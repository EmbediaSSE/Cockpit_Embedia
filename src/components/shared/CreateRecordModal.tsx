"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RecordType = "project" | "task" | "milestone" | "decision";

interface Project { id: string; code: string; name: string; }

interface CreateRecordModalProps {
  defaultType?: RecordType;
  onClose: () => void;
  onCreated?: (type: RecordType, data: Record<string, unknown>) => void;
}

// ── Natural language parsers ───────────────────────────────────

function parseDate(text: string): string | null {
  const today = new Date();
  const lower = text.toLowerCase();

  // Explicit date patterns
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const ddmmMatch = text.match(/(\d{1,2})[\/\-\s]([A-Za-z]+|\d{1,2})(?:[\/\-\s](\d{2,4}))?/);
  if (ddmmMatch) {
    const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const day = parseInt(ddmmMatch[1]);
    const monthRaw = ddmmMatch[2].toLowerCase().slice(0, 3);
    const monthNum = months[monthRaw] ?? (parseInt(ddmmMatch[2]) - 1);
    const year = ddmmMatch[3] ? (parseInt(ddmmMatch[3]) < 100 ? 2000 + parseInt(ddmmMatch[3]) : parseInt(ddmmMatch[3])) : today.getFullYear();
    if (!isNaN(day) && !isNaN(monthNum)) {
      return new Date(year, monthNum, day).toISOString().split("T")[0];
    }
  }

  // Relative
  if (lower.includes("tomorrow")) { const d = new Date(today); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; }
  if (lower.includes("next week")) { const d = new Date(today); d.setDate(d.getDate()+7); return d.toISOString().split("T")[0]; }
  if (lower.includes("end of month")) { const d = new Date(today.getFullYear(), today.getMonth()+1, 0); return d.toISOString().split("T")[0]; }
  if (lower.includes("end of year")) return `${today.getFullYear()}-12-31`;

  // Month name only
  const monthNames: Record<string, number> = { january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11 };
  for (const [name, idx] of Object.entries(monthNames)) {
    if (lower.includes(name) || lower.includes(name.slice(0,3))) {
      const year = today.getMonth() > idx ? today.getFullYear() + 1 : today.getFullYear();
      return new Date(year, idx, 30).toISOString().split("T")[0];
    }
  }
  return null;
}

function toSlug(text: string, maxLen = 10): string {
  return text.toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim().split(/\s+/).slice(0, 3).map(w => w.slice(0, maxLen)).join("-");
}

function parseProject(text: string) {
  const priority = text.match(/\b(P0|P1|P2|P3)\b/i)?.[1]?.toUpperCase() || "P2";
  const categoryMap: Record<string, string> = {
    consultancy: "Consultancy", consult: "Consultancy", product: "Product",
    publishing: "Publishing", bd: "BD", "biz dev": "BD", ops: "Operations", operations: "Operations",
  };
  let category = "Consultancy";
  for (const [kw, val] of Object.entries(categoryMap)) {
    if (text.toLowerCase().includes(kw)) { category = val; break; }
  }
  const target_date = parseDate(text);
  // Remove keywords to get clean name
  const name = text
    .replace(/\b(P0|P1|P2|P3)\b/gi, "")
    .replace(/due\s+\S+/gi, "")
    .replace(new RegExp(Object.keys(categoryMap).join("|"), "gi"), "")
    .replace(/\s+/g, " ").trim();
  const code = toSlug(name);
  return { name, code, priority, category, target_date };
}

