"use client";

import { useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────

export interface KpiDrillData {
  kpiKey: "active_projects" | "revenue_pipeline" | "avg_margin" | "bd_pipeline" | "overdue_items" | "next_milestone";
  label: string;
  value: string;
  sub: string;
  // Raw data passed from the dashboard
  projects?: Array<{
    code: string; name: string; client: string; category: string;
    stage: string; status: string; priority: string;
    selling_price: number; margin_pct: number; target_date: string | null;
  }>;
  tasks?: Array<{ task_code?: string; name?: string; status: string; due_date: string | null }>;
  accounts?: Array<{ id: string; name?: string; status: string; category?: string; country?: string }>;
  milestones?: Array<{ name: string; target_date: string | null; status: string }>;
}

interface Props {
  data: KpiDrillData | null;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-status-green", done: "bg-status-green", won: "bg-status-green",
    pending: "bg-dark-5", planned: "bg-dark-5", identified: "bg-dark-5",
    contacted: "bg-blue-500", qualified: "bg-amber-500", proposal: "bg-purple-500",
    lost: "bg-status-red", overdue: "bg-status-red",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? "bg-dark-5"} mr-1.5 flex-shrink-0`} />;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 mb-2 mt-5">
      {children}
    </div>
  );
}

function NextStepCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex gap-2.5 items-start bg-dark-3 rounded-lg p-3 border border-dark-4">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <p className="text-xs text-grey leading-relaxed">{text}</p>
    </div>
  );
}

// ── Per-KPI content ───────────────────────────────────────────

function ActiveProjectsContent({ data }: { data: KpiDrillData }) {
  const projects = data.projects || [];
  const active = projects.filter((p) => p.status === "active");
  const byCategory = active.reduce<Record<string, typeof active>>((acc, p) => {
    acc[p.category] = [...(acc[p.category] || []), p];
    return acc;
  }, {});

  const nextSteps = [];
  if (active.filter((p) => p.category === "Consultancy").length === 0)
    nextSteps.push({ icon: "🤝", text: "No active consultancy engagements. A new client project would directly improve revenue." });
  if (active.filter((p) => p.category === "Product").length >= 2)
    nextSteps.push({ icon: "⚡", text: "2+ product workstreams running in parallel. Review capacity — consider staging milestones to avoid bottlenecks." });
  if (active.length === 0)
    nextSteps.push({ icon: "🚀", text: "No active projects detected. Check that projects are marked as 'active' in Supabase." });
  if (nextSteps.length === 0)
    nextSteps.push({ icon: "✅", text: "Portfolio balance looks healthy. Keep monitoring priority alignment each sprint." });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Count of rows in <span className="text-gold font-mono">projects</span> where{" "}
        <span className="text-gold font-mono">status = &apos;active&apos;</span>. Breakdown sub-label splits by{" "}
        <span className="text-gold font-mono">category</span>.
      </p>

      <SectionHeading>Breakdown by category</SectionHeading>
      {Object.entries(byCategory).length === 0 ? (
        <p className="text-xs text-dark-5">No active projects.</p>
      ) : (
        Object.entries(byCategory).map(([cat, ps]) => (
          <div key={cat} className="mb-3">
            <div className="text-[10px] font-bold text-grey mb-1.5">{cat} <span className="text-dark-5">({ps.length})</span></div>
            <div className="space-y-1.5">
              {ps.map((p) => (
                <div key={p.code} className="flex items-center justify-between bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
                  <div>
                    <div className="text-xs font-medium text-white">{p.name}</div>
                    <div className="text-[10px] text-dark-5">{p.client} · {p.code} · {p.priority}</div>
                  </div>
                  <div className="flex items-center">
                    <StatusDot status={p.status} />
                    <span className="text-[10px] text-grey">{p.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

function RevenuePipelineContent({ data }: { data: KpiDrillData }) {
  const projects = data.projects || [];
  const billable = projects.filter((p) => p.selling_price > 0 && ["active", "pending"].includes(p.status));
  const total = billable.reduce((s, p) => s + p.selling_price, 0);

  const nextSteps = [];
  if (total === 0)
    nextSteps.push({ icon: "💰", text: "No billable revenue in the pipeline. Prioritise closing a BD deal or creating a new consultancy engagement." });
  if (billable.length === 1)
    nextSteps.push({ icon: "⚠️", text: "Revenue depends on a single engagement. High concentration risk — diversify with at least one more client." });
  if (total > 0 && billable.length > 1)
    nextSteps.push({ icon: "📈", text: "Good spread across engagements. Ensure delivery timelines are aligned to invoice milestones." });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Sum of <span className="text-gold font-mono">selling_price</span> for all projects where{" "}
        <span className="text-gold font-mono">selling_price &gt; 0</span> AND{" "}
        <span className="text-gold font-mono">status IN (active, pending)</span>. Internal product and ops projects are excluded (selling_price = 0).
      </p>

      <SectionHeading>Billable engagements ({billable.length})</SectionHeading>
      {billable.length === 0 ? (
        <p className="text-xs text-dark-5 bg-dark-3 rounded-lg px-3 py-2.5">No billable projects at this time.</p>
      ) : (
        <div className="space-y-1.5">
          {billable.map((p) => (
            <div key={p.code} className="flex items-center justify-between bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
              <div>
                <div className="text-xs font-medium text-white">{p.name}</div>
                <div className="text-[10px] text-dark-5">{p.client} · {p.code}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gold">€{p.selling_price.toLocaleString()}</div>
                <div className="text-[10px] text-dark-5">{p.margin_pct}% margin</div>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 text-xs font-bold text-white border-t border-dark-4 mt-1">
            <span>Total</span>
            <span className="text-gold">€{total.toLocaleString()}</span>
          </div>
        </div>
      )}

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

function AvgMarginContent({ data }: { data: KpiDrillData }) {
  const projects = data.projects || [];
  const withMargin = projects.filter((p) => p.margin_pct > 0);
  const avg = withMargin.length > 0
    ? Math.round(withMargin.reduce((s, p) => s + p.margin_pct, 0) / withMargin.length)
    : 0;

  const nextSteps = [];
  if (avg >= 70)
    nextSteps.push({ icon: "✅", text: "Excellent margin. This reflects strong value positioning. Document the delivery model so it's replicable." });
  if (avg < 50 && avg > 0)
    nextSteps.push({ icon: "⚠️", text: "Margin below 50%. Review cost structure — are delivery days, tools, and overhead correctly accounted for?" });
  if (withMargin.length <= 1)
    nextSteps.push({ icon: "📊", text: "Margin is based on only 1 engagement. Add selling_price and margin_pct to new projects for a representative average." });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Average of <span className="text-gold font-mono">margin_pct</span> across all projects where{" "}
        <span className="text-gold font-mono">margin_pct &gt; 0</span>. Projects without a margin set are excluded to avoid skew.
      </p>

      <SectionHeading>Per-engagement margin</SectionHeading>
      {withMargin.length === 0 ? (
        <p className="text-xs text-dark-5 bg-dark-3 rounded-lg px-3 py-2.5">No margin data available. Set margin_pct on your projects.</p>
      ) : (
        <div className="space-y-1.5">
          {withMargin.map((p) => (
            <div key={p.code} className="flex items-center justify-between bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
              <div>
                <div className="text-xs font-medium text-white">{p.name}</div>
                <div className="text-[10px] text-dark-5">{p.client} · €{p.selling_price.toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-dark-4 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${p.margin_pct >= 70 ? "bg-status-green" : p.margin_pct >= 50 ? "bg-amber-500" : "bg-status-red"}`}
                    style={{ width: `${Math.min(p.margin_pct, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-white w-10 text-right">{p.margin_pct}%</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 text-xs font-bold border-t border-dark-4 mt-1">
            <span className="text-grey">Average</span>
            <span className="text-gold">{avg}%</span>
          </div>
        </div>
      )}

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

function BdPipelineContent({ data }: { data: KpiDrillData }) {
  const accounts = data.accounts || [];
  const STAGES = ["identified", "contacted", "qualified", "proposal", "won", "lost"];
  const stageCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = accounts.filter((a) => a.status === s).length;
    return acc;
  }, {});
  const stageColors: Record<string, string> = {
    identified: "bg-dark-5", contacted: "bg-blue-500", qualified: "bg-amber-500",
    proposal: "bg-purple-500", won: "bg-status-green", lost: "bg-status-red",
  };

  const nextSteps = [];
  if (accounts.length === 0)
    nextSteps.push({ icon: "🎯", text: "Pipeline is empty. Use the BD Pipeline view to add your first prospect — or ask Claude to add one by name." });
  if (stageCounts.won === 0 && accounts.length > 0)
    nextSteps.push({ icon: "🏆", text: "No closed-won deals yet. Focus on moving qualified/proposal accounts to close." });
  if (stageCounts.identified > 3)
    nextSteps.push({ icon: "📞", text: `${stageCounts.identified} accounts in Identified with no outreach. Schedule intro calls to move them forward.` });
  if (accounts.length > 0 && stageCounts.won > 0)
    nextSteps.push({ icon: "✅", text: `${stageCounts.won} won account(s). Document the winning pattern and replicate outreach.` });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Total count of rows in <span className="text-gold font-mono">pipeline_accounts</span>. The sub-label shows won accounts and those in{" "}
        <span className="text-gold font-mono">contacted · qualified · proposal</span> stages.
      </p>

      <SectionHeading>Pipeline funnel</SectionHeading>
      <div className="space-y-1.5">
        {STAGES.map((stage) => (
          <div key={stage} className="flex items-center gap-3 bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
            <div className="flex items-center gap-1.5 w-24">
              <span className={`w-2 h-2 rounded-full ${stageColors[stage]}`} />
              <span className="text-[10px] text-grey capitalize">{stage}</span>
            </div>
            <div className="flex-1 bg-dark-4 rounded-full h-1.5">
              {accounts.length > 0 && (
                <div
                  className={`h-1.5 rounded-full ${stageColors[stage]}`}
                  style={{ width: `${(stageCounts[stage] / accounts.length) * 100}%` }}
                />
              )}
            </div>
            <span className="text-xs font-bold text-white w-4 text-right">{stageCounts[stage]}</span>
          </div>
        ))}
      </div>

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

function OverdueItemsContent({ data }: { data: KpiDrillData }) {
  const tasks = data.tasks || [];
  const overdue = tasks.filter((t) => t.due_date && t.due_date < TODAY && t.status !== "done");
  const projects = data.projects || [];

  const nextSteps = [];
  if (overdue.length === 0)
    nextSteps.push({ icon: "✅", text: "No overdue items. Keep sprint tasks up to date to maintain this." });
  if (overdue.length > 0)
    nextSteps.push({ icon: "🔴", text: `${overdue.length} task(s) are past due. Go to the Sprint Board and either complete or reschedule them.` });
  if (overdue.length > 5)
    nextSteps.push({ icon: "⚠️", text: "High overdue count suggests a planning issue. Consider a sprint retrospective and re-baselining task due dates." });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Count of rows in <span className="text-gold font-mono">wbs_tasks</span> where{" "}
        <span className="text-gold font-mono">due_date &lt; today</span> AND{" "}
        <span className="text-gold font-mono">status ≠ done</span>.
      </p>

      <SectionHeading>Overdue tasks ({overdue.length})</SectionHeading>
      {overdue.length === 0 ? (
        <p className="text-xs text-dark-5 bg-dark-3 rounded-lg px-3 py-2.5">All tasks are on track.</p>
      ) : (
        <div className="space-y-1.5">
          {overdue.map((t, i) => {
            const daysAgo = t.due_date
              ? Math.ceil((new Date(TODAY).getTime() - new Date(t.due_date).getTime()) / 86400000)
              : 0;
            return (
              <div key={i} className="flex items-center justify-between bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
                <div className="flex items-center gap-2">
                  <StatusDot status="overdue" />
                  <div>
                    <div className="text-xs font-medium text-white">
                      {(t as {task_code?: string}).task_code ? `${(t as {task_code?: string}).task_code} — ` : ""}
                      {(t as {name?: string}).name || "Task"}
                    </div>
                    <div className="text-[10px] text-dark-5">Due {formatDate(t.due_date)}</div>
                  </div>
                </div>
                <span className="text-[10px] text-status-red font-semibold">{daysAgo}d ago</span>
              </div>
            );
          })}
        </div>
      )}

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

function NextMilestoneContent({ data }: { data: KpiDrillData }) {
  const milestones = data.milestones || [];
  const upcoming = milestones.filter((m) => m.status !== "done" && m.target_date && m.target_date >= TODAY);
  const past = milestones.filter((m) => m.status === "done");
  const next = upcoming[0];
  const daysTo = next?.target_date
    ? Math.ceil((new Date(next.target_date).getTime() - new Date(TODAY).getTime()) / 86400000)
    : null;

  const nextSteps = [];
  if (!next)
    nextSteps.push({ icon: "🗓️", text: "No upcoming milestones. Add milestones to the database to track enterprise delivery progress." });
  if (daysTo !== null && daysTo <= 3)
    nextSteps.push({ icon: "🔴", text: `"${next?.name}" is due in ${daysTo} day(s). Confirm readiness and escalate any blockers now.` });
  if (daysTo !== null && daysTo > 3 && daysTo <= 10)
    nextSteps.push({ icon: "🟡", text: `"${next?.name}" is ${daysTo} days away. Final prep check: deliverables complete? Stakeholders notified?` });
  if (daysTo !== null && daysTo > 10)
    nextSteps.push({ icon: "✅", text: "Next milestone is comfortably ahead. Use this window to clear overdue items and prep the upcoming sprint." });

  return (
    <>
      <SectionHeading>How this is computed</SectionHeading>
      <p className="text-xs text-grey leading-relaxed bg-dark-3 rounded-lg px-3 py-2.5 border border-dark-4">
        Days until the next milestone in <span className="text-gold font-mono">milestones</span> where{" "}
        <span className="text-gold font-mono">status ≠ done</span> AND{" "}
        <span className="text-gold font-mono">target_date ≥ today</span>, ordered ascending.
      </p>

      {upcoming.length > 0 && (
        <>
          <SectionHeading>Upcoming milestones</SectionHeading>
          <div className="space-y-1.5">
            {upcoming.slice(0, 6).map((m, i) => {
              const days = m.target_date
                ? Math.ceil((new Date(m.target_date).getTime() - new Date(TODAY).getTime()) / 86400000)
                : null;
              return (
                <div key={i} className="flex items-center justify-between bg-dark-3 rounded-lg px-3 py-2 border border-dark-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${m.status === "active" ? "bg-amber-500" : "bg-dark-5"}`} />
                    <div>
                      <div className="text-xs font-medium text-white">{m.name}</div>
                      <div className="text-[10px] text-dark-5">{formatDate(m.target_date)}</div>
                    </div>
                  </div>
                  {days !== null && (
                    <span className={`text-[10px] font-semibold ${days <= 3 ? "text-status-red" : days <= 7 ? "text-amber-400" : "text-grey"}`}>
                      {days}d
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <SectionHeading>Completed ({past.length})</SectionHeading>
          <div className="space-y-1.5">
            {past.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center gap-2 bg-dark-3 rounded-lg px-3 py-2 border border-dark-4 opacity-60">
                <span className="w-2 h-2 rounded-full bg-status-green" />
                <div className="text-xs text-grey">{m.name}</div>
                <div className="ml-auto text-[10px] text-dark-5">{formatDate(m.target_date)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading>Next steps</SectionHeading>
      <div className="space-y-2">
        {nextSteps.map((s, i) => <NextStepCard key={i} {...s} />)}
      </div>
    </>
  );
}

// ── Main panel component ──────────────────────────────────────

const accentBar: Record<string, string> = {
  gold: "bg-gold", green: "bg-status-green", amber: "bg-amber-500",
  blue: "bg-blue-500", red: "bg-status-red",
};

const kpiAccent: Record<string, string> = {
  active_projects: "gold", revenue_pipeline: "green", avg_margin: "amber",
  bd_pipeline: "blue", overdue_items: "red", next_milestone: "gold",
};

export default function KpiDrillPanel({ data, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!data) return null;

  const accent = kpiAccent[data.kpiKey] || "gold";

  return (
    <div className="fixed inset-0 z-[250] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-[440px] bg-dark-2 border-l border-dark-4 flex flex-col overflow-hidden">
        {/* Top accent bar */}
        <div className={`h-[3px] ${accentBar[accent]}`} />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-dark-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 mb-1">{data.label}</div>
            <div className="text-3xl font-extrabold text-white tracking-tight">{data.value}</div>
            <div className="text-xs text-grey mt-0.5">{data.sub}</div>
          </div>
          <button onClick={onClose} className="text-grey hover:text-white transition-colors mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {data.kpiKey === "active_projects"   && <ActiveProjectsContent data={data} />}
          {data.kpiKey === "revenue_pipeline"  && <RevenuePipelineContent data={data} />}
          {data.kpiKey === "avg_margin"        && <AvgMarginContent data={data} />}
          {data.kpiKey === "bd_pipeline"       && <BdPipelineContent data={data} />}
          {data.kpiKey === "overdue_items"     && <OverdueItemsContent data={data} />}
          {data.kpiKey === "next_milestone"    && <NextMilestoneContent data={data} />}
        </div>
      </div>
    </div>
  );
}
