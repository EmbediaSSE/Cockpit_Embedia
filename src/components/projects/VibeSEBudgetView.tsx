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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  not_started: { label: "Not started", color: "#5F5E5A", bg: "#F1EFE8" },
  in_progress:  { label: "In progress", color: "#854F0B", bg: "#FAEEDA" },
  done:         { label: "Done",        color: "#3B6D11", bg: "#EAF3DE" },
};

const RISK_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#3B6D11", bg: "#EAF3DE" },
  medium: { label: "Medium", color: "#854F0B", bg: "#FAEEDA" },
  high:   { label: "High",   color: "#A32D2D", bg: "#FCEBEB" },
};

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px",
      borderRadius: 6, color, background: bg, whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div style={{ background: "#E8E7E1", borderRadius: 4, height: 6, width: "100%", minWidth: 80 }}>
      <div style={{
        height: 6, borderRadius: 4, width: `${pct}%`,
        background: pct === 100 ? "#639922" : pct > 0 ? "#EF9F27" : "#D3D1C7",
        transition: "width 0.3s ease",
      }} />
    </div>
  );
}

function fmt(n: number | null, unit = "€"): string {
  if (n === null || n === undefined) return "—";
  if (unit === "€") return `€${n.toLocaleString()}`;
  return String(n);
}

