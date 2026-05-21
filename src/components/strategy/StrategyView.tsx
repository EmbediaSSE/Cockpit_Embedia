"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";
import type { NewsItem } from "@/lib/supabase/types";

// Note: SE OS Strategic Bets, Product Horizon, and Open Decisions moved to ProductView (SE OS tab)

// ── Types ──────────────────────────────────────────────────────────────────────

interface StrategicBet {
  id: string;
  domain: string;
  decision: string;
  rationale: string;
  status: "confirmed" | "active" | "watch" | "draft";
  adr?: string;
  tag?: string;
}

interface Decision {
  id: string;
  code: string;
  text: string;
  owner: string;
  deadline: string | null;
  status: string;
  note: string | null;
}

// ── Strategic Bets — SE OS source of truth ────────────────────────────────────

const STRATEGIC_BETS: StrategicBet[] = [
  {
    id: "sb-1",
    domain: "Orchestration",
    decision: "Claude API primary · Llama 3.3-70B fallback",
    rationale:
      "Engineering-grade reasoning at Claude tier; OSS fallback for air-gapped Mode B/C. DeepSeek deprioritised.",
    status: "confirmed",
    tag: "Model",
  },
  {
    id: "sb-2",
    domain: "Deployment Modes",
    decision: "Mode A (AWS EKS) · Mode B (on-prem RTX 4090) · Mode C (air-gapped Mistral/Llama)",
    rationale:
      "Three-mode architecture covers cloud, customer VPC, and fully air-gapped. Each mode independently viable.",
    status: "active",
    tag: "Infra",
  },
  {
    id: "sb-3",
    domain: "Customer Lock-in",
    decision: "Per-customer LoRA adapters (ADR-004)",
    rationale:
      "Domain base model (Sprint 5) + customer LoRA fine-tuned on engineering corpus. Switching cost: 6–12 months of domain data.",
    status: "active",
    adr: "ADR-004",
    tag: "ML",
  },
  {
    id: "sb-4",
    domain: "On-Prem Training",
    decision: "RoundPipe + Unsloth on 8×RTX 4090",
    rationale:
      "RoundPipe (arXiv:2604.27085) enables 32B full fine-tune and 235B LoRA on commodity hardware (€15–20K). Moves Mode B training to customer infrastructure.",
    status: "watch",
    tag: "ML",
  },
  {
    id: "sb-5",
    domain: "GRPO Feedback",
    decision: "GRPO on Llama 3.2 → Mode B air-gapped agents (Phase 3)",
    rationale:
      "Safouen validated GRPO+Unsloth. Phase 3 applies this to customer-hosted adaptation loops. Stack: Unsloth + RoundPipe + GRPO.",
    status: "watch",
    tag: "ML",
  },
  {
    id: "sb-6",
    domain: "AI OS Architecture",
    decision: "Tool-agnostic internal AI OS — Four Cs (Context · Connections · Capabilities · Cadence)",
    rationale:
      "Durable layer is architecture + workflow intelligence, not any specific LLM or tool. Skills are portable markdown SOPs; connections abstracted behind agent interface. Externally: SE OS lock-in is the customer LoRA adapter + GRPO feedback loop, not Anthropic dependency. ADR-003 LLM adapter layer is the correct answer to vendor risk. [DRAFT — to be refined]",
    status: "draft",
    tag: "Ops",
  },
];

// ── Product Horizon — updated 2026-05-04 ─────────────────────────────────────

interface HorizonItem {
  phase: string;
  label: string;
  status: "done" | "active" | "planned";
}

const SE_OS_HORIZON: HorizonItem[] = [
  { phase: "Phase 1",   label: "VibeSE MVP — Cloud Run",             status: "done"    },
  { phase: "Phase 2",   label: "Garrett LoRA adapter (ADR-004)",     status: "done"    },
  { phase: "S11–S21",   label: "FuSa uplift · RFLP v1.1 · E2E eval", status: "done"    },
  { phase: "S22–S24",   label: "RFLP v1.5 · Dashboard · CORS fix",   status: "done"    },
  { phase: "Sprint 25", label: "Dashboard API wiring",                status: "active"  },
  { phase: "Phase 2b",  label: "Mode B on-prem deployment",           status: "planned" },
  { phase: "Phase 3",   label: "GRPO feedback loop",                  status: "planned" },
];

