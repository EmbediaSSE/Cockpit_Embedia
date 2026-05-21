"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────

interface WorkPackage {
  code: string;
  name: string;
  effort: string;
  cost: string;
  timeline: string;
  status: "done" | "active" | "planned" | "new";
}

interface Phase {
  id: string;
  label: string;
  period: string;
  objective: string;
  budget: string;
  status: "done" | "active" | "planned";
  wps: WorkPackage[];
  gateDate: string;
  gateCriteria: string[];
}

interface StrategicBet {
  id: string;
  domain: string;
  decision: string;
  rationale: string;
  status: "confirmed" | "active" | "watch" | "draft";
  adr?: string;
  tag?: string;
}

interface Competitor {
  name: string;
  type: string;
  positioning: string;
  gap: string;
  threat: "high" | "medium" | "low";
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

// ── Data ───────────────────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    id: "p1",
    label: "Phase 1",
    period: "Jun – Aug 2026",
    objective: "Core Orchestration + Safety & Cyber Analysis",
    budget: "~€220K",
    status: "active",
    gateDate: "Aug 2026",
    gateCriteria: [
      "Central Brain routes 3 workflows correctly",
      "Validation Agent checks ≥95% ISO 26262:2018 clauses",
      "HARA generation < 4 hours",
      "≥75% first-pass gate pass rate",
    ],
    wps: [
      { code: "WP-001", name: "Central Brain MVP",        effort: "L", cost: "~€80K", timeline: "Jun–Jul",  status: "active"  },
      { code: "WP-009", name: "Validation Agent v1.0",    effort: "M", cost: "~€40K", timeline: "Jun–Jul",  status: "active"  },
      { code: "WP-003", name: "FuSa Agent v1.0",          effort: "M", cost: "~€40K", timeline: "Jul–Aug",  status: "planned" },
      { code: "WP-004", name: "CyberSec Agent v1.0",      effort: "M", cost: "~€40K", timeline: "Jul–Aug",  status: "planned" },
      { code: "WP-010", name: "Documentation Agent v1.0", effort: "S", cost: "~€20K", timeline: "Aug",      status: "planned" },
    ],
  },
  {
    id: "p2",
    label: "Phase 2",
    period: "Sep 2026 – Jan 2027",
    objective: "Platform Completion + KGE + Three-Tier Connectors + Mode B",
    budget: "~€405K",
    status: "planned",
    gateDate: "Jan 2027",
    gateCriteria: [
      "All 12 SE OS components integrated",
      "KGE graph coverage ≥80% of agent outputs",
      "Tier 2 OSLC connector live on ≥1 pilot tool",
      "Tier 3 extraction ≥85% confidence on closed-tool exports",
      "Mode B deployment validated (air-gapped K8s)",
      "3 reference customers complete UAT",
    ],
    wps: [
      { code: "WP-002", name: "WSCI Tier 1 (Codebeamer, Capella, Jira, DOORS)", effort: "M", cost: "~€50K", timeline: "Sep–Oct", status: "planned" },
      { code: "WP-005", name: "SOTIF Agent v1.0",                                effort: "M", cost: "~€40K", timeline: "Sep–Oct", status: "planned" },
      { code: "WP-006", name: "MBSE Agent v1.0",                                 effort: "M", cost: "~€40K", timeline: "Sep–Oct", status: "planned" },
      { code: "WP-007", name: "VibeSE → Central Brain integration",              effort: "S", cost: "~€15K", timeline: "Sep",     status: "planned" },
      { code: "WP-008", name: "RFLP → Central Brain integration",                effort: "S", cost: "~€15K", timeline: "Sep",     status: "planned" },
      { code: "WP-012", name: "Talent Store v1.0",                               effort: "S", cost: "~€20K", timeline: "Oct",     status: "planned" },
      { code: "WP-013", name: "Knowledge Graph Engine v1.0",                     effort: "M", cost: "~€60K", timeline: "Oct–Nov", status: "new"     },
      { code: "WP-014", name: "WSCI Tier 2 — OSLC / ReqIF / STEP AP233",        effort: "M", cost: "~€40K", timeline: "Oct–Nov", status: "new"     },
      { code: "WP-015", name: "WSCI Tier 3 — AI Boundary Extractors (3DX…)",    effort: "M", cost: "~€45K", timeline: "Nov–Dec", status: "new"     },
    ],
  },
  {
    id: "p3",
    label: "Phase 3",
    period: "Feb – Nov 2027",
    objective: "Self-Improvement + KGE AI Reasoning + Market Expansion",
    budget: "~€345K",
    status: "planned",
    gateDate: "Nov 2027",
    gateCriteria: [
      "10+ customers in production",
      "KGE AI Reasoning Layer live (impact analysis, gap detection)",
      "HR Department automated quality monitoring live",
      "Talent Catalogue with 5+ certified domain adapters",
      "$2–5M ARR achieved",
    ],
    wps: [
      { code: "WP-011", name: "HR Department v1.0",                   effort: "M", cost: "~€50K",  timeline: "Feb–Mar", status: "planned" },
      { code: "—",      name: "Performance Ledger infrastructure",    effort: "S", cost: "~€25K",  timeline: "Feb–Mar", status: "planned" },
      { code: "—",      name: "GRPO feedback loop",                   effort: "M", cost: "~€60K",  timeline: "Apr–May", status: "planned" },
      { code: "—",      name: "KGE AI Reasoning Layer",               effort: "M", cost: "~€80K",  timeline: "Apr–Jun", status: "new"     },
      { code: "—",      name: "Talent Catalogue (5 domains)",         effort: "M", cost: "~€80K",  timeline: "Jun–Aug", status: "planned" },
      { code: "—",      name: "Mode C offline deployment",            effort: "S", cost: "~€30K",  timeline: "Jun–Jul", status: "planned" },
      { code: "—",      name: "Professional services (deployments)",  effort: "M", cost: "~€100K", timeline: "ongoing", status: "planned" },
    ],
  },
];