// ─── Totals row ───────────────────────────────────────────────────────────────
function SummaryCards({ baseline }: { baseline: Baseline }) {
  const tracks = baseline.vibese_budget_tracks || [];
  const actualSprints = tracks.reduce((s, t) => s + (t.sprints_actual ?? 0), 0);
  const actualCost    = tracks.reduce((s, t) => s + (t.cost_actual_eur ?? 0), 0);
  const doneCount     = tracks.filter(t => t.status === "done").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
      {[
        { label: "Baseline version", value: baseline.version, sub: new Date(baseline.baseline_date).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) },
        { label: "Planned sprints", value: `${baseline.sprints_total_min}–${baseline.sprints_total_max}`, sub: `${baseline.weeks_total_min}–${baseline.weeks_total_max} weeks` },
        { label: "Sprints to date", value: actualSprints || "0", sub: "actuals logged" },
        { label: "Planned cost", value: `€${baseline.cost_total_min_eur.toLocaleString()}–${baseline.cost_total_max_eur.toLocaleString()}`, sub: "infra + GPU" },
        { label: "Cost to date", value: actualCost ? `€${actualCost.toLocaleString()}` : "€0", sub: "actuals logged" },
        { label: "Tracks done", value: `${doneCount}/${tracks.length}`, sub: "of 6 tracks" },
      ].map(c => (
        <div key={c.label} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>{c.value}</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function VibeSEBudgetView() {
  const supabase = createClient();
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [activeVersion, setActiveVersion] = useState<string>("B0");
  const [loading, setLoading] = useState(true);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [editActuals, setEditActuals] = useState<{ sprints: string; cost: string; progress: string }>({ sprints: "", cost: "", progress: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
  const tracks = active?.vibese_budget_tracks || [];

  async function saveActuals(trackId: string) {
    setSaving(true);
    const { error } = await supabase
      .from("vibese_budget_tracks")
      .update({
        sprints_actual: editActuals.sprints ? parseInt(editActuals.sprints) : null,
        cost_actual_eur: editActuals.cost ? parseFloat(editActuals.cost) : null,
        progress_pct: editActuals.progress ? parseInt(editActuals.progress) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", trackId);
    if (!error) {
      setEditingTrack(null);
      await loadData();
    }
    setSaving(false);
  }

  function exportToExcel() {
    if (!active) return;
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ─────────────────────────────────────
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
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // ── Sheet 2: Tracks ──────────────────────────────────────
    const headers = [
      "Track", "Category",
      "Sprints Plan Min", "Sprints Plan Max", "Sprints Actual", "Sprint Variance",
      "Cost Plan Min (€)", "Cost Plan Max (€)", "Cost Actual (€)",
      "Progress %", "Status", "Risk", "Notes", "Last Updated",
    ];
    const trackRows = (active.vibese_budget_tracks || []).map(t => {
      const midPlan = (t.sprints_planned_min + t.sprints_planned_max) / 2;
      const variance = t.sprints_actual !== null ? t.sprints_actual - midPlan : null;
      return [
        t.track_name, t.category ?? "",
        t.sprints_planned_min, t.sprints_planned_max,
        t.sprints_actual ?? "",
        variance !== null ? +variance.toFixed(1) : "",
        t.cost_planned_min_eur, t.cost_planned_max_eur,
        t.cost_actual_eur ?? "",
        t.progress_pct,
        t.status, t.risk_level,
        t.notes ?? "",
        t.updated_at ? new Date(t.updated_at).toLocaleDateString("en-GB") : "",
      ];
    });
    const wsTracks = XLSX.utils.aoa_to_sheet([headers, ...trackRows]);
    // Column widths
    wsTracks["!cols"] = [22,12,14,14,14,14,16,16,16,12,14,10,40,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsTracks, "Tracks");

    // ── Download ─────────────────────────────────────────────
    const fileName = `VibeSE_Budget_${active.version}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  if (loading) return (
    <div style={{ padding: "2rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
      Loading budget baseline...
    </div>
  );

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>
            VibeSE MVP — Budget tracker
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
            Actuals vs baseline · updated each sprint
          </p>
        </div>
        {/* Baseline version selector + export */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {baselines.map(b => (
            <button
              key={b.version}
              onClick={() => setActiveVersion(b.version)}
              style={{
                fontSize: 12, fontWeight: 500, padding: "4px 12px",
                borderRadius: 6, border: "0.5px solid",
                borderColor: activeVersion === b.version ? "#378ADD" : "var(--color-border-tertiary)",
                background: activeVersion === b.version ? "#E6F1FB" : "var(--color-background-secondary)",
                color: activeVersion === b.version ? "#185FA5" : "var(--color-text-secondary)",
                cursor: "pointer",
              }}
            >
              {b.version}
            </button>
          ))}
          <button
            onClick={exportToExcel}
            disabled={!active}
            style={{
              fontSize: 12, fontWeight: 500, padding: "4px 12px",
              borderRadius: 6, border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              cursor: active ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5,
              marginLeft: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export .xlsx
          </button>
        </div>
      </div>

      {active && <SummaryCards baseline={active} />}

      {/* Track table */}
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 100px 100px 110px 110px 90px 70px 70px 80px",
          gap: 0,
          background: "var(--color-background-secondary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          padding: "8px 16px",
        }}>
          {["Track", "Sprints plan", "Sprints act.", "Cost plan", "Cost act.", "Progress", "Status", "Risk", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {h}
            </div>
          ))}
        </div>

        {tracks.map((t, idx) => {
          const st = STATUS_LABEL[t.status] || STATUS_LABEL.not_started;
          const rk = RISK_LABEL[t.risk_level] || RISK_LABEL.low;
          const isEditing = editingTrack === t.id;
          const sprintVariance = t.sprints_actual !== null
            ? t.sprints_actual - ((t.sprints_planned_min + t.sprints_planned_max) / 2)
            : null;

          return (
            <div
              key={t.id}
              style={{
                borderBottom: idx < tracks.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                background: "var(--color-background-primary)",
              }}
            >
              {/* Main row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 100px 100px 110px 110px 90px 70px 70px 80px",
                gap: 0,
                padding: "12px 16px",
                alignItems: "center",
              }}>
                {/* Track name */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{t.track_name}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {t.notes?.slice(0, 80)}{(t.notes?.length || 0) > 80 ? "…" : ""}
                  </div>
                </div>

                {/* Sprints plan */}
                <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                  {t.sprints_planned_min}–{t.sprints_planned_max}
                </div>

                {/* Sprints actual */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: t.sprints_actual !== null ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                    {t.sprints_actual ?? "—"}
                  </span>
                  {sprintVariance !== null && (
                    <span style={{
                      fontSize: 11,
                      color: sprintVariance > 0 ? "#A32D2D" : "#3B6D11",
                    }}>
                      {sprintVariance > 0 ? `+${sprintVariance.toFixed(0)}` : sprintVariance.toFixed(0)}
                    </span>
                  )}
                </div>

                {/* Cost plan */}
                <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                  {t.cost_planned_min_eur === 0 && t.cost_planned_max_eur === 0
                    ? "€0"
                    : `€${t.cost_planned_min_eur.toLocaleString()}–${t.cost_planned_max_eur.toLocaleString()}`}
                </div>

                {/* Cost actual */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, color: t.cost_actual_eur !== null ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                    {t.cost_actual_eur !== null ? `€${t.cost_actual_eur.toLocaleString()}` : "—"}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{t.progress_pct}%</span>
                  <ProgressBar pct={t.progress_pct} />
                </div>

                {/* Status */}
                <Badge text={st.label} color={st.color} bg={st.bg} />

                {/* Risk */}
                <Badge text={rk.label} color={rk.color} bg={rk.bg} />

                {/* Edit button */}
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditingTrack(null);
                    } else {
                      setEditingTrack(t.id);
                      setEditActuals({
                        sprints: t.sprints_actual?.toString() ?? "",
                        cost: t.cost_actual_eur?.toString() ?? "",
                        progress: t.progress_pct?.toString() ?? "0",
                      });
                    }
                  }}
                  style={{
                    fontSize: 11, padding: "3px 10px",
                    borderRadius: 6, border: "0.5px solid var(--color-border-secondary)",
                    background: "transparent", color: "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Cancel" : "Update"}
                </button>
              </div>

              {/* Inline edit panel */}
              {isEditing && (
                <div style={{
                  padding: "12px 16px 16px",
                  background: "var(--color-background-secondary)",
                  borderTop: "0.5px solid var(--color-border-tertiary)",
                  display: "flex", gap: 16, alignItems: "flex-end",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Sprints actual</label>
                    <input
                      type="number" min={0} value={editActuals.sprints}
                      onChange={e => setEditActuals(p => ({ ...p, sprints: e.target.value }))}
                      placeholder="0"
                      style={{ width: 80, fontSize: 13, padding: "4px 8px", borderRadius: 6,
                        border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)",
                        color: "var(--color-text-primary)" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Cost actual (€)</label>
                    <input
                      type="number" min={0} value={editActuals.cost}
                      onChange={e => setEditActuals(p => ({ ...p, cost: e.target.value }))}
                      placeholder="0"
                      style={{ width: 100, fontSize: 13, padding: "4px 8px", borderRadius: 6,
                        border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)",
                        color: "var(--color-text-primary)" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Progress %</label>
                    <input
                      type="number" min={0} max={100} value={editActuals.progress}
                      onChange={e => setEditActuals(p => ({ ...p, progress: e.target.value }))}
                      placeholder="0"
                      style={{ width: 70, fontSize: 13, padding: "4px 8px", borderRadius: 6,
                        border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)",
                        color: "var(--color-text-primary)" }}
                    />
                  </div>
                  <button
                    onClick={() => saveActuals(t.id)}
                    disabled={saving}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "6px 16px",
                      borderRadius: 6, border: "none",
                      background: "#185FA5", color: "#fff",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "Saving…" : "Save actuals"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Baseline notes */}
      {active?.notes && (
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 12, lineHeight: 1.5 }}>
          {active.version} note: {active.notes}
        </p>
      )}

      {/* Baseline history footer */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          Baseline history
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {baselines.map(b => (
            <div key={b.id} style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{b.version}</span>
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
