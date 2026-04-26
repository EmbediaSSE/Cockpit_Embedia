"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionType = "decide" | "approve" | "review" | "delegate" | "follow_up";
type ActionStatus = "pending" | "approved" | "rejected" | "deferred";

interface CeoAction {
  id: string;
  code: string;
  text: string;
  owner: string | null;
  deadline: string | null;
  status: ActionStatus;
  note: string | null;       // repurposed: stores ActionType
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectBacklog {
  id: string;
  code: string;
  name: string;
  open: number;
  inProgress: number;
  overdue: number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const ACTION_TYPES: { id: ActionType; label: string; color: string; bg: string }[] = [
  { id: "decide",     label: "Decide",     color: "#E74C3C", bg: "rgba(231,76,60,0.12)"   },
  { id: "approve",    label: "Approve",    color: "#F5A623", bg: "rgba(245,166,35,0.12)"  },
  { id: "review",     label: "Review",     color: "#3498DB", bg: "rgba(52,152,219,0.12)"  },
  { id: "delegate",   label: "Delegate",   color: "#8E44AD", bg: "rgba(142,68,173,0.12)"  },
  { id: "follow_up",  label: "Follow-up",  color: "#27AE60", bg: "rgba(39,174,96,0.12)"   },
];

function getActionType(action: CeoAction): ActionType {
  return (action.note as ActionType) || "decide";
}

function typeMeta(t: ActionType) {
  return ACTION_TYPES.find((a) => a.id === t) ?? ACTION_TYPES[0];
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / 86_400_000);
}

function formatDeadline(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ActionType }) {
  const m = typeMeta(type);
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function DeadlineChip({ deadline }: { deadline: string | null }) {
  const days = daysUntil(deadline);
  if (days === null) return <span className="text-[10px] text-grey">—</span>;
  const color = days < 0 ? "#E74C3C" : days <= 3 ? "#F39C12" : "#8E8E93";
  return (
    <span className="text-[10px] font-semibold" style={{ color }}>
      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Today" : `${days}d`}
      <span className="font-normal text-grey ml-1">({formatDeadline(deadline)})</span>
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CeoBacklog() {
  const [actions, setActions]           = useState<CeoAction[]>([]);
  const [projects, setProjects]         = useState<ProjectBacklog[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showDone, setShowDone]         = useState(false);
  const [addOpen, setAddOpen]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [ceoExpanded, setCeoExpanded]   = useState(true);
  const [wbsExpanded, setWbsExpanded]   = useState(true);
  const [actingOn, setActingOn]         = useState<string | null>(null);

  const [form, setForm] = useState({
    text: "", type: "decide" as ActionType,
    deadline: "", project_id: "",
  });

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    const [decisionsRes, projectsRes, tasksRes] = await Promise.all([
      supabase
        .from("decisions")
        .select("*")
        .in("status", ["pending", "deferred"])
        .order("deadline", { ascending: true, nullsFirst: false }),
      supabase
        .from("projects")
        .select("id, code, name, status")
        .in("status", ["active", "pending"])
        .order("priority", { ascending: true }),
      supabase
        .from("wbs_tasks")
        .select("id, stage_id, status, due_date, project_id:stage_id"),
    ]);

    setActions((decisionsRes.data ?? []) as CeoAction[]);

    // Build per-project backlog summary
    const projectList = (projectsRes.data ?? []) as { id: string; code: string; name: string; status: string }[];

    // Get open tasks per project via wbs_stages join
    const stagesRes = await supabase
      .from("wbs_stages")
      .select("id, project_id, tasks:wbs_tasks(id, status, due_date)");

    const stageMap: Record<string, { id: string; project_id: string; tasks: { id: string; status: string; due_date: string | null }[] }[]> = {};
    for (const stage of (stagesRes.data ?? []) as { id: string; project_id: string; tasks: { id: string; status: string; due_date: string | null }[] }[]) {
      if (!stageMap[stage.project_id]) stageMap[stage.project_id] = [];
      stageMap[stage.project_id].push(stage);
    }

    const backlog: ProjectBacklog[] = projectList.map((p) => {
      const stages = stageMap[p.id] ?? [];
      const allTasks = stages.flatMap((s) => s.tasks ?? []);
      const open       = allTasks.filter((t) => t.status !== "done").length;
      const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
      const overdue    = allTasks.filter(
        (t) => t.status !== "done" && t.due_date && t.due_date < today
      ).length;
      return { id: p.id, code: p.code, name: p.name, open, inProgress, overdue };
    }).filter((p) => p.open > 0 || p.overdue > 0);

    setProjects(backlog);
    setLoading(false);
  }

  // ── Add action ─────────────────────────────────────────────────────────────
  const addAction = useCallback(async () => {
    if (!form.text.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const existing = await supabase.from("decisions").select("code").order("created_at", { ascending: false }).limit(1);
    const lastCode = (existing.data?.[0]?.code as string) ?? "CEO-000";
    const nextNum  = parseInt(lastCode.replace(/\D/g, "") || "0", 10) + 1;
    const code     = `CEO-${String(nextNum).padStart(3, "0")}`;

    const { data, error } = await supabase.from("decisions").insert({
      code,
      text:       form.text.trim(),
      owner:      "CEO",
      deadline:   form.deadline || null,
      status:     "pending",
      note:       form.type,            // ActionType stored in note field
      project_id: form.project_id || null,
    }).select().single();

    if (!error && data) {
      setActions((prev) => [data as CeoAction, ...prev]);
      setForm({ text: "", type: "decide", deadline: "", project_id: "" });
      setAddOpen(false);
    }
    setSaving(false);
  }, [form]);

  // ── Mark done / defer ─────────────────────────────────────────────────────
  async function markStatus(id: string, status: ActionStatus) {
    setActingOn(id);
    const supabase = createClient();
    await supabase.from("decisions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    setActingOn(null);
  }

  // ── Filtered view ─────────────────────────────────────────────────────────
  const pending  = actions.filter((a) => a.status === "pending");
  const deferred = actions.filter((a) => a.status === "deferred");
  const done     = actions.filter((a) => ["approved", "rejected"].includes(a.status));
  const visible  = [...pending, ...deferred, ...(showDone ? done : [])];

  const overdueCount = pending.filter((a) => {
    const d = daysUntil(a.deadline);
    return d !== null && d < 0;
  }).length;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="bg-dark-2 rounded-xl border border-dark-4 h-16 animate-pulse" />
        <div className="bg-dark-2 rounded-xl border border-dark-4 h-16 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── CEO Personal Backlog ────────────────────────────────── */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: "#F5A623" }}>

        {/* Header */}
        <button
          onClick={() => setCeoExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-dark-3 transition-colors cursor-pointer"
          style={{ background: "rgba(245,166,35,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gold">CEO Actions</span>
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red/10 text-red border border-red/30">
                ⚠ {overdueCount} overdue
              </span>
            )}
            <span className="text-[10px] text-grey">{pending.length} pending · {deferred.length} deferred</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); setAddOpen((v) => !v); }}
              className="flex items-center gap-1 text-[10px] font-bold text-grey hover:text-gold transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
            <span className="text-dark-5 text-sm">{ceoExpanded ? "▲" : "▼"}</span>
          </div>
        </button>

        {ceoExpanded && (
          <>
            {/* Column headers */}
            <div
              className="grid px-5 py-2 text-[9px] font-bold uppercase tracking-[1.2px] text-gold border-b border-t border-dark-4"
              style={{ gridTemplateColumns: "80px 1fr 100px 120px 130px" }}
            >
              <div>Code</div>
              <div>Action</div>
              <div>Type</div>
              <div>Deadline</div>
              <div className="text-right">Status</div>
            </div>

            {/* Rows */}
            {visible.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-grey">
                No pending CEO actions. Add one above.
              </div>
            ) : (
              visible.map((action) => {
                const type = getActionType(action);
                const meta = typeMeta(type);
                const isDone = ["approved", "rejected"].includes(action.status);
                const days = daysUntil(action.deadline);
                const isOverdue = days !== null && days < 0 && !isDone;

                return (
                  <div
                    key={action.id}
                    className={`grid items-center px-5 py-3 border-b border-dark-4 last:border-0 transition-colors ${
                      isDone ? "opacity-40" : isOverdue ? "bg-red/[0.03]" : "hover:bg-dark-3"
                    }`}
                    style={{ gridTemplateColumns: "80px 1fr 100px 120px 130px" }}
                  >
                    {/* Code */}
                    <div className="font-mono text-[10px] font-bold text-gold">{action.code}</div>

                    {/* Text + project link */}
                    <div>
                      <div className="text-[13px] font-medium text-white leading-snug">{action.text}</div>
                      {action.status === "deferred" && (
                        <span className="text-[9px] text-grey italic">deferred</span>
                      )}
                    </div>

                    {/* Type */}
                    <div><TypeBadge type={type} /></div>

                    {/* Deadline */}
                    <div><DeadlineChip deadline={action.deadline} /></div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      {!isDone && (
                        <>
                          <button
                            onClick={() => markStatus(action.id, "approved")}
                            disabled={actingOn === action.id}
                            title="Mark done"
                            className="px-2 py-1 rounded text-[9px] font-bold border border-green/40 text-green hover:bg-green/10 transition-all cursor-pointer disabled:opacity-50"
                          >
                            ✓ Done
                          </button>
                          <button
                            onClick={() => markStatus(action.id, "deferred")}
                            disabled={actingOn === action.id}
                            title="Defer"
                            className="px-2 py-1 rounded text-[9px] font-bold border border-dark-5 text-grey hover:border-grey hover:text-white transition-all cursor-pointer disabled:opacity-50"
                          >
                            ↷
                          </button>
                        </>
                      )}
                      {isDone && (
                        <button
                          onClick={() => markStatus(action.id, "pending")}
                          className="px-2 py-1 rounded text-[9px] border border-dark-5 text-grey hover:text-white transition-all cursor-pointer"
                        >
                          ↩
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Add form */}
            {addOpen && (
              <div className="px-5 py-4 border-t border-dark-4 bg-dark-3 space-y-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-gold mb-1">New CEO Action</div>
                <div className="flex gap-2">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as ActionType })}
                    className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white w-36 flex-shrink-0"
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addAction()}
                    placeholder="What needs to be done? *"
                    className="flex-1 bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                    autoFocus
                  />
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white w-36 flex-shrink-0"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setAddOpen(false)}
                    className="px-3 py-1.5 text-xs text-grey hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addAction}
                    disabled={saving || !form.text.trim()}
                    className="px-4 py-1.5 bg-gold text-dark text-xs font-bold rounded hover:bg-gold/90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {saving ? "Adding…" : "Add Action"}
                  </button>
                </div>
              </div>
            )}

            {/* Show done toggle */}
            {done.length > 0 && (
              <button
                onClick={() => setShowDone((v) => !v)}
                className="w-full px-5 py-2 text-left text-[10px] text-grey hover:text-white transition-colors border-t border-dark-4 cursor-pointer"
                style={{ background: "rgba(245,166,35,0.02)" }}
              >
                {showDone ? "▲ Hide" : "▼ Show"} {done.length} completed action{done.length !== 1 ? "s" : ""}
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Agent & Project Backlog ─────────────────────────────── */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: "#3498DB" }}>

        <button
          onClick={() => setWbsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-dark-3 transition-colors cursor-pointer"
          style={{ background: "rgba(52,152,219,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: "#3498DB" }}>Agent &amp; Project Backlog</span>
            <span className="text-[10px] text-grey">
              {projects.reduce((s, p) => s + p.open, 0)} open tasks across {projects.length} project{projects.length !== 1 ? "s" : ""}
            </span>
            {projects.some((p) => p.overdue > 0) && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red/10 text-red border border-red/30">
                ⚠ overdue
              </span>
            )}
          </div>
          <span className="text-dark-5 text-sm">{wbsExpanded ? "▲" : "▼"}</span>
        </button>

        {wbsExpanded && (
          <>
            {projects.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-grey">
                No open WBS tasks found.
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div
                  className="grid px-5 py-2 text-[9px] font-bold uppercase tracking-[1.2px] border-b border-t border-dark-4"
                  style={{ gridTemplateColumns: "110px 1fr 80px 80px 90px", color: "#3498DB" }}
                >
                  <div>Project</div>
                  <div>Name</div>
                  <div className="text-center">Open</div>
                  <div className="text-center">In Progress</div>
                  <div className="text-center">Overdue</div>
                </div>

                {projects.map((p) => (
                  <div
                    key={p.id}
                    className={`grid items-center px-5 py-3 border-b border-dark-4 last:border-0 hover:bg-dark-3 transition-colors ${
                      p.overdue > 0 ? "bg-red/[0.02]" : ""
                    }`}
                    style={{ gridTemplateColumns: "110px 1fr 80px 80px 90px" }}
                  >
                    <div className="font-mono text-[10px] font-bold" style={{ color: "#3498DB" }}>{p.code}</div>
                    <div className="text-[13px] font-medium text-white truncate">{p.name}</div>
                    <div className="text-center">
                      <span className="text-sm font-bold text-white">{p.open}</span>
                    </div>
                    <div className="text-center">
                      {p.inProgress > 0 ? (
                        <span className="text-sm font-bold text-amber">{p.inProgress}</span>
                      ) : (
                        <span className="text-sm text-dark-5">—</span>
                      )}
                    </div>
                    <div className="text-center">
                      {p.overdue > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red/10 text-red">
                          ⚠ {p.overdue}
                        </span>
                      ) : (
                        <span className="text-[10px] text-green">✓ on track</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}