const STRATEGIC_BETS: StrategicBet[] = [
  {
    id: "sb-1",
    domain: "Orchestration",
    decision: "Claude API primary · Llama 3.3-70B fallback",
    rationale: "Engineering-grade reasoning at Claude tier; OSS fallback for air-gapped Mode B/C. DeepSeek deprioritised.",
    status: "confirmed",
    tag: "Model",
  },
  {
    id: "sb-2",
    domain: "Deployment Modes",
    decision: "Mode A (AWS EKS) · Mode B (on-prem RTX 4090) · Mode C (air-gapped Mistral/Llama)",
    rationale: "Three-mode architecture covers cloud, customer VPC, and fully air-gapped. Each mode independently viable.",
    status: "active",
    tag: "Infra",
  },
  {
    id: "sb-3",
    domain: "Customer Lock-in",
    decision: "Per-customer LoRA adapters (ADR-004)",
    rationale: "Domain base model + customer LoRA fine-tuned on engineering corpus. Switching cost: 6–12 months of domain data.",
    status: "active",
    adr: "ADR-004",
    tag: "ML",
  },
  {
    id: "sb-4",
    domain: "Knowledge Graph",
    decision: "Enterprise Knowledge Graph as 13th SE OS component (ADR-006)",
    rationale: "Persistent semantic graph of all artifacts, roles, tools, decisions. Turns SE OS from a pipeline into a platform. Queryable digital thread across all toolchain tiers.",
    status: "active",
    adr: "ADR-006",
    tag: "Arch",
  },
  {
    id: "sb-5",
    domain: "Vendor Neutrality",
    decision: "Three-tier WSCI: Tier 1 (API) · Tier 2 (OSLC/ReqIF/STEP) · Tier 3 (AI boundary extractor)",
    rationale: "Works with any tool at any openness level. Closed tools (3DX, legacy MBSE) covered via AI extraction. No lock-in to any vendor. Core competitive moat vs. platform vendors.",
    status: "active",
    tag: "Arch",
  },
  {
    id: "sb-6",
    domain: "On-Prem Training",
    decision: "RoundPipe + Unsloth on 8×RTX 4090",
    rationale: "RoundPipe (arXiv:2604.27085) enables 32B full fine-tune and 235B LoRA on commodity hardware. Moves Mode B training to customer infrastructure.",
    status: "watch",
    tag: "ML",
  },
  {
    id: "sb-7",
    domain: "GRPO Feedback",
    decision: "GRPO on Llama 3.2 → Mode B air-gapped agents (Phase 3)",
    rationale: "Validated GRPO + Unsloth. Phase 3 applies to customer-hosted adaptation loops.",
    status: "watch",
    tag: "ML",
  },
  {
    id: "sb-8",
    domain: "AI OS Architecture",
    decision: "Tool-agnostic internal AI OS — Four Cs (Context · Connections · Capabilities · Cadence)",
    rationale: "Durable layer is architecture + workflow intelligence, not any specific LLM or tool. ADR-003 LLM adapter layer is the correct answer to vendor risk. [DRAFT]",
    status: "draft",
    tag: "Ops",
  },
];

