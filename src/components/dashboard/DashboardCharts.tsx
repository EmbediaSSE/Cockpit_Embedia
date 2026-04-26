"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EngagementRow {
  account_id: string;
  outcome: string;
  type: string;
  value: number;
  date: string | null;
  pipeline_accounts: { id: string; name: string } | null;
}

interface RevenueBar {
  accountId: string;
  name: string;
  revenue: number;
}

interface ProjectBar {
  name: string;
  code: string;
  revenue: number;
  margin: number;
  stage?: string;
}

interface PipelineSlice {
  name: string;
  value: number;
  color: string;
}

interface StatusBar {
  name: string;
  value: number;
  color: string;
}

interface ChartData {
  engagements: EngagementRow[];
  projectBars: ProjectBar[];
  pipelineData: PipelineSlice[];
  statusData: StatusBar[];
  totalAccounts: number;
  projectRevenue: number;
}

type YearFilter = "all" | number;

// ── Color map for pipeline stages ─────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  target:        "#3498DB",
  engaged:       "#8E44AD",
  proposal:      "#F39C12",
  active:        "#F5A623",
  retained:      "#27AE60",
  churned:       "#8E8E93",
  identified:    "#3498DB",
  submitted:     "#8E44AD",
  due_diligence: "#F39C12",
  term_sheet:    "#F5A623",
  closed_won:    "#27AE60",
  closed_lost:   "#E74C3C",
  researched:    "#8E44AD",
  approached:    "#F39C12",
  screening:     "#F5A623",
  placed:        "#27AE60",
  member:        "#27AE60",
  ambassador:    "#F5A623",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtK(v: number): string {
  if (v === 0) return "—";
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `€${(v / 1000).toFixed(0)}k`;
  return `€${v}`;
}

// ── SVG Engagement Revenue Bar Chart ─────────────────────────────────────────

