"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";

interface SprintTask {
  id: string;
  task_code: string;
  name: string;
  status: string;
  due_date: string | null;
  effort_days: number;
  assignee: string | null;
  epic: string | null;
  sprint_name: string | null;
  stage?: { name: string; project?: { code: string; name: string } };
}

const COLUMNS = [
  { id: "todo",        label: "To Do",       color: "border-dark-5",       dropBg: "bg-dark-3/30" },
  { id: "in_progress", label: "In Progress", color: "border-blue-400",     dropBg: "bg-blue-500/5"  },
  { id: "blocked",     label: "Blocked",     color: "border-status-red",   dropBg: "bg-red-500/5"   },
  { id: "done",        label: "Done",        color: "border-status-green", dropBg: "bg-green-500/5" },
] as const;

type ColumnId = typeof COLUMNS[number]["id"];

const EPIC_COLORS: Record<string, string> = {
  "Sprint 1 - MBSE Core": "bg-blue-500/15 text-blue-400",
  Platform: "bg-blue-500/15 text-blue-400",
  RAG:      "bg-purple-500/15 text-purple-400",
  Core:     "bg-gold/15 text-gold",
  Eval:     "bg-green-500/15 text-green-400",
  Testing:  "bg-dark-4 text-dark-5",
  Infra:    "bg-cyan-500/15 text-cyan-400",
  DevEx:    "bg-orange-500/15 text-orange-400",
  Ops:      "bg-grey/15 text-grey",
};

function epicLabel(epic: string) {
  // Shorten "Sprint 1 - MBSE Core" → "MBSE Core"
  return epic.replace(/^Sprint \d+ - /, "");
}

function isOverdue(date: string | null, status: string) {
  if (!date || status === "done") return false;
  return new Date(date) < new Date();
}

function TaskCard({
  task,
  onClick,
  onDragStart,
}: {
  task: SprintTask;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}) {
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className="bg-dark-2 border border-dark-4 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-dark-5 transition-all select-none"
    >
      {/* Epic + code */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[9px] font-mono text-dark-5">{task.task_code}</span>
        {task.epic && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${EPIC_COLORS[task.epic] || "bg-dark-4 text-dark-5"}`}>
            {epicLabel(task.epic)}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="text-xs font-medium text-white leading-snug mb-2">{task.name}</div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.effort_days > 0 && (
            <span className="text-[10px] text-dark-5">{task.effort_days}d</span>
          )}
          {task.stage?.project && (
            <span className="text-[9px] text-dark-5">{task.stage.project.code}</span>
          )}
        </div>
        {task.due_date && (
          <span className={`text-[10px] ${overdue ? "text-red-400 font-bold" : "text-dark-5"}`}>
            {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            {overdue && " ⚠"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SprintBoardView() {
  const { openPanel } = usePanel();
  const [tasks, setTasks] = useState<SprintTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEpic, setFilterEpic] = useState<string>("all");
  const [filterSprint, setFilterSprint] = useState<string>("Sprint 1");
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("wbs_tasks")
        .select(`
          id, task_code, name, status, due_date, effort_days, assignee, epic, sprint_name,
          wbs_stages (name, projects (code, name))
        `)
        .order("task_code", { ascending: true });

      setTasks((data || []).map((t: Record<string, unknown>) => ({
        ...t,
        stage: (t.wbs_stages as { name: string; projects: { code: string; name: string } } | null) || undefined,
      })) as SprintTask[]);
      setLoading(false);
    }
    load();
  }, []);

  // ── Drag-and-drop handlers ────────────────────────────────────

  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragId.current = taskId;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  }

  function handleDragLeave() {
    setDragOverCol(null);
  }

  async function handleDrop(e: React.DragEvent, colId: string) {
    e.preventDefault();
    setDragOverCol(null);
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;

    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === colId) return;

    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: colId } : t)));

    // Persist to Supabase
    const supabase = createClient();
    const { error } = await supabase
      .from("wbs_tasks")
      .update({ status: colId })
      .eq("id", id);

    if (error) {
      // Revert
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: task.status } : t)));
    }
  }

  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading sprint board…</div>;
  }

  const sprints = Array.from(new Set(tasks.map((t) => t.sprint_name).filter(Boolean))).sort() as string[];
  const epics   = Array.from(new Set(tasks.map((t) => t.epic).filter(Boolean))).sort() as string[];

  const filtered = tasks.filter(
    (t) =>
      (filterSprint === "all" || t.sprint_name === filterSprint) &&
      (filterEpic   === "all" || t.epic === filterEpic)
  );

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: filtered.filter((t) => t.status === col.id),
  }));

  const inProgressCount = filtered.filter((t) => t.status === "in_progress").length;
  const overdueCount    = filtered.filter((t) => isOverdue(t.due_date, t.status)).length;
  const doneCount       = filtered.filter((t) => t.status === "done").length;
  const totalCount      = filtered.length;

  return (
    <div>
      {/* Sprint Header */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 px-5 py-4 mb-5 flex items-center gap-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Active Sprint</div>
          <div className="text-lg font-bold text-white">
            {filterSprint === "all" ? "All Sprints" : filterSprint}
          </div>
        </div>
        <div className="h-8 w-px bg-dark-4" />
        {[
          { label: "Tasks",       value: totalCount,      color: "text-white" },
          { label: "In Progress", value: inProgressCount, color: "text-blue-400" },
          { label: "Overdue",     value: overdueCount,    color: overdueCount > 0 ? "text-red-400" : "text-dark-5" },
          { label: "Done",        value: `${doneCount}/${totalCount}`, color: "text-status-green" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-[10px] text-dark-5 uppercase tracking-widest">{s.label}</div>
            <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterSprint}
            onChange={(e) => setFilterSprint(e.target.value)}
            className="bg-dark-3 border border-dark-4 text-grey text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold"
          >
            <option value="all">All Sprints</option>
            {sprints.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterEpic}
            onChange={(e) => setFilterEpic(e.target.value)}
            className="bg-dark-3 border border-dark-4 text-grey text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-gold"
          >
            <option value="all">All Epics</option>
            {epics.map((e) => <option key={e} value={e}>{epicLabel(e)}</option>)}
          </select>
        </div>

        <div className="text-[10px] text-dark-5 italic">Drag cards to change status</div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div
            key={col.id}
            className="flex flex-col"
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className={`bg-dark-2 rounded-t-lg border-t-2 ${col.color} px-3 py-2.5 flex items-center justify-between`}>
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-grey">{col.label}</span>
              <span className="text-[10px] font-bold text-dark-5 bg-dark-4 rounded-full w-5 h-5 flex items-center justify-center">
                {col.tasks.length}
              </span>
            </div>

            {/* Drop zone */}
            <div
              className={`rounded-b-lg border border-dark-4 border-t-0 p-2 space-y-2 min-h-[400px] transition-colors ${
                dragOverCol === col.id ? col.dropBg + " border-dashed" : "bg-dark-2/50"
              }`}
            >
              {col.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => openPanel("task", task.id)}
                  onDragStart={handleDragStart}
                />
              ))}
              {col.tasks.length === 0 && (
                <div className={`text-center py-8 text-dark-5 text-xs ${dragOverCol === col.id ? "opacity-50" : ""}`}>
                  {dragOverCol === col.id ? "Drop here" : "Empty"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
