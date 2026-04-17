"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePanel } from "@/contexts/PanelContext";
import type { PanelType } from "@/lib/supabase/types";

// ── Panel data types ────────────────────────────────────────────

interface TaskItem {
  task_code: string;
  name: string;
  status: string;
  due_date: string | null;
  effort_days: number;
  epic: string | null;
  assignee: string | null;
}

interface StageGroup {
  stage: string;
  tasks: TaskItem[];
}

interface RiskItem {
  level: string;
  description: string;
  mitigation: string | null;
  status: string;
}

interface MilestoneItem {
  name: string;
  target_date: string | null;
  status: string;
}

interface ProjectPanelData {
  type: "project";
  id: string;
  code: string;
  name: string;
  client: string;
  category: string;
  priority: string;
  status: string;
  stage: string;
  phase: string | null;
  summary: string | null;
  selling_price: number;
  margin_pct: number;
  target_date: string | null;
  dependencies_text: string | null;
  progress: number;
  taskCount: number;
  doneCount: number;
  risks: RiskItem[];
  stages: StageGroup[];
  milestones: MilestoneItem[];
}

interface AccountPanelData {
  type: "account";
  id: string;
  name: string;
  category: string;
  country: string;
  city: string;
  icp_segment: string;
  status: string;
  priority: string;
  notes: string;
  last_touch: string | null;
  next_action: string | null;
  revenue_potential: number;
  contacts: { name: string; title: string; email: string; is_decision_maker: boolean }[];
}

interface MilestonePanelData {
  type: "milestone";
  id: string;
  name: string;
  target_date: string | null;
  status: string;
  unlocks: string | null;
  dependencies: string | null;
  project: { code: string; name: string } | null;
}

interface TaskPanelData {
  type: "task";
  id: string;
  task_code: string;
  name: string;
  status: string;
  due_date: string | null;
  effort_days: number;
  rate: number;
  assignee: string | null;
  epic: string | null;
  sprint_name: string | null;
  stage_name: string | null;
  project: { code: string; name: string; client: string } | null;
}

interface DecisionPanelData {
  type: "decision";
  id: string;
  code: string;
  text: string;
  owner: string | null;
  deadline: string | null;
  status: string;
  note: string | null;
  project: { code: string; name: string } | null;
}

interface NewsPanelData {
  type: "news";
  id: string;
  title: string;
  source: string;
  url: string;
  summary: string | null;
  category: string;
  relevance_score: number;
  published_at: string | null;
}

interface ContentPanelData {
  type: "content";
  id: string;
  title: string;
  asset_type: string;
  status: string;
  progress_pct: number;
  audience: string | null;
  channel: string | null;
  target_date: string | null;
  summary: string | null;
}

type PanelData = ProjectPanelData | AccountPanelData | MilestonePanelData | DecisionPanelData | NewsPanelData | ContentPanelData | TaskPanelData | null;

// ── Patch helper ───────────────────────────────────────────────

