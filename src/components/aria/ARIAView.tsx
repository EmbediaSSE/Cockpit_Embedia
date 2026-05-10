"use client";

import { useEffect, useState } from "react";
import type { AriaAgent } from "@/lib/supabase/types";

// ── Rank system ──────────────────────────────────────────────────────────────

interface Rank {
  name:      string;
  min:       number;
  max:       number;
  color:     string; // bar + badge accent
  bgClass:   string; // tailwind bg for icon bg
  textClass: string; // tailwind text for badge text
}

const RANKS: Rank[] = [
  { name: "Dormant",  min: 0,    max: 24,         color: "#6B7280", bgClass: "bg-dark-4",       textClass: "text-dark-5"  },
  { name: "Awakened", min: 25,   max: 149,         color: "#3B82F6", bgClass: "bg-blue-900/40",  textClass: "text-blue-400" },
  { name: "Learning", min: 150,  max: 399,         color: "#10B981", bgClass: "bg-emerald-900/40", textClass: "text-emerald-400" },
  { name: "Adaptive", min: 400,  max: 999,         color: "#22C55E", bgClass: "bg-green-900/40", textClass: "text-green-400" },
  { name: "Expert",   min: 1000, max: 2999,        color: "#F5A623", bgClass: "bg-gold/10",      textClass: "text-gold"    },
  { name: "Elite",    min: 3000, max: 7999,        color: "#F97316", bgClass: "bg-orange-900/40", textClass: "text-orange-400" },
  { name: "Apex",     min: 8000, max: Infinity,    color: "#A855F7", bgClass: "bg-purple-900/40", textClass: "text-purple-400" },
];

function getRank(xp: number): { rank: Rank; index: number } {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return { rank: RANKS[i], index: i };
  }
  return { rank: RANKS[0], index: 0 };
}

function getProgress(xp: number): number {
  const { rank, index } = getRank(xp);
  if (index === RANKS.length - 1) return 100;
  const span = RANKS[index + 1].min - rank.min;
  return Math.round(((xp - rank.min) / span) * 100);
}

function getOsLevel(agents: AriaAgent[]): number {
  const total = agents.reduce((s, a) => s + a.xp, 0);
  return Math.floor(total / 200);
}

// ── Agent icons (inline SVG paths keyed by slug) ─────────────────────────────

const ICON_PATHS: Record<string, string> = {
  dashboard:    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  palette:      "M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z",
  presentation: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
  "chart-line": "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
  wand:         "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  photo:        "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  "file-text":  "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  plug:         "M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z",
  file:         "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  table:        "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-3.375c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v3.375m0-3.375h4.5m-4.5 0v3.375m0-3.375v-9.75c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v9.75m4.5 0h4.5m-4.5 0v-3.375m0 3.375h4.5m-4.5 0v-3.375m4.5 3.375v-3.375m-4.5-3.375h4.5m-4.5 0v-3.375m4.5 3.375V9.75m0 0c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125v3.375m0 0v3.375",
  layout:       "M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z",
  message:      "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z",
};

function AgentIcon({ icon, color }: { icon: string; color: string }) {
  const path = ICON_PATHS[icon] ?? ICON_PATHS["file"];
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke={color} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

// ── Agent card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AriaAgent }) {
  const { rank, index } = getRank(agent.xp);
  const progress = getProgress(agent.xp);
  const next = index < RANKS.length - 1 ? RANKS[index + 1] : null;
  const gap = next ? `${(next.min - agent.xp).toLocaleString()} XP to ${next.name}` : "Max rank";

  return (
    <div className="bg-dark-2 border border-dark-4 rounded-xl p-4 hover:border-dark-5 transition-colors">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-lg ${rank.bgClass} flex items-center justify-center mb-3`}>
        <AgentIcon icon={agent.icon} color={rank.color} />
      </div>

      {/* Name + rank badge */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-white">{agent.name}</span>
        <span
          className={`text-[9px] font-bold uppercase tracking-[1.5px] px-2 py-0.5 rounded-full ${rank.bgClass} ${rank.textClass}`}
        >
          {rank.name}
        </span>
      </div>

      {/* XP bar */}
      <div className="h-[3px] bg-dark-4 rounded-full mb-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: rank.color }}
        />
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-grey">{agent.xp.toLocaleString()} XP</span>
        <span className="text-[10px] text-dark-5">{gap}</span>
      </div>

      {/* Task count */}
      <div className="mt-2 pt-2 border-t border-dark-4">
        <span className="text-[10px] text-grey">{agent.tasks_count} tasks completed</span>
      </div>
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function ARIAView() {
  const [agents, setAgents] = useState<AriaAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/aria")
      .then((r) => r.json())
      .then((data) => {
        setAgents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalXp = agents.reduce((s, a) => s + a.xp, 0);
  const osLevel = getOsLevel(agents);
  const activeCount = agents.filter((a) => a.xp >= 25).length;
  const topAgent = agents[0];
  const { rank: topRank } = topAgent ? getRank(topAgent.xp) : { rank: RANKS[0] };
  const tasksTotal = agents.reduce((s, a) => s + a.tasks_count, 0);

  return (
    <div className="pb-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-[10px] font-bold tracking-[2px] text-grey uppercase mb-1">
            Embedia Internal OS
          </div>
          <h1 className="text-2xl font-bold text-white">ARIA</h1>
          <p className="text-sm text-grey mt-0.5">Adaptive Reasoning Intelligence Architecture</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-grey uppercase tracking-widest mb-1">OS Level</div>
          <div className="text-4xl font-bold text-gold">{osLevel}</div>
          <div className="text-[10px] text-grey mt-0.5">{totalXp.toLocaleString()} total XP</div>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Agents", value: String(activeCount) },
          { label: "Top Agent",     value: topAgent?.name ?? "—" },
          { label: "Tasks Total",   value: String(tasksTotal) },
          { label: "Top Rank",      value: topAgent ? topRank.name : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-dark-2 rounded-[10px] border border-dark-4 px-4 py-3">
            <div className="text-[10px] text-grey uppercase tracking-wider mb-1">{label}</div>
            <div className="text-lg font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Rank legend ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 px-1">
        {RANKS.map((r) => (
          <div key={r.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
            <span className="text-[10px] text-grey">{r.name}</span>
          </div>
        ))}
      </div>

      {/* ── Section label ──────────────────────────────────────── */}
      <div className="text-[9px] font-bold uppercase tracking-[2px] text-dark-5 mb-3">
        Agent Roster
      </div>

      {/* ── Agent grid ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-dark-2 rounded-xl border border-dark-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-grey text-sm">No agents found</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