// ── Style maps ────────────────────────────────────────────────────────────────

const BET_STATUS: Record<
  StrategicBet["status"],
  { border: string; badge: string; dot: string; label: string }
> = {
  confirmed: {
    border:  "border-l-2 border-l-[#27AE60]",
    badge:   "bg-[#27AE60]/15 text-[#27AE60]",
    dot:     "bg-[#27AE60]",
    label:   "Confirmed",
  },
  active: {
    border:  "border-l-2 border-l-[#F5A623]",
    badge:   "bg-[#F5A623]/15 text-[#F5A623]",
    dot:     "bg-[#F5A623]",
    label:   "Active",
  },
  watch: {
    border:  "border-l-2 border-l-[#60A5FA]",
    badge:   "bg-[#60A5FA]/15 text-[#60A5FA]",
    dot:     "bg-[#60A5FA]",
    label:   "Watch",
  },
  draft: {
    border:  "border-l-2 border-l-dashed border-l-[#3A3A3A]",
    badge:   "bg-[#2A2A2A] text-[#8E8E93] border border-dashed border-[#3A3A3A]",
    dot:     "bg-[#3A3A3A]",
    label:   "Draft",
  },
};

const HORIZON_STYLE: Record<
  HorizonItem["status"],
  { dot: string; text: string; bg: string; connector: string }
> = {
  done:    { dot: "bg-[#27AE60]",            text: "text-[#27AE60]",   bg: "bg-[#27AE60]/10 border-[#27AE60]/30",  connector: "bg-[#27AE60]/40" },
  active:  { dot: "bg-[#F5A623] animate-pulse", text: "text-[#F5A623]",  bg: "bg-[#F5A623]/10 border-[#F5A623]/40",  connector: "bg-[#F5A623]/30" },
  planned: { dot: "bg-[#2A2A2A]",            text: "text-[#3A3A3A]",   bg: "bg-transparent border-[#2A2A2A]",       connector: "bg-[#2A2A2A]"    },
};

const TAG_STYLE: Record<string, string> = {
  Model: "bg-purple-500/15 text-purple-400",
  Infra: "bg-blue-500/15 text-blue-400",
  ML:    "bg-[#F5A623]/15 text-[#F5A623]",
  Ops:   "bg-green-500/15 text-green-400",
};

