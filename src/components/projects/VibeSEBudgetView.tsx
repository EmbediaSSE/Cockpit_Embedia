"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BudgetTrack {
  id: string;
  track_key: string;
  track_name: string;
  category: string;
  sort_order: number;
  sprints_planned_min: number;
  sprints_planned_max: number;
  cost_planned_min_eur: number;
  cost_planned_max_eur: number;
  sprints_actual: number | null;
  cost_actual_eur: number | null;
  progress_pct: number;
  status: string;
  risk_level: string;
  notes: string;
  updated_at: string;
}

interface Baseline {
  id: string;
  version: string;
  baseline_date: string;
  sprints_total_min: number;
  sprints_total_max: number;
  weeks_total_min: number;
  weeks_total_max: number;
  cost_total_min_eur: number;
  cost_total_max_eur: number;
  notes: string;
  created_at: string;
  vibese_budget_tracks: BudgetTrack[];
}

// ─── Design tokens (Cockpit gold + dark) ──────────────────────────────────────
const GOLD = "#F5A623";
const GOLD_DIM = "rgba(245,166,35,0.18)";
const GOLD_BORDER = "rgba(245,166,35,0.45)";
const GREEN = "#639922";
const RED = "#A32D2D";
const TRACK_BG = "#1C1C1A";
const RING_EMPTY = "#2A2A28";

// ─── Status / risk helpers ────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string }> = {
  not_started: { label: "Not started", dot: "#5F5E5A" },
  in_progress:  { label: "In progress", dot: GOLD },
  done:         { label: "Done",        dot: GREEN },
};
const RISK_META: Record<string, { label: string; color: string }> = {
  low:    { label: "Low",    color: GREEN },
  medium: { label: "Medium", color: GOLD },
  high:   { label: "High",   color: RED },
};

function statusDot(status: string) {
  return STATUS_META[status]?.dot ?? "#5F5E5A";
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
        color: GOLD, background: GOLD_DIM, padding: "2px 8px", borderRadius: 4,
        border: `1px solid ${GOLD_BORDER}`,
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border-tertiary)" }} />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 10, padding: "14px 16px",
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ?? "var(--color-text-primary)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>{sub}</div>
    </div>
  );
}

// ─── Donut ring ───────────────────────────────────────────────────────────────
function DonutRing({ pct, label, status, size = 88 }: {
  pct: number; label: string; status: string; size?: number;
}) {
  const r = (size / 2) - 9;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(pct, 100) / 100) * circ;
  const ringColor = pct === 100 ? GREEN : pct > 0 ? GOLD : RING_EMPTY;
  const dot = statusDot(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: "1 1 0", minWidth: 80 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        {/* Glow behind ring when active */}
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ringColor} strokeWidth={8}
            strokeOpacity={0.12}
            style={{ filter: "blur(4px)" }}
          />
        )}
        {/* Background track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={RING_EMPTY} strokeWidth={6} />
        {/* Progress arc */}
        {pct > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={6}
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
          />
        )}
        {/* Centre label */}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 15, fontWeight: 700, fill: pct > 0 ? ringColor : "var(--color-text-secondary)" }}>
          {pct}%
        </text>
      </svg>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-primary)" }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sprint bar row ───────────────────────────────────────────────────────────
