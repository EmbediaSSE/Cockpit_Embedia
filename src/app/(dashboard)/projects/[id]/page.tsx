"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SectionTitle from "@/components/dashboard/SectionTitle";
import type { Project, WbsStage, WbsTask, ProjectRisk } from "@/lib/supabase/types";

interface ProjectDetail extends Project {
  stages: (WbsStage & { wbs_tasks: WbsTask[] })[];
  documents: { id: string; name: string; doc_status: string; created_at: string }[];
  risks: ProjectRisk[];
}

// ── Seed data fallback (for dev before Supabase is connected) ──

const SEED_PROJECT: ProjectDetail = {
  id: "a1000000-0000-0000-0000-000000000001",
  code: "CB-TME-001",
  name: "Codebeamer RM Configuration",
  client: "Toyota Motor Europe",
  category: "Consultancy",
  stage: "Won",
  status: "active",
  priority: "P0",
  summary: "End-to-end requirements management configuration for TCU platform using PTC Codebeamer.",
  selling_price: 30000,
  margin_pct: 83,
  target_date: "2025-06-30",
  created_at: "2025-01-15T00:00:00Z",
  updated_at: "2025-04-10T00:00:00Z",
  stages: [
    {
      id: "s1", project_id: "a1000000-0000-0000-0000-000000000001", name: "Requirements Analysis", sort_order: 1,
      wbs_tasks: [
        { id: "t1", stage_id: "s1", task_code: "CB-T01", name: "Stakeholder interviews", effort_days: 2, rate: 1200, status: "done", assignee: "Safouen", due_date: "2025-04-01", created_at: "", updated_at: "" },
        { id: "t2", stage_id: "s1", task_code: "CB-T02", name: "Item type mapping", effort_days: 3, rate: 1200, status: "done", assignee: "Safouen", due_date: "2025-04-05", created_at: "", updated_at: "" },
      ],
    },
    {
      id: "s2", project_id: "a1000000-0000-0000-0000-000000000001", name: "Configuration", sort_order: 2,
      wbs_tasks: [
        { id: "t3", stage_id: "s2", task_code: "CB-T03", name: "Workflow configuration", effort_days: 5, rate: 1200, status: "in_progress", assignee: "Safouen", due_date: "2025-04-20", created_at: "", updated_at: "" },
        { id: "t4", stage_id: "s2", task_code: "CB-T04", name: "Traceability rules", effort_days: 3, rate: 1200, status: "todo", assignee: "Safouen", due_date: "2025-04-25", created_at: "", updated_at: "" },
      ],
    },
    {
      id: "s3", project_id: "a1000000-0000-0000-0000-000000000001", name: "Testing & Handover", sort_order: 3,
      wbs_tasks: [
        { id: "t5", stage_id: "s3", task_code: "CB-T05", name: "UAT and handover", effort_days: 4, rate: 1200, status: "todo", assignee: "Safouen", due_date: "2025-05-10", created_at: "", updated_at: "" },
      ],
    },
  ],
  documents: [],
  risks: [
    { id: "r1", project_id: "a1000000-0000-0000-0000-000000000001", level: "low", description: "TME requirements scope creep beyond contracted item types", mitigation: "Scope boundary documented in SoW; change request process in place", status: "mitigated" },
  ],
};

const statusStyles: Record<string, string> = {
  todo: "bg-dark-4 text-grey",
  in_progress: "bg-status-amber/20 text-status-amber",
  done: "bg-status-green/20 text-status-green",
  blocked: "bg-status-red/20 text-status-red",
};

