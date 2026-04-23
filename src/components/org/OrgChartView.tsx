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

// Embedia org structure: CEO + AI Agent Team + Human team from Supabase
const AI_AGENTS = [
  { id: "chief-of-staff", name: "Chief of Staff", type: "AI Agent", desc: "Daily briefing, portfolio overview, decision support", status: "active" },
  { id: "bizdev", name: "BizDev Agent", type: "AI Agent", desc: "Pipeline management, outreach, lead qualification", status: "active" },
  { id: "mbse", name: "MBSE Agent", type: "AI Agent", desc: "Model-based systems engineering, SysML, architecture", status: "in_dev" },
  { id: "fusa", name: "FuSa Agent", type: "AI Agent", desc: "ISO 26262, HARA, FMEA, safety case generation", status: "planned" },
  { id: "cybersec", name: "CyberSec Agent", type: "AI Agent", desc: "ISO 21434, UN R155, TARA, threat modelling", status: "planned" },
  { id: "content", name: "Content Agent", type: "AI Agent", desc: "White papers, proposals, technical documentation", status: "active" },
  { id: "whitepaper", name: "White Paper Agent", type: "AI Agent", desc: "Long-form publishing, research synthesis", status: "active" },
];

// Embedia AI OS — Internal Dev Team (hired 2026-04-23)
const DEV_AGENTS = [
  {
    id: "tech-lead",
    name: "Tech Lead",
    emoji: "🏗️",
    desc: "Spec-driven development, architecture decisions, API design, planning",
    skills: ["spec-driven-development", "planning-and-task-breakdown", "api-and-interface-design"],
    upgraded: false,
  },
  {
    id: "frontend-eng",
    name: "Frontend Engineer",
    emoji: "🎨",
    desc: "Production UI — anti-slop enforcement, design commitment protocol, motion & spatial composition",
    skills: ["frontend-ui-engineering", "ui-ux-pro-max", "browser-testing-with-devtools"],
    upgraded: true,
  },
  {
    id: "backend-eng",
    name: "Backend Engineer",
    emoji: "⚙️",
    desc: "APIs, data models, business logic — TDD + security-first",
    skills: ["api-and-interface-design", "test-driven-development", "security-and-hardening"],
    upgraded: false,
  },
  {
    id: "test-eng",
    name: "Test Engineer",
    emoji: "🧪",
    desc: "TDD with Iron Rule enforcement + mutation testing via Stryker",
    skills: ["test-driven-development", "browser-testing-with-devtools", "debugging-and-error-recovery"],
    upgraded: true,
  },
  {
    id: "security-auditor",
    name: "Security Auditor",
    emoji: "🔒",
    desc: "OWASP + CodeQL + Semgrep tooling, differential review, variant analysis, supply chain",
    skills: ["security-and-hardening", "code-review-and-quality"],
    upgraded: true,
  },
  {
    id: "ciso",
    name: "CISO",
    emoji: "🛡️",
    desc: "AI-layer security, prompt injection detection, file audit, instruction integrity",
    skills: ["ciso-security"],
    upgraded: false,
  },
  {
    id: "enterprise-architect",
    name: "Enterprise Architect",
    emoji: "🏛️",
    desc: "TOGAF ADM, capability maps, EA governance, architecture roadmaps",
    skills: ["enterprise-architecture", "documentation-and-adrs"],
    upgraded: false,
  },
  {
    id: "solution-architect",
    name: "Solution Architect",
    emoji: "🔧",
    desc: "HLD, LLD, C4 diagrams, technology selection, NFRs",
    skills: ["solution-architecture", "api-and-interface-design"],
    upgraded: false,
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    emoji: "👁️",
    desc: "Six-axis review with confidence scoring, git history analysis, two-stage spec compliance",
    skills: ["code-review-and-quality", "code-simplification", "security-and-hardening"],
    upgraded: true,
  },
  {
    id: "devops-eng",
    name: "DevOps Engineer",
    emoji: "🚀",
    desc: "CI/CD, canary monitoring, performance baselines, engineering retros, git worktrees",
    skills: ["shipping-and-launch", "ci-cd-and-automation", "git-workflow-and-versioning"],
    upgraded: true,
  },
  {
    id: "tech-writer",
    name: "Tech Writer",
    emoji: "📝",
    desc: "ADRs, README, API docs, changelogs — document the why, not the what",
    skills: ["documentation-and-adrs"],
    upgraded: false,
  },
];

const DEPARTMENTS = [
  {
    name: "Executive",
    color: "gold",
    description: "Strategy, vision, client relationships",
  },
  {
    name: "Consultancy Delivery",
    color: "blue-400",
    description: "Client projects, MBSE, process optimisation",
  },
  {
    name: "Product & Engineering",
    color: "purple-400",
    description: "AI agents, cockpit platform, tooling",
  },
  {
    name: "Business Development",
    color: "green-400",
    description: "Pipeline, partnerships, market expansion",
  },
  {
    name: "Operations & Publishing",
    color: "amber-400",
    description: "Content, brand, internal processes",
  },
];

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

  const activeAgents = AI_AGENTS.filter((a) => a.status === "active").length;
  const upgradedToday = DEV_AGENTS.filter((a) => a.upgraded).length;
  const totalCapacity = team.length + activeAgents + DEV_AGENTS.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Organisation</h2>
          <p className="text-xs text-grey mt-1">
            {team.length} human{team.length !== 1 ? "s" : ""} · {AI_AGENTS.length} ops agents ({activeAgents} active) · {DEV_AGENTS.length} dev agents — {totalCapacity} total capacity
          </p>
          {upgradedToday > 0 && (
            <p className="text-[10px] text-violet-400 mt-0.5">
              ↑ {upgradedToday} dev agents upgraded today (2026-04-23)
            </p>
          )}
        </div>
      </div>

      {/* Org Tree */}
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
        <div className="w-px h-8 bg-dark-4" />

        {/* Department Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">

          {/* Human Team */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-gold" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Team</h3>
            </div>
            {loading ? (
              <div className="text-xs text-dark-5">Loading...</div>
            ) : team.length === 0 ? (
              <div className="text-xs text-dark-5">No team members yet</div>
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
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

          {/* AI Agents — Active */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-400">Active Agents</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "active").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Agents — In Development */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">In Development</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "in_dev").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Agents — Planned */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-dark-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-dark-5">Planned</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "planned").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-dark-4 text-dark-5 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-grey">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Dev Team — Embedia AI OS */}
        <div className="w-full max-w-5xl mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">Embedia AI OS — Dev Team</h3>
            <span className="text-[10px] bg-violet-500/10 border border-violet-500/30 text-violet-400 px-2 py-0.5 rounded-full font-semibold">
              {DEV_AGENTS.length} agents · all active
            </span>
            <span className="text-[10px] bg-gold/10 border border-gold/30 text-gold px-2 py-0.5 rounded-full font-semibold">
              ↑ {upgradedToday} upgraded 2026-04-23
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                      ↑ New
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

        {/* Departments Overview */}
        <div className="w-full max-w-5xl mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-dark-5 mb-4">Functional Areas</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {DEPARTMENTS.map((dept) => (
              <div key={dept.name} className={`bg-dark-2 border border-dark-4 rounded-lg p-4 border-t-2 border-t-${dept.color}`}>
                <div className="text-xs font-bold text-white mb-1">{dept.name}</div>
                <div className="text-[10px] text-dark-5 leading-relaxed">{dept.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
