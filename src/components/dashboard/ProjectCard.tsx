"use client";

import type { Project } from "@/lib/supabase/types";

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const priorityStyles: Record<string, string> = {
  P0: "bg-status-green text-white",
  P1: "bg-status-amber text-dark",
  P2: "bg-dark-5 text-grey",
  P3: "bg-dark-4 text-dark-5",
};

const statusDots: Record<string, string> = {
  active: "bg-status-green",
  pending: "bg-status-amber",
  on_hold: "bg-status-red",
  completed: "bg-status-blue",
};

export default function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      onClick={() => onClick(project)}
      className="flex items-center px-3 py-2.5 rounded-lg gap-3 cursor-pointer transition-all border border-transparent hover:bg-dark-3 hover:border-dark-5 group"
    >
      <div className={`w-2 h-2 rounded-full shrink-0 ${statusDots[project.status] || "bg-dark-5"}`} />
      <div className="flex-1 font-medium text-sm">{project.name}</div>
      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priorityStyles[project.priority] || priorityStyles.P2}`}>
        {project.priority}
      </span>
      <span className="text-[11px] text-grey min-w-[80px] text-right">{project.stage}</span>
      <span className="text-dark-5 text-sm transition-colors group-hover:text-gold">→</span>
    </div>
  );
}
