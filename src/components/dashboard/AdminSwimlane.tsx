"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AdminTask, AdminTaskDueStatus } from "@/lib/supabase/types";

// ── Seed data (shown when Supabase has no rows yet) ───────────
const SEED_TASKS: AdminTask[] = [
  {
    id: "seed-1", code: "ADM-001", name: "VAT Report",
    description: "Monthly VAT declaration — compile receipts, verify figures, and submit to tax authority.",
    recurrence: "monthly", next_due: "2026-04-30", last_completed: "2026-03-31",
    priority: "P0", effort_days: 0.5, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 10,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-2", code: "ADM-002", name: "Invoice Sorting & Upload",
    description: "Sort, categorise, and upload supplier and client invoices to the accounting system.",
    recurrence: "monthly", next_due: "2026-04-30", last_completed: "2026-03-31",
    priority: "P0", effort_days: 0.5, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 20,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-3", code: "ADM-005", name: "Payroll & Social Contributions",
    description: "Process payroll and declare social contributions (URSSAF or equivalent).",
    recurrence: "monthly", next_due: "2026-04-30", last_completed: "2026-03-31",
    priority: "P0", effort_days: 0.5, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 30,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-4", code: "ADM-007", name: "Bank Reconciliation",
    description: "Reconcile bank statements with accounting records. Flag and resolve discrepancies.",
    recurrence: "monthly", next_due: "2026-04-30", last_completed: "2026-03-31",
    priority: "P0", effort_days: 0.5, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 40,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-5", code: "ADM-004", name: "Quarterly Financial Review",
    description: "Review P&L, cash flow, and rolling forecast with accountant. Update board summary.",
    recurrence: "quarterly", next_due: "2026-06-30", last_completed: "2026-03-31",
    priority: "P1", effort_days: 2, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 50,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-6", code: "ADM-006", name: "Contract Renewal Review",
    description: "Review all active contracts for upcoming renewal deadlines or termination notices.",
    recurrence: "quarterly", next_due: "2026-06-30", last_completed: "2026-03-31",
    priority: "P1", effort_days: 1, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 60,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-7", code: "ADM-003", name: "Assurance Questionnaire",
    description: "Complete annual professional liability / business assurance questionnaire for insurer.",
    recurrence: "annual", next_due: "2026-06-30", last_completed: "2025-06-30",
    priority: "P1", effort_days: 1, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 70,
    created_at: "", updated_at: "",
  },
  {
    id: "seed-8", code: "ADM-008", name: "Annual Accounts Filing",
    description: "Prepare and file annual statutory accounts with company registry.",
    recurrence: "annual", next_due: "2026-12-31", last_completed: "2025-12-31",
    priority: "P1", effort_days: 2, status_override: null,
    done_at: null, done_by: null, notes: null, sort_order: 80,
    created_at: "", updated_at: "",
  },
];

// ── Helpers ───────────────────────────────────────────────────
function getDueStatus(task: AdminTask, doneSet: Set<string>): AdminTaskDueStatus {
  if (doneSet.has(task.id) || task.status_override === "done") return "done";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.next_due);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0)  return "overdue";
  if (diffDays <= 14) return "due-soon";
  return "upcoming";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const URGENCY_ORDER: Record<AdminTaskDueStatus, number> = {
  overdue: 0, "due-soon": 1, upcoming: 2, done: 3,
};

// ── Sub-components ────────────────────────────────────────────