function EngagementBarChart({
  data,
  onBarClick,
}: {
  data: RevenueBar[];
  onBarClick?: (accountId: string, name: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-grey text-xs">
        No revenue data for this period
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const chartH = 140;
  const barW   = 38;
  const gap    = 14;
  const padL   = 52;
  const padB   = 30;
  const padT   = 18;
  const totalW = padL + data.length * (barW + gap) - gap + 12;
  const plotH  = chartH - padT - padB;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = (maxVal / tickCount) * i;
    return { v, y: chartH - padB - (v / maxVal) * plotH };
  });

  return (
    <svg
      viewBox={`0 0 ${totalW} ${chartH}`}
      className="w-full"
      style={{ height: chartH }}
      aria-label="Revenue by account"
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={t.y} x2={totalW} y2={t.y}
            stroke="#2A2A2A" strokeWidth={1} strokeDasharray="3 3" />
          <text x={padL - 6} y={t.y + 4}
            textAnchor="end" fontSize={9} fill="#5A5A5F">
            {fmtK(t.v)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const x  = padL + i * (barW + gap);
        const h  = Math.max((d.revenue / maxVal) * plotH, 2);
        const y  = chartH - padB - h;
        const clickable = !!onBarClick;
        return (
          <g
            key={d.accountId}
            onClick={clickable ? () => onBarClick!(d.accountId, d.name) : undefined}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            {/* Hit area */}
            <rect x={x - 4} y={padT - 4} width={barW + 8} height={plotH + 4} fill="transparent" />
            {/* Ghost */}
            <rect x={x} y={padT} width={barW} height={plotH} rx={4} fill="#1E1E1E" />
            {/* Bar */}
            <rect x={x} y={y} width={barW} height={h} rx={4} fill="#27AE60" opacity={0.85}>
              <animate attributeName="height" from="0" to={h}
                dur="0.45s" calcMode="spline" keySplines="0.4 0 0.2 1" fill="freeze" />
              <animate attributeName="y" from={chartH - padB} to={y}
                dur="0.45s" calcMode="spline" keySplines="0.4 0 0.2 1" fill="freeze" />
            </rect>
            {/* Value */}
            <text x={x + barW / 2} y={y - 5}
              textAnchor="middle" fontSize={9} fill="#27AE60" fontWeight="600">
              {fmtK(d.revenue)}
            </text>
            {/* Label */}
            <text
              x={x + barW / 2} y={chartH - 8}
              textAnchor="middle" fontSize={9}
              fill={clickable ? "#C0C0C6" : "#8E8E93"}
              textDecoration={clickable ? "underline" : undefined}
            >
              {d.name.length > 9 ? d.name.slice(0, 8) + "…" : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Project Bar Chart (active pipeline) ───────────────────────────────────

function ProjectBarChart({
  data,
  onBarClick,
}: {
  data: ProjectBar[];
  onBarClick?: (code: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-grey text-xs">
        No active project revenue
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const chartH = 140;
  const barW   = 36;
  const gap    = 14;
  const padL   = 48;
  const padB   = 28;
  const padT   = 18;
  const totalW = padL + data.length * (barW + gap) - gap + 8;
  const plotH  = chartH - padT - padB;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const v = (maxVal / tickCount) * i;
    return { v, y: chartH - padB - (v / maxVal) * plotH };
  });

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH}`} className="w-full" style={{ height: chartH }}>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={t.y} x2={totalW} y2={t.y}
            stroke="#2A2A2A" strokeWidth={1} strokeDasharray="3 3" />
          <text x={padL - 6} y={t.y + 4} textAnchor="end" fontSize={9} fill="#5A5A5F">
            {fmtK(t.v)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padL + i * (barW + gap);
        const h = Math.max((d.revenue / maxVal) * plotH, 2);
        const y = chartH - padB - h;
        const color = d.stage === "Won" ? "#F5A623" : "#C47D0E";
        return (
          <g key={d.code}
            onClick={onBarClick ? () => onBarClick!(d.code) : undefined}
            style={{ cursor: onBarClick ? "pointer" : "default" }}>
            <rect x={x - 4} y={padT - 4} width={barW + 8} height={plotH + 4} fill="transparent" />
            <rect x={x} y={padT} width={barW} height={plotH} rx={4} fill="#1E1E1E" />
            <rect x={x} y={y} width={barW} height={h} rx={4} fill={color} opacity={0.8}>
              <animate attributeName="height" from="0" to={h}
                dur="0.5s" calcMode="spline" keySplines="0.4 0 0.2 1" fill="freeze" />
              <animate attributeName="y" from={chartH - padB} to={y}
                dur="0.5s" calcMode="spline" keySplines="0.4 0 0.2 1" fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={y - 5}
              textAnchor="middle" fontSize={9} fill="#F5A623" fontWeight="600">
              {fmtK(d.revenue)}
            </text>
            <text x={x + barW / 2} y={chartH - 8}
              textAnchor="middle" fontSize={9} fill="#C0C0C6"
              textDecoration="underline">
              {d.name.length > 8 ? d.name.slice(0, 7) + "…" : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Donut Chart ───────────────────────────────────────────────────────────

function DonutChart({ data, total }: { data: PipelineSlice[]; total: number }) {
  if (data.length === 0) return (
    <div className="flex items-center justify-center h-28 text-grey text-xs">No pipeline data</div>
  );

  const cx = 54, cy = 54, R = 46, r = 28;
  let angle = -Math.PI / 2;

  const arcs = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const start = angle;
    angle += sweep;
    const end = angle;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end);
    const ix1 = cx + r * Math.cos(start), iy1 = cy + r * Math.sin(start);
    const ix2 = cx + r * Math.cos(end),   iy2 = cy + r * Math.sin(end);
    const large = sweep > Math.PI ? 1 : 0;
    const path = sweep < 0.001 ? "" :
      `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} ` +
      `L ${ix2} ${iy2} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { path, color: d.color, name: d.name, value: d.value };
  });

  return (
    <svg viewBox="0 0 108 108" className="w-28 h-28">
      {arcs.map((arc, i) => arc.path ? (
        <path key={i} d={arc.path} fill={arc.color} opacity={0.9} stroke="#111111" strokeWidth={1.5} />
      ) : null)}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight="700" fill="#FFFFFF">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#8E8E93">accounts</text>
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-dark-3 rounded animate-pulse ${className ?? ""}`} />;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardCharts({ onBarClick }: { onBarClick?: (projectCode: string) => void } = {}) {
  const router = useRouter();
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueFilter, setRevenueFilter] = useState<YearFilter>("all");

  const currentYear = new Date().getFullYear();
  const prevYear    = currentYear - 1;

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [projectsRes, pipelineRes, engRes] = await Promise.all([
        supabase.from("projects").select("code, name, selling_price, margin_pct, status, stage"),
        supabase.from("pipeline_accounts").select("status, swimlane"),
        supabase.from("customer_engagements")
          .select("account_id, outcome, type, value, date, pipeline_accounts(id, name)"),
      ]);

      const projects    = projectsRes.data ?? [];
      const accounts    = pipelineRes.data ?? [];
      const engagements = (engRes.data ?? []) as EngagementRow[];

      // ── Project bars (active pipeline) ───────────────────────
      const REVENUE_STAGES  = ["Won", "Active"];
      const EXCLUDED_STATUS = ["cancelled", "on_hold"];
      const projectBars: ProjectBar[] = projects
        .filter(p => (p.selling_price ?? 0) > 0)
        .filter(p => REVENUE_STAGES.includes(p.stage ?? ""))
        .filter(p => !EXCLUDED_STATUS.includes((p.status ?? "").toLowerCase()))
        .sort((a, b) => b.selling_price - a.selling_price)
        .slice(0, 7)
        .map(p => ({
          code:    p.code || p.name?.slice(0, 10) || "—",
          name:    p.code || p.name?.slice(0, 10) || "—",
          revenue: p.selling_price,
          margin:  p.margin_pct ?? 0,
          stage:   p.stage as string,
        }));

      const projectRevenue = projectBars.reduce((s, d) => s + d.revenue, 0);

      // ── Pipeline donut ────────────────────────────────────────
      const stageCounts: Record<string, number> = {};
      for (const acc of accounts) {
        if (acc.status) stageCounts[acc.status] = (stageCounts[acc.status] ?? 0) + 1;
      }
      const pipelineData: PipelineSlice[] = Object.entries(stageCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([stage, count]) => ({
          name: stage.replace(/_/g, " "), value: count,
          color: STAGE_COLORS[stage] ?? "#8E8E93",
        }));

      const totalAccounts = accounts.length;

      // ── Project status bars ───────────────────────────────────
      const statusData: StatusBar[] = [
        { name: "Active",  value: projects.filter(p => p.status === "active").length,  color: "#27AE60" },
        { name: "Pending", value: projects.filter(p => p.status === "pending").length, color: "#F39C12" },
        { name: "Done",    value: projects.filter(p => p.status === "done").length,    color: "#8E8E93" },
      ].filter(d => d.value > 0);

      setData({ engagements, projectBars, pipelineData, statusData, totalAccounts, projectRevenue });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Skeleton className="lg:col-span-2 h-64" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[102px]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { engagements, projectBars, pipelineData, statusData, totalAccounts, projectRevenue } = data;
  const totalStatusCount = statusData.reduce((s, d) => s + d.value, 0);

  // ── Compute engagement revenue bars based on active filter ────────────────
  const filteredEngs = revenueFilter === "all"
    ? engagements.filter(e => e.outcome === "won" || e.type === "historical")
    : engagements.filter(e =>
        (e.outcome === "won" || e.outcome === "active") &&
        e.type !== "historical" &&
        e.date != null &&
        new Date(e.date).getFullYear() === (revenueFilter as number)
      );

  // Group by account
  const accountMap: Record<string, { name: string; revenue: number }> = {};
  for (const e of filteredEngs) {
    const id   = e.account_id;
    const name = e.pipeline_accounts?.name ?? "Unknown";
    if (!accountMap[id]) accountMap[id] = { name, revenue: 0 };
    accountMap[id].revenue += e.value || 0;
  }

  const engBars: RevenueBar[] = Object.entries(accountMap)
    .map(([accountId, d]) => ({ accountId, name: d.name, revenue: d.revenue }))
    .filter(d => d.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const engTotal = engBars.reduce((s, d) => s + d.revenue, 0);

  // Quick stat for each filter option (for the pill sub-labels)
  const allGross = engagements
    .filter(e => e.outcome === "won" || e.type === "historical")
    .reduce((s, e) => s + (e.value || 0), 0);
  const cyTotal = engagements
    .filter(e => (e.outcome === "won" || e.outcome === "active") && e.type !== "historical" && e.date && new Date(e.date).getFullYear() === currentYear)
    .reduce((s, e) => s + (e.value || 0), 0);
  const pyTotal = engagements
    .filter(e => (e.outcome === "won" || e.outcome === "active") && e.type !== "historical" && e.date && new Date(e.date).getFullYear() === prevYear)
    .reduce((s, e) => s + (e.value || 0), 0);

  // Order: past years left → current year → future (active)
  // Pills: prev year | current year | All time
  const filterOptions: { key: YearFilter; label: string; sub: string; note?: string }[] = [
    { key: prevYear,    label: String(prevYear),    sub: fmtK(pyTotal),  note: "won" },
    { key: currentYear, label: String(currentYear), sub: fmtK(cyTotal),  note: "won + active" },
    { key: "all",       label: "All time",          sub: fmtK(allGross), note: "gross" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

      {/* ── Confirmed Revenue — engagement-based, interactive ──── */}
      <div className="lg:col-span-2 bg-dark-2 rounded-xl border border-dark-4 p-5">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Confirmed Revenue</div>
            <div className="text-xs text-grey mt-0.5">From won engagements · EUR</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-green">{fmtK(engTotal)}</div>
            <div className="text-[10px] text-grey">
              {revenueFilter === "all" ? "all time gross" : `${revenueFilter} total`}
            </div>
          </div>
        </div>

        {/* Year filter — proper tab buttons, past → present → all time */}
        <div className="flex gap-1.5 mb-4 bg-dark-3 p-1 rounded-lg w-fit">
          {filterOptions.map(opt => {
            const active = revenueFilter === opt.key;
            return (
              <button
                key={String(opt.key)}
                onClick={() => setRevenueFilter(opt.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                  active
                    ? "bg-dark-1 border border-dark-4 shadow"
                    : "hover:bg-dark-2"
                }`}
              >
                <span className={`text-xs font-bold ${active ? "text-white" : "text-grey"}`}>
                  {opt.label}
                </span>
                <span className={`text-xs font-bold ${
                  active
                    ? opt.key === "all" ? "text-green" : "text-gold"
                    : "text-dark-5"
                }`}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <EngagementBarChart
          data={engBars}
        />

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-4">
          <span className="text-[10px] text-grey">
            {revenueFilter === "all"
              ? "Won + historical engagements across all accounts"
              : `Won & active engagements dated in ${revenueFilter}`}
          </span>
          <a
            href="/pipeline"
            className="text-[10px] font-bold text-gold hover:text-gold/80 transition-colors flex items-center gap-1"
          >
            BD Pipeline
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Right column ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        {/* Active project pipeline */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs font-semibold text-white">Active Pipeline</div>
              <div className="text-[10px] text-grey mt-0.5">Won &amp; Active projects</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gold">{fmtK(projectRevenue)}</div>
            </div>
          </div>
          <ProjectBarChart data={projectBars} onBarClick={onBarClick} />
        </div>

        {/* BD Pipeline Donut */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-4 flex gap-4 items-center">
          <DonutChart data={pipelineData} total={totalAccounts} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white mb-2">BD Pipeline</div>
            <div className="space-y-1.5">
              {pipelineData.slice(0, 5).map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[10px] text-grey capitalize truncate">{d.name}</span>
                  <span className="text-[10px] font-semibold text-white ml-auto">{d.value}</span>
                </div>
              ))}
              {pipelineData.length > 5 && (
                <div className="text-[9px] text-grey">+{pipelineData.length - 5} more stages</div>
              )}
            </div>
          </div>
        </div>

        {/* Project Status Progress Bars */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-4">
          <div className="text-xs font-semibold text-white mb-3">Project Status</div>
          <div className="space-y-3">
            {statusData.map((d) => {
              const pct = totalStatusCount > 0 ? Math.round((d.value / totalStatusCount) * 100) : 0;
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-grey">{d.name}</span>
                    <span style={{ color: d.color }} className="font-semibold">{d.value} · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-4 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {totalStatusCount > 0 && (
            <div className="mt-3 h-1.5 bg-dark-4 rounded-full overflow-hidden flex">
              {statusData.map((d) => (
                <div key={d.name} className="h-full transition-all duration-700"
                  style={{ width: `${(d.value / totalStatusCount) * 100}%`, background: d.color }} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