function SprintBar({ track, maxScale }: { track: BudgetTrack; maxScale: number }) {
  const planMin = track.sprints_planned_min;
  const planMax = track.sprints_planned_max;
  const actual  = track.sprints_actual;
  const rLeft   = (planMin / maxScale) * 100;
  const rWidth  = ((planMax - planMin) / maxScale) * 100;
  const aWidth  = actual !== null ? Math.min((actual / maxScale) * 100, 100) : 0;
  const mid     = (planMin + planMax) / 2;
  const variance = actual !== null ? actual - mid : null;
  const varColor = variance === null ? "transparent" : variance > 0 ? RED : GREEN;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "130px 1fr 110px",
      alignItems: "center", gap: 12, padding: "9px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      {/* Label */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{track.track_name}</div>
        <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{track.category}</div>
      </div>

      {/* Bar */}
      <div style={{ position: "relative", height: 22 }}>
        {/* Track */}
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          left: 0, right: 0, height: 6, background: TRACK_BG, borderRadius: 3,
        }} />
        {/* Planned range band */}
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          left: `${rLeft}%`, width: `${rWidth}%`,
          height: 14, background: GOLD_DIM,
          border: `1px solid ${GOLD_BORDER}`, borderRadius: 3,
        }} />
        {/* Actual bar */}
        {actual !== null && (
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            left: 0, width: `${aWidth}%`,
            height: 6, background: GOLD,
            borderRadius: 3,
            boxShadow: `0 0 6px rgba(245,166,35,0.4)`,
          }} />
        )}
      </div>

      {/* Values */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Plan <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{planMin}–{planMax}</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Act</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: actual !== null ? GOLD : "var(--color-text-secondary)" }}>
            {actual ?? "—"}
          </span>
          {variance !== null && (
            <span style={{ fontSize: 10, color: varColor, fontWeight: 500 }}>
              {variance > 0 ? `+${variance.toFixed(0)}` : variance.toFixed(0)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cost bar row ─────────────────────────────────────────────────────────────
function CostBar({ track, maxScale }: { track: BudgetTrack; maxScale: number }) {
  const cMin = track.cost_planned_min_eur;
  const cMax = track.cost_planned_max_eur;
  const actual = track.cost_actual_eur;
  if (cMax === 0 && actual === null) return null; // skip €0 tracks

  const rLeft  = (cMin / maxScale) * 100;
  const rWidth = ((cMax - cMin) / maxScale) * 100;
  const aWidth = actual !== null ? Math.min((actual / maxScale) * 100, 100) : 0;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "130px 1fr 130px",
      alignItems: "center", gap: 12, padding: "9px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
    }}>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{track.track_name}</div>
      </div>
      <div style={{ position: "relative", height: 22 }}>
        <div style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          left: 0, right: 0, height: 6, background: TRACK_BG, borderRadius: 3,
        }} />
        {cMax > 0 && (
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            left: `${rLeft}%`, width: `${Math.max(rWidth, 1)}%`,
            height: 14, background: GOLD_DIM,
            border: `1px solid ${GOLD_BORDER}`, borderRadius: 3,
          }} />
        )}
        {actual !== null && actual > 0 && (
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            left: 0, width: `${aWidth}%`,
            height: 6, background: GOLD,
            borderRadius: 3,
            boxShadow: `0 0 6px rgba(245,166,35,0.4)`,
          }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
          Plan{" "}
          <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
            {cMax === 0 ? "€0" : `€${cMin.toLocaleString()}–€${cMax.toLocaleString()}`}
          </span>
        </div>
        <div style={{ fontSize: 11, color: actual !== null ? GOLD : "var(--color-text-secondary)", fontWeight: actual !== null ? 600 : 400 }}>
          Act {actual !== null ? `€${actual.toLocaleString()}` : "—"}
        </div>
      </div>
    </div>
  );
}

