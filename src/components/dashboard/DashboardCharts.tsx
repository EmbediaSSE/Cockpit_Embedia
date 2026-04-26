"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RevenueBar {
  name: string;
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
  revenueData: RevenueBar[];
  pipelineData: PipelineSlice[];
  statusData: StatusBar[];
  totalAccounts: number;
  totalRevenue: number;
}

// ── Color map for pipeline stages ─────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  target:       "#3498DB",
  engaged:      "#8E44AD",
  proposal:     "#F39C12",
  active:       "#F5A623",
  retained:     "#27AE60",
  churned:      "#8E8E93",
  identified:   "#3498DB",
  submitted:    "#8E44AD",
  due_diligence:"#F39C12",
  term_sheet:   "#F5A623",
  closed_won:   "#27AE60",
  closed_lost:  "#E74C3C",
  researched:   "#8E44AD",
  approached:   "#F39C12",
  screening:    "#F5A623",
  placed:       "#27AE60",
  member:       "#27AE60",
  ambassador:   "#F5A623",
};

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data }: { data: RevenueBar[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-grey text-sm">
        No revenue data yet
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const chartH  = 140;
  const barW    = 36;
  const gap     = 16;
  const padL    = 48;
  const padB    = 28;
  const padT    = 18;
  const totalW  = padL + data.length * (barW + gap) - gap + 8;
  const plotH   = chartH - padT - padB;

  // Y-axis ticks
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
      aria-label="Revenue by project"
    >
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={padL} y1={t.y} x2={totalW} y2={t.y}
            stroke="#2A2A2A" strokeWidth={1} strokeDasharray="3 3"
          />
          <text
            x={padL - 6} y={t.y + 4}
            textAnchor="end" fontSize={9} fill="#5A5A5F"
          >
            {t.v >= 1000 ? `€${(t.v / 1000).toFixed(0)}k` : `€${t.v}`}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * (barW + gap);
        const h = Math.max((d.revenue / maxVal) * plotH, 2);
        const y = chartH - padB - h;
        const opacity = 0.75 + (i === 0 ? 0.25 : 0);
        return (
          <g key={d.name}>
            {/* Bar background (ghost) */}
            <rect
              x={x} y={padT} width={barW} height={plotH}
              rx={4} fill="#1E1E1E"
            />
            {/* Actual bar — gold=Won, dimmer=Active */}
            <rect
              x={x} y={y} width={barW} height={h}
              rx={4}
              fill={data[i]?.stage === "Won" ? "#F5A623" : "#C47D0E"}
              opacity={opacity}
            >
              <animate
                attributeName="height" from="0" to={h}
                dur="0.5s" calcMode="spline"
                keySplines="0.4 0 0.2 1" fill="freeze"
              />
              <animate
                attributeName="y" from={chartH - padB} to={y}
                dur="0.5s" calcMode="spline"
                keySplines="0.4 0 0.2 1" fill="freeze"
              />
            </rect>
            {/* Value label above bar */}
            <text
              x={x + barW / 2} y={y - 5}
              textAnchor="middle" fontSize={9} fill="#F5A623" fontWeight="600"
            >
              {d.revenue >= 1000 ? `€${(d.revenue / 1000).toFixed(0)}k` : `€${d.revenue}`}
            </text>
            {/* X label */}
            <text
              x={x + barW / 2} y={chartH - 8}
              textAnchor="middle" fontSize={9} fill="#8E8E93"
            >
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
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-grey text-xs">
        No pipeline data
      </div>
    );
  }

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
    <svg viewBox="0 0 108 108" className="w-28 h-28" aria-label="Pipeline distribution">
      {arcs.map((arc, i) =>
        arc.path ? (
          <path
            key={i}
            d={arc.path}
            fill={arc.color}
            opacity={0.9}
            stroke="#111111"
            strokeWidth={1.5}
          />
        ) : null
      )}
      {/* Center text */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight="700" fill="#FFFFFF">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill="#8E8E93">
        accounts
      </text>
    </svg>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-dark-3 rounded animate-pulse ${className ?? ""}`} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [projectsRes, pipelineRes] = await Promise.all([
        supabase
          .from("projects")
          .select("code, name, selling_price, margin_pct, status, stage"),
        supabase
          .from("pipeline_accounts")
          .select("status, swimlane"),
      ]);

      const projects = projectsRes.data ?? [];
      const accounts = pipelineRes.data ?? [];

      // ── Revenue bars: Won + Active only — exclude Lost, Planned, Concept ──
      // Lost RFQs and pipeline opportunities must not inflate confirmed revenue.
      const REVENUE_STAGES = ["Won", "Active"];
      const revenueData: RevenueBar[] = projects
        .filter((p) => (p.selling_price ?? 0) > 0)
        .filter((p) => REVENUE_STAGES.includes(p.stage ?? ""))
        .sort((a, b) => b.selling_price - a.selling_price)
        .slice(0, 7)
        .map((p) => ({
          name:    p.code || p.name?.slice(0, 10) || "—",
          revenue: p.selling_price,
          margin:  p.margin_pct ?? 0,
          stage:   p.stage as string,
        }));

      const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0);

      // ── Pipeline donut ────────────────────────────────────────
      const stageCounts: Record<string, number> = {};
      for (const acc of accounts) {
        if (acc.status) stageCounts[acc.status] = (stageCounts[acc.status] ?? 0) + 1;
      }
      const pipelineData: PipelineSlice[] = Object.entries(stageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([stage, count]) => ({
          name:  stage.replace(/_/g, " "),
          value: count,
          color: STAGE_COLORS[stage] ?? "#8E8E93",
        }));

      const totalAccounts = accounts.length;

      // ── Project status bars ───────────────────────────────────
      const activeCount  = projects.filter((p) => p.status === "active").length;
      const pendingCount = projects.filter((p) => p.status === "pending").length;
      const doneCount    = projects.filter((p) => p.status === "done").length;
      const statusData: StatusBar[] = [
        { name: "Active",  value: activeCount,  color: "#27AE60" },
        { name: "Pending", value: pendingCount, color: "#F39C12" },
        { name: "Done",    value: doneCount,    color: "#8E8E93" },
      ].filter((d) => d.value > 0);

      setData({ revenueData, pipelineData, statusData, totalAccounts, totalRevenue });
      setLoading(false);
    }

    load();
  }, []);

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Skeleton className="lg:col-span-2 h-56" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[138px]" />
          <Skeleton className="h-[102px]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { revenueData, pipelineData, statusData, totalAccounts, totalRevenue } = data;
  const totalStatusCount = statusData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

      {/* ── Revenue Bar Chart ──────────────────────────────────── */}
      <div className="lg:col-span-2 bg-dark-2 rounded-xl border border-dark-4 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-white">Confirmed Revenue</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-grey">Won &amp; Active projects only · EUR</span>
              <span className="flex items-center gap-1 text-[9px] text-grey">
                <span className="w-2 h-2 rounded-sm inline-block" style={{background:"#F5A623"}} /> Won
              </span>
              <span className="flex items-center gap-1 text-[9px] text-grey">
                <span className="w-2 h-2 rounded-sm inline-block" style={{background:"#C47D0E"}} /> Active
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gold">
              {totalRevenue >= 1000
                ? `€${(totalRevenue / 1000).toFixed(0)}k`
                : `€${totalRevenue}`}
            </div>
            <div className="text-[10px] text-grey">total</div>
          </div>
        </div>
        <BarChart data={revenueData} />
      </div>

      {/* ── Right column: Donut + Status bars ─────────────────── */}
      <div className="flex flex-col gap-4">

        {/* BD Pipeline Donut */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-4 flex gap-4 items-center">
          <DonutChart data={pipelineData} total={totalAccounts} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white mb-2">BD Pipeline</div>
            <div className="space-y-1.5">
              {pipelineData.slice(0, 5).map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: d.color }}
                  />
                  <span className="text-[10px] text-grey capitalize truncate">{d.name}</span>
                  <span className="text-[10px] font-semibold text-white ml-auto">{d.value}</span>
                </div>
              ))}
              {pipelineData.length > 5 && (
                <div className="text-[9px] text-grey">
                  +{pipelineData.length - 5} more stages
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Status Progress Bars */}
        <div className="bg-dark-2 rounded-xl border border-dark-4 p-4">
          <div className="text-xs font-semibold text-white mb-3">Project Status</div>
          <div className="space-y-3">
            {statusData.map((d) => {
              const pct = totalStatusCount > 0
                ? Math.round((d.value / totalStatusCount) * 100)
                : 0;
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-grey">{d.name}</span>
                    <span style={{ color: d.color }} className="font-semibold">
                      {d.value} &middot; {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-dark-4 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Stacked bar */}
          {totalStatusCount > 0 && (
            <div className="mt-3 h-1.5 bg-dark-4 rounded-full overflow-hidden flex">
              {statusData.map((d) => (
                <div
                  key={d.name}
                  className="h-full transition-all duration-700"
                  style={{
                    width: `${(d.value / totalStatusCount) * 100}%`,
                    background: d.color,
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
