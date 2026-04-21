"use client";

import { useState, useEffect } from "react";
import Header from "@/components/dashboard/Header";
import KpiCard from "@/components/dashboard/KpiCard";
import SectionTitle from "@/components/dashboard/SectionTitle";
import ProjectCard from "@/components/dashboard/ProjectCard";
import MilestoneBar from "@/components/dashboard/MilestoneBar";
import ChatPanel from "@/components/chat/ChatPanel";
import SettingsView from "@/components/settings/SettingsView";
import UserManagementView from "@/components/settings/UserManagementView";
import ProjectsView from "@/components/projects/ProjectsView";
import PipelineView from "@/components/pipeline/PipelineView";
import OrgChartView from "@/components/org/OrgChartView";
import CriticalNow from "@/components/dashboard/CriticalNow";
import DailyBriefing from "@/components/dashboard/DailyBriefing";
import AdminSwimlane from "@/components/dashboard/AdminSwimlane";
import DetailPanel from "@/components/shared/DetailPanel";
import KpiDrillPanel, { type KpiDrillData } from "@/components/dashboard/KpiDrillPanel";
import CreateRecordModal from "@/components/shared/CreateRecordModal";
import { PanelProvider, usePanel } from "@/contexts/PanelContext";
import { createClient } from "@/lib/supabase/client";
import type { Project, Milestone } from "@/lib/supabase/types";

// ── Lazy-loaded views (heavy) ─────────────────────────────────
import dynamic from "next/dynamic";
const RoadmapView     = dynamic(() => import("@/components/roadmap/RoadmapView"),      { loading: () => <ViewPlaceholder label="Loading Roadmap…" /> });
const SprintBoardView = dynamic(() => import("@/components/sprint/SprintBoardView"),   { loading: () => <ViewPlaceholder label="Loading Sprint Board…" /> });
const IntelligenceView= dynamic(() => import("@/components/intelligence/IntelligenceView"), { loading: () => <ViewPlaceholder label="Loading Intelligence…" /> });

function ViewPlaceholder({ label }: { label: string }) {
  return (
    <div className="text-center py-20 text-grey text-sm">{label}</div>
  );
}

// ── KPI type ──────────────────────────────────────────────────
interface KpiData {
  label: string;
  value: string;
  sub: string;
  accent: "gold" | "green" | "amber" | "blue" | "red";
}

const SEED_PROJECTS: Project[] = [
  {
    id: "1", code: "CB-TME-001", name: "Codebeamer RM Configuration", client: "Toyota Motor Europe",
    category: "Consultancy", stage: "Won", status: "active", priority: "P0",
    summary: "Requirements management tool configuration", selling_price: 30000, margin_pct: 83,
    function_area: "Operations", phase: null, risks_summary: [], dependencies_text: null,
    target_date: "2025-06-30", created_at: "2025-01-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "2", code: "MBSE-001", name: "AI Agent — MBSE", client: "Embedia",
    category: "Product", stage: "Active", status: "active", priority: "P0",
    summary: "On-prem MBSE reasoning agent", selling_price: 0, margin_pct: 0,
    function_area: "Product", phase: "Sprint 1", risks_summary: [], dependencies_text: null,
    target_date: "2025-09-30", created_at: "2025-03-01T00:00:00Z", updated_at: "2025-04-15T00:00:00Z",
  },
  {
    id: "3", code: "WP-001", name: "MBSE Adoption Roadmap", client: "Embedia",
    category: "Publishing", stage: "Active", status: "active", priority: "P1",
    summary: "White paper on MBSE adoption for mechatronic enterprises", selling_price: 0, margin_pct: 0,
    function_area: "ThoughtLeadership", phase: null, risks_summary: [], dependencies_text: null,
    target_date: "2025-04-21", created_at: "2025-02-01T00:00:00Z", updated_at: "2025-04-14T00:00:00Z",
  },
  {
    id: "4", code: "FUSA-001", name: "AI Agent — FuSa", client: "Embedia",
    category: "Product", stage: "Planned", status: "pending", priority: "P1",
    summary: "Functional safety reasoning agent (ISO 26262)", selling_price: 0, margin_pct: 0,
    function_area: "Product", phase: "Planned", risks_summary: [], dependencies_text: null,
    target_date: null, created_at: "2025-03-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "5", code: "CYBER-001", name: "AI Agent — CyberSec", client: "Embedia",
    category: "Product", stage: "Planned", status: "pending", priority: "P2",
    summary: "Cybersecurity agent (ISO 21434 / R155)", selling_price: 0, margin_pct: 0,
    function_area: "Product", phase: "Planned", risks_summary: [], dependencies_text: null,
    target_date: null, created_at: "2025-03-15T00:00:00Z", updated_at: "2025-04-10T00:00:00Z",
  },
  {
    id: "6", code: "COCKPIT-001", name: "CEO War Room Cockpit", client: "Embedia",
    category: "Operations", stage: "Active", status: "active", priority: "P0",
    summary: "Web application for cockpit.embedia.io", selling_price: 0, margin_pct: 0,
    function_area: "Operations", phase: "MVP", risks_summary: [], dependencies_text: null,
    target_date: "2025-05-31", created_at: "2025-04-15T00:00:00Z", updated_at: "2025-04-15T00:00:00Z",
  },
];

