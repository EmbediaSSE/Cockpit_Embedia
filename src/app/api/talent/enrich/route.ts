import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

// ── /api/talent/enrich ─────────────────────────────────────────────────────────
// POST { url?, rawText?, type: "candidate" | "role", cluster? }
// → fetches the URL (best-effort), combines with rawText, asks Claude to extract
//   a structured Candidate or RoleItem and returns it as JSON.

const client = new Anthropic();

// ── Fetch URL content (best-effort, no crash on failure) ──────────────────────

async function fetchUrlText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags to get readable text (rough but good enough for LLM input)
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 12000); // cap context
  } catch {
    return "";
  }
}

// ── Claude extraction prompts ─────────────────────────────────────────────────

const CANDIDATE_PROMPT = (content: string) => `
You are a recruitment intelligence assistant for Embedia.io, an automotive engineering consultancy
that places engineers at clients like IMEC, Bosch, Continental, etc.

Extract a structured candidate profile from the text below.
Return ONLY a JSON object with exactly this schema (no markdown, no explanation):

{
  "name": "Full Name",
  "role": "Current job title",
  "match": "strong" | "medium" | "weak",   // vs ASIC / semiconductor / embedded engineering roles
  "target_roles": "comma-separated list of roles this person could fill",
  "summary": "1-2 sentence professional summary highlighting key strengths",
  "tags": ["skill1", "skill2", ...],         // 4-8 key technical skills or tools
  "alert": "any concern or notable caveat"   // omit key if nothing notable
}

Evaluate "match" against semiconductor/ASIC engineering roles (Digital IC design, Analog design,
Layout, Verification, Test engineering, FAE). Strong = clear semiconductor background.
Medium = transferable skills. Weak = unlikely fit.

--- PROFILE ---
${content}
--- END ---
`;

const ROLE_PROMPT = (content: string, cluster: string) => `
You are a recruitment intelligence assistant. Extract a structured job role from the text below.
Return ONLY a JSON object (no markdown, no explanation):

{
  "title": "Exact job title",
  "tags": "comma-separated skills/tools required (4-6 items)",
  "cluster": "${cluster || "General"}"
}

--- JOB POSTING ---
${content}
--- END ---
`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      url?: string;
      rawText?: string;
      pdfBase64?: string;    // base64-encoded PDF (LinkedIn export or any profile PDF)
      type: "candidate" | "role";
      cluster?: string;
    };

    const { url, rawText, pdfBase64, type, cluster } = body;

    if (!type) {
      return NextResponse.json({ error: "type is required (candidate | role)" }, { status: 400 });
    }

    // Build message content — PDF takes priority when present
    type MessageContent = { type: "text"; text: string } | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

    const contentBlocks: MessageContent[] = [];

    if (pdfBase64) {
      // Send PDF directly to Claude — no parsing library needed
      contentBlocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
      });
    }

    // Also include any URL-fetched text and pasted text as supplementary context
    let fetchedText = "";
    if (url) fetchedText = await fetchUrlText(url);
    const textContext = [fetchedText, rawText].filter(Boolean).join("\n\n---\n\n");

    if (!pdfBase64 && !textContext.trim()) {
      return NextResponse.json(
        { error: "No content found. Upload a PDF, paste a URL, or paste the profile text." },
        { status: 400 }
      );
    }

    const prompt =
      type === "candidate"
        ? CANDIDATE_PROMPT(textContext || "(see attached PDF above)")
        : ROLE_PROMPT(textContext || "(see attached PDF above)", cluster || "");

    contentBlocks.push({ type: "text", text: prompt });

    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: contentBlocks }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();

    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);

    if (url) {
      if (type === "candidate") parsed.linkedin_url = url;
      else parsed.source_url = url;
    }

    return NextResponse.json({ [type]: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
