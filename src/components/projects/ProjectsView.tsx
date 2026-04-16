"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface WbsTask {
  id: string;
  task_code: string;
  name: string;
  effort_days: number;
  rate: number;
  status: string;
  assignee: string | null;
  due_date: string | null;
}

interface WbsStage {
  id: string;
  name: string;
  sort_order: number;
  wbs_tasks: WbsTask[];
}

interface Project {
  id: string;
  code: string;
  name: string;
  client: string;
  category: string;
  stage: string;
  status: string;
  priority: string;
  summary: string;
  selling_price: number;
  margin_pct: number;
  target_date: string | null;
  wbs_stages: WbsStage[];
  project_risks: Risk[];
}

interface Risk {
  id: string;
  level: string;
  description: string;
  mitigation: string | null;
  status: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-500",
  P1: "bg-amber-500",
  P2: "bg-blue-500",
  P3: "bg-dark-5",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-dark-5",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-amber-400",
  high: "text-red-400",
  critical: "text-red-500",
};

export default function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select(`
          *,
          wbs_stages (
            id, name, sort_order,
            wbs_tasks (id, task_code, name, effort_days, rate, status, assignee, due_date)
          ),
          project_risks (id, level, description, mitigation, status)
        `)
        .order("priority", { ascending: true });

      if (data) {
        setProjects(data.map((p: Record<string, unknown>) => ({
          ...p,
          wbs_stages: ((p.wbs_stages as WbsStage[]) || []).sort((a: WbsStage, b: WbsStage) => a.sort_order - b.sort_order),
        })) as Project[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading projects...</div>;
  }

  function getProjectProgress(project: Project) {
    const allTasks = project.wbs_stages.flatMap((s) => s.wbs_tasks);
    if (allTasks.length === 0) return 0;
    return Math.round((allTasks.filter((t) => t.status === "done").length / allTasks.length) * 100);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Project Portfolio</h2>
          <p className="text-xs text-grey mt-1">
            {projects.length} projects — {projects.filter((p) => p.status === "active").length} active
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {projects.map((project) => {
          const isExpanded = expandedProject === project.id;
          const progress = getProjectProgress(project);
          const allTasks = project.wbs_stages.flatMap((s) => s.wbs_tasks);
          const openRisks = project.project_risks.filter((r) => r.status === "open");

          return (
            <div key={project.id} className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
              {/* Project Header */}
              <div
                className="px-5 py-4 cursor-pointer hover:bg-dark-3 transition-colors"
                onClick={() => setExpandedProject(isExpanded ? null : project.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Priority */}
                  <div className={`w-2 h-8 rounded-full ${PRIORITY_COLORS[project.priority]}`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-dark-5">{project.code}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${PRIORITY_COLORS[project.priority]}/20 text-white`}>
                        {project.priority}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-3 text-dark-5 uppercase">
                        {project.category}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white mt-0.5">{project.name}</div>
                    <div className="text-[10px] text-dark-5 mt-0.5">
                      {project.client} — {project.stage}
                      {project.target_date && ` — Due ${new Date(project.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-32 text-right">
                    <div className="text-xs text-grey mb-1">{progress}% complete</div>
                    <div className="w-full h-1.5 bg-dark-4 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-dark-5 mt-1">
                      {allTasks.filter((t) => t.status === "done").length}/{allTasks.length} tasks
                    </div>
                  </div>

                  {/* Financials */}
                  {project.selling_price > 0 && (
                    <div className="text-right w-24">
                      <div className="text-sm font-semibold text-gold">
                        €{(project.selling_price / 1000).toFixed(0)}k
                      </div>
                      <div className="text-[10px] text-dark-5">{project.margin_pct}% margin</div>
                    </div>
                  )}

                  {/* Risk badge */}
                  {openRisks.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold ${
                        openRisks.some((r) => r.level === "high" || r.level === "critical")
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}>
                        ⚠ {openRisks.length}
                      </span>
                    </div>
                  )}

                  {/* Chevron */}
                  <svg
                    className={`w-4 h-4 text-dark-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded: WBS + Risks */}
              {isExpanded && (
                <div className="border-t border-dark-4 px-5 py-4">
                  {/* Summary */}
                  {project.summary && (
                    <p className="text-xs text-grey mb-4 leading-relaxed">{project.summary}</p>
                  )}

                  {/* WBS Stages */}
                  {project.wbs_stages.length > 0 ? (
                    <div className="space-y-4">
                      {project.wbs_stages.map((stage) => (
                        <div key={stage.id}>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-gold mb-2">
                            {stage.name}
                          </div>
                          <div className="space-y-1">
                            {stage.wbs_tasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-3 px-3 py-2 bg-dark-3 rounded-lg">
                                <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[task.status]}`} />
                                <span className="text-[10px] font-mono text-dark-5 w-16">{task.task_code}</span>
                                <span className="text-xs text-white flex-1">{task.name}</span>
                                {task.assignee && (
                                  <span className="text-[10px] text-grey">{task.assignee}</span>
                                )}
                                {task.effort_days > 0 && (
                                  <span className="text-[10px] text-dark-5">{task.effort_days}d</span>
                                )}
                                {task.due_date && (
                                  <span className={`text-[10px] ${
                                    new Date(task.due_date) < new Date() && task.status !== "done"
                                      ? "text-red-400"
                                      : "text-dark-5"
                                  }`}>
                                    {new Date(task.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                  </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                                  task.status === "done" ? "bg-green-500/15 text-green-400" :
                                  task.status === "in_progress" ? "bg-blue-500/15 text-blue-400" :
                                  task.status === "blocked" ? "bg-red-500/15 text-red-400" :
                                  "bg-dark-4 text-dark-5"
                                }`}>
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-dark-5 py-4 text-center">No WBS defined yet.</div>
                  )}

                  {/* Risks */}
                  {project.project_risks.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-dark-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-dark-5 mb-2">
                        Risks ({project.project_risks.length})
                      </div>
                      <div className="space-y-1.5">
                        {project.project_risks.map((risk) => (
                          <div key={risk.id} className="flex items-start gap-2 px-3 py-2 bg-dark-3 rounded-lg">
                            <span className={`text-xs font-bold uppercase ${RISK_COLORS[risk.level]}`}>
                              {risk.level}
                            </span>
                            <div className="flex-1">
                              <div className="text-xs text-white">{risk.description}</div>
                              {risk.mitigation && (
                                <div className="text-[10px] text-dark-5 mt-1">Mitigation: {risk.mitigation}</div>
                              )}
                            </div>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              risk.status === "open" ? "bg-amber-500/15 text-amber-400" :
                              risk.status === "mitigated" ? "bg-green-500/15 text-green-400" :
                              "bg-dark-4 text-dark-5"
                            }`}>
                              {risk.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