// ── Inner component (has access to PanelContext) ───────────────

function DashboardInner() {
  const { openPanel } = usePanel();
  const [activeView, setActiveView] = useState("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [kpis, setKpis] = useState<KpiData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [kpiDrill, setKpiDrill] = useState<KpiDrillData | null>(null);
  // Raw data for drill panels
  const [allTasks, setAllTasks]     = useState<Array<{ task_code?: string; name?: string; status: string; due_date: string | null }>>([]);
  const [allAccounts, setAllAccounts] = useState<Array<{ id: string; name?: string; status: string; category?: string; country?: string }>>([]);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string }>({
    name: "Safouen",
    email: "",
    role: "admin",
  });

  // Fetch authenticated user info
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("full_name, email, role")
          .eq("id", authUser.id)
          .single();

        setUser({
          name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          email: profile?.email || authUser.email || "",
          role: profile?.role || "member",
        });
      }
    }
    loadUser();
  }, []);

  // Fetch live KPIs, projects, and milestones from Supabase
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const [projectsRes, tasksRes, pipelineRes, milestonesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, code, name, client, category, stage, status, priority, summary, selling_price, margin_pct, target_date, function_area, phase, risks_summary, dependencies_text, created_at, updated_at")
          .order("priority", { ascending: true }),
        supabase
          .from("wbs_tasks")
          .select("id, task_code, name, status, due_date"),
        supabase
          .from("pipeline_accounts")
          .select("id, name, status, category, country"),
        supabase
          .from("milestones")
          .select("*")
          .order("target_date", { ascending: true })
          .limit(20),
      ]);

      const allProjects  = (projectsRes.data || []) as Project[];
      const fetchedTasks = tasksRes.data || [];
      const fetchedAccounts = pipelineRes.data || [];
      const allMilestones= (milestonesRes.data || []) as Milestone[];

      // Store raw data for KPI drill panels
      setAllTasks(fetchedTasks);
      setAllAccounts(fetchedAccounts);

      const allTasks     = fetchedTasks;
      const allAccounts  = fetchedAccounts;

      setProjects(allProjects);
      setMilestones(allMilestones);

      // Compute KPIs
      const activeProjects = allProjects.filter((p) => p.status === "active");
      const consultancy    = activeProjects.filter((p) => p.category === "Consultancy").length;
      const product        = activeProjects.filter((p) => p.category === "Product").length;

      const revenueProjects = allProjects.filter((p) =>
        p.selling_price > 0 && ["active", "pending"].includes(p.status)
      );
      const totalRevenue = revenueProjects.reduce((sum, p) => sum + p.selling_price, 0);

      const marginProjects = allProjects.filter((p) => p.margin_pct > 0);
      const avgMargin = marginProjects.length > 0
        ? Math.round(marginProjects.reduce((sum, p) => sum + p.margin_pct, 0) / marginProjects.length)
        : 0;

      // Active = any non-terminal status across all swimlanes
      const terminalStatuses = ["won", "lost", "churned", "closed_won", "closed_lost", "ambassador"];
      const pipelineInProgress = allAccounts.filter((a) =>
        !terminalStatuses.includes(a.status)
      ).length;
      const pipelineWon = allAccounts.filter((a) =>
        ["won", "closed_won", "retained"].includes(a.status)
      ).length;

      const today = new Date().toISOString().split("T")[0];
      const overdueTasks = allTasks.filter(
        (t) => t.due_date && t.due_date < today && t.status !== "done"
      ).length;

      // Days to next pending milestone
      const nextMilestone = allMilestones.find(
        (m) => m.status !== "done" && m.target_date && m.target_date >= today
      );
      const daysToMilestone = nextMilestone?.target_date
        ? Math.ceil((new Date(nextMilestone.target_date).getTime() - new Date(today).getTime()) / 86400000)
        : null;

      setKpis([
        {
          label: "Active Projects",
          value: String(activeProjects.length),
          sub: `${consultancy} consultancy · ${product} product`,
          accent: "gold",
        },
        {
          label: "Revenue Pipeline",
          value: totalRevenue >= 1000 ? `€${(totalRevenue / 1000).toFixed(0)}k` : `€${totalRevenue}`,
          sub: `${revenueProjects.length} billable project${revenueProjects.length !== 1 ? "s" : ""}`,
          accent: "green",
        },
        {
          label: "Avg Margin",
          value: `${avgMargin}%`,
          sub: `Across ${marginProjects.length} engagement${marginProjects.length !== 1 ? "s" : ""}`,
          accent: "amber",
        },
        {
          label: "BD Pipeline",
          value: String(allAccounts.length),
          sub: `${pipelineWon} won · ${pipelineInProgress} active`,
          accent: "blue",
        },
        {
          label: "Overdue Items",
          value: String(overdueTasks),
          sub: overdueTasks === 0 ? "All on track" : `${overdueTasks} task${overdueTasks !== 1 ? "s" : ""} past due`,
          accent: overdueTasks > 0 ? "red" : "green",
        },
        {
          label: "Next Milestone",
          value: daysToMilestone !== null ? `${daysToMilestone}d` : "—",
          sub: nextMilestone ? nextMilestone.name : "No upcoming milestones",
          accent: daysToMilestone !== null && daysToMilestone <= 3 ? "red" : "gold",
        },
      ]);
      setKpisLoading(false);
    }
    loadData();
  }, []);

  const handleProjectClick = (project: Project) => {
    openPanel("project", project.code);
  };

  const openKpiDrill = (kpiKey: KpiDrillData["kpiKey"]) => {
    const kpi = kpis.find((k) => {
      const map: Record<KpiDrillData["kpiKey"], string> = {
        active_projects: "Active Projects",
        revenue_pipeline: "Revenue Pipeline",
        avg_margin: "Avg Margin",
        bd_pipeline: "BD Pipeline",
        overdue_items: "Overdue Items",
        next_milestone: "Next Milestone",
      };
      return k.label === map[kpiKey];
    });
    setKpiDrill({
      kpiKey,
      label: kpi?.label ?? kpiKey,
      value: kpi?.value ?? "—",
      sub: kpi?.sub ?? "",
      projects: projects.map((p) => ({
        code: p.code, name: p.name, client: p.client, category: p.category,
        stage: p.stage, status: p.status, priority: p.priority,
        selling_price: p.selling_price, margin_pct: p.margin_pct, target_date: p.target_date,
      })),
      tasks: allTasks,
      accounts: allAccounts,
      milestones: milestones.map((m) => ({
        name: m.name, target_date: m.target_date, status: m.status,
      })),
    });
  };

  // Convert Milestone to MilestoneBar format
  const milestonesToBar = milestones.length > 0
    ? milestones.slice(0, 8).map((m) => ({
        id: m.id,
        label: m.name,
        date: m.target_date
          ? new Date(m.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          : "TBD",
        status: (m.status === "done" ? "done" : m.status === "active" ? "active" : "pending") as "done" | "active" | "pending",
        onClick: () => openPanel("milestone", m.id),
      }))
    : [
        { label: "Auth + DB", date: "18 Apr", status: "active" as const },
        { label: "Detail Panels", date: "22 Apr", status: "pending" as const },
        { label: "Intelligence", date: "25 Apr", status: "pending" as const },
        { label: "cockpit.embedia.io", date: "30 Apr", status: "pending" as const },
      ];

  return (
    <div className="flex h-[100dvh] bg-dark text-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          activeView={activeView}
          onViewChange={setActiveView}
          onNewRecord={() => setShowCreateModal(true)}
          userName={user.name}
          userEmail={user.email}
          userRole={user.role}
        />

        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6 pb-24 md:pb-6">

          {/* ── Dashboard ───────────────────────────────────────── */}
          {activeView === "dashboard" && (
            <>
              {/* KPI Strip — 6 cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
                {kpisLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-dark-2 rounded-[10px] border border-dark-4 h-20 animate-pulse" />
                  ))
                ) : (
                  kpis.map((kpi) => {
                    const keyMap: Record<string, KpiDrillData["kpiKey"]> = {
                      "Active Projects":  "active_projects",
                      "Revenue Pipeline": "revenue_pipeline",
                      "Avg Margin":       "avg_margin",
                      "BD Pipeline":      "bd_pipeline",
                      "Overdue Items":    "overdue_items",
                      "Next Milestone":   "next_milestone",
                    };
                    const drillKey = keyMap[kpi.label];
                    return (
                      <KpiCard
                        key={kpi.label}
                        {...kpi}
                        onClick={drillKey ? () => openKpiDrill(drillKey) : undefined}
                      />
                    );
                  })
                )}
              </div>

              {/* Critical Now */}
              <SectionTitle>Critical Now</SectionTitle>
              <CriticalNow onItemClick={(type, id) => openPanel(type as "decision" | "project", id)} />

              {/* Enterprise Milestones */}
              <SectionTitle>Enterprise Milestones</SectionTitle>
              <div className="bg-dark-2 rounded-[10px] border border-dark-4 px-6 py-2 mb-2">
                <MilestoneBar milestones={milestonesToBar} />
              </div>

              {/* Portfolio */}
              <SectionTitle>Portfolio — Active Workstreams</SectionTitle>
              <div className="bg-dark-2 rounded-[10px] border border-dark-4 overflow-hidden">
                <div className="flex items-center px-3 py-2 text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
                  <div className="w-2 mr-3" />
                  <div className="flex-1">Project</div>
                  <div className="w-16 text-center">Priority</div>
                  <div className="w-[80px] text-right">Stage</div>
                  <div className="w-5" />
                </div>
                {(projects.length > 0 ? projects : SEED_PROJECTS).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={handleProjectClick}
                  />
                ))}
              </div>

              {/* Admin & Compliance Tasks */}
              <SectionTitle>Admin &amp; Compliance</SectionTitle>
              <AdminSwimlane onTaskClick={(task) => openPanel("task", task.code)} />

              {/* Daily Briefing */}
              <SectionTitle>Daily Briefing</SectionTitle>
              <DailyBriefing />

              {/* Quick Actions */}
              <SectionTitle>Quick Actions</SectionTitle>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: "📋", label: "Daily Briefing",     desc: "Ask Chief of Staff" },
                  { icon: "🤝", label: "Pipeline Status",    desc: "Ask BizDev Agent" },
                  { icon: "✍️", label: "Draft Proposal",     desc: "Ask Content Agent" },
                  { icon: "🏗️", label: "Architecture Review",desc: "Ask MBSE Agent" },
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

          {/* ── Other views ─────────────────────────────────────── */}
          {activeView === "projects"     && <ProjectsView />}
          {activeView === "pipeline"     && <PipelineView />}
          {activeView === "roadmap"      && <RoadmapView />}
          {activeView === "sprint"       && <SprintBoardView />}
          {activeView === "org"          && <OrgChartView />}
          {activeView === "intelligence" && <IntelligenceView />}

          {activeView === "settings" && (
            <SettingsView onViewChange={setActiveView} />
          )}
          {activeView === "admin" && (
            <UserManagementView onViewChange={setActiveView} />
          )}
        </main>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />

      {/* Universal Detail Panel */}
      <DetailPanel />

      {/* KPI Drill Panel */}
      <KpiDrillPanel data={kpiDrill} onClose={() => setKpiDrill(null)} />

      {/* Create Record Modal */}
      {showCreateModal && (
        <CreateRecordModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(_type, _data) => {
            setShowCreateModal(false);
            // Reload dashboard data so new records appear immediately
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

// ── Root export — wraps with PanelProvider ─────────────────────

export default function DashboardPage() {
  return (
    <PanelProvider>
      <DashboardInner />
    </PanelProvider>
  );
}
