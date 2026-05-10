"use client";

import { useEffect, useState } from "react";
import type { AriaAgent } from "@/lib/supabase/types";

const RANKS = [
  { name: "Dormant",  min: 0,    color: "#6B7280" },
  { name: "Awakened", min: 25,   color: "#3B82F6" },
  { name: "Learning", min: 150,  color: "#10B981" },
  { name: "Adaptive", min: 400,  color: "#22C55E" },
  { name: "Expert",   min: 1000, color: "#F5A623" },
  { name: "Elite",    min: 3000, color: "#F97316" },
  { name: "Apex",     min: 8000, color: "#A855F7" },
];

function getRank(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].min) return { rank: RANKS[i], index: i };
  }
  return { rank: RANKS[0], index: 0 };
}

function getProgress(xp: number): number {
  const { rank, index } = getRank(xp);
  if (index === RANKS.length - 1) return 100;
  const next = RANKS[index + 1];
  const span = next.min - rank.min;
  return Math.round(((xp - rank.min) / span) * 100);
}

interface ARIAWidgetProps {
  onViewChange: (view: string) => void;
}

export default function ARIAWidget({ onViewChange }: ARIAWidgetProps) {
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

  const totalXp   = agents.reduce((s, a) => s + a.xp, 0);
  const osLevel   = Math.floor(totalXp / 200);
  const top3      = agents.slice(0, 3);

  return (
    <div
      className="bg-dark-2 border border-dark-4 rounded-xl p-4 hover:border-dark-5 transition-colors cursor-pointer"
      onClick={() => onViewChange("aria")}
      role="button"
      aria-label="Open ARIA agent ranking"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* ARIA spark icon */}
          <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#F5A623" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-white">ARIA</span>
            <span className="text-[10px] text-grey ml-1.5">Agent Ranking</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-grey uppercase tracking-widest">OS Level</div>
          <div className="text-xl font-bold text-gold leading-tight">
            {loading ? "—" : osLevel}
          </div>
        </div>
      </div>

      {/* Top 3 agents */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 bg-dark-4 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {top3.map((agent) => {
            const { rank } = getRank(agent.xp);
            const prog = getProgress(agent.xp);
            return (
              <div key={agent.id} className="flex items-center gap-2">
                <span className="text-[10px] text-grey w-14 truncate">{agent.name}</span>
                <div className="flex-1 h-[3px] bg-dark-4 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${prog}%`, backgroundColor: rank.color }}
                  />
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wide w-14 text-right"
                  style={{ color: rank.color }}
                >
                  {rank.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-dark-4 flex items-center justify-between">
        <span className="text-[10px] text-grey">{agents.length} agents active</span>
        <span className="text-[10px] text-gold">View all →</span>
      </div>
    </div>
  );
}
