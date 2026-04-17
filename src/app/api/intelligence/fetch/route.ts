import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import { FEEDS, type FeedCategory } from "@/lib/intelligence/feeds";

// ── Supabase server client ──────────────────────────────────────

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );
}

// ── RSS parser (no external library — native fetch + regex) ────

interface FeedItem {
  title: string;
  url: string;
  publishedAt: string | null;
}

async function parseRss(url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Embedia-Cockpit-Intelligence/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    const xml = await res.text();

    // Extract <item> or <entry> blocks
    const itemRe = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
    const items: FeedItem[] = [];
    let match;

    while ((match = itemRe.exec(xml)) !== null) {
      const block = match[1];
      const title  = (/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/.exec(block)?.[1] || "").trim();
      const link   = (/<link[^>]*>(?:<!\[CDATA\[)?(https?[^<]*?)(?:\]\]>)?<\/link>/.exec(block)?.[1] ||
                      /href="(https?[^"]+)"/.exec(block)?.[1] || "").trim();
      const dateStr= (/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/.exec(block)?.[1] || "").trim();

      if (title && link) {
        items.push({
          title,
          url: link,
          publishedAt: dateStr ? new Date(dateStr).toISOString() : null,
        });
      }
    }

    return items.slice(0, 10); // Max 10 per feed
  } catch {
    return [];
  }
}

// ── HTML scraper — extract page titles and hrefs ───────────────

async function scrapeHeadlines(url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Embedia-Cockpit-Intelligence/1.0" },
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();

    // Extract <a href="...">title</a> patterns within article/news containers
    // Look for links with substantial anchor text (>20 chars) in news-like contexts
    const linkRe = /<a\s[^>]*href="(https?[^"]+)"[^>]*>\s*([^<]{20,200})\s*<\/a>/g;
    const items: FeedItem[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = linkRe.exec(html)) !== null && items.length < 8) {
      const [, href, text] = match;
      const clean = text.replace(/\s+/g, " ").trim();
      // Skip navigation, footer, and boilerplate
      if (!seen.has(href) && clean.split(" ").length >= 4 && !href.includes("#")) {
        seen.add(href);
        items.push({ title: clean, url: href, publishedAt: null });
      }
    }

    return items;
  } catch {
    return [];
  }
}

// ── Claude Haiku scoring ───────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ScoredItem {
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  relevanceScore: number;
  category: FeedCategory;
}

async function scoreWithHaiku(
  title: string,
  sourceCategory: FeedCategory,
  relevanceBoost: number
): Promise<{ summary: string; score: number }> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `You are the intelligence curation assistant for Embedia.io, a digital transformation consultancy specialising in MBSE, functional safety (ISO 26262), cybersecurity (ISO/SAE 21434), software-defined vehicles, and AI agents for automotive/mechatronic industries.

Article title: "${title}"

Tasks:
1. Write a 1–2 sentence summary (max 180 chars) of what this article is likely about, based on the title. Be concrete.
2. Score its relevance to Embedia on a scale of 0–80 (integer). Consider: MBSE, systems engineering, automotive, SDV, E/E architecture, functional safety, cybersecurity, AI/LLM tools for engineering, Belgian/DACH automotive ecosystem, EU regulation.

Respond in this exact JSON format (no markdown):
{"summary":"...","score":42}`
      }],
    });

    const raw = (msg.content[0] as { text: string }).text.trim();
    const parsed = JSON.parse(raw);
    const boostedScore = Math.min(100, (parsed.score || 50) + relevanceBoost);

    return { summary: parsed.summary || title, score: boostedScore };
  } catch {
    return { summary: title, score: 50 + relevanceBoost };
  }
}

// ── POST /api/intelligence/fetch ───────────────────────────────

export async function POST() {
  const supabase = await createClient();
  const stats = { processed: 0, inserted: 0, skipped: 0, errors: 0 };

  // Get existing URLs to avoid re-processing
  const { data: existing } = await supabase.from("news_items").select("url");
  const existingUrls = new Set((existing || []).map((r: { url: string }) => r.url));

  // Process feeds in batches of 5 (rate limit Haiku calls)
  const BATCH_SIZE = 5;

  for (let i = 0; i < FEEDS.length; i += BATCH_SIZE) {
    const batch = FEEDS.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (feed) => {
      try {
        const rawItems = feed.fetchType === "rss"
          ? await parseRss(feed.url)
          : await scrapeHeadlines(feed.url);

        const newItems = rawItems.filter(item => !existingUrls.has(item.url));

        for (const item of newItems.slice(0, 5)) {
          try {
            stats.processed++;
            const { summary, score } = await scoreWithHaiku(
              item.title,
              feed.category,
              feed.relevanceBoost
            );

            // Only store items with relevance >= 40
            if (score < 40) {
              stats.skipped++;
              continue;
            }

            const { error } = await supabase.from("news_items").upsert({
              source:          feed.name,
              title:           item.title,
              url:             item.url,
              summary,
              category:        feed.category,
              relevance_score: score,
              published_at:    item.publishedAt,
              fetched_at:      new Date().toISOString(),
            }, { onConflict: "url" });

            if (error) {
              stats.errors++;
            } else {
              stats.inserted++;
              existingUrls.add(item.url);
            }
          } catch {
            stats.errors++;
          }
        }
      } catch {
        stats.errors++;
      }
    }));

    // Small pause between batches
    if (i + BATCH_SIZE < FEEDS.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    message: `Fetch complete: ${stats.inserted} new items added (${stats.processed} processed, ${stats.skipped} below threshold, ${stats.errors} errors)`,
    stats,
  });
}
