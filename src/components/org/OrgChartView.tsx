"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

// ── C-Suite Layer (new 2026-05-06) ──────────────────────────────────────────

const C_SUITE = [
  {
    id: "coo",
    name: "COO",
    fullName: "Chief Operating Agent",
    emoji: "🧭",
    desc: "Ops coordination, intake routing, weekly ops review, escalation arbitration",
    hitlGates: "Gates 4, 5, 6",
  },
  {
    id: "cto",
    name: "CTO",
    fullName: "Chief Technology Agent",
    emoji: "⚙️",
    desc: "Tech portfolio, dev team governance, sprint planning, deploy gating",
    hitlGates: "Gate 3",
  },
  {
    id: "cpo",
    name: "CPO",
    fullName: "Chief Product Agent",
    emoji: "🗺️",
    desc: "Product roadmap, feature briefs, GTM readiness, positioning",
    hitlGates: "Gate 5",
  },
  {
    id: "cro",
    name: "CRO",
    fullName: "Chief Revenue Agent",
    emoji: "📈",
    desc: "BD pipeline, investor relations, GTM execution, partnerships",
    hitlGates: "Gates 1, 2",
  },
  {
    id: "ciso",
    name: "CISO",
    fullName: "Chief Security Agent",
    emoji: "🛡️",
    desc: "File audit, prompt injection defence, security review, protocol integrity",
    hitlGates: "Gate 6",
  },
];

// ── Department Agents (operations + new) ────────────────────────────────────

const DEPT_AGENTS = [
  // Operations
  { id: "chief-of-staff", name: "Chief of Staff", dept: "Operations", emoji: "📋", desc: "Daily briefing, portfolio overview, decision support", isNew: false },
  { id: "admin-agent", name: "Admin Agent", dept: "Operations", emoji: "🗂️", desc: "Email triage, calendar, scheduling, file organisation", isNew: false },
  // Advisory & Brand
  { id: "content-agent", name: "Content Agent", dept: "Advisory & Brand", emoji: "✍️", desc: "Decks, SOWs, proposals, framework docs, client deliverables", isNew: false },
  { id: "copywriter-agent", name: "Copywriter Agent", dept: "Advisory & Brand", emoji: "🖊️", desc: "Editorial review, proofreading, brand QA", isNew: false },
  // Intelligence & Publishing
  { id: "white-paper-agent", name: "White Paper Agent", dept: "Intelligence & Publishing", emoji: "📄", desc: "Long-form research publications, chapter workflow", isNew: false },
  { id: "innovation-scout", name: "Innovation Scout", dept: "Intelligence & Publishing", emoji: "🔭", desc: "Industry signals, trends, competitive landscape, weekly digest", isNew: false },
  // Strategy & Network
  { id: "bizdev-agent", name: "BizDev Agent", dept: "Strategy & Network", emoji: "🤝", desc: "Outreach, BD pipeline, partnerships, network engagement", isNew: false },
  // Project
  { id: "project-agent", name: "Project Agent", dept: "Product & Ventures", emoji: "🗃️", desc: "JIRA, sprint, milestone, project status, roadmap tracking", isNew: false },
  // NEW — HR & Talent
  { id: "hr-agent", name: "HR Agent", dept: "HR & Talent", emoji: "🧬", desc: "Agent health scores, performance ledger, 3-tier intervention (Tier 1 auto)", isNew: true },
  // NEW — Finance & Legal
  { id: "finance-agent", name: "Finance Agent", dept: "Finance & Legal", emoji: "💰", desc: "Revenue tracking, cost monitoring, Gate 4 spend analysis, investor financials", isNew: true },
  { id: "legal-agent", name: "Legal Agent", dept: "Finance & Legal", emoji: "⚖️", desc: "Contract review, IP register, licence inventory, GDPR flags", isNew: true },
  // NEW — Investor Relations
  { id: "ir-agent", name: "IR Agent", dept: "Investor Relations", emoji: "🏦", desc: "Investor updates, term sheet analysis, DD packages, fundraising narrative", isNew: true },
  // NEW — Marketing & GTM
  { id: "gtm-agent", name: "GTM Agent", dept: "Marketing & GTM", emoji: "🚀", desc: "Lead gen, LinkedIn calendar, outbound sequences, ICP analysis, campaigns", isNew: true },
];

// ── Dev Team ─────────────────────────────────────────────────────────────────