async function patchPanel(type: string, id: string, fields: Record<string, unknown>) {
  const res = await fetch(`/api/panel/${type}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`Patch failed: ${res.status}`);
  return res.json();
}

// ── Inline edit components ─────────────────────────────────────

interface EditableSelectProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onSave: (v: string) => Promise<void>;
  renderValue?: (v: string) => React.ReactNode;
}

function EditableSelect({ label, value, options, onSave, renderValue }: EditableSelectProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [current, setCurrent] = useState(value);

  // Keep in sync if parent data reloads
  useEffect(() => { setCurrent(value); }, [value]);

  const handleChange = async (v: string) => {
    if (v === current) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(v);
      setCurrent(v);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // revert on error
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  return (
    <div className="bg-dark-3 rounded-lg px-3 py-2 group relative">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5">{label}</div>
        <div className="flex items-center gap-1">
          {saving && <span className="text-[9px] text-dark-5 animate-pulse">saving…</span>}
          {saved  && <span className="text-[9px] text-status-green">✓ saved</span>}
          {!saving && !saved && (
            <button
              onClick={() => setEditing(!editing)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-5 hover:text-gold"
              title="Edit"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <select
          autoFocus
          defaultValue={current}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={(e) => handleChange(e.target.value)}
          className="w-full bg-dark-2 border border-gold/50 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-gold"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <div
          className="text-xs text-white cursor-pointer hover:text-gold transition-colors"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {renderValue ? renderValue(current) : current}
        </div>
      )}
    </div>
  );
}

interface EditableTextProps {
  label: string;
  value: string | null;
  placeholder?: string;
  onSave: (v: string) => Promise<void>;
  multiline?: boolean;
}

function EditableText({ label, value, placeholder = "—", onSave, multiline = false }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [current, setCurrent] = useState(value || "");
  const [draft, setDraft] = useState(value || "");

  useEffect(() => { setCurrent(value || ""); setDraft(value || ""); }, [value]);

  const commit = async () => {
    if (draft === current) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setCurrent(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setDraft(current);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setDraft(current); setEditing(false); }
    if (e.key === "Enter" && !multiline) commit();
  };

  return (
    <div className="bg-dark-3 rounded-lg px-3 py-2 group relative">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5">{label}</div>
        <div className="flex items-center gap-1">
          {saving && <span className="text-[9px] text-dark-5 animate-pulse">saving…</span>}
          {saved  && <span className="text-[9px] text-status-green">✓ saved</span>}
          {!saving && !saved && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-5 hover:text-gold"
              title="Edit"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
          )}
          {editing && (
            <button
              onClick={commit}
              className="text-[9px] text-gold hover:text-white transition-colors font-semibold"
            >
              Save
            </button>
          )}
        </div>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            rows={3}
            placeholder={placeholder}
            className="w-full bg-dark-2 border border-gold/50 rounded text-xs text-white px-2 py-1.5 focus:outline-none focus:border-gold resize-none"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="w-full bg-dark-2 border border-gold/50 rounded text-xs text-white px-2 py-1 focus:outline-none focus:border-gold"
          />
        )
      ) : (
        <div
          className={`text-xs cursor-pointer hover:text-gold transition-colors ${current ? "text-white" : "text-dark-5 italic"}`}
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {current || placeholder}
        </div>
      )}
    </div>
  );
}

// ── Utilities ──────────────────────────────────────────────────

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(date: string | null, status: string) {
  if (!date || status === "done" || status === "delivered") return false;
  return new Date(date) < new Date();
}

const STATUS_DOT: Record<string, string> = {
  done:        "bg-status-green",
  delivered:   "bg-status-green",
  active:      "bg-blue-400",
  in_progress: "bg-blue-400",
  pending:     "bg-dark-5",
  at_risk:     "bg-status-amber",
  overdue:     "bg-status-red",
  todo:        "bg-dark-5",
  blocked:     "bg-status-red",
};

const RISK_COLOR: Record<string, string> = {
  low:      "bg-green-500/15 text-green-400",
  medium:   "bg-amber-500/15 text-amber-400",
  high:     "bg-red-500/15 text-red-400",
  critical: "bg-red-600/20 text-red-400 font-bold",
};

const PRIORITY_BADGE: Record<string, string> = {
  P0: "bg-red-500/20 text-red-400",
  P1: "bg-amber-500/20 text-amber-400",
  P2: "bg-blue-500/20 text-blue-400",
  P3: "bg-dark-4 text-dark-5",
};

// ── Sub-renderers by panel type ────────────────────────────────

function ProjectPanel({ data, openPanel }: { data: ProjectPanelData; openPanel: (type: PanelType, id: string) => void }) {
  const patch = (fields: Record<string, unknown>) => patchPanel("project", data.id, fields);

  const statusOptions = [
    { value: "active",    label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold",   label: "On Hold" },
    { value: "pending",   label: "Pending" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const stageOptions = [
    { value: "Won",       label: "Won" },
    { value: "Active",    label: "Active" },
    { value: "Planned",   label: "Planned" },
    { value: "Concept",   label: "Concept" },
    { value: "Backlog",   label: "Backlog" },
    { value: "Delivered", label: "Delivered" },
    { value: "Published", label: "Published" },
    { value: "Closed",    label: "Closed" },
    { value: "On Hold",   label: "On Hold" },
  ];
  const priorityOptions = [
    { value: "P0", label: "P0 — Critical" },
    { value: "P1", label: "P1 — High" },
    { value: "P2", label: "P2 — Medium" },
    { value: "P3", label: "P3 — Low" },
  ];

  return (
    <>
      {/* Metadata badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[data.priority] || PRIORITY_BADGE.P2}`}>
          {data.priority}
        </span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-4 text-grey uppercase">{data.category}</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-4 text-grey">{data.stage}</span>
        {data.phase && <span className="px-2 py-0.5 rounded text-[10px] bg-dark-3 text-dark-5">{data.phase}</span>}
      </div>

      {/* Editable fields — 2×2 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <EditableSelect
          label="Status"
          value={data.status}
          options={statusOptions}
          onSave={v => patch({ status: v, stage: stageOptions.find(s => s.value.toLowerCase() === v)?.value || data.stage })}
          renderValue={v => v.replace("_", " ").toUpperCase()}
        />
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Client</div>
          <div className="text-xs text-white">{data.client}</div>
        </div>
        <EditableSelect
          label="Priority"
          value={data.priority}
          options={priorityOptions}
          onSave={v => patch({ priority: v })}
        />
        <EditableSelect
          label="Stage"
          value={data.stage}
          options={stageOptions}
          onSave={v => patch({ stage: v })}
        />
      </div>

      {/* Phase / Label */}
      <div className="mb-3">
        <EditableText
          label="Phase / Label"
          value={data.phase}
          placeholder="e.g. Beta Version, Phase 2, Pilot…"
          onSave={v => patch({ phase: v })}
        />
      </div>

      {/* Progress + Target */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Progress</div>
          <div className="text-xs text-white">{data.progress}% ({data.doneCount}/{data.taskCount} tasks)</div>
        </div>
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Target</div>
          <div className="text-xs text-white">{data.target_date ? fmt(data.target_date) : "Not set"}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="w-full h-1.5 bg-dark-4 rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: `${data.progress}%` }} />
        </div>
      </div>

      {/* Financials */}
      {data.selling_price > 0 && (
        <div className="flex gap-4 mb-4 px-3 py-2 bg-dark-3 rounded-lg">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Revenue</div>
            <div className="text-sm font-bold text-gold">€{(data.selling_price / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Margin</div>
            <div className="text-sm font-bold text-white">{data.margin_pct}%</div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-4">
        <EditableText
          label="Overview"
          value={data.summary}
          placeholder="Add project summary…"
          onSave={v => patch({ summary: v })}
          multiline
        />
      </div>

      {/* Dependencies */}
      {data.dependencies_text && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">Dependencies</div>
          <p className="text-xs text-grey">{data.dependencies_text}</p>
        </div>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-2">
            Risks &amp; Flags ({data.risks.filter(r => r.status === "open").length} open)
          </div>
          <div className="space-y-1.5">
            {data.risks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-2.5 py-2 bg-dark-3 rounded-lg">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 ${RISK_COLOR[r.level]}`}>{r.level}</span>
                <div className="flex-1">
                  <div className="text-xs text-white">{r.description}</div>
                  {r.mitigation && <div className="text-[10px] text-dark-5 mt-0.5">↳ {r.mitigation}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones */}
      {data.milestones.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-2">Milestones</div>
          <div className="space-y-1">
            {data.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-dark-3 rounded-lg">
                <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[m.status] || "bg-dark-5"}`} />
                <span className="text-xs text-white flex-1">{m.name}</span>
                <span className={`text-[10px] ${isOverdue(m.target_date, m.status) ? "text-red-400" : "text-dark-5"}`}>
                  {fmt(m.target_date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Breakdown */}
      {data.stages.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-2">Task Breakdown</div>
          <div className="space-y-4">
            {data.stages.map((sg) => (
              <div key={sg.stage}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gold mb-1.5">{sg.stage}</div>
                <div className="space-y-1">
                  {sg.tasks.map((t) => (
                    <div key={t.task_code} className="flex items-center gap-2 px-2.5 py-1.5 bg-dark-3 rounded-lg">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[t.status] || "bg-dark-5"}`} />
                      <span className="text-[10px] font-mono text-dark-5 w-10 shrink-0">{t.task_code}</span>
                      <span className="text-xs text-white flex-1">{t.name}</span>
                      {t.effort_days > 0 && <span className="text-[10px] text-dark-5">{t.effort_days}d</span>}
                      {t.due_date && (
                        <span className={`text-[10px] ${isOverdue(t.due_date, t.status) ? "text-red-400" : "text-dark-5"}`}>
                          {fmt(t.due_date)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-dark-4 mt-4">
        <button
          onClick={() => openPanel("agent", "mbse")}
          className="flex-1 py-2 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors"
        >
          Ask MBSE Agent ▸
        </button>
      </div>
    </>
  );
}

function AccountPanel({ data }: { data: AccountPanelData }) {
  const patch = (fields: Record<string, unknown>) => patchPanel("account", data.id, fields);

  const STATUS_BADGE: Record<string, string> = {
    identified: "bg-dark-4 text-dark-5",
    contacted:  "bg-amber-500/15 text-amber-400",
    qualified:  "bg-green-500/15 text-green-400",
    proposal:   "bg-gold/15 text-gold",
    won:        "bg-green-500/20 text-green-300",
    lost:       "bg-red-500/15 text-red-400",
  };

  const statusOptions = [
    { value: "identified", label: "Identified" },
    { value: "contacted",  label: "Contacted" },
    { value: "qualified",  label: "Qualified" },
    { value: "proposal",   label: "Proposal" },
    { value: "won",        label: "Won" },
    { value: "lost",       label: "Lost" },
  ];
  const priorityOptions = [
    { value: "P0", label: "P0 — Critical" },
    { value: "P1", label: "P1 — High" },
    { value: "P2", label: "P2 — Medium" },
    { value: "P3", label: "P3 — Low" },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGE[data.status]}`}>{data.status}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[data.priority]}`}>{data.priority}</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-4 text-grey">{data.category}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <EditableSelect
          label="Status"
          value={data.status}
          options={statusOptions}
          onSave={v => patch({ status: v })}
          renderValue={v => <span className={`text-[10px] font-bold uppercase ${STATUS_BADGE[v]?.split(" ")[1] || "text-white"}`}>{v}</span>}
        />
        <EditableSelect
          label="Priority"
          value={data.priority}
          options={priorityOptions}
          onSave={v => patch({ priority: v })}
        />
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">City/Country</div>
          <div className="text-xs text-white">{data.city}, {data.country}</div>
        </div>
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Revenue Pot.</div>
          <div className="text-xs text-white">{data.revenue_potential > 0 ? `€${(data.revenue_potential / 1000).toFixed(0)}k` : "TBD"}</div>
        </div>
      </div>

      <div className="mb-3">
        <EditableText
          label="Next Action"
          value={data.next_action}
          placeholder="What's the next step with this account?"
          onSave={v => patch({ next_action: v })}
        />
      </div>

      <div className="mb-4">
        <EditableText
          label="Notes"
          value={data.notes}
          placeholder="Add notes about this account…"
          onSave={v => patch({ notes: v })}
          multiline
        />
      </div>

      {data.contacts.length > 0 && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-2">Contacts ({data.contacts.length})</div>
          <div className="space-y-1.5">
            {data.contacts.map((c, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-dark-3 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-dark-4 flex items-center justify-center text-[10px] font-bold text-grey">
                  {c.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white flex items-center gap-1.5">
                    {c.name}
                    {c.is_decision_maker && <span className="text-[9px] text-gold">★</span>}
                  </div>
                  <div className="text-[10px] text-dark-5">{c.title}</div>
                </div>
                {c.email && <div className="text-[10px] text-grey">{c.email}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-dark-4 mt-4">
        <button className="flex-1 py-2 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors">
          Ask BizDev Agent ▸
        </button>
      </div>
    </>
  );
}

function MilestonePanel({ data }: { data: MilestonePanelData }) {
  const patch = (fields: Record<string, unknown>) => patchPanel("milestone", data.id, fields);

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "active",  label: "Active" },
    { value: "done",    label: "Done" },
    { value: "at_risk", label: "At Risk" },
    { value: "overdue", label: "Overdue" },
  ];

  const STATUS_COLORS: Record<string, string> = {
    done:    "text-green-400",
    active:  "text-blue-400",
    pending: "text-grey",
    at_risk: "text-amber-400",
    overdue: "text-red-400",
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs font-semibold uppercase ${STATUS_COLORS[data.status]}`}>{data.status}</span>
        {data.target_date && (
          <span className={`px-2 py-0.5 rounded text-[10px] ${isOverdue(data.target_date, data.status) ? "bg-red-500/15 text-red-400" : "bg-dark-4 text-grey"}`}>
            {fmt(data.target_date)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <EditableSelect
          label="Status"
          value={data.status}
          options={statusOptions}
          onSave={v => patch({ status: v })}
          renderValue={v => <span className={STATUS_COLORS[v] || "text-white"}>{v.toUpperCase()}</span>}
        />
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Target Date</div>
          <div className={`text-xs ${isOverdue(data.target_date, data.status) ? "text-red-400" : "text-white"}`}>
            {fmt(data.target_date)}
          </div>
        </div>
      </div>

      {data.project && (
        <div className="mb-4 px-3 py-2 bg-dark-3 rounded-lg">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Project</div>
          <div className="text-xs text-white">{data.project.name} <span className="text-dark-5">({data.project.code})</span></div>
        </div>
      )}

      {data.unlocks && (
        <div className="mb-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">Unlocks</div>
          <p className="text-xs text-grey">{data.unlocks}</p>
        </div>
      )}

      {data.dependencies && (
        <div className="mb-4">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">Dependencies</div>
          <p className="text-xs text-grey">{data.dependencies}</p>
        </div>
      )}
    </>
  );
}

function TaskPanel({ data, openPanel }: { data: TaskPanelData; openPanel: (type: PanelType, id: string) => void }) {
  const patch = (fields: Record<string, unknown>) => patchPanel("task", data.id, fields);

  const today = new Date().toISOString().split("T")[0];
  const overdue = data.due_date && data.due_date < today && data.status !== "done";
  const daysOverdue = overdue && data.due_date
    ? Math.ceil((new Date(today).getTime() - new Date(data.due_date).getTime()) / 86400000)
    : null;

  const STATUS_BADGE: Record<string, string> = {
    todo:        "bg-dark-4 text-dark-5",
    in_progress: "bg-blue-500/15 text-blue-400",
    done:        "bg-green-500/15 text-green-400",
    blocked:     "bg-red-500/15 text-red-400",
  };

  const statusOptions = [
    { value: "todo",        label: "Todo" },
    { value: "in_progress", label: "In Progress" },
    { value: "done",        label: "Done" },
    { value: "blocked",     label: "Blocked" },
  ];

  return (
    <>
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGE[data.status] || "bg-dark-4 text-dark-5"}`}>
          {data.status.replace("_", " ")}
        </span>
        {data.task_code && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-dark-3 text-dark-5">{data.task_code}</span>
        )}
        {data.epic && (
          <span className="px-2 py-0.5 rounded text-[10px] bg-dark-3 text-grey">{data.epic}</span>
        )}
        {overdue && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
            {daysOverdue}d overdue
          </span>
        )}
      </div>

      {/* Editable meta grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <EditableSelect
          label="Status"
          value={data.status}
          options={statusOptions}
          onSave={v => patch({ status: v })}
          renderValue={v => <span className={`text-[10px] font-bold uppercase ${STATUS_BADGE[v]?.split(" ")[1] || "text-white"}`}>{v.replace("_"," ")}</span>}
        />
        <div className="bg-dark-3 rounded-lg px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Due Date</div>
          <div className={`text-xs ${overdue ? "text-red-400" : "text-white"}`}>
            {data.due_date ? fmt(data.due_date) : "Not set"}
          </div>
        </div>
        <EditableText
          label="Assignee"
          value={data.assignee}
          placeholder="Assign to…"
          onSave={v => patch({ assignee: v })}
        />
        <EditableText
          label="Sprint"
          value={data.sprint_name}
          placeholder="Sprint name"
          onSave={v => patch({ sprint_name: v })}
        />
      </div>

      {/* Stage */}
      {data.stage_name && (
        <div className="mb-4 px-3 py-2 bg-dark-3 rounded-lg">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Stage</div>
          <div className="text-xs text-white">{data.stage_name}</div>
        </div>
      )}

      {/* Project link */}
      {data.project && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">Project</div>
          <button
            onClick={() => openPanel("project", data.project!.code)}
            className="w-full flex items-center justify-between px-3 py-2 bg-dark-3 rounded-lg hover:bg-dark-4 transition-colors group"
          >
            <div>
              <div className="text-xs font-medium text-white group-hover:text-gold transition-colors">{data.project.name}</div>
              <div className="text-[10px] text-dark-5">{data.project.client} · {data.project.code}</div>
            </div>
            <span className="text-dark-5 group-hover:text-gold transition-colors">→</span>
          </button>
        </div>
      )}

      {/* Next steps */}
      <div className="pt-4 border-t border-dark-4 space-y-2">
        {overdue && (
          <div className="flex gap-2 items-start px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-base">🔴</span>
            <p className="text-xs text-red-300 leading-relaxed">
              This task is {daysOverdue}d past due. Use the Status field above to mark it done, or update the sprint.
            </p>
          </div>
        )}
        {data.status === "blocked" && (
          <div className="flex gap-2 items-start px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-amber-300 leading-relaxed">Task is blocked. Identify the blocker and update the sprint board.</p>
          </div>
        )}
        {data.status === "todo" && !overdue && (
          <div className="flex gap-2 items-start px-3 py-2.5 bg-dark-3 border border-dark-4 rounded-lg">
            <span className="text-base">📋</span>
            <p className="text-xs text-grey leading-relaxed">Task is queued. Set Status to In Progress when you start.</p>
          </div>
        )}
        {data.status === "done" && (
          <div className="flex gap-2 items-start px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <span className="text-base">✅</span>
            <p className="text-xs text-green-300 leading-relaxed">Task completed. Check if there are dependent tasks to unblock next.</p>
          </div>
        )}
      </div>
    </>
  );
}

function DecisionPanel({ data }: { data: DecisionPanelData }) {
  const patch = (fields: Record<string, unknown>) => patchPanel("decision", data.id, fields);

  const STATUS_BADGE: Record<string, string> = {
    pending:  "bg-amber-500/15 text-amber-400",
    approved: "bg-green-500/15 text-green-400",
    rejected: "bg-red-500/15 text-red-400",
    deferred: "bg-dark-4 text-dark-5",
  };

  const statusOptions = [
    { value: "pending",  label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "deferred", label: "Deferred" },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGE[data.status]}`}>{data.status}</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-3 text-dark-5 font-mono">{data.code}</span>
        {data.deadline && (
          <span className={`px-2 py-0.5 rounded text-[10px] ${isOverdue(data.deadline, data.status === "pending" ? "active" : data.status) ? "bg-red-500/15 text-red-400" : "bg-dark-4 text-grey"}`}>
            Deadline: {fmt(data.deadline)}
          </span>
        )}
      </div>

      <div className="mb-5 px-3 py-3 bg-dark-3 rounded-lg">
        <p className="text-sm text-white leading-relaxed">{data.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <EditableSelect
          label="Status"
          value={data.status}
          options={statusOptions}
          onSave={v => patch({ status: v })}
        />
        <EditableText
          label="Owner"
          value={data.owner}
          placeholder="Who decides?"
          onSave={v => patch({ owner: v })}
        />
      </div>

      <div className="mb-4">
        <EditableText
          label="Current Thinking / Notes"
          value={data.note}
          placeholder="Add context, considerations, or rationale…"
          onSave={v => patch({ note: v })}
          multiline
        />
      </div>

      {data.project && (
        <div className="mb-4 px-3 py-2 bg-dark-3 rounded-lg">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Linked Project</div>
          <div className="text-xs text-white">{data.project.name}</div>
        </div>
      )}
    </>
  );
}

function NewsPanel({ data }: { data: NewsPanelData }) {
  const CATEGORY_LABELS: Record<string, string> = {
    automotive: "Automotive", sdv: "SDV", mbse: "MBSE",
    ai_llm: "AI / LLM", standards: "Standards", market: "Market",
  };
  const relevanceColor =
    data.relevance_score >= 75 ? "text-green-400" :
    data.relevance_score >= 50 ? "text-amber-400" : "text-dark-5";

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-4 text-grey">{CATEGORY_LABELS[data.category] || data.category}</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-3 text-dark-5">{data.source}</span>
        <span className={`text-[10px] font-bold ${relevanceColor}`}>Relevance: {data.relevance_score}/100</span>
      </div>
      {data.published_at && <div className="text-[10px] text-dark-5 mb-4">{fmt(data.published_at)}</div>}
      {data.summary && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">AI Summary</div>
          <p className="text-xs text-grey leading-relaxed">{data.summary}</p>
        </div>
      )}
      <div className="flex gap-2 pt-4 border-t border-dark-4 mt-4">
        <a href={data.url} target="_blank" rel="noopener noreferrer"
          className="flex-1 py-2 bg-dark-3 border border-dark-5 text-grey text-xs font-semibold rounded-lg hover:text-white hover:border-grey transition-colors text-center">
          Read Source ↗
        </a>
      </div>
    </>
  );
}

function ContentPanel({ data }: { data: ContentPanelData }) {
  const STATUS_BADGE: Record<string, string> = {
    draft: "bg-dark-4 text-dark-5", review: "bg-amber-500/15 text-amber-400",
    approved: "bg-blue-500/15 text-blue-400", published: "bg-green-500/15 text-green-400",
  };
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_BADGE[data.status]}`}>{data.status}</span>
        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-4 text-grey uppercase">{data.asset_type}</span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-[10px] mb-1">
          <span className="text-dark-5">Progress</span>
          <span className="text-grey">{data.progress_pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-dark-4 rounded-full overflow-hidden">
          <div className="h-full bg-gold rounded-full" style={{ width: `${data.progress_pct}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {data.audience && (
          <div className="bg-dark-3 rounded-lg px-3 py-2 col-span-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Audience</div>
            <div className="text-xs text-white">{data.audience}</div>
          </div>
        )}
        {data.channel && (
          <div className="bg-dark-3 rounded-lg px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Channel</div>
            <div className="text-xs text-white">{data.channel}</div>
          </div>
        )}
        {data.target_date && (
          <div className="bg-dark-3 rounded-lg px-3 py-2">
            <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-0.5">Target</div>
            <div className="text-xs text-white">{fmt(data.target_date)}</div>
          </div>
        )}
      </div>
      {data.summary && (
        <div className="mb-5">
          <div className="text-[9px] font-bold uppercase tracking-widest text-dark-5 mb-1.5">Summary</div>
          <p className="text-xs text-grey leading-relaxed">{data.summary}</p>
        </div>
      )}
      <div className="flex gap-2 pt-4 border-t border-dark-4 mt-4">
        <button className="flex-1 py-2 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors">
          Ask Content Agent ▸
        </button>
      </div>
    </>
  );
}

// ── Main DetailPanel ───────────────────────────────────────────

export default function DetailPanel() {
  const { panel, closePanel, openPanel, isOpen } = usePanel();
  const [data, setData] = useState<PanelData>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (type: string, id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/panel/${type}/${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(`Could not load ${type} detail.`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (panel) {
      fetchData(panel.type, panel.id);
    } else {
      setData(null);
      setError(null);
    }
  }, [panel, fetchData]);

  const typeLabel: Record<string, string> = {
    project: "Project", account: "Account", milestone: "Milestone",
    decision: "Decision", news: "News Item", content: "Content Asset",
    task: "Task", agent: "Agent",
  };

  const getTitle = () => {
    if (!data) return panel ? typeLabel[panel.type] || "Detail" : "Detail";
    if (data.type === "project")   return data.name;
    if (data.type === "account")   return data.name;
    if (data.type === "milestone") return data.name;
    if (data.type === "decision")  return `${data.code}: Decision`;
    if (data.type === "news")      return data.title;
    if (data.type === "content")   return data.title;
    if (data.type === "task")      return data.name;
    return "Detail";
  };

  const getSubtitle = () => {
    if (!data) return "";
    if (data.type === "project")   return `${data.code} · ${data.client}`;
    if (data.type === "account")   return `${data.category} · ${data.city}, ${data.country}`;
    if (data.type === "milestone") return data.project ? data.project.code : "Enterprise milestone";
    if (data.type === "decision")  return data.owner ? `Owner: ${data.owner}` : "Pending decision";
    if (data.type === "news")      return data.source;
    if (data.type === "content")   return `${data.asset_type} · ${data.status}`;
    if (data.type === "task")      return `${data.task_code}${data.project ? ` · ${data.project.name}` : ""}`;
    return "";
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closePanel}
      />

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[520px] bg-dark-2 border-l border-dark-4 z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-dark-4 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-white leading-tight truncate">{getTitle()}</h2>
            {getSubtitle() && (
              <div className="text-[11px] text-dark-5 mt-0.5">{getSubtitle()}</div>
            )}
          </div>
          <button
            onClick={closePanel}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-3 text-dark-5 hover:text-white hover:bg-dark-4 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-dark-3 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {data.type === "project"   && <ProjectPanel   data={data} openPanel={openPanel} />}
              {data.type === "account"   && <AccountPanel   data={data} />}
              {data.type === "milestone" && <MilestonePanel data={data} />}
              {data.type === "decision"  && <DecisionPanel  data={data} />}
              {data.type === "news"      && <NewsPanel      data={data} />}
              {data.type === "content"   && <ContentPanel   data={data} />}
              {data.type === "task"      && <TaskPanel      data={data} openPanel={openPanel} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}
