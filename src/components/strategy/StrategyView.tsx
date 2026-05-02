"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";
import type { NewsItem } from "@/lib/supabase/types";

// ── Strategic Bets (hardcoded — source of truth for SE OS decisions) ──────────

interface StrategicBet {
  id: string;
  domain: string;
  decision: string;
  rationale: string;
  status: "confirmed" | "active" | "watch";
  adr?: string;
}

const STRATEGIC_BETS: StrategicBet[] = [
  {
    id: "sb-1",
    domain: "Orchestration",
    decision: "Claude API primary · Llama 3.3-70B fallback",
    rationale: "Engineering-grade reasoning at Claude tier; OSS fallback for air-gapped Mode B/C. DeepSeek deprioritised.",
    status: "confirmed",
  },
  {
    id: "sb-2",
    domain: "Deployment Modes",
    decision: "Mode A (AWS EKS) · Mode B (on-prem RTX 4090) · Mode C (air-gapped Mistral/Llama)",
    rationale: "Three-mode architecture covers cloud, customer VPC, and fully air-gapped. Each mode independently viable.",
    status: "active",
  },
  {
    id: "sb-3",
    domain: "Customer Lock-in",
    decision: "Per-customer LoRA adapters (ADR-004)",
    rationale: "Domain base model (Sprint 5) + customer LoRA fine-tuned on their engineering corpus. Switching cost: 6–12 months of domain data.",
    status: "active",
    adr: "ADR-004",
  },
  {
    id: "sb-4",
    domain: "On-Prem Training",
    decision: "RoundPipe + Unsloth on 8×RTX 4090",
    rationale: "RoundPipe (arXiv:2604.27085) enables 32B full fine-tune and 235B LoRA on commodity hardware (€15–20K). Unsloth handles per-GPU memory. Moves Mode B training from cloud to customer infrastructure.",
    status: "watch",
  },
  {
    id: "sb-5",
    domain: "GRPO Feedback",
    decision: "GRPO on Llama 3.2 → Mode B air-gapped agents (Phase 3)",
    rationale: "Safouen validated GRPO+Unsloth. Phase 3 applies this to customer-hosted adaptation loops. Stack: Unsloth + RoundPipe + GRPO.",
    status: "watch",
  },
];

const STATUS_STYLE: Record<StrategicBet["status"], { badge: string; dot: string }> = {
  confirmed: { badge: "bg-status-green/15 text-status-green", dot: "bg-status-green" },
  active:    { badge: "bg-gold/15 text-gold",                 dot: "bg-gold" },
  watch:     { badge: "bg-blue-400/15 text-blue-400",         dot: "bg-blue-400" },
};

const STATUS_LABEL: Record<StrategicBet["status"], string> = {
  confirmed: "Confirmed",
  active:    "Active",
  watch:     "Watch",
};

// ── Category badge ─────────────────────────────────────────────────────────────

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

// ── Strategic Bets Panel ───────────────────────────────────────────────────────

function StrategicBetsPanel() {
  return (
    <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-4">
        <div className="text-sm font-bold text-white">SE OS Strategic Bets</div>
        <div className="text-[10px] text-dark-5">Confirmed architectural decisions · source of truth</div>
      </div>
      <div className="divide-y divide-dark-4">
        {STRATEGIC_BETS.map((bet) => {
          const s = STATUS_STYLE[bet.status];
          return (
            <div key={bet.id} className="px-5 py-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-dark-5">{bet.domain}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {STATUS_LABEL[bet.status]}
                </span>
                {bet.adr && (
                  <span className="text-[9px] font-mono text-dark-5 ml-auto">{bet.adr}</span>
                )}
              </div>
              <div className="text-xs font-semibold text-white mb-1 leading-snug">{bet.decision}</div>
              <div className="text-[10px] text-grey leading-relaxed">{bet.rationale}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tech Intelligence Feed ─────────────────────────────────────────────────────

function TechIntelFeed({ onItemClick }: { onItemClick: (id: string) => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("news_items")
        .select("*")
        .in("category", ["ai_llm", "sdv", "mbse"])
        .order("relevance_score", { ascending: false })
        .order("fetched_at", { ascending: false })
        .limit(20);
      setItems((data || []) as NewsItem[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Tech Intelligence</div>
          <div className="text-[10px] text-dark-5">AI · LLM · SDV · MBSE signals — sorted by Embedia relevance</div>
        </div>
        <span className="text-[10px] text-dark-5">{items.length} items</span>
      </div>

      <div className="divide-y divide-dark-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse">
              <div className="h-3 bg-dark-3 rounded w-3/4 mb-2" />
              <div className="h-2 bg-dark-4 rounded w-1/2" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-5 py-10 text-center text-dark-5 text-xs">
            No tech intelligence yet — add items via the Intelligence tab or Cowork agent.
          </div>
        ) : (
          items.map((item) => (
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
                        {new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white leading-snug mb-1">{item.title}</div>
                  {item.summary && (
                    <div className="text-[10px] text-grey line-clamp-3 leading-relaxed">{item.summary}</div>
                  )}
                </div>
                <div className="shrink-0 pt-1">{relevanceBar(item.relevance_score)}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── SE OS Horizon Strip ────────────────────────────────────────────────────────

interface HorizonItem {
  phase: string;
  label: string;
  status: "done" | "active" | "planned";
}

const SE_OS_HORIZON: HorizonItem[] = [
  { phase: "Phase 1", label: "VibeSE MVP on Cloud Run",             status: "done" },
  { phase: "Phase 2", label: "Garrett LoRA adapter (ADR-004)",      status: "done" },
  { phase: "Sprint 11–12", label: "FuSa uplift + E2E eval baseline", status: "active" },
  { phase: "Sprint 13", label: "SOTIF / Cyber training data",        status: "planned" },
  { phase: "Phase 2b", label: "Mode B on-prem deployment",          status: "planned" },
  { phase: "Phase 3", label: "GRPO feedback loop",                  status: "planned" },
];

const HORIZON_STYLE: Record<HorizonItem["status"], { dot: string; text: string; border: string }> = {
  done:    { dot: "bg-status-green", text: "text-status-green", border: "border-status-green/30" },
  active:  { dot: "bg-gold animate-pulse", text: "text-gold", border: "border-gold/40" },
  planned: { dot: "bg-dark-5", text: "text-dark-5", border: "border-dark-4" },
};

function ProductHorizon() {
  return (
    <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-4">
        <div className="text-sm font-bold text-white">SE OS Product Horizon</div>
        <div className="text-[10px] text-dark-5">VibeSE sprint cadence · Mode B roadmap</div>
      </div>
      <div className="px-5 py-3 flex flex-wrap gap-2">
        {SE_OS_HORIZON.map((item) => {
          const s = HORIZON_STYLE[item.status];
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${s.border} bg-dark-3`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <div>
                <div className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}>{item.phase}</div>
                <div className="text-[10px] text-white leading-tight">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main StrategyView ──────────────────────────────────────────────────────────

export default function StrategyView() {
  const { openPanel } = usePanel();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Strategy</h2>
          <p className="text-xs text-grey mt-1">
            SE OS architectural decisions · Tech scouting · Product horizon
          </p>
        </div>
      </div>

      {/* Product Horizon strip — full width */}
      <div className="mb-4">
        <ProductHorizon />
      </div>

      {/* Main grid: Tech Intel (left 2/3) + Strategic Bets (right 1/3) */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <TechIntelFeed onItemClick={(id) => openPanel("news", id)} />
        </div>
        <div className="col-span-1">
          <StrategicBetsPanel />
        </div>
      </div>
    </div>
  );
}