function parseTask(text: string) {
  const priority_match = text.match(/\b(P0|P1|P2|P3)\b/i);
  const status_match = text.match(/\b(todo|in.?progress|done|blocked)\b/i);
  const effort_match = text.match(/(\d+(?:\.\d+)?)\s*d(?:ays?)?\b/i);
  const project_match = text.match(/\b([A-Z]{2,}-\d{3,})\b/);
  const due_date = parseDate(text);
  // Assignee: "for X", "@X", or "assign.*to X"
  const assignee_match = text.match(/(?:for|@|assign(?:ed)?\s+to)\s+([A-Za-z]+)/i);
  const sprint_match = text.match(/sprint\s*(\S+)/i);
  // Epic: "epic X" or "#X"
  const epic_match = text.match(/(?:epic\s+|#)(\S+)/i);

  let name = text
    .replace(/\b(P0|P1|P2|P3)\b/gi, "")
    .replace(/\b([A-Z]{2,}-\d{3,})\b/, "")
    .replace(/\d+(?:\.\d+)?d(?:ays?)?\b/gi, "")
    .replace(/(?:for|@|assign(?:ed)?\s+to)\s+\S+/gi, "")
    .replace(/due\s+\S+/gi, "")
    .replace(/sprint\s*\S+/gi, "")
    .replace(/(?:epic\s+|#)\S+/gi, "")
    .replace(/\s+/g, " ").trim();

  return {
    name: name || text,
    project_code: project_match?.[1] || "",
    status: status_match ? status_match[1].toLowerCase().replace(/\s|-/g, "_") : "todo",
    effort_days: effort_match ? parseFloat(effort_match[1]) : 0,
    assignee: assignee_match?.[1] || "",
    due_date,
    sprint_name: sprint_match?.[1] || "",
    epic: epic_match?.[1] || "",
    priority: priority_match?.[1] || "P2",
  };
}

function parseMilestone(text: string) {
  const project_match = text.match(/\b([A-Z]{2,}-\d{3,})\b/);
  const status_match = text.match(/\b(done|active|pending|at.?risk|overdue)\b/i);
  const target_date = parseDate(text);
  const unlocks_match = text.match(/unlock[s]?\s+(.+?)(?:,|$)/i);
  let name = text
    .replace(/\b([A-Z]{2,}-\d{3,})\b/, "")
    .replace(/target\s+\S+/gi, "")
    .replace(/due\s+\S+/gi, "")
    .replace(/unlock[s]?\s+.+/gi, "")
    .replace(/\s+/g, " ").trim();
  return {
    name: name || text,
    project_code: project_match?.[1] || "",
    target_date,
    status: status_match?.[1]?.toLowerCase().replace(/\s|-/g, "_") || "pending",
    unlocks: unlocks_match?.[1]?.trim() || "",
  };
}

function parseDecision(text: string) {
  const project_match = text.match(/\b([A-Z]{2,}-\d{3,})\b/);
  const owner_match = text.match(/(?:owner|by|assigned\s+to)\s+([A-Za-z]+)/i);
  const deadline = parseDate(text);
  const status_match = text.match(/\b(pending|approved|rejected|deferred)\b/i);
  let decisionText = text
    .replace(/\b([A-Z]{2,}-\d{3,})\b/, "")
    .replace(/(?:owner|by)\s+\S+/gi, "")
    .replace(/deadline\s+\S+/gi, "")
    .replace(/due\s+\S+/gi, "")
    .replace(/\s+/g, " ").trim();
  return {
    text: decisionText || text,
    project_code: project_match?.[1] || "",
    owner: owner_match?.[1] || "",
    deadline,
    status: status_match?.[1] || "pending",
  };
}

// ── Field components ───────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-dark-5 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-dark-2 border border-dark-4 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-5 focus:outline-none focus:border-gold/50";
const selectCls = inputCls;

// ── Form sections by type ──────────────────────────────────────

function ProjectForm({ values, onChange }: { values: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" required>
          <input className={inputCls} value={values.name || ""} onChange={e => onChange("name", e.target.value)} placeholder="e.g. MBSE Agent for Garrett" />
        </Field>
        <Field label="Code" required>
          <input className={inputCls} value={values.code || ""} onChange={e => onChange("code", e.target.value.toUpperCase())} placeholder="e.g. MBSE-GAR" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client">
          <input className={inputCls} value={values.client || ""} onChange={e => onChange("client", e.target.value)} placeholder="e.g. Garrett" />
        </Field>
        <Field label="Category" required>
          <select className={selectCls} value={values.category || "Consultancy"} onChange={e => onChange("category", e.target.value)}>
            {["Consultancy","Product","Publishing","BD","ProfDevel","Operations"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Priority">
          <select className={selectCls} value={values.priority || "P2"} onChange={e => onChange("priority", e.target.value)}>
            {["P0","P1","P2","P3"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Stage">
          <select className={selectCls} value={values.stage || "Planned"} onChange={e => onChange("stage", e.target.value)}>
            {["Won","Active","Planned","Concept","Backlog","Delivered","Published","Closed","On Hold"].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Target Date">
          <input type="date" className={inputCls} value={values.target_date || ""} onChange={e => onChange("target_date", e.target.value)} />
        </Field>
      </div>
      <Field label="Summary">
        <textarea className={inputCls} rows={2} value={values.summary || ""} onChange={e => onChange("summary", e.target.value)} placeholder="Brief description of the project" />
      </Field>
    </div>
  );
}

function TaskForm({ values, onChange, projects }: { values: Record<string, string>; onChange: (k: string, v: string) => void; projects: Project[] }) {
  return (
    <div className="space-y-3">
      <Field label="Task Name" required>
        <input className={inputCls} value={values.name || ""} onChange={e => onChange("name", e.target.value)} placeholder="e.g. Deploy to production" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project" required>
          <select className={selectCls} value={values.project_code || ""} onChange={e => onChange("project_code", e.target.value)}>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
        </Field>
        <Field label="Stage">
          <input className={inputCls} value={values.stage_name || "General"} onChange={e => onChange("stage_name", e.target.value)} placeholder="e.g. Development" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Status">
          <select className={selectCls} value={values.status || "todo"} onChange={e => onChange("status", e.target.value)}>
            {[["todo","Todo"],["in_progress","In Progress"],["done","Done"],["blocked","Blocked"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Assignee">
          <input className={inputCls} value={values.assignee || ""} onChange={e => onChange("assignee", e.target.value)} placeholder="Name" />
        </Field>
        <Field label="Effort (days)">
          <input type="number" step="0.5" className={inputCls} value={values.effort_days || ""} onChange={e => onChange("effort_days", e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due Date">
          <input type="date" className={inputCls} value={values.due_date || ""} onChange={e => onChange("due_date", e.target.value)} />
        </Field>
        <Field label="Sprint">
          <input className={inputCls} value={values.sprint_name || ""} onChange={e => onChange("sprint_name", e.target.value)} placeholder="e.g. Sprint 3" />
        </Field>
      </div>
      <Field label="Epic">
        <input className={inputCls} value={values.epic || ""} onChange={e => onChange("epic", e.target.value)} placeholder="e.g. Platform" />
      </Field>
    </div>
  );
}

function MilestoneForm({ values, onChange, projects }: { values: Record<string, string>; onChange: (k: string, v: string) => void; projects: Project[] }) {
  return (
    <div className="space-y-3">
      <Field label="Milestone Name" required>
        <input className={inputCls} value={values.name || ""} onChange={e => onChange("name", e.target.value)} placeholder="e.g. Public Launch" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Project">
          <select className={selectCls} value={values.project_code || ""} onChange={e => onChange("project_code", e.target.value)}>
            <option value="">— Enterprise / no project —</option>
            {projects.map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
        </Field>
        <Field label="Target Date">
          <input type="date" className={inputCls} value={values.target_date || ""} onChange={e => onChange("target_date", e.target.value)} />
        </Field>
      </div>
      <Field label="Status">
        <select className={selectCls} value={values.status || "pending"} onChange={e => onChange("status", e.target.value)}>
          {[["pending","Pending"],["active","Active"],["done","Done"],["at_risk","At Risk"],["overdue","Overdue"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field label="Unlocks (what this enables)">
        <input className={inputCls} value={values.unlocks || ""} onChange={e => onChange("unlocks", e.target.value)} placeholder="e.g. Customer onboarding, full deployment" />
      </Field>
    </div>
  );
}

function DecisionForm({ values, onChange, projects }: { values: Record<string, string>; onChange: (k: string, v: string) => void; projects: Project[] }) {
  return (
    <div className="space-y-3">
      <Field label="Decision" required>
        <textarea className={inputCls} rows={2} value={values.text || ""} onChange={e => onChange("text", e.target.value)} placeholder="e.g. Go/No-Go on MBSE Beta release" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner">
          <input className={inputCls} value={values.owner || ""} onChange={e => onChange("owner", e.target.value)} placeholder="Who decides?" />
        </Field>
        <Field label="Deadline">
          <input type="date" className={inputCls} value={values.deadline || ""} onChange={e => onChange("deadline", e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select className={selectCls} value={values.status || "pending"} onChange={e => onChange("status", e.target.value)}>
            {[["pending","Pending"],["approved","Approved"],["rejected","Rejected"],["deferred","Deferred"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Linked Project">
          <select className={selectCls} value={values.project_code || ""} onChange={e => onChange("project_code", e.target.value)}>
            <option value="">— None —</option>
            {projects.map(p => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes / Context">
        <textarea className={inputCls} rows={2} value={values.note || ""} onChange={e => onChange("note", e.target.value)} placeholder="Current thinking, considerations, rationale…" />
      </Field>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────

const TYPE_LABELS: Record<RecordType, string> = {
  project: "Project", task: "Task", milestone: "Milestone", decision: "Decision",
};
const TYPE_ICONS: Record<RecordType, string> = {
  project: "🗂", task: "✅", milestone: "🏁", decision: "⚖️",
};
const QUICK_PLACEHOLDERS: Record<RecordType, string> = {
  project:   "e.g. "New MBSE agent for Garrett, Consultancy, P1, due June 2026"",
  task:      "e.g. "Deploy to production in COCKPIT-001, assignee Safouen, 2d effort, due 30 Apr"",
  milestone: "e.g. "Public launch target 15 May COCKPIT-001, unlocks customer onboarding"",
  decision:  "e.g. "Go/No-Go MBSE Beta, owner Safouen, deadline end of April"",
};

export default function CreateRecordModal({ defaultType = "project", onClose, onCreated }: CreateRecordModalProps) {
  const [type, setType] = useState<RecordType>(defaultType);
  const [mode, setMode] = useState<"quick" | "form">("quick");
  const [quickText, setQuickText] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const quickRef = useRef<HTMLTextAreaElement>(null);

  // Fetch projects for dropdowns
  useEffect(() => {
    const supabase = createClient();
    supabase.from("projects").select("id, code, name").order("code").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  // Focus quick input when mode changes
  useEffect(() => { if (mode === "quick") quickRef.current?.focus(); }, [mode]);

  // Reset form when type changes
  useEffect(() => { setFormValues({}); setQuickText(""); setError(null); }, [type]);

  const handleQuickParse = () => {
    if (!quickText.trim()) return;
    let parsed: Record<string, string> = {};
    if (type === "project")   parsed = parseProject(quickText) as Record<string, string>;
    if (type === "task")      parsed = parseTask(quickText) as Record<string, string>;
    if (type === "milestone") parsed = parseMilestone(quickText) as Record<string, string>;
    if (type === "decision")  parsed = parseDecision(quickText) as Record<string, string>;
    // Convert nulls to empty strings
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) { cleaned[k] = v == null ? "" : String(v); }
    setFormValues(cleaned);
    setMode("form");
  };

  const setField = (k: string, v: string) => setFormValues(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(formValues)) {
        if (v !== "" && v !== null && v !== undefined) payload[k] = v;
      }
      // Parse numeric fields
      if (type === "task" && payload.effort_days) payload.effort_days = parseFloat(payload.effort_days as string);
      if (type === "project" && payload.selling_price) payload.selling_price = parseFloat(payload.selling_price as string);

      const res = await fetch(`/api/panel/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to create record");
      onCreated?.(type, json.data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-[200]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[210] w-full max-w-lg bg-dark-2 border border-dark-4 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">New Record</h2>
            <p className="text-[10px] text-dark-5 mt-0.5">Quick entry or fill the form</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-3 text-dark-5 hover:text-white hover:bg-dark-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Type selector */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {(["project","task","milestone","decision"] as RecordType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                type === t ? "bg-gold/15 border border-gold/40 text-gold" : "bg-dark-3 border border-transparent text-dark-5 hover:text-grey"
              }`}
            >
              <span className="text-base">{TYPE_ICONS[t]}</span>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {(["quick","form"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded text-[10px] font-semibold transition-colors ${
                mode === m ? "bg-gold text-dark-1 font-bold" : "text-dark-5 hover:text-grey"
              }`}
            >
              {m === "quick" ? "⚡ Quick" : "📋 Form"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {mode === "quick" && (
            <div className="space-y-3">
              <textarea
                ref={quickRef}
                value={quickText}
                onChange={e => setQuickText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuickParse(); }}
                rows={4}
                placeholder={QUICK_PLACEHOLDERS[type]}
                className="w-full bg-dark-3 border border-dark-4 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50 resize-none leading-relaxed"
              />
              <p className="text-[10px] text-dark-5">Tip: include project code (e.g. COCKPIT-001), dates, priority (P0-P3), assignee. Press ⌘+Enter to parse.</p>
              <button
                onClick={handleQuickParse}
                disabled={!quickText.trim()}
                className="w-full py-2.5 bg-gold/10 border border-gold/30 text-gold text-xs font-semibold rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-40"
              >
                Parse &amp; Fill Form →
              </button>
            </div>
          )}

          {mode === "form" && (
            <>
              {type === "project"   && <ProjectForm   values={formValues} onChange={setField} />}
              {type === "task"      && <TaskForm      values={formValues} onChange={setField} projects={projects} />}
              {type === "milestone" && <MilestoneForm values={formValues} onChange={setField} projects={projects} />}
              {type === "decision"  && <DecisionForm  values={formValues} onChange={setField} projects={projects} />}
            </>
          )}

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-dark-4 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 bg-dark-3 border border-dark-4 text-grey text-xs font-semibold rounded-lg hover:text-white transition-colors">
            Cancel
          </button>
          {mode === "quick" ? (
            <button
              onClick={handleQuickParse}
              disabled={!quickText.trim()}
              className="flex-1 py-2.5 bg-gold text-dark-1 text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40"
            >
              Parse →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 bg-gold text-dark-1 text-xs font-bold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : `Create ${TYPE_LABELS[type]}`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
