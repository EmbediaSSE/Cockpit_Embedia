"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";
import type { Milestone } from "@/lib/supabase/types";

interface MilestoneWithProject extends Milestone {
  projects?: { code: string; name: string; category: string } | null;
}

const CATEGORY_COLOR: Record<string, string> = {
  Product:       "bg-blue-500 border-blue-500",
  Consultancy:   "bg-gold border-gold",
  Publishing:    "bg-purple-500 border-purple-500",
  Operations:    "bg-grey border-grey",
  BD:            "bg-green-500 border-green-500",
  ProfDevel:     "bg-dark-5 border-dark-5",
};

const STATUS_FILL: Record<string, string> = {
  done:    "bg-status-green",
  active:  "bg-blue-400 animate-pulse",
  pending: "bg-transparent",
  at_risk: "bg-status-amber",
  overdue: "bg-status-red",
};

const STATUS_RING: Record<string, string> = {
  done:    "border-status-green",
  active:  "border-blue-400",
  pending: "border-dark-5",
  at_risk: "border-status-amber",
  overdue: "border-status-red",
};

function getDaysFromNow(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function MilestoneDot({
  milestone,
  onClick,
}: {
  milestone: MilestoneWithProject;
  onClick: () => void;
}) {
  const days = getDaysFromNow(milestone.target_date);
  const catColor = milestone.projects?.category
    ? CATEGORY_COLOR[milestone.projects.category] || "bg-dark-5 border-dark-5"
    : "bg-dark-5 border-dark-5";

  const isOverdue = days !== null && days < 0 && milestone.status !== "done";
  const ringColor = isOverdue ? "border-status-red" : STATUS_RING[milestone.status] || "border-dark-5";
  const fillColor = isOverdue ? "bg-status-red" : STATUS_FILL[milestone.status] || "bg-dark-5";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      {/* Dot */}
      <div className={`w-5 h-5 rounded-full border-2 ${ringColor} ${fillColor} group-hover:scale-125 transition-transform`} />

      {/* Label */}
      <div className="text-center max-w-[90px]">
        <div className="text-[10px] text-white font-medium leading-tight line-clamp-2 group-hover:text-gold transition-colors">
          {milestone.name}
        </div>
        <div className={`text-[9px] mt-0.5 ${isOverdue ? "text-status-red" : "text-dark-5"}`}>
          {milestone.target_date
            ? new Date(milestone.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "TBD"}
        </div>
        {milestone.projects && (
          <div className="text-[9px] text-dark-5 truncate max-w-[80px] mx-auto">{milestone.projects.code}</div>
        )}
      </div>
    </button>
  );
}

export default function RoadmapView() {
  const { openPanel } = usePanel();
  const [milestones, setMilestones] = useState<MilestoneWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("milestones")
        .select(`*, projects (code, name, category)`)
        .order("target_date", { ascending: true });

      setMilestones((data || []) as MilestoneWithProject[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading roadmap…</div>;
  }

  const today = new Date().toISOString().split("T")[0];
  const endOfMonth  = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0];
  const in90Days    = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

  const lanes = [
    {
      label: "This Month",
      desc: "Next 30 days",
      items: milestones.filter(m => m.target_date && m.target_date <= endOfMonth),
    },
    {
      label: "Next 3 Months",
      desc: "30–90 days",
      items: milestones.filter(m => m.target_date && m.target_date > endOfMonth && m.target_date <= in90Days),
    },
    {
      label: "Beyond",
      desc: "90+ days or undated",
      items: milestones.filter(m => !m.target_date || m.target_date > in90Days),
    },
  ];

  // Legend
  const categories = Array.from(
    new Set(milestones.map(m => m.projects?.category).filter(Boolean))
  ) as string[];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Enterprise Roadmap</h2>
          <p className="text-xs text-grey mt-1">
            {milestones.length} milestones across all projects · click any to drill in
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${(CATEGORY_COLOR[cat] || "bg-dark-5").split(" ")[0]}`} />
              <span className="text-[10px] text-dark-5">{cat}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-status-green" />
            <span className="text-[10px] text-dark-5">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-dark-5" />
            <span className="text-[10px] text-dark-5">Pending</span>
          </div>
        </div>
      </div>

      {/* Swimlanes */}
      <div className="space-y-4">
        {lanes.map((lane) => (
          <div key={lane.label} className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
            {/* Lane header */}
            <div className="px-5 py-3 border-b border-dark-4 flex items-center gap-3">
              <div className="text-sm font-bold text-white">{lane.label}</div>
              <div className="text-xs text-dark-5">{lane.desc}</div>
              <div className="ml-auto text-[10px] text-dark-5">{lane.items.length} milestone{lane.items.length !== 1 ? "s" : ""}</div>
            </div>

            {/* Milestone rail */}
            <div className="px-5 py-6">
              {lane.items.length === 0 ? (
                <div className="text-xs text-dark-5 text-center py-4">No milestones in this period</div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute top-2.5 left-0 right-0 h-px bg-dark-4" />

                  {/* Milestones */}
                  <div className="relative flex gap-8 flex-wrap">
                    {lane.items.map((m) => (
                      <MilestoneDot
                        key={m.id}
                        milestone={m}
                        onClick={() => openPanel("milestone", m.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="mt-4 bg-dark-2 rounded-xl border border-dark-4 p-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5">Milestone Summary</div>
        <div className="flex gap-6 text-sm">
          {[
            { label: "Done",    value: milestones.filter(m => m.status === "done").length,    color: "text-status-green" },
            { label: "Active",  value: milestones.filter(m => m.status === "active").length,  color: "text-blue-400" },
            { label: "Pending", value: milestones.filter(m => m.status === "pending").length, color: "text-grey" },
            { label: "At Risk", value: milestones.filter(m => m.status === "at_risk" || (m.status !== "done" && m.target_date && m.target_date < today)).length, color: "text-status-amber" },
          ].map(s => (
            <span key={s.label} className="text-grey">
              {s.label}: <span className={`font-bold ${s.color}`}>{s.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