const CATEGORY_BADGE: Record<string, string> = {
  automotive: "bg-blue-500/15 text-blue-400",
  sdv:        "bg-purple-500/15 text-purple-400",
  mbse:       "bg-[#F5A623]/15 text-[#F5A623]",
  ai_llm:     "bg-green-500/15 text-green-400",
  standards:  "bg-amber-500/15 text-amber-400",
  market:     "bg-[#3A3A3A]/40 text-[#8E8E93]",
};

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-[#3A3A3A] uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Product Horizon ────────────────────────────────────────────────────────────

function ProductHorizon() {
  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">SE OS Product Horizon</div>
          <div className="text-[10px] text-[#3A3A3A]">VibeSE sprint cadence · Mode B roadmap · updated 2026-05-04</div>
        </div>
        <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-[#F5A623]/15 text-[#F5A623] animate-pulse">
          Sprint 25 Active
        </span>
      </div>
      <div className="px-5 py-4 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {SE_OS_HORIZON.map((item, i) => {
            const s = HORIZON_STYLE[item.status];
            const isLast = i === SE_OS_HORIZON.length - 1;
            return (
              <div key={item.label} className="flex items-center">
                {/* Card */}
                <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border ${s.bg}`} style={{ minWidth: 148 }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${s.dot}`} />
                  <div>
                    <div className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}>{item.phase}</div>
                    <div className="text-[10px] text-white leading-snug mt-0.5">{item.label}</div>
                  </div>
                </div>
                {/* Connector */}
                {!isLast && (
                  <div className={`h-px w-5 flex-shrink-0 ${s.connector}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Strategic Bets Grid ────────────────────────────────────────────────────────

type BetFilter = "all" | StrategicBet["status"];

function StrategicBetsGrid() {
  const [filter, setFilter] = useState<BetFilter>("all");

  const counts = {
    all:       STRATEGIC_BETS.length,
    confirmed: STRATEGIC_BETS.filter(b => b.status === "confirmed").length,
    active:    STRATEGIC_BETS.filter(b => b.status === "active").length,
    watch:     STRATEGIC_BETS.filter(b => b.status === "watch").length,
    draft:     STRATEGIC_BETS.filter(b => b.status === "draft").length,
  };

  const filtered = filter === "all"
    ? STRATEGIC_BETS
    : STRATEGIC_BETS.filter(b => b.status === filter);

  const FILTERS: { id: BetFilter; label: string; color: string }[] = [
    { id: "all",       label: `All (${counts.all})`,             color: "text-white" },
    { id: "confirmed", label: `Confirmed (${counts.confirmed})`, color: "text-[#27AE60]" },
    { id: "active",    label: `Active (${counts.active})`,       color: "text-[#F5A623]" },
    { id: "watch",     label: `Watch (${counts.watch})`,         color: "text-[#60A5FA]" },
    { id: "draft",     label: `Draft (${counts.draft})`,         color: "text-[#8E8E93]" },
  ];

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      {/* Header + filter bar */}
      <div className="px-5 py-3 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-sm font-bold text-white">SE OS Strategic Bets</div>
            <div className="text-[10px] text-[#3A3A3A]">Architectural decisions · source of truth</div>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                filter === f.id
                  ? `${f.color} bg-white/8 border border-white/10`
                  : "text-[#3A3A3A] hover:text-[#8E8E93] border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {filtered.map((bet) => {
          const s = BET_STATUS[bet.status];
          return (
            <div
              key={bet.id}
              className={`rounded-lg bg-[#151515] border border-[#2A2A2A] p-3.5 ${s.border} transition-all hover:border-[#3A3A3A]`}
            >
              {/* Top row */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3A] flex-1">
                  {bet.domain}
                </span>
                {bet.tag && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${TAG_STYLE[bet.tag] ?? "bg-[#2A2A2A] text-[#8E8E93]"}`}>
                    {bet.tag}
                  </span>
                )}
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  {s.label}
                </span>
                {bet.adr && (
                  <span className="text-[8px] font-mono text-[#3A3A3A]">{bet.adr}</span>
                )}
              </div>

              {/* Decision */}
              <div className="text-xs font-semibold text-white leading-snug mb-1.5">
                {bet.decision}
              </div>

              {/* Rationale */}
              <div className="text-[10px] text-[#8E8E93] leading-relaxed line-clamp-3">
                {bet.rationale}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Open Decisions Panel ───────────────────────────────────────────────────────

function OpenDecisionsPanel() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("decisions")
        .select("id, code, text, owner, deadline, status, note")
        .in("status", ["pending", "in_review"])
        .order("code", { ascending: true })
        .limit(10);
      setDecisions((data || []) as Decision[]);
      setLoading(false);
    }
    load();
  }, []);

  function fmtDeadline(d: string | null) {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const overdue = date < now;
    const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return { label, overdue };
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-sm font-bold text-white">Open Decisions</div>
          <div className="text-[10px] text-[#3A3A3A]">Pending · In review</div>
        </div>
        {!loading && (
          <span className="text-[10px] font-bold text-[#F5A623]">{decisions.length} open</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2A]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 animate-pulse">
              <div className="h-2.5 bg-[#2A2A2A] rounded w-3/4 mb-1.5" />
              <div className="h-2 bg-[#1E1E1E] rounded w-1/2" />
            </div>
          ))
        ) : decisions.length === 0 ? (
          <div className="px-4 py-8 text-center text-[#3A3A3A] text-xs">
            No open decisions
          </div>
        ) : (
          decisions.map((d) => {
            const dl = fmtDeadline(d.deadline);
            return (
              <div key={d.id} className="px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-[9px] font-mono font-bold text-[#3A3A3A] flex-shrink-0 pt-0.5">
                    {d.code}
                  </span>
                  <span className="text-[10px] text-white font-medium leading-snug flex-1">
                    {d.text}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-[9px] text-[#3A3A3A]">{d.owner}</span>
                  {dl && (
                    <span className={`text-[9px] font-medium ${dl.overdue ? "text-red-400" : "text-[#3A3A3A]"}`}>
                      {dl.overdue ? "⚠ " : ""}{dl.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Tech Intel Feed — compact ──────────────────────────────────────────────────

function relevanceBar(score: number) {
  const color =
    score >= 75 ? "bg-[#27AE60]" : score >= 50 ? "bg-[#F39C12]" : "bg-[#2A2A2A]";
  const textColor =
    score >= 75 ? "text-[#27AE60]" : score >= 50 ? "text-[#F39C12]" : "text-[#3A3A3A]";
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[9px] font-bold ${textColor}`}>{score}</span>
    </div>
  );
}

function TechIntelFeed({ onItemClick }: { onItemClick: (id: string) => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("news_items")
        .select("*")
        .in("category", ["ai_llm", "sdv", "mbse"])
        .order("relevance_score", { ascending: false })
        .order("fetched_at", { ascending: false })
        .limit(30);
      setItems((data || []) as NewsItem[]);
      setLoading(false);
    }
    load();
  }, []);

  const visible = expanded ? items : items.slice(0, 8);

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Tech Intelligence</div>
          <div className="text-[10px] text-[#3A3A3A]">
            AI · LLM · SDV · MBSE signals — sorted by Embedia relevance
          </div>
        </div>
        <span className="text-[10px] text-[#3A3A3A]">{items.length} signals</span>
      </div>

      {/* 2-column grid */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse p-3 rounded-lg bg-[#151515] border border-[#2A2A2A]">
                <div className="h-2.5 bg-[#2A2A2A] rounded w-3/4 mb-2" />
                <div className="h-2 bg-[#1E1E1E] rounded w-1/2" />
              </div>
            ))
          : visible.length === 0
          ? (
            <div className="col-span-2 px-5 py-8 text-center text-[#3A3A3A] text-xs">
              No signals yet — add items via the Intelligence tab or Cowork agent.
            </div>
          )
          : visible.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className="text-left p-3 rounded-lg bg-[#151515] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                      CATEGORY_BADGE[item.category] ?? "bg-[#2A2A2A] text-[#8E8E93]"
                    }`}
                  >
                    {item.category.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-[9px] text-[#3A3A3A] truncate flex-1">{item.source}</span>
                  <div className="flex-shrink-0">{relevanceBar(item.relevance_score)}</div>
                </div>
                <div className="text-[10px] font-semibold text-white leading-snug line-clamp-2">
                  {item.title}
                </div>
                {item.published_at && (
                  <div className="text-[9px] text-[#3A3A3A] mt-1">
                    {new Date(item.published_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}
              </button>
            ))}
      </div>

      {/* Show more / less */}
      {items.length > 8 && (
        <div className="border-t border-[#2A2A2A] px-5 py-2.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-semibold text-[#F5A623] hover:text-[#F5A623]/80 transition-colors cursor-pointer"
          >
            {expanded ? "Show less" : `Show ${items.length - 8} more signals`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main StrategyView ──────────────────────────────────────────────────────────

export default function StrategyView() {
  const { openPanel } = usePanel();

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Strategy</h2>
          <p className="text-xs text-[#8E8E93] mt-1">
            Tech scouting · Market intelligence · SE OS product moved to <span className="text-[#F5A623]">SE OS</span> tab
          </p>
        </div>
      </div>

      {/* ── Tech Intelligence — full width, compact grid ── */}
      <TechIntelFeed onItemClick={(id) => openPanel("news", id)} />

    </div>
  );
}