const DEV_AGENTS = [
  { id: "tech-lead", name: "Tech Lead", emoji: "🏗️", desc: "Spec-driven development, architecture decisions, API design, planning", skills: ["spec-driven-development", "planning-and-task-breakdown", "api-and-interface-design"], upgraded: false },
  { id: "frontend-eng", name: "Frontend Engineer", emoji: "🎨", desc: "Production UI — anti-slop enforcement, design commitment protocol, motion & spatial composition", skills: ["frontend-ui-engineering", "ui-ux-pro-max", "browser-testing-with-devtools"], upgraded: true },
  { id: "backend-eng", name: "Backend Engineer", emoji: "⚙️", desc: "APIs, data models, business logic — TDD + security-first", skills: ["api-and-interface-design", "test-driven-development", "security-and-hardening"], upgraded: false },
  { id: "test-eng", name: "Test Engineer", emoji: "🧪", desc: "TDD with Iron Rule enforcement + mutation testing via Stryker", skills: ["test-driven-development", "browser-testing-with-devtools", "debugging-and-error-recovery"], upgraded: true },
  { id: "security-auditor", name: "Security Auditor", emoji: "🔒", desc: "OWASP + CodeQL + Semgrep tooling, differential review, variant analysis, supply chain", skills: ["security-and-hardening", "code-review-and-quality"], upgraded: true },
  { id: "enterprise-architect", name: "Enterprise Architect", emoji: "🏛️", desc: "TOGAF ADM, capability maps, EA governance, architecture roadmaps", skills: ["enterprise-architecture", "documentation-and-adrs"], upgraded: false },
  { id: "solution-architect", name: "Solution Architect", emoji: "🔧", desc: "HLD, LLD, C4 diagrams, technology selection, NFRs", skills: ["solution-architecture", "api-and-interface-design"], upgraded: false },
  { id: "code-reviewer", name: "Code Reviewer", emoji: "👁️", desc: "Six-axis review with confidence scoring, git history analysis, two-stage spec compliance", skills: ["code-review-and-quality", "code-simplification", "security-and-hardening"], upgraded: true },
  { id: "devops-eng", name: "DevOps Engineer", emoji: "🚀", desc: "CI/CD, canary monitoring, performance baselines, engineering retros, git worktrees", skills: ["shipping-and-launch", "ci-cd-and-automation", "git-workflow-and-versioning"], upgraded: true },
  { id: "tech-writer", name: "Tech Writer", emoji: "📝", desc: "ADRs, README, API docs, changelogs — document the why, not the what", skills: ["documentation-and-adrs"], upgraded: false },
];

// ── Data Department ───────────────────────────────────────────────────────────

const DATA_AGENTS = [
  { id: "data-architect", name: "Data Architect", emoji: "🏛️", desc: "Schema design, data governance, storage tier decisions, ADRs for data", skills: ["data-architecture", "data-governance", "adr-authoring"] },
  { id: "data-engineer", name: "Data Engineer", emoji: "⚙️", desc: "Pipelines, ETL/ELT, Supabase sync, eval runners, Cloud SQL migrations", skills: ["etl-pipelines", "supabase-sync", "cloud-sql"] },
  { id: "analytics-engineer", name: "Analytics Engineer", emoji: "📐", desc: "dbt models, SQL transforms, metric definitions, Cockpit KPI views", skills: ["dbt-modelling", "sql-transforms", "metric-catalogue"] },
  { id: "data-analyst", name: "Data Analyst", emoji: "📊", desc: "KPI analysis, sprint reports, BD pipeline insights, investor data points", skills: ["kpi-analysis", "sprint-reporting", "bd-pipeline"] },
  { id: "data-scientist", name: "Data Scientist", emoji: "🔬", desc: "VibeSE evals, fine-tuning, BLEU/BERTScore, FuSa improvement, GRPO", skills: ["model-evaluation", "fine-tuning", "grpo-feedback"] },
];

// ── Functional Departments ────────────────────────────────────────────────────

const DEPARTMENTS = [
  { name: "Operations", color: "gold", desc: "CoS, Admin — daily ops, scheduling, admin" },
  { name: "Advisory & Brand", color: "blue-400", desc: "Content, Copywriter — client delivery, brand" },
  { name: "Intelligence & Publishing", color: "purple-400", desc: "White Paper, Innovation Scout — research, trends" },
  { name: "Strategy & Network", color: "green-400", desc: "BizDev — pipeline, partnerships, outreach" },
  { name: "Product & Ventures", color: "amber-400", desc: "Project Agent — milestones, sprints, roadmap" },
  { name: "HR & Talent", color: "pink-400", desc: "HR Agent — agent health, 3-tier interventions", isNew: true },
  { name: "Finance & Legal", color: "emerald-400", desc: "Finance + Legal — spend, contracts, IP, GDPR", isNew: true },
  { name: "Investor Relations", color: "sky-400", desc: "IR Agent — updates, DD, term sheets, fundraising", isNew: true },
  { name: "Marketing & GTM", color: "orange-400", desc: "GTM Agent — leads, LinkedIn, campaigns, ICP", isNew: true },
  { name: "Dev Team", color: "violet-400", desc: "10 specialists under CTO — full product dev stack" },
  { name: "Data & Intelligence", color: "cyan-400", desc: "5 data agents — pipelines, analytics, ML evals", isNew: false },
];

