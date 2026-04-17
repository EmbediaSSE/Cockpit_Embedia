"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";
import type { NewsItem, StandardsWatch } from "@/lib/supabase/types";

// ── Category config ────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",        label: "All Topics" },
  { id: "automotive", label: "Automotive" },
  { id: "sdv",        label: "SDV" },
  { id: "mbse",       label: "MBSE" },
  { id: "ai_llm",     label: "AI / LLM" },
  { id: "standards",  label: "Standards" },
  { id: "market",     label: "Market" },
] as const;

const CATEGORY_BADGE: Record<string, string> = {
  automotive: "bg-blue-500/15 text-blue-400",
  sdv:        "bg-purple-500/15 text-purple-400",
  mbse:       "bg-gold/15 text-gold",
  ai_llm:     "bg-green-500/15 text-green-400",
  standards:  "bg-amber-500/15 text-amber-400",
  market:     "bg-grey/15 text-grey",
};

function relevanceBar(score: number) {
  const color = score >= 75 ? "bg-status-green" : score >= 50 ? "bg-status-amber" : "bg-dark-5";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-dark-4 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-bold ${score >= 75 ? "text-status-green" : score >= 50 ? "text-status-amber" : "text-dark-5"}`}>
        {score}
      </span>
    </div>
  );
}

// ── News Feed ──────────────────────────────────────────────────

function NewsFeed({ onItemClick }: { onItemClick: (id: string) => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      let q = supabase
        .from("news_items")
        .select("*")
        .order("relevance_score", { ascending: false })
        .order("fetched_at", { ascending: false })
        .limit(30);

      if (category !== "all") {
        q = q.eq("category", category);
      }

      const { data } = await q;
      setItems((data || []) as NewsItem[]);
      setLoading(false);
    }
    setLoading(true);
    load();
  }, [category]);

  async function handleFetch() {
    setFetching(true);
    setFetchMsg(null);
    try {
      const res = await fetch("/api/intelligence/fetch", { method: "POST" });
      const json = await res.json();
      setFetchMsg(json.message || "Fetch complete.");
      // Reload
      const supabase = createClient();
      const { data } = await supabase
        .from("news_items")
        .select("*")
        .order("relevance_score", { ascending: false })
        .order("fetched_at", { ascending: false })
        .limit(30);
      setItems((data || []) as NewsItem[]);
    } catch {
      setFetchMsg("Fetch failed — check API logs.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-dark-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Industry Intelligence</div>
          <div className="text-[10px] text-dark-5">{items.length} curated articles · sorted by Embedia relevance</div>
        </div>
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-gold/10 border border-gold/30 text-gold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-40"
        >
          {fetching ? "Fetching…" : "↓ Fetch Now"}
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 px-5 py-2 border-b border-dark-4 overflow-x-auto">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-all ${
              category === c.id ? "bg-gold text-dark" : "text-grey hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {fetchMsg && (
        <div className="px-5 py-2 bg-dark-3 text-[10px] text-grey border-b border-dark-4">{fetchMsg}</div>
      )}

      {/* Items */}
      <div className="divide-y divide-dark-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="h-3 bg-dark-3 rounded w-3/4 mb-2" />
              <div className="h-2 bg-dark-4 rounded w-1/2" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-dark-5 text-xs">
            No items yet — click "Fetch Now" to ingest your first batch of intelligence.
          </div>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className="w-full px-5 py-3 text-left hover:bg-dark-3 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${CATEGORY_BADGE[item.category] || "bg-dark-4 text-dark-5"}`}>
                      {item.category.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="text-[10px] text-dark-5">{item.source}</span>
                    {item.published_at && (
                      <span className="text-[10px] text-dark-5">
                        {new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-white leading-snug mb-1 truncate">{item.title}</div>
                  {item.summary && (
                    <div className="text-[10px] text-grey line-clamp-2 leading-relaxed">{item.summary}</div>
                  )}
                </div>
                <div className="shrink-0">{relevanceBar(item.relevance_score)}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Standards Radar ────────────────────────────────────────────

function StandardsRadar() {
  const [standards, setStandards] = useState<StandardsWatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("standards_watch").select("*").order("code");
      setStandards((data || []) as StandardsWatch[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-4">
        <div className="text-sm font-bold text-white">Standards Radar</div>
        <div className="text-[10px] text-dark-5">Curated standards relevant to Embedia domains</div>
      </div>
      <div className="divide-y divide-dark-4">
        {loading ? (
          <div className="px-5 py-4 text-xs text-dark-5">Loading…</div>
        ) : standards.length === 0 ? (
          <div className="px-5 py-4 text-xs text-dark-5 text-center">No standards data — run migration 003</div>
        ) : (
          standards.map(s => (
            <div key={s.id} className="px-5 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold font-mono text-gold">{s.code}</span>
                <span className="text-[10px] text-dark-5">{s.body}</span>
                {s.last_updated && (
                  <span className="text-[9px] text-dark-5 ml-auto">
                    Updated {new Date(s.last_updated).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <div className="text-xs text-white font-medium mb-0.5">{s.title}</div>
              {s.relevance && <div className="text-[10px] text-grey">{s.relevance}</div>}
              {s.notes && <div className="text-[10px] text-dark-5 mt-1">{s.notes}</div>}
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-gold hover:underline mt-1 inline-block"
                  onClick={e => e.stopPropagation()}
                >
                  View standard ↗
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main IntelligenceView ──────────────────────────────────────

export default function IntelligenceView() {
  const { openPanel } = usePanel();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Intelligence</h2>
          <p className="text-xs text-grey mt-1">
            Market signals · Standards radar · AI-curated by Claude Haiku · daily refresh
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* News Feed — 2/3 width */}
        <div className="col-span-2">
          <NewsFeed onItemClick={(id) => openPanel("news", id)} />
        </div>

        {/* Standards — 1/3 width */}
        <div className="col-span-1">
          <StandardsRadar />
        </div>
      </div>
    </div>
  );
}
