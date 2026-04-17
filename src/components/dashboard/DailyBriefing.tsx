"use client";

import { useState } from "react";

interface BriefingLine {
  type: "section" | "item";
  text: string;
}

// Static briefing for pre-launch. Post-launch this will come from
// /api/intelligence/digest or a stored agent_conversations entry.
const STATIC_BRIEFING: BriefingLine[] = [
  { type: "section", text: "🔴 Critical Today" },
  { type: "item",    text: "MBSE Agent auth middleware (M04) — in progress, due 18 Apr" },
  { type: "item",    text: "Decision D1: Vector DB selection — deadline 20 Apr" },
  { type: "section", text: "🟡 This Week" },
  { type: "item",    text: "Retrieval quality eval (M10) — due 20 Apr; benchmark dataset not yet defined" },
  { type: "item",    text: "WP-001 MBSE whitepaper at 40% — target 15 May; content sprint needed" },
  { type: "section", text: "📊 Pipeline" },
  { type: "item",    text: "Volvo Cars: last touch 7d ago — send MBSE roadmap whitepaper, schedule call" },
  { type: "item",    text: "Continental AG: contacted — follow up on LinkedIn, share MBSE brief" },
  { type: "section", text: "🧠 Intelligence Signal" },
  { type: "item",    text: "AUTOSAR released Adaptive Platform 23-11 update — review impact on Platform agent scope" },
  { type: "item",    text: "EU Cyber Resilience Act enters force — flag for CyberSec agent regulatory corpus" },
];

export default function DailyBriefing() {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const visibleLines = expanded ? STATIC_BRIEFING : STATIC_BRIEFING.slice(0, 6);

  async function handleRegenerate() {
    setRegenerating(true);
    // Future: call /api/intelligence/digest and refresh
    await new Promise((r) => setTimeout(r, 1500));
    setRegenerating(false);
  }

  return (
    <div className="bg-dark-2 rounded-[10px] border border-dark-4 overflow-hidden mb-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-dark-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5">Chief of Staff · Daily Briefing</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dark-5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="text-[10px] text-dark-5 hover:text-gold transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {regenerating ? (
              <span className="animate-spin">↻</span>
            ) : "↻"} Regenerate
          </button>
        </div>
      </div>

      {/* Briefing content */}
      <div className="px-5 py-4">
        <div className="space-y-1.5">
          {visibleLines.map((line, i) =>
            line.type === "section" ? (
              <div key={i} className="text-[10px] font-bold uppercase tracking-widest text-dark-5 mt-3 first:mt-0">
                {line.text}
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2 pl-2">
                <span className="text-dark-5 text-[10px] mt-0.5 shrink-0">▸</span>
                <span className="text-xs text-grey leading-relaxed">{line.text}</span>
              </div>
            )
          )}
        </div>

        {STATIC_BRIEFING.length > 6 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-[10px] text-dark-5 hover:text-gold transition-colors"
          >
            {expanded ? "Show less ↑" : `Show ${STATIC_BRIEFING.length - 6} more items ↓`}
          </button>
        )}
      </div>
    </div>
  );
}