const COMPETITORS: Competitor[] = [
  {
    name: ":em AG",
    type: "Process Consulting",
    positioning: "MBSE process methodology + toolchain consulting. Building digital thread offerings post-Engineering Process Days 2026.",
    gap: "Services-led (no recurring platform). No AI-native layer. No knowledge graph.",
    threat: "medium",
  },
  {
    name: "Prostep",
    type: "PLM Integration",
    positioning: "Tool connectors and PLM integration (CONNECT suite). Strong Dassault/Siemens adapter coverage.",
    gap: "Connectors only — no AI agents, no knowledge graph, no standards automation.",
    threat: "low",
  },
  {
    name: "Siemens — Teamcenter AI",
    type: "Platform Vendor",
    positioning: "AI layer on top of Teamcenter. Knowledge graph within Teamcenter ecosystem.",
    gap: "Locked to Teamcenter. Customers outside Siemens stack cannot use it. No vendor-neutral play.",
    threat: "high",
  },
  {
    name: "Dassault — 3DX / ENOVIA AI",
    type: "Platform Vendor",
    positioning: "AI-assisted engineering inside 3DEXPERIENCE. Closed ecosystem — no external APIs.",
    gap: "Zero vendor neutrality. Closed tool is our Tier 3 target. No multi-standard compliance automation.",
    threat: "high",
  },
  {
    name: "ANSYS Minerva",
    type: "Simulation Data Mgmt",
    positioning: "Simulation data management + traceability. Some knowledge graph features in roadmap.",
    gap: "Simulation-focused only. No requirements, safety, or cybersecurity analysis coverage.",
    threat: "low",
  },
];

// ── Style maps ─────────────────────────────────────────────────────────────────

const PHASE_STYLE: Record<Phase["status"], { border: string; badge: string; dot: string }> = {
  done:    { border: "border-[#27AE60]/40", badge: "bg-[#27AE60]/15 text-[#27AE60]", dot: "bg-[#27AE60]" },
  active:  { border: "border-[#F5A623]/50", badge: "bg-[#F5A623]/15 text-[#F5A623]", dot: "bg-[#F5A623] animate-pulse" },
  planned: { border: "border-[#2A2A2A]",    badge: "bg-[#2A2A2A] text-[#8E8E93]",   dot: "bg-[#2A2A2A]" },
};

const WP_STYLE: Record<WorkPackage["status"], { badge: string; text: string }> = {
  done:    { badge: "bg-[#27AE60]/15 text-[#27AE60]",  text: "line-through text-[#3A3A3A]" },
  active:  { badge: "bg-[#F5A623]/15 text-[#F5A623]",  text: "text-white" },
  planned: { badge: "bg-[#2A2A2A] text-[#8E8E93]",     text: "text-[#8E8E93]" },
  new:     { badge: "bg-blue-500/15 text-blue-400",     text: "text-white" },
};

const BET_STATUS: Record<StrategicBet["status"], { border: string; badge: string; dot: string; label: string }> = {
  confirmed: { border: "border-l-2 border-l-[#27AE60]",            badge: "bg-[#27AE60]/15 text-[#27AE60]",     dot: "bg-[#27AE60]",  label: "Confirmed" },
  active:    { border: "border-l-2 border-l-[#F5A623]",            badge: "bg-[#F5A623]/15 text-[#F5A623]",     dot: "bg-[#F5A623]",  label: "Active"    },
  watch:     { border: "border-l-2 border-l-[#60A5FA]",            badge: "bg-[#60A5FA]/15 text-[#60A5FA]",     dot: "bg-[#60A5FA]",  label: "Watch"     },
  draft:     { border: "border-l-2 border-l-dashed border-l-[#3A3A3A]", badge: "bg-[#2A2A2A] text-[#8E8E93] border border-dashed border-[#3A3A3A]", dot: "bg-[#3A3A3A]", label: "Draft" },
};

