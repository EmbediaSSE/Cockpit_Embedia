"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePanel } from "@/contexts/PanelContext";
import AddProjectModal from "./AddProjectModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WbsTask {
  id: string;
  status: string;
  effort_days: number;
  due_date: string | null;
}
interface WbsStage {
  id: string;
  name: string;
  sort_order: number;
  wbs_tasks: WbsTask[];
}
interface Risk {
  id: string;
  level: string;
  status: string;
}
interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  category: string;
  status: string;
  priority: string;
  phase: string | null;
  summary: string | null;
  selling_price: number;
  target_date: string | null;
  wbs_stages: WbsStage[];
  project_risks: Risk[];
}

// ─── Board config ─────────────────────────────────────────────────────────────
interface SwimlaneDef {
  id: string;
  label: string;
  icon: string;
  accent: string;
}

const SWIMLANES: SwimlaneDef[] = [
  { id: "Product",     label: "AI Products",         icon: "🤖", accent: "#8E44AD" },
  { id: "Consultancy", label: "Client Engagements",  icon: "🔧", accent: "#3498DB" },
  { id: "Operations",  label: "Internal / Platform", icon: "⚙️", accent: "#27AE60" },
  { id: "BD",          label: "Business Dev",        icon: "📈", accent: "#F5A623" },
  { id: "Publishing",  label: "Content & IP",        icon: "📝", accent: "#E74C3C" },
];

interface ColumnDef {
  id: string;
  label: string;
  textColor: string;
  dotColor: string;
}

const COLUMNS: ColumnDef[] = [
  { id: "pending",   label: "Planned",   textColor: "#3A3A3A", dotColor: "#3A3A3A" },
  { id: "active",    label: "Active",    textColor: "#3498DB", dotColor: "#3498DB" },
  { id: "on_hold",   label: "On Hold",   textColor: "#F39C12", dotColor: "#F39C12" },
  { id: "completed", label: "Delivered", textColor: "#27AE60", dotColor: "#27AE60" },
  { id: "cancelled", label: "Cancelled", textColor: "#6B6B6B", dotColor: "#6B6B6B" },
];

const PRIORITY_DOT: Record<string, string> = {
  P0: "#E74C3C",
  P1: "#F39C12",
  P2: "#3498DB",
  P3: "#3A3A3A",
};

// Phase badge colours — Consultancy phases get special treatment
const PHASE_ACCENT: Record<string, string> = {
  // Consultancy
  RFQ:          "rgba(52,152,219,0.15)",
  Submitted:    "rgba(243,156,18,0.15)",
  Negotiation:  "rgba(243,156,18,0.20)",
  Won:          "rgba(39,174,96,0.15)",
  Discovery:    "rgba(245,166,35,0.12)",
  Delivery:     "rgba(245,166,35,0.20)",
  Invoiced:     "rgba(39,174,96,0.20)",
  Lost:         "rgba(231,76,60,0.15)",
  // Product
  Concept:      "rgba(142,68,173,0.15)",
  PoC:          "rgba(142,68,173,0.20)",
  Alpha:        "rgba(52,152,219,0.15)",
  Beta:         "rgba(52,152,219,0.20)",
  Live:         "rgba(39,174,96,0.20)",
  Deprecated:   "rgba(58,58,58,0.40)",
  // Generic
  Draft:        "rgba(52,152,219,0.12)",
  Review:       "rgba(243,156,18,0.15)",
  Published:    "rgba(39,174,96,0.20)",
};