function RecurrenceBadge({ r }: { r: AdminTask["recurrence"] }) {
  const styles: Record<string, string> = {
    monthly:   "bg-blue/10 text-blue   border border-blue/30",
    quarterly: "bg-purple/10 text-purple border border-purple/30",
    annual:    "bg-gold/10 text-gold   border border-gold/30",
    adhoc:     "bg-dark-4 text-grey    border border-dark-5",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.4px] ${styles[r]}`}>
      ↻ {r}
    </span>
  );
}

function DueChip({ status, date }: { status: AdminTaskDueStatus; date: string }) {
  const styles: Record<AdminTaskDueStatus, string> = {
    overdue:  "bg-red/10 text-red",
    "due-soon": "bg-amber/10 text-amber",
    upcoming:  "bg-green/10 text-green",
    done:      "bg-dark-4 text-grey",
  };
  const labels: Record<AdminTaskDueStatus, string> = {
    overdue:   "⚠ OVERDUE",
    "due-soon": "Due soon",
    upcoming:  "Upcoming",
    done:      "✓ Done",
  };
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
      <span className="text-[10px] text-grey">{formatDate(date)}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

interface AdminSwimlaneProps {
  /** Called when user clicks a task row — can open a detail panel later */
  onTaskClick?: (task: AdminTask) => void;
}

export default function AdminSwimlane({ onTaskClick }: AdminSwimlaneProps) {
  const [tasks, setTasks]         = useState<AdminTask[]>([]);
  const [loading, setLoading]     = useState(true);
  const [doneSet, setDoneSet]     = useState<Set<string>>(new Set());
  const [usingSeed, setUsingSeed] = useState(false);
  const [expanded, setExpanded]   = useState(true);

  // ── Load from Supabase ──
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("admin_tasks")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error || !data || data.length === 0) {
        setTasks(SEED_TASKS);
        setUsingSeed(true);
      } else {
        setTasks(data as AdminTask[]);
        // Pre-populate done set from DB status_override
        const already = new Set<string>(
          (data as AdminTask[])
            .filter((t) => t.status_override === "done")
            .map((t) => t.id)
        );
        setDoneSet(already);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Toggle done (optimistic + persist if real DB) ──
  const toggleDone = useCallback(async (task: AdminTask) => {
    const nowDone = !doneSet.has(task.id);
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(task.id); else next.delete(task.id);
      return next;
    });

    if (!usingSeed) {
      const supabase = createClient();
      await supabase
        .from("admin_tasks")
        .update({
          status_override: nowDone ? "done" : null,
          done_at: nowDone ? new Date().toISOString() : null,
        })
        .eq("id", task.id);
    }
  }, [doneSet, usingSeed]);

  // ── Sorted list ──
  const sorted = [...tasks].sort((a, b) => {
    const sa = URGENCY_ORDER[getDueStatus(a, doneSet)];
    const sb = URGENCY_ORDER[getDueStatus(b, doneSet)];
    return sa !== sb ? sa - sb : a.sort_order - b.sort_order;
  });

  // ── Stats ──
  const actionNeeded = sorted.filter((t) => {
    const s = getDueStatus(t, doneSet);
    return s === "overdue" || s === "due-soon";
  }).length;
  const doneCount = sorted.filter((t) => getDueStatus(t, doneSet) === "done").length;

  if (loading) {
    return (
      <div className="bg-dark-2 rounded-[10px] border border-dark-4 h-20 animate-pulse" />
    );
  }

  return (
    <div className="bg-dark-2 rounded-[10px] border border-dark-4 border-l-4 overflow-hidden"
         style={{ borderLeftColor: "#1ABC9C" }}>

      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-dark-3 transition-colors"
        style={{ background: "rgba(26,188,156,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: "#1ABC9C" }}>
            📋 Admin &amp; Compliance
          </span>
          {actionNeeded > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber/10 text-amber border border-amber/30">
              ⚠ {actionNeeded} action{actionNeeded !== 1 ? "s" : ""} needed
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] text-grey">
          <span>✓ {doneCount}/{tasks.length} done</span>
          <span className="text-dark-5 text-base leading-none">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Column headers */}
      {expanded && (
        <>
          <div className="grid px-5 py-2 text-[9px] font-bold uppercase tracking-[1.2px] text-gold border-b border-dark-4"
               style={{ gridTemplateColumns: "80px 1fr 110px 130px 80px" }}>
            <div>ID</div>
            <div>Task</div>
            <div>Recurrence</div>
            <div>Status / Due</div>
            <div className="text-right">Action</div>
          </div>

          {/* Task rows */}
          {sorted.map((task) => {
            const status = getDueStatus(task, doneSet);
            const isDone = status === "done";
            return (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={[
                  "grid items-center px-5 py-3 border-b border-dark-4 last:border-0 transition-colors",
                  "cursor-pointer hover:bg-dark-3",
                  isDone ? "opacity-50" : "",
                  status === "overdue" ? "bg-red/[0.03]" : "",
                ].join(" ")}
                style={{ gridTemplateColumns: "80px 1fr 110px 130px 80px" }}
              >
                {/* ID */}
                <div className="font-mono text-[10px] font-bold" style={{ color: "#1ABC9C" }}>
                  {task.code}
                </div>

                {/* Name + description */}
                <div>
                  <div className="text-[13px] font-semibold">{task.name}</div>
                  {task.description && (
                    <div className="text-[11px] text-grey mt-0.5 leading-snug line-clamp-1">
                      {task.description}
                    </div>
                  )}
                </div>

                {/* Recurrence */}
                <div>
                  <RecurrenceBadge r={task.recurrence} />
                </div>

                {/* Status + date */}
                <div>
                  <DueChip status={status} date={task.next_due} />
                </div>

                {/* Mark done button */}
                <div className="text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleDone(task)}
                    className={[
                      "px-2.5 py-1 rounded text-[10px] font-bold border transition-all",
                      isDone
                        ? "border-teal/40 text-teal bg-teal/10 hover:bg-dark-4 hover:text-grey"
                        : "border-dark-5 text-grey hover:border-teal hover:text-teal",
                    ].join(" ")}
                    style={isDone ? { borderColor: "#1ABC9C", color: "#1ABC9C", background: "rgba(26,188,156,0.1)" } : {}}
                    title={isDone ? "Undo" : "Mark as done"}
                  >
                    {isDone ? "↩ Undo" : "✓ Done"}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Seed warning */}
          {usingSeed && (
            <div className="px-5 py-2 text-[10px] text-grey border-t border-dark-4"
                 style={{ background: "rgba(26,188,156,0.04)" }}>
              ⚠ Showing seed data — run migration 006_admin_tasks.sql to persist tasks to Supabase.
            </div>
          )}
        </>
      )}
    </div>
  );
}