const riskLevelStyles: Record<string, string> = {
  low: "text-status-green",
  medium: "text-status-amber",
  high: "text-status-red",
  critical: "text-status-red font-bold",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        } else {
          // Fallback to seed data in dev
          setProject(SEED_PROJECT);
        }
      } catch {
        setProject(SEED_PROJECT);
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gold text-sm animate-pulse">Loading project...</div>
      </div>
    );
  }

  if (!project) return null;

  const totalEffort = project.stages.reduce(
    (sum, s) => sum + s.wbs_tasks.reduce((ts, t) => ts + t.effort_days, 0), 0
  );
  const doneEffort = project.stages.reduce(
    (sum, s) => sum + s.wbs_tasks.filter((t) => t.status === "done").reduce((ts, t) => ts + t.effort_days, 0), 0
  );
  const progressPct = totalEffort > 0 ? Math.round((doneEffort / totalEffort) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-8 py-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="text-dark-5 hover:text-gold text-sm mb-4 transition-colors"
      >
        ← Back to portfolio
      </button>

      {/* Project Header */}
      <div className="bg-dark-2 rounded-xl border border-dark-4 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 mb-1">
              {project.code} — {project.client}
            </div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.summary && (
              <p className="text-grey text-sm mt-2 max-w-2xl">{project.summary}</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-status-green text-white">
              {project.priority}
            </span>
            <span className="text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-dark-4 text-grey">
              {project.stage}
            </span>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-dark-3 rounded-lg p-3">
            <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5">Value</div>
            <div className="text-lg font-bold text-gold">
              {project.selling_price > 0 ? `€${(project.selling_price / 1000).toFixed(0)}k` : "Internal"}
            </div>
          </div>
          <div className="bg-dark-3 rounded-lg p-3">
            <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5">Margin</div>
            <div className="text-lg font-bold">{project.margin_pct > 0 ? `${project.margin_pct}%` : "—"}</div>
          </div>
          <div className="bg-dark-3 rounded-lg p-3">
            <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5">Progress</div>
            <div className="text-lg font-bold text-status-green">{progressPct}%</div>
          </div>
          <div className="bg-dark-3 rounded-lg p-3">
            <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5">Target</div>
            <div className="text-lg font-bold">
              {project.target_date
                ? new Date(project.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "TBD"}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1.5 bg-dark-4 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-status-green rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* WBS Table */}
      <SectionTitle>Work Breakdown Structure</SectionTitle>
      <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
              <th className="text-left px-4 py-2.5">Code</th>
              <th className="text-left px-4 py-2.5">Task</th>
              <th className="text-center px-4 py-2.5">Days</th>
              <th className="text-center px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Assignee</th>
              <th className="text-right px-4 py-2.5">Due</th>
            </tr>
          </thead>
          <tbody>
            {project.stages.map((stage) => (
              <>
                <tr key={stage.id} className="border-b border-dark-4 bg-dark-3/50">
                  <td colSpan={6} className="px-4 py-2 text-[10px] font-bold uppercase tracking-[1.2px] text-gold">
                    {stage.name}
                  </td>
                </tr>
                {stage.wbs_tasks.map((task) => (
                  <tr key={task.id} className="border-b border-dark-4 hover:bg-dark-3/30 transition-colors">
                    <td className="px-4 py-2 text-dark-5 font-mono text-xs">{task.task_code}</td>
                    <td className="px-4 py-2">{task.name}</td>
                    <td className="px-4 py-2 text-center text-grey">{task.effort_days}d</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${statusStyles[task.status]}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-grey">{task.assignee || "—"}</td>
                    <td className="px-4 py-2 text-right text-grey text-xs">
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risks */}
      {project.risks.length > 0 && (
        <>
          <SectionTitle>Risks</SectionTitle>
          <div className="bg-dark-2 rounded-xl border border-dark-4 p-4 space-y-3">
            {project.risks.map((risk) => (
              <div key={risk.id} className="flex items-start gap-3">
                <span className={`text-[9px] font-bold uppercase mt-0.5 ${riskLevelStyles[risk.level]}`}>
                  {risk.level}
                </span>
                <div className="flex-1">
                  <div className="text-sm">{risk.description}</div>
                  {risk.mitigation && (
                    <div className="text-xs text-dark-5 mt-1">Mitigation: {risk.mitigation}</div>
                  )}
                </div>
                <span className="text-[9px] font-bold uppercase text-dark-5">{risk.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
