"use client";

import { useState } from "react";
import Header from "@/components/dashboard/Header";
import KpiCard from "@/components/dashboard/KpiCard";
import SectionTitle from "@/components/dashboard/SectionTitle";
import ProjectCard from "@/components/dashboard/ProjectCard";
import MilestoneBar from "@/components/dashboard/MilestoneBar";
import ChatPanel from "@/components/chat/ChatPanel";
import type { Project } from "@/lib/supabase/types";

// ── Seed data (replaced by Supabase queries in Phase 2) ──────────

const SEED_KPIS = [
  { label: "Active Projects", value: "6", sub: "3 consultancy, 3 product", accent: "gold" as const },
  { label: "Revenue Pipeline", value: "€247k", sub: "Won + qualified", accent: "green" as const },
  { label: "Avg Margin", value: "72%", sub: "Across active engagements", accent: "amber" as const },
  { label: "Sprint Velocity", value: "14 pts", sub: "MBSE Agent Sprint 1", accent: "blue" as const },
  { label: "Overdue Items", value: "2", sub: "1 task, 1 milestone", accent: "red" as const },
];

const SEED_PROJECTS: Project[] = [
  {
    id: "1", code: "CB-TME-001", name: "Codebeamer RM Configuration", client: "Toyota Motor Europe",
    category: "Consultancy", stage: "Won", status: "active", priority: "P0",
    summary: "Requirements management tool configuration", selling_price: 30000, margin_pct: 83,
    target_date: "2025-06-30", created_at: "2025-01-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "2", code: "MBSE-001", name: "AI Agent — MBSE", client: "Embedia",
    category: "Product", stage: "Active", status: "active", priority: "P0",
    summary: "On-prem MBSE reasoning agent", selling_price: 0, margin_pct: 0,
    target_date: "2025-09-30", created_at: "2025-03-01T00:00:00Z", updated_at: "2025-04-15T00:00:00Z",
  },
  {
    id: "3", code: "WP-001", name: "MBSE Adoption Roadmap", client: "Embedia",
    category: "Publishing", stage: "Active", status: "active", priority: "P1",
    summary: "White paper on MBSE adoption for mechatronic enterprises", selling_price: 0, margin_pct: 0,
    target_date: "2025-04-21", created_at: "2025-02-01T00:00:00Z", updated_at: "2025-04-14T00:00:00Z",
  },
  {
    id: "4", code: "FUSA-001", name: "AI Agent — FuSa", client: "Embedia",
    category: "Product", stage: "Planned", status: "pending", priority: "P1",
    summary: "Functional safety reasoning agent (ISO 26262)", selling_price: 0, margin_pct: 0,
    target_date: null, created_at: "2025-03-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "5", code: "CYBER-001", name: "AI Agent — CyberSec", client: "Embedia",
    category: "Product", stage: "Planned", status: "pending", priority: "P2",
    summary: "Cybersecurity agent (ISO 21434 / R155)", selling_price: 0, margin_pct: 0,
    target_date: null, created_at: "2025-03-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "6", code: "COCKPIT-001", name: "CEO War Room Cockpit", client: "Embedia",
    category: "Operations", stage: "Active", status: "active", priority: "P0",
    summary: "Web application for cockpit.embedia.io", selling_price: 0, margin_pct: 0,
    target_date: "2025-05-31", created_at: "2025-04-15T00:00:00Z", updated_at: "2025-04-15T00:00:00Z",
  },
];

const SEED_MILESTONES = [
  { label: "TOGAF Docs", date: "15 Apr", status: "done" as const },
  { label: "MVP Scaffold", date: "16 Apr", status: "active" as const },
  { label: "Auth + DB", date: "18 Apr", status: "pending" as const },
  { label: "Agent Chat Live", date: "22 Apr", status: "pending" as const },
  { label: "Brand QA", date: "25 Apr", status: "pending" as const },
  { label: "cockpit.embedia.io", date: "30 Apr", status: "pending" as const },
];

// ── Component ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    // TODO: navigate to /projects/[id] detail view
    console.log("Navigate to project:", project.code);
  };

  return (
    <div className="flex h-screen bg-dark text-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeView={activeView}
          onViewChange={setActiveView}
          userName="Safouen"
        />

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {activeView === "dashboard" && (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-5 gap-4 mb-2">
                {SEED_KPIS.map((kpi) => (
                  <KpiCard key={kpi.label} {...kpi} />
                ))}
              </div>

              {/* Milestones */}
              <SectionTitle>Cockpit Deployment Milestones</SectionTitle>
              <div className="bg-dark-2 rounded-[10px] border border-dark-4 px-6 py-2 mb-2">
                <MilestoneBar milestones={SEED_MILESTONES} />
              </div>

              {/* Projects */}
              <SectionTitle>Portfolio — Active Workstreams</SectionTitle>
              <div className="bg-dark-2 rounded-[10px] border border-dark-4 overflow-hidden">
                <div className="flex items-center px-3 py-2 text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
                  <div className="w-2 mr-3" />
                  <div className="flex-1">Project</div>
                  <div className="w-16 text-center">Priority</div>
                  <div className="w-[80px] text-right">Stage</div>
                  <div className="w-5" />
                </div>
                {SEED_PROJECTS.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={handleProjectClick}
                  />
                ))}
              </div>

              {/* Quick Actions */}
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: "📋", label: "Daily Briefing", desc: "Ask Chief of Staff" },
                  { icon: "🤝", label: "Pipeline Status", desc: "Ask BizDev Agent" },
                  { icon: "✍️", label: "Draft Proposal", desc: "Ask Content Agent" },
                  { icon: "🏗️", label: "Architecture Review", desc: "Ask MBSE Agent" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setChatOpen(true)}
                    className="bg-dark-2 border border-dark-4 rounded-lg p-4 text-left hover:border-gold hover:bg-dark-3 transition-all group"
                  >
                    <div className="text-xl mb-2">{action.icon}</div>
                    <div className="text-sm font-semibold group-hover:text-gold transition-colors">{action.label}</div>
                    <div className="text-[10px] text-dark-5 mt-0.5">{action.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeView === "projects" && (
            <div className="text-center py-20 text-grey">
              <div className="text-4xl mb-4">🏗️</div>
              <div className="text-lg font-semibold">Projects View</div>
              <div className="text-sm text-dark-5 mt-2">Detailed project cards with WBS — coming in next sprint</div>
            </div>
          )}

          {activeView === "pipeline" && (
            <div className="text-center py-20 text-grey">
              <div className="text-4xl mb-4">🤝</div>
              <div className="text-lg font-semibold">BD Pipeline</div>
              <div className="text-sm text-dark-5 mt-2">Kanban board with account stages — coming in next sprint</div>
            </div>
          )}

          {activeView === "sprint" && (
            <div className="text-center py-20 text-grey">
              <div className="text-4xl mb-4">🏃</div>
              <div className="text-lg font-semibold">Sprint Board</div>
              <div className="text-sm text-dark-5 mt-2">Task board for MBSE Agent Sprint 1 — coming in next sprint</div>
            </div>
          )}
        </main>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
    </div>
  );
}