// ─── Risk heatmap pill ────────────────────────────────────────────────────────
function RiskPill({ level }: { level: string }) {
  const m = RISK_META[level] ?? RISK_META.low;
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      color: m.color, border: `1px solid ${m.color}44`,
      background: `${m.color}18`,
    }}>{m.label}</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VibeSEBudgetView() {
  const supabase = createClient();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [activeVersion, setActiveVersion] = useState("B0");
  const [loading, setLoading] = useState(true);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [editActuals, setEditActuals] = useState({ sprints: "", cost: "", progress: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data } = await supabase
      .from("vibese_budget_baselines")
      .select("*, vibese_budget_tracks(*)")
      .order("created_at", { ascending: true });
    if (data) {
      const sorted = data.map(b => ({
        ...b,
        vibese_budget_tracks: (b.vibese_budget_tracks || []).sort(
          (a: BudgetTrack, b: BudgetTrack) => a.sort_order - b.sort_order
        ),
      }));
      setBaselines(sorted);
      if (sorted.length > 0) setActiveVersion(sorted[sorted.length - 1].version);
    }
    setLoading(false);
  }

  const active = baselines.find(b => b.version === activeVersion);
  const tracks = active?.vibese_budget_tracks ?? [];

  async function saveActuals(trackId: string) {
    setSaving(true);
    const { error } = await supabase
      .from("vibese_budget_tracks")
      .update({
        sprints_actual:  editActuals.sprints  ? parseInt(editActuals.sprints)   : null,
        cost_actual_eur: editActuals.cost     ? parseFloat(editActuals.cost)    : null,
        progress_pct:    editActuals.progress ? parseInt(editActuals.progress)  : 0,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", trackId);
    if (!error) { setEditingTrack(null); await loadData(); }
    setSaving(false);
  }

  function exportToExcel() {
    if (!active) return;
    const wb = XLSX.utils.book_new();
    const summaryRows = [
      ["VibeSE MVP — Budget Baseline", active.version, new Date(active.baseline_date).toLocaleDateString("en-GB")],
      [],
      ["Metric", "Min", "Max"],
      ["Sprints total", active.sprints_total_min, active.sprints_total_max],
      ["Weeks total", active.weeks_total_min, active.weeks_total_max],
      ["Cost total (€)", active.cost_total_min_eur, active.cost_total_max_eur],
      [],
      ["Notes", active.notes ?? ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    const headers = ["Track","Category","Sprints Plan Min","Sprints Plan Max","Sprints Actual","Sprint Variance","Cost Plan Min (€)","Cost Plan Max (€)","Cost Actual (€)","Progress %","Status","Risk","Notes","Last Updated"];
    const trackRows = tracks.map(t => {
      const mid = (t.sprints_planned_min + t.sprints_planned_max) / 2;
      const v   = t.sprints_actual !== null ? t.sprints_actual - mid : null;
      return [t.track_name, t.category ?? "", t.sprints_planned_min, t.sprints_planned_max, t.sprints_actual ?? "", v !== null ? +v.toFixed(1) : "", t.cost_planned_min_eur, t.cost_planned_max_eur, t.cost_actual_eur ?? "", t.progress_pct, t.status, t.risk_level, t.notes ?? "", t.updated_at ? new Date(t.updated_at).toLocaleDateString("en-GB") : ""];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...trackRows]);
    ws["!cols"] = [22,12,14,14,14,14,16,16,16,12,14,10,40,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, "Tracks");
    XLSX.writeFile(wb, `VibeSE_Budget_${active.version}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // ── Derived scales ─────────────────────────────────────────────────────────
  const maxSprints = tracks.length
    ? Math.max(...tracks.map(t => t.sprints_planned_max), ...tracks.map(t => t.sprints_actual ?? 0)) + 2
    : 15;
  const maxCost = tracks.length
    ? Math.max(...tracks.map(t => t.cost_planned_max_eur), ...tracks.map(t => t.cost_actual_eur ?? 0), 100) * 1.15
    : 5000;

  // ── KPI derived ────────────────────────────────────────────────────────────
  const actualSprints = tracks.reduce((s, t) => s + (t.sprints_actual ?? 0), 0);
  const actualCost    = tracks.reduce((s, t) => s + (t.cost_actual_eur ?? 0), 0);
  const doneCount     = tracks.filter(t => t.status === "done").length;
  const avgProgress   = tracks.length ? Math.round(tracks.reduce((s, t) => s + t.progress_pct, 0) / tracks.length) : 0;

  if (loading) return (
    <div style={{ padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14, textAlign: "center" }}>
      Loading budget baseline…
    </div>
  );

  if (!active) return (
    <div style={{ padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14, textAlign: "center" }}>
      No baseline data found.
    </div>
  );

  return (
    <div style={{ padding: "1.5rem 1.5rem 3rem", maxWidth: 1050 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
            VibeSE MVP — Budget tracker
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
            Actuals vs baseline · updated each sprint
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {baselines.map(b => (
            <button key={b.version} onClick={() => setActiveVersion(b.version)} style={{
              fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${activeVersion === b.version ? GOLD_BORDER : "var(--color-border-tertiary)"}`,
              background: activeVersion === b.version ? GOLD_DIM : "var(--color-background-secondary)",
              color: activeVersion === b.version ? GOLD : "var(--color-text-secondary)",
              cursor: "pointer",
            }}>{b.version}</button>
          ))}
          <button onClick={exportToExcel} style={{
            fontSize: 11, fontWeight: 500, padding: "4px 12px", borderRadius: 6,
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginLeft: 6,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export .xlsx
          </button>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 28 }}>
        <KpiCard label="Baseline" value={active.version} sub={new Date(active.baseline_date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })} accent={GOLD} />
        <KpiCard label="Planned sprints" value={`${active.sprints_total_min}–${active.sprints_total_max}`} sub={`${active.weeks_total_min}–${active.weeks_total_max} weeks`} />
        <KpiCard label="Sprints to date" value={String(actualSprints || 0)} sub="actuals logged" accent={actualSprints > 0 ? GOLD : undefined} />
        <KpiCard label="Planned cost" value={`€${(active.cost_total_min_eur / 1000).toFixed(0)}k–€${(active.cost_total_max_eur / 1000).toFixed(0)}k`} sub="infra + GPU" />
        <KpiCard label="Cost to date" value={actualCost ? `€${actualCost.toLocaleString()}` : "€0"} sub="actuals logged" accent={actualCost > 0 ? GOLD : undefined} />
        <KpiCard label="Overall progress" value={`${avgProgress}%`} sub={`${doneCount}/${tracks.length} tracks done`} accent={avgProgress > 0 ? GREEN : undefined} />
      </div>

      {/* ── Progress rings ─────────────────────────────────────────────────── */}
      <SectionHeading>Track progress</SectionHeading>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12,
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "20px 16px", marginBottom: 28,
        justifyContent: "space-around",
      }}>
        {tracks.map(t => (
          <DonutRing key={t.id} pct={t.progress_pct} label={t.track_name} status={t.status} />
        ))}
      </div>

      {/* ── Sprint plan vs actual ──────────────────────────────────────────── */}
      <SectionHeading>Sprint plan vs actual</SectionHeading>
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "8px 16px 4px", marginBottom: 8,
      }}>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 8, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--color-text-secondary)" }}>
            <div style={{ width: 20, height: 10, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 2 }} />
            Planned range
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--color-text-secondary)" }}>
            <div style={{ width: 20, height: 5, background: GOLD, borderRadius: 2, boxShadow: `0 0 4px ${GOLD}88` }} />
            Actual
          </div>
        </div>
        {tracks.map(t => <SprintBar key={t.id} track={t} maxScale={maxSprints} />)}
        {/* X-axis ticks */}
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 110px", gap: 12, paddingTop: 4 }}>
          <div />
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0", fontSize: 9, color: "var(--color-text-secondary)" }}>
            {Array.from({ length: 5 }, (_, i) => Math.round((maxSprints / 4) * i)).map(v => (
              <span key={v}>{v}</span>
            ))}
          </div>
          <div />
        </div>
      </div>
      <p style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 24, paddingLeft: 142 }}>
        sprints — shaded band = planned min/max range
      </p>

      {/* ── Cost plan vs actual ────────────────────────────────────────────── */}
      <SectionHeading>Cost plan vs actual</SectionHeading>
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "8px 16px 4px", marginBottom: 28,
      }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 8, justifyContent: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--color-text-secondary)" }}>
            <div style={{ width: 20, height: 10, background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}`, borderRadius: 2 }} />
            Planned range
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--color-text-secondary)" }}>
            <div style={{ width: 20, height: 5, background: GOLD, borderRadius: 2, boxShadow: `0 0 4px ${GOLD}88` }} />
            Actual
          </div>
        </div>
        {tracks.filter(t => t.cost_planned_max_eur > 0 || (t.cost_actual_eur ?? 0) > 0).map(t => (
          <CostBar key={t.id} track={t} maxScale={maxCost} />
        ))}
        <p style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 6, marginBottom: 4 }}>
          Tracks with €0 planned cost (ReqIF, Capella, SysML) are excluded — cost is engineering time only.
        </p>
      </div>

      {/* ── Risk heatmap row ───────────────────────────────────────────────── */}
      <SectionHeading>Risk snapshot</SectionHeading>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 28,
      }}>
        {tracks.map(t => {
          const st = STATUS_META[t.status] ?? STATUS_META.not_started;
          return (
            <div key={t.id} style={{
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 8, padding: "10px 12px",
              borderTop: `3px solid ${statusDot(t.status)}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
                {t.track_name}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot(t.status) }} />
                  {st.label}
                </span>
                <RiskPill level={t.risk_level} />
              </div>
              {t.notes && (
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                  {t.notes.slice(0, 70)}{t.notes.length > 70 ? "…" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Track detail table (update actuals) ───────────────────────────── */}
      <SectionHeading>Update actuals</SectionHeading>
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 90px 90px 100px 100px 80px 65px 65px 80px",
          background: "var(--color-background-secondary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          padding: "7px 14px",
        }}>
          {["Track", "Plan sp.", "Act. sp.", "Plan cost", "Act. cost", "Progress", "Status", "Risk", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>{h}</div>
          ))}
        </div>

        {tracks.map((t, idx) => {
          const st = STATUS_META[t.status] ?? STATUS_META.not_started;
          const isEditing = editingTrack === t.id;
          const sprintMid = (t.sprints_planned_min + t.sprints_planned_max) / 2;
          const variance  = t.sprints_actual !== null ? t.sprints_actual - sprintMid : null;

          return (
            <div key={t.id} style={{ borderBottom: idx < tracks.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 90px 90px 100px 100px 80px 65px 65px 80px",
                padding: "10px 14px", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.track_name}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{t.sprints_planned_min}–{t.sprints_planned_max}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: t.sprints_actual !== null ? GOLD : "var(--color-text-secondary)" }}>{t.sprints_actual ?? "—"}</span>
                  {variance !== null && (
                    <span style={{ fontSize: 10, color: variance > 0 ? RED : GREEN, fontWeight: 600 }}>
                      {variance > 0 ? `+${variance.toFixed(0)}` : variance.toFixed(0)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-primary)" }}>
                  {t.cost_planned_max_eur === 0 ? "€0" : `€${t.cost_planned_min_eur.toLocaleString()}–${t.cost_planned_max_eur.toLocaleString()}`}
                </div>
                <div style={{ fontSize: 12, color: t.cost_actual_eur !== null ? GOLD : "var(--color-text-secondary)" }}>
                  {t.cost_actual_eur !== null ? `€${t.cost_actual_eur.toLocaleString()}` : "—"}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{t.progress_pct}%</div>
                  <div style={{ background: RING_EMPTY, borderRadius: 3, height: 5, width: "100%", minWidth: 60 }}>
                    <div style={{
                      height: 5, borderRadius: 3,
                      width: `${t.progress_pct}%`,
                      background: t.progress_pct === 100 ? GREEN : t.progress_pct > 0 ? GOLD : RING_EMPTY,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot(t.status) }} />
                  <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{st.label}</span>
                </div>
                <RiskPill level={t.risk_level} />
                <button
                  onClick={() => {
                    if (isEditing) { setEditingTrack(null); return; }
                    setEditingTrack(t.id);
                    setEditActuals({ sprints: t.sprints_actual?.toString() ?? "", cost: t.cost_actual_eur?.toString() ?? "", progress: t.progress_pct?.toString() ?? "0" });
                  }}
                  style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    border: `0.5px solid ${isEditing ? GOLD_BORDER : "var(--color-border-secondary)"}`,
                    background: isEditing ? GOLD_DIM : "transparent",
                    color: isEditing ? GOLD : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >{isEditing ? "Cancel" : "Update"}</button>
              </div>

              {/* Inline edit panel */}
              {isEditing && (
                <div style={{
                  padding: "12px 14px 16px",
                  background: "var(--color-background-secondary)",
                  borderTop: "0.5px solid var(--color-border-tertiary)",
                  display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap",
                }}>
                  {[
                    { label: "Sprints actual", key: "sprints" as const, placeholder: "0", width: 80, type: "number" },
                    { label: "Cost actual (€)", key: "cost" as const, placeholder: "0", width: 100, type: "number" },
                    { label: "Progress %", key: "progress" as const, placeholder: "0", width: 70, type: "number" },
                  ].map(f => (
                    <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</label>
                      <input
                        type={f.type} min={0} max={f.key === "progress" ? 100 : undefined}
                        value={editActuals[f.key]}
                        onChange={e => setEditActuals(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{
                          width: f.width, fontSize: 13, padding: "5px 8px", borderRadius: 6,
                          border: `0.5px solid ${GOLD_BORDER}`,
                          background: "var(--color-background-primary)",
                          color: "var(--color-text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => saveActuals(t.id)}
                    disabled={saving}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 6,
                      border: "none", background: GOLD, color: "#0A0A09",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                      boxShadow: saving ? "none" : `0 0 10px rgba(245,166,35,0.3)`,
                    }}
                  >{saving ? "Saving…" : "Save actuals"}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Baseline history footer ────────────────────────────────────────── */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-secondary)", marginBottom: 8 }}>
          Baseline history
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {baselines.map(b => (
            <div key={b.id} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              <span style={{ fontWeight: 600, color: GOLD }}>{b.version}</span>
              {" · "}{new Date(b.baseline_date).toLocaleDateString("en-GB")}
              {" · "}{b.sprints_total_min}–{b.sprints_total_max} sprints
              {" · "}€{b.cost_total_min_eur.toLocaleString()}–€{b.cost_total_max_eur.toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