const THREAT_STYLE: Record<Competitor["threat"], { badge: string }> = {
  high:   { badge: "bg-red-500/15 text-red-400" },
  medium: { badge: "bg-[#F5A623]/15 text-[#F5A623]" },
  low:    { badge: "bg-[#2A2A2A] text-[#8E8E93]" },
};

const TAG_STYLE: Record<string, string> = {
  Model: "bg-purple-500/15 text-purple-400",
  Infra: "bg-blue-500/15 text-blue-400",
  ML:    "bg-[#F5A623]/15 text-[#F5A623]",
  Ops:   "bg-green-500/15 text-green-400",
  Arch:  "bg-cyan-500/15 text-cyan-400",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-[#3A3A3A] uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Product Roadmap ────────────────────────────────────────────────────────────

function ProductRoadmap() {
  const [expanded, setExpanded] = useState<string | null>("p1");

  const totalBudget = "~€970K";
  const totalWPs = PHASES.reduce((s, p) => s + p.wps.length, 0);
  const newWPs = PHASES.flatMap(p => p.wps).filter(w => w.status === "new").length;

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">SE OS Product Roadmap</div>
          <div className="text-[10px] text-[#3A3A3A]">18-month delivery plan · TOGAF Phase F · updated 2026-05-21</div>
        </div>
        <div className="flex items-center gap-4">
          <StatPill value={totalBudget} label="total investment" color="text-[#F5A623]" />
          <div className="w-px h-4 bg-[#2A2A2A]" />
          <StatPill value={totalWPs} label="work packages" color="text-white" />
          {newWPs > 0 && (
            <>
              <div className="w-px h-4 bg-[#2A2A2A]" />
              <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">
                {newWPs} new
              </span>
            </>
          )}
        </div>
      </div>

      <div className="divide-y divide-[#2A2A2A]">
        {PHASES.map((phase) => {
          const s = PHASE_STYLE[phase.status];
          const isOpen = expanded === phase.id;
          return (
            <div key={phase.id}>
              {/* Phase header — clickable */}
              <button
                onClick={() => setExpanded(isOpen ? null : phase.id)}
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-[#1E1E1E] transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{phase.label}</span>
                    <span className="text-[10px] text-[#3A3A3A]">{phase.period}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.badge}`}>
                      {phase.status === "active" ? "In Progress" : phase.status === "done" ? "Done" : "Planned"}
                    </span>
                    {phase.wps.some(w => w.status === "new") && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        {phase.wps.filter(w => w.status === "new").length} new WPs
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8E8E93] mt-0.5 truncate">{phase.objective}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] font-bold text-[#F5A623]">{phase.budget}</span>
                  <span className="text-[10px] text-[#3A3A3A]">Gate: {phase.gateDate}</span>
                  <svg
                    className={`w-4 h-4 text-[#3A3A3A] transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-5 pb-4 bg-[#161616]">
                  {/* Work packages */}
                  <div className="mb-3">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3A] mb-2">Work Packages</div>
                    <div className="space-y-1.5">
                      {phase.wps.map((wp) => {
                        const ws = WP_STYLE[wp.status];
                        return (
                          <div key={wp.code + wp.name} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#1E1E1E] transition-colors">
                            <span className="text-[9px] font-mono text-[#3A3A3A] flex-shrink-0 w-10">{wp.code}</span>
                            <span className={`text-[10px] flex-1 ${ws.text}`}>{wp.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${ws.badge}`}>
                              {wp.status === "new" ? "NEW" : wp.status.toUpperCase()}
                            </span>
                            <span className="text-[9px] text-[#3A3A3A] flex-shrink-0 w-16 text-right">{wp.cost}</span>
                            <span className="text-[9px] text-[#3A3A3A] flex-shrink-0 w-16 text-right">{wp.timeline}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gate criteria */}
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3A] mb-2">
                      Go/No-Go Gate — {phase.gateDate}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {phase.gateCriteria.map((c, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-[#F5A623] text-[10px] flex-shrink-0 mt-0.5">›</span>
                          <span className="text-[10px] text-[#8E8E93]">{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Strategic Bets ─────────────────────────────────────────────────────────────

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

  const filtered = filter === "all" ? STRATEGIC_BETS : STRATEGIC_BETS.filter(b => b.status === filter);

  const FILTERS: { id: BetFilter; label: string; color: string }[] = [
    { id: "all",       label: `All (${counts.all})`,             color: "text-white" },
    { id: "confirmed", label: `Confirmed (${counts.confirmed})`, color: "text-[#27AE60]" },
    { id: "active",    label: `Active (${counts.active})`,       color: "text-[#F5A623]" },
    { id: "watch",     label: `Watch (${counts.watch})`,         color: "text-[#60A5FA]" },
    { id: "draft",     label: `Draft (${counts.draft})`,         color: "text-[#8E8E93]" },
  ];

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <div className="text-sm font-bold text-white">Architectural Bets</div>
            <div className="text-[10px] text-[#3A3A3A]">SE OS strategic decisions · source of truth</div>
          </div>
        </div>
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
      <div className="p-4 grid grid-cols-2 gap-3">
        {filtered.map((bet) => {
          const s = BET_STATUS[bet.status];
          return (
            <div
              key={bet.id}
              className={`rounded-lg bg-[#151515] border border-[#2A2A2A] p-3.5 ${s.border} transition-all hover:border-[#3A3A3A]`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3A] flex-1">{bet.domain}</span>
                {bet.tag && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${TAG_STYLE[bet.tag] ?? "bg-[#2A2A2A] text-[#8E8E93]"}`}>
                    {bet.tag}
                  </span>
                )}
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                  {s.label}
                </span>
                {bet.adr && <span className="text-[8px] font-mono text-[#3A3A3A]">{bet.adr}</span>}
              </div>
              <div className="text-xs font-semibold text-white leading-snug mb-1.5">{bet.decision}</div>
              <div className="text-[10px] text-[#8E8E93] leading-relaxed line-clamp-3">{bet.rationale}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Competitive Landscape ──────────────────────────────────────────────────────

function CompetitiveLandscape() {
  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Competitive Landscape</div>
          <div className="text-[10px] text-[#3A3A3A]">Digital thread + toolchain players · updated post :em AG Engineering Process Days 2026</div>
        </div>
        <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400">
          SE OS moat: AI-native · vendor-neutral · continuous
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 gap-2">
        {COMPETITORS.map((c) => {
          const ts = THREAT_STYLE[c.threat];
          return (
            <div
              key={c.name}
              className="flex items-start gap-4 px-3 py-3 rounded-lg bg-[#151515] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors"
            >
              <div className="flex-shrink-0 w-32">
                <div className="text-xs font-bold text-white">{c.name}</div>
                <div className="text-[9px] text-[#3A3A3A] mt-0.5">{c.type}</div>
                <span className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded ${ts.badge}`}>
                  {c.threat.toUpperCase()} threat
                </span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3A] mb-1">Positioning</div>
                  <div className="text-[10px] text-[#8E8E93] leading-relaxed">{c.positioning}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#27AE60] mb-1">SE OS Gap</div>
                  <div className="text-[10px] text-[#8E8E93] leading-relaxed">{c.gap}</div>
                </div>
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
    const overdue = date < new Date();
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
        {!loading && <span className="text-[10px] font-bold text-[#F5A623]">{decisions.length} open</span>}
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
          <div className="px-4 py-8 text-center text-[#3A3A3A] text-xs">No open decisions</div>
        ) : (
          decisions.map((d) => {
            const dl = fmtDeadline(d.deadline);
            return (
              <div key={d.id} className="px-4 py-3 hover:bg-[#1E1E1E] transition-colors">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-[9px] font-mono font-bold text-[#3A3A3A] flex-shrink-0 pt-0.5">{d.code}</span>
                  <span className="text-[10px] text-white font-medium leading-snug flex-1">{d.text}</span>
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

// ── Product Sprint Horizon ─────────────────────────────────────────────────────

interface HorizonItem { phase: string; label: string; status: "done" | "active" | "planned" }

const SE_OS_HORIZON: HorizonItem[] = [
  { phase: "Phase 1",   label: "VibeSE MVP — Cloud Run",             status: "done"    },
  { phase: "Phase 2",   label: "Garrett LoRA adapter (ADR-004)",     status: "done"    },
  { phase: "S11–S21",   label: "FuSa uplift · RFLP v1.1 · E2E eval", status: "done"    },
  { phase: "S22–S24",   label: "RFLP v1.5 · Dashboard · CORS fix",   status: "done"    },
  { phase: "Sprint 25", label: "Dashboard API wiring",                status: "active"  },
  { phase: "Phase 2b",  label: "Central Brain + Validation Agent",    status: "planned" },
  { phase: "Phase 2c",  label: "KGE + WSCI Tier 2/3",                status: "planned" },
  { phase: "Phase 3",   label: "GRPO + KGE AI Reasoning",            status: "planned" },
];

const HORIZON_STYLE: Record<HorizonItem["status"], { dot: string; text: string; bg: string; connector: string }> = {
  done:    { dot: "bg-[#27AE60]",               text: "text-[#27AE60]", bg: "bg-[#27AE60]/10 border-[#27AE60]/30",  connector: "bg-[#27AE60]/40" },
  active:  { dot: "bg-[#F5A623] animate-pulse", text: "text-[#F5A623]", bg: "bg-[#F5A623]/10 border-[#F5A623]/40",  connector: "bg-[#F5A623]/30" },
  planned: { dot: "bg-[#2A2A2A]",               text: "text-[#3A3A3A]", bg: "bg-transparent border-[#2A2A2A]",      connector: "bg-[#2A2A2A]"    },
};

function SprintHorizon() {
  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Sprint Horizon</div>
          <div className="text-[10px] text-[#3A3A3A]">VibeSE sprint cadence · updated 2026-05-21</div>
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
                <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border ${s.bg}`} style={{ minWidth: 148 }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${s.dot}`} />
                  <div>
                    <div className={`text-[9px] font-bold uppercase tracking-wider ${s.text}`}>{item.phase}</div>
                    <div className="text-[10px] text-white leading-snug mt-0.5">{item.label}</div>
                  </div>
                </div>
                {!isLast && <div className={`h-px w-5 flex-shrink-0 ${s.connector}`} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ProductView ───────────────────────────────────────────────────────────

export default function ProductView() {
  const confirmed = STRATEGIC_BETS.filter(b => b.status === "confirmed").length;
  const active    = STRATEGIC_BETS.filter(b => b.status === "active").length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">SE OS Product</h2>
          <p className="text-xs text-[#8E8E93] mt-1">
            Systems Engineering Operating System · 18-month roadmap · vendor-neutral · air-gap ready
          </p>
        </div>
        <div className="flex items-center gap-4 pt-1">
          <StatPill value="Phase 1" label="active"    color="text-[#F5A623]" />
          <div className="w-px h-4 bg-[#2A2A2A]" />
          <StatPill value="Sprint 25" label="current" color="text-white" />
          <div className="w-px h-4 bg-[#2A2A2A]" />
          <StatPill value={confirmed + active} label="bets locked" color="text-[#27AE60]" />
          <div className="w-px h-4 bg-[#2A2A2A]" />
          <StatPill value="~€970K" label="total budget" color="text-[#F5A623]" />
        </div>
      </div>

      {/* Sprint Horizon */}
      <SprintHorizon />

      {/* Roadmap + Open Decisions */}
      <div className="grid grid-cols-3 gap-4 items-start">
        <div className="col-span-2">
          <ProductRoadmap />
        </div>
        <div className="col-span-1" style={{ minHeight: 400 }}>
          <OpenDecisionsPanel />
        </div>
      </div>

      {/* Architectural Bets */}
      <StrategicBetsGrid />

      {/* Competitive Landscape */}
      <CompetitiveLandscape />

    </div>
  );
}