const PHASE_TEXT: Record<string, string> = {
  RFQ:         "#3498DB", Submitted:   "#F39C12", Negotiation: "#F39C12",
  Won:         "#27AE60", Discovery:   "#F5A623", Delivery:    "#F5A623",
  Invoiced:    "#27AE60", Lost:        "#E74C3C",
  Concept:     "#8E44AD", PoC:         "#8E44AD", Alpha:       "#3498DB",
  Beta:        "#3498DB", Live:        "#27AE60", Deprecated:  "#3A3A3A",
  Draft:       "#3498DB", Review:      "#F39C12", Published:   "#27AE60",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getProgress(p: Project): { pct: number; done: number; total: number } {
  const tasks = p.wbs_stages.flatMap(s => s.wbs_tasks);
  if (!tasks.length) {
    const pct = p.status === "completed" || p.status === "cancelled" ? 100 : 0;
    return { pct, done: 0, total: 0 };
  }
  const done = tasks.filter(t => t.status === "done").length;
  return { pct: Math.round(done / tasks.length * 100), done, total: tasks.length };
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(d: string, status: string): boolean {
  return status !== "done" && status !== "completed" && status !== "cancelled" && new Date(d) < new Date();
}

// ─── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  project: Project;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { openPanel } = usePanel();
  const { pct, done, total } = getProgress(project);
  const openRisks = project.project_risks.filter(r => r.status === "open");
  const criticalRisk = openRisks.some(r => r.level === "high" || r.level === "critical");

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={() => openPanel("project", project.id)}
      className="rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing
        hover:border-dark-5 transition-all select-none"
      style={{
        background: "#1E1E1E",
        border: "1px solid #2A2A2A",
        opacity: isDragging ? 0.4 : 1,
        transform: isDragging ? "scale(0.96)" : "scale(1)",
        transition: "opacity 0.15s, transform 0.15s",
      }}
    >
      {/* Top row: priority dot · code · risk badge */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: PRIORITY_DOT[project.priority] ?? "#3A3A3A" }}
        />
        <span className="text-[9px] font-mono flex-1 truncate" style={{ color: "#3A3A3A" }}>
          {project.code}
        </span>
        <span
          className="text-[9px] font-bold px-1 py-0.5 rounded"
          style={{
            background: `${PRIORITY_DOT[project.priority]}22`,
            color: PRIORITY_DOT[project.priority] ?? "#3A3A3A",
          }}
        >
          {project.priority}
        </span>
        {openRisks.length > 0 && (
          <span
            className="text-[9px] font-bold"
            style={{ color: criticalRisk ? "#E74C3C" : "#F39C12" }}
          >
            ⚠ {openRisks.length}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="text-xs font-semibold text-white leading-tight mb-1.5 line-clamp-2">
        {project.name}
      </div>

      {/* Phase badge */}
      {project.phase && (
        <div className="mb-1.5">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: PHASE_ACCENT[project.phase] ?? "#2A2A2A", color: PHASE_TEXT[project.phase] ?? "#8E8E93" }}
          >
            {project.phase}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-2">
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#2A2A2A" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: "#F5A623" }}
            />
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: "#3A3A3A" }}>
            {pct}% · {done}/{total} tasks
          </div>
        </div>
      )}

      {/* Footer: client · date · revenue */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] flex-1 truncate" style={{ color: "#8E8E93" }}>
          {project.client}
        </span>
        {project.target_date && (
          <span
            className="text-[9px] font-medium"
            style={{ color: isOverdue(project.target_date, project.status) ? "#E74C3C" : "#3A3A3A" }}
          >
            {fmtDate(project.target_date)}
          </span>
        )}
        {project.selling_price > 0 && (
          <span className="text-[9px] font-semibold" style={{ color: "#F5A623" }}>
            €{(project.selling_price / 1000).toFixed(0)}k
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Swimlane row ─────────────────────────────────────────────────────────────
function SwimlaneRow({
  lane,
  projects,
  dragging,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  lane: SwimlaneDef;
  projects: Project[];
  dragging: { id: string; category: string; fromStatus: string } | null;
  dropTarget: { category: string; status: string } | null;
  onDragStart: (p: Project) => void;
  onDragEnd: () => void;
  onDragOver: (category: string, status: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (category: string, status: string) => void;
}) {
  const isDraggingInLane = dragging?.category === lane.id;

  return (
    <div className="flex gap-2 mb-2">
      {/* Swimlane label */}
      <div
        className="flex-shrink-0 flex flex-col justify-start pt-2 pr-3"
        style={{ width: 140, borderRight: `2px solid ${lane.accent}30` }}
      >
        <div
          className="text-[9px] font-bold uppercase tracking-widest mb-1"
          style={{ color: lane.accent }}
        >
          {lane.icon}
        </div>
        <div className="text-[11px] font-semibold text-white leading-tight">{lane.label}</div>
        <div className="text-[9px] mt-0.5" style={{ color: "#3A3A3A" }}>
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Column cells */}
      {COLUMNS.map(col => {
        const cards = projects.filter(p => p.status === col.id);
        const isTarget = dropTarget?.category === lane.id && dropTarget?.status === col.id;
        const isSameStatus = dragging?.category === lane.id && dragging?.fromStatus === col.id;

        return (
          <div
            key={col.id}
            className="flex-1 min-w-0 rounded-lg p-1.5 transition-all"
            style={{
              minHeight: 72,
              background: isTarget ? "rgba(245,166,35,0.05)" : "rgba(21,21,21,0.4)",
              border: isTarget
                ? "1px solid rgba(245,166,35,0.5)"
                : isDraggingInLane && !isSameStatus
                ? "1px dashed #2A2A2A"
                : "1px solid transparent",
            }}
            onDragOver={(e) => {
              if (!dragging || dragging.category !== lane.id) return;
              e.preventDefault();
              onDragOver(lane.id, col.id);
            }}
            onDragLeave={onDragLeave}
            onDrop={(e) => { e.preventDefault(); onDrop(lane.id, col.id); }}
          >
            <div className="space-y-1.5">
              {cards.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isDragging={dragging?.id === project.id}
                  onDragStart={() => onDragStart(project)}
                  onDragEnd={onDragEnd}
                />
              ))}

              {/* Drop hint when dragging within this lane */}
              {isDraggingInLane && cards.length === 0 && (
                <div
                  className="rounded-md flex items-center justify-center"
                  style={{
                    height: 40,
                    border: "1px dashed #2A2A2A",
                  }}
                >
                  <span className="text-[9px]" style={{ color: "#3A3A3A" }}>
                    {isTarget ? "Release to move" : "Drop here"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [dragging, setDragging] = useState<{
    id: string;
    category: string;
    fromStatus: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    category: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select(`
          id, code, name, client, category, status, priority,
          summary, selling_price, target_date,
          wbs_stages ( id, name, sort_order, wbs_tasks ( id, status, effort_days, due_date ) ),
          project_risks ( id, level, status )
        `)
        .order("priority", { ascending: true });

      if (data) {
        setProjects(
          data.map((p: Record<string, unknown>) => ({
            ...p,
            wbs_stages: ((p.wbs_stages as WbsStage[]) ?? []).sort(
              (a: WbsStage, b: WbsStage) => a.sort_order - b.sort_order
            ),
          })) as Project[]
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function handleDragStart(project: Project) {
    setDragging({ id: project.id, category: project.category, fromStatus: project.status });
  }

  function handleDragEnd() {
    setDragging(null);
    setDropTarget(null);
  }

  function handleDragOver(category: string, status: string) {
    setDropTarget({ category, status });
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if leaving the cell entirely (not entering a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }

  async function handleDrop(targetCategory: string, targetStatus: string) {
    if (!dragging || dragging.category !== targetCategory) return;
    setDragging(null);
    setDropTarget(null);
    if (dragging.fromStatus === targetStatus) return;

    const prevStatus = dragging.fromStatus;
    const projectId = dragging.id;

    // Optimistic update
    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, status: targetStatus } : p))
    );

    // Persist to Supabase
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({ status: targetStatus })
      .eq("id", projectId);

    if (error) {
      console.error("Failed to update project status:", error.message);
      // Rollback
      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, status: prevStatus } : p))
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-20 text-grey text-sm">Loading projects…</div>
    );
  }

  const totalActive = projects.filter(p => p.status === "active").length;

  // Build a catch-all for unmatched categories
  const knownCategories = new Set(SWIMLANES.map(s => s.id));
  const otherProjects = projects.filter(p => !knownCategories.has(p.category));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Project Portfolio</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8E8E93" }}>
            {projects.length} projects · {totalActive} active
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.dotColor }} />
                <span className="text-[10px]" style={{ color: "#3A3A3A" }}>{col.label}</span>
              </div>
            ))}
          </div>

          {/* New project button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "#F5A623", color: "#0D0D0D" }}
          >
            <span className="text-base leading-none">+</span>
            New Project
          </button>
        </div>
      </div>

      {/* Add project modal */}
      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onCreated={(newProject) => {
            setProjects(prev => [
              ...prev,
              { ...newProject, wbs_stages: [], project_risks: [] } as unknown as Project,
            ]);
          }}
        />
      )}

      {/* Board — horizontally scrollable */}
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: 900 }}>

          {/* Sticky column headers */}
          <div className="flex gap-2 mb-3" style={{ paddingLeft: 148 }}>
            {COLUMNS.map(col => (
              <div key={col.id} className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-bold uppercase tracking-widest text-center py-1.5 px-2 rounded-md"
                  style={{
                    background: "#151515",
                    border: "1px solid #2A2A2A",
                    color: col.textColor,
                  }}
                >
                  {col.label}
                </div>
              </div>
            ))}
          </div>

          {/* Swimlane rows */}
          {SWIMLANES.map(lane => (
            <SwimlaneRow
              key={lane.id}
              lane={lane}
              projects={projects.filter(p => p.category === lane.id)}
              dragging={dragging}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ))}

          {/* Catch-all: projects with unmapped category */}
          {otherProjects.length > 0 && (
            <SwimlaneRow
              lane={{ id: "__other__", label: "Other", icon: "📁", accent: "#3A3A3A" }}
              projects={otherProjects}
              dragging={dragging}
              dropTarget={dropTarget}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          )}
        </div>
      </div>
    </div>
  );
}
