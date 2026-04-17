"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface CriticalItem {
  id: string;
  type: "task" | "decision";
  label: string;
  sub: string;
  daysOverdue: number | null;
  urgency: "critical" | "high" | "medium";
}

interface CriticalNowProps {
  onItemClick: (type: string, id: string) => void;
}

export default function CriticalNow({ onItemClick }: CriticalNowProps) {
  const [items, setItems] = useState<CriticalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const [tasksRes, decisionsRes] = await Promise.all([
        supabase
          .from("wbs_tasks")
          .select("id, task_code, name, status, due_date, stage_id")
          .neq("status", "done")
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(5),
        supabase
          .from("decisions")
          .select("id, code, text, deadline, status, owner")
          .eq("status", "pending")
          .lt("deadline", today)
          .order("deadline", { ascending: true })
          .limit(5),
      ]);

      const critical: CriticalItem[] = [];
      const now = new Date(today);

      for (const t of (tasksRes.data || [])) {
        const daysOver = t.due_date
          ? Math.ceil((now.getTime() - new Date(t.due_date).getTime()) / 86400000)
          : null;
        critical.push({
          id:          t.id,
          type:        "task",
          label:       `${t.task_code} — ${t.name}`,
          sub:         t.due_date
            ? `Due ${new Date(t.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${daysOver}d overdue`
            : "No due date",
          daysOverdue: daysOver,
          urgency:     daysOver !== null && daysOver > 7 ? "critical" : daysOver !== null && daysOver > 3 ? "high" : "medium",
        });
      }

      for (const d of (decisionsRes.data || [])) {
        const daysOver = d.deadline
          ? Math.ceil((now.getTime() - new Date(d.deadline).getTime()) / 86400000)
          : null;
        critical.push({
          id:          d.id,
          type:        "decision",
          label:       `${d.code}: ${d.text.slice(0, 60)}${d.text.length > 60 ? "…" : ""}`,
          sub:         d.deadline
            ? `Deadline ${new Date(d.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${daysOver}d past · Owner: ${d.owner || "Unassigned"}`
            : `Owner: ${d.owner || "Unassigned"}`,
          daysOverdue: daysOver,
          urgency:     daysOver !== null && daysOver > 5 ? "critical" : "high",
        });
      }

      // Sort by urgency
      critical.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
      setItems(critical);
      setLoading(false);
    }
    load();
  }, []);

  const urgencyStyles: Record<string, string> = {
    critical: "border-l-status-red bg-status-red/5",
    high:     "border-l-status-amber bg-status-amber/5",
    medium:   "border-l-dark-5 bg-dark-3",
  };

  const typeIcon: Record<string, string> = {
    task:     "⏱",
    decision: "⚡",
  };

  if (loading) {
    return (
      <div className="bg-dark-2 rounded-[10px] border border-dark-4 p-4 mb-2">
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-dark-3 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-dark-2 rounded-[10px] border border-dark-4 px-5 py-4 mb-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-status-green/15 flex items-center justify-center text-status-green text-sm">✓</div>
        <div>
          <div className="text-sm font-semibold text-white">All clear</div>
          <div className="text-[10px] text-dark-5">No overdue tasks or pending decisions past deadline</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-2 rounded-[10px] border border-dark-4 overflow-hidden mb-2">
      {items.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          onClick={() => onItemClick(item.type, item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 border-b border-dark-4 last:border-b-0 text-left hover:brightness-110 transition-all ${urgencyStyles[item.urgency]}`}
        >
          <span className="text-sm shrink-0">{typeIcon[item.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{item.label}</div>
            <div className="text-[10px] text-dark-5 mt-0.5">{item.sub}</div>
          </div>
          {item.daysOverdue !== null && item.daysOverdue > 0 && (
            <span className={`text-[10px] font-bold shrink-0 ${item.urgency === "critical" ? "text-status-red" : "text-status-amber"}`}>
              {item.daysOverdue}d
            </span>
          )}
          <span className="text-dark-5 text-xs shrink-0">→</span>
        </button>
      ))}
    </div>
  );
}