// ── HITL Gate colours ────────────────────────────────────────────────────────

const GATE_COLORS: Record<string, string> = {
  "Gates 4, 5, 6": "text-amber-400 bg-amber-500/10 border-amber-500/30",
  "Gate 3": "text-red-400 bg-red-500/10 border-red-500/30",
  "Gate 5": "text-purple-400 bg-purple-500/10 border-purple-500/30",
  "Gates 1, 2": "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "Gate 6": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrgChartView() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: true });
      if (data) setTeam(data);
      setLoading(false);
    }
    load();
  }, []);

  const newAgents = DEPT_AGENTS.filter((a) => a.isNew).length;
  const totalCapacity =
    team.length + C_SUITE.length + DEPT_AGENTS.length + DEV_AGENTS.length + DATA_AGENTS.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Organisation</h2>
          <p className="text-xs text-grey mt-1">
            {team.length} human{team.length !== 1 ? "s" : ""} · {C_SUITE.length} C-level ·{" "}
            {DEPT_AGENTS.length} dept agents · {DEV_AGENTS.length} dev agents · {DATA_AGENTS.length} data agents —{" "}
            {totalCapacity} total capacity
          </p>
          <p className="text-[10px] text-gold mt-0.5">
            ✦ AI OS v2 — C-Suite layer + {newAgents} new department agents onboarded 2026-05-06
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">

        {/* CEO Node */}
        <div className="bg-dark-2 border-2 border-gold rounded-xl px-8 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gold text-dark flex items-center justify-center text-lg font-bold mx-auto mb-2">
            SS
          </div>
          <div className="text-sm font-bold text-white">Safouen Selmi</div>
          <div className="text-[10px] text-gold font-semibold uppercase tracking-wider">Founder & CEO</div>
          <div className="text-[10px] text-dark-5 mt-1">Embedia.io</div>
        </div>

        {/* Connector */}
        <div className="w-px h-6 bg-dark-4" />

        {/* HITL Gates label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-px bg-dark-4" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-dark-5">6 HITL gates — CEO approves only</span>
          <div className="w-16 h-px bg-dark-4" />
        </div>

        {/* Connector */}
        <div className="w-px h-4 bg-dark-4" />

        {/* C-Suite Row */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-gold" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">C-Suite — Autonomous Agents</h3>
            <span className="text-[10px] bg-gold/10 border border-gold/30 text-gold px-2 py-0.5 rounded-full font-semibold">
              {C_SUITE.length} agents · v2 2026-05-06
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {C_SUITE.map((agent) => {
              const gateClass = GATE_COLORS[agent.hitlGates] ?? "text-grey bg-dark-3 border-dark-4";
              return (
                <div
                  key={agent.id}
                  className="bg-dark-2 border-2 border-gold/40 hover:border-gold/80 rounded-xl p-3 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gold/15 text-gold flex items-center justify-center text-base flex-shrink-0">
                      {agent.emoji}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gold leading-tight">{agent.name}</div>
                      <div className="text-[9px] text-dark-5 leading-tight">{agent.fullName}</div>
                    </div>
                  </div>
                  <div className="text-[9px] text-dark-5 leading-relaxed mb-2">{agent.desc}</div>
                  <span className={`text-[8px] border px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${gateClass}`}>
                    {agent.hitlGates}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connector */}
        <div className="w-px h-6 bg-dark-4 mt-4" />

        {/* Department Agents Grid */}
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-400">Department Agents</h3>
            <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full font-semibold">
              {DEPT_AGENTS.length} agents
            </span>
            <span className="text-[10px] bg-gold/10 border border-gold/30 text-gold px-2 py-0.5 rounded-full font-semibold">
              ✦ {newAgents} new 2026-05-06
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {DEPT_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className={`bg-dark-2 rounded-xl p-3 transition-colors ${
                  agent.isNew
                    ? "border-2 border-gold/40 hover:border-gold/70"
                    : "border border-dark-4 hover:border-green-500/30"
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      agent.isNew ? "bg-gold/15 text-gold" : "bg-green-500/15 text-green-400"
                    }`}>
                      {agent.emoji}
                    </div>
                    <div className="text-[11px] font-bold text-white leading-tight">{agent.name}</div>
                  </div>
                  {agent.isNew && (
                    <span className="text-[8px] bg-gold/10 text-gold border border-gold/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 ml-1">
                      New
                    </span>
                  )}
                </div>
                <div className="text-[8px] font-semibold text-dark-5 uppercase tracking-wide mb-1">{agent.dept}</div>
                <div className="text-[9px] text-dark-5 leading-relaxed">{agent.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Human Team */}
        {(loading || team.length > 0) && (
          <div className="w-full max-w-5xl mt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-2 rounded-full bg-white/50" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-grey">Human Team</h3>
            </div>
            {loading ? (
              <div className="text-xs text-dark-5">Loading...</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 bg-dark-2 border border-dark-4 rounded-xl px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold">
                      {(m.full_name || m.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{m.full_name || m.email.split("@")[0]}</div>
                      <div className="text-[9px] text-dark-5">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Dev Team */}
        <div className="w-full max-w-5xl mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">Dev Team — under CTO</h3>
            <span className="text-[10px] bg-violet-500/10 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full font-semibold">
              {DEV_AGENTS.length} agents · all active
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DEV_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className={`bg-dark-2 border rounded-xl p-3 transition-colors ${
                  agent.upgraded
                    ? "border-violet-500/40 hover:border-violet-500/70"
                    : "border-dark-4 hover:border-violet-500/30"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-300 flex items-center justify-center text-sm flex-shrink-0">
                      {agent.emoji}
                    </div>
                    <div className="text-[11px] font-bold text-white leading-tight">{agent.name}</div>
                  </div>
                  {agent.upgraded && (
                    <span className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex-shrink-0 ml-1">
                      ↑
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-dark-5 leading-relaxed mb-2">{agent.desc}</div>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.slice(0, 2).map((skill) => (
                    <span key={skill} className="text-[8px] bg-dark-3 text-grey px-1.5 py-0.5 rounded font-mono">
                      {skill.split("-").slice(0, 2).join("-")}
                    </span>
                  ))}
                  {agent.skills.length > 2 && (
                    <span className="text-[8px] text-dark-5">+{agent.skills.length - 2}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Department */}
        <div className="w-full max-w-5xl mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Data Department</h3>
            <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full font-semibold">
              {DATA_AGENTS.length} agents · onboarded 2026-05-01
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {DATA_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="bg-dark-2 border border-cyan-500/40 hover:border-cyan-400/70 rounded-xl p-3 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-cyan-500/15 text-cyan-300 flex items-center justify-center text-sm flex-shrink-0">
                    {agent.emoji}
                  </div>
                  <div className="text-[11px] font-bold text-white leading-tight">{agent.name}</div>
                </div>
                <div className="text-[9px] text-dark-5 leading-relaxed mb-2">{agent.desc}</div>
                <div className="flex flex-wrap gap-1">
                  {agent.skills.slice(0, 2).map((skill) => (
                    <span key={skill} className="text-[8px] bg-dark-3 text-grey px-1.5 py-0.5 rounded font-mono">
                      {skill.split("-").slice(0, 2).join("-")}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Functional Areas */}
        <div className="w-full max-w-5xl mt-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-dark-5 mb-4">Functional Areas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {DEPARTMENTS.map((dept) => (
              <div
                key={dept.name}
                className={`bg-dark-2 rounded-lg p-3 border-t-2 ${
                  dept.isNew
                    ? "border border-gold/30 border-t-gold"
                    : "border border-dark-4 border-t-dark-5"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="text-xs font-bold text-white">{dept.name}</div>
                  {dept.isNew && (
                    <span className="text-[8px] bg-gold/10 text-gold border border-gold/20 px-1 py-0.5 rounded font-bold uppercase">New</span>
                  )}
                </div>
                <div className="text-[10px] text-dark-5 leading-relaxed">{dept.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* A2A Protocol Footer */}
        <div className="w-full max-w-5xl mt-8 mb-4">
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4 flex flex-wrap gap-6">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">A2A Protocol</div>
              <div className="text-xs text-grey">Typed Talent interfaces — all agents</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Context Bus</div>
              <div className="text-xs text-grey">context/active-state.md — shared live state</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Performance Ledger</div>
              <div className="text-xs text-grey">HR Agent monitors all agents weekly</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">HITL Gates</div>
              <div className="text-xs text-grey">6 types — CEO approval only at gates</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Budget Rule</div>
              <div className="text-xs text-gold font-semibold">Any spend → Gate 4 → CEO approval required</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
