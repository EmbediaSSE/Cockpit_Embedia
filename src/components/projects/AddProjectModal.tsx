"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AddProjectModalProps {
  onClose: () => void;
  onCreated: (project: Record<string, unknown>) => void;
}

const CATEGORIES = [
  { id: "Product",     label: "🤖 AI Products"         },
  { id: "Consultancy", label: "🔧 Client Engagements"  },
  { id: "Operations",  label: "⚙️ Internal / Platform" },
  { id: "BD",          label: "📈 Business Dev"        },
  { id: "Publishing",  label: "📝 Content & IP"        },
];

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const STATUSES   = [
  { id: "pending",   label: "Planned"   },
  { id: "active",    label: "Active"    },
  { id: "on_hold",   label: "On Hold"   },
  { id: "completed", label: "Delivered" },
];

// Category-aware phase ladders
const PHASES: Record<string, string[]> = {
  Consultancy: ["RFQ", "Submitted", "Negotiation", "Won", "Discovery", "Delivery", "Invoiced", "Lost"],
  Product:     ["Concept", "PoC", "Alpha", "Beta", "Live", "Deprecated"],
  Operations:  ["Discovery", "Build", "Testing", "Live", "Maintenance"],
  BD:          ["Identified", "Researched", "Outreach", "Active", "Closed"],
  Publishing:  ["Outline", "Draft", "Review", "Approved", "Published"],
};

const FIELD = "w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder:text-dark-5 focus:outline-none focus:border-gold/60 transition-colors";
const LABEL = "block text-[10px] font-bold uppercase tracking-wider mb-1.5";

export default function AddProjectModal({ onClose, onCreated }: AddProjectModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    code:          "",
    name:          "",
    client:        "",
    category:      "Product",
    priority:      "P1",
    status:        "active",
    phase:         "",
    summary:       "",
    target_date:   "",
    selling_price: "",
    margin_pct:    "",
  });

  function set(key: string, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
    // Auto-suggest code from name
    if (key === "name" && !form.code) {
      const slug = value
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map(w => w.slice(0, 4))
        .join("-");
      setForm(prev => ({ ...prev, name: value, code: slug || prev.code }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and Name are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      code:          form.code.trim().toUpperCase(),
      name:          form.name.trim(),
      client:        form.client.trim() || "Embedia",
      category:      form.category,
      priority:      form.priority,
      status:        form.status,
      stage:         "Active",
      phase:         form.phase.trim() || null,
      summary:       form.summary.trim() || null,
      target_date:   form.target_date || null,
      selling_price: parseFloat(form.selling_price) || 0,
      margin_pct:    parseFloat(form.margin_pct)    || 0,
      risks_summary: [],
    };

    const supabase = createClient();
    const { data, error: dbErr } = await supabase
      .from("projects")
      .insert(payload)
      .select()
      .single();

    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }

    onCreated(data as Record<string, unknown>);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "#151515", border: "1px solid #2A2A2A" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #2A2A2A" }}
        >
          <div>
            <h3 className="text-base font-bold text-white">New Project</h3>
            <p className="text-[10px] mt-0.5" style={{ color: "#8E8E93" }}>
              Creates the record in Cockpit — workspace folder syncs on next export
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-grey hover:text-white transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1: Code + Name */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Code *</label>
              <input
                className={FIELD}
                placeholder="CYBER-001"
                value={form.code}
                onChange={e => set("code", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL} style={{ color: "#8E8E93" }}>Name *</label>
              <input
                className={FIELD}
                placeholder="Project name"
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Client + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Client</label>
              <input
                className={FIELD}
                placeholder="Client or Embedia"
                value={form.client}
                onChange={e => set("client", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Category</label>
              <select className={FIELD} value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Priority + Status + Phase */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Priority</label>
              <select className={FIELD} value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Status</label>
              <select className={FIELD} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Phase</label>
              {/* Datalist gives dropdown suggestions while still allowing free text */}
              <input
                className={FIELD}
                list={`phases-${form.category}`}
                placeholder={PHASES[form.category]?.[0] ?? "e.g. Discovery"}
                value={form.phase}
                onChange={e => set("phase", e.target.value)}
              />
              <datalist id={`phases-${form.category}`}>
                {(PHASES[form.category] ?? []).map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {/* Phase ladder hint */}
              {PHASES[form.category] && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {PHASES[form.category].map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("phase", p)}
                      className="text-[8px] px-1.5 py-0.5 rounded transition-all"
                      style={{
                        background: form.phase === p ? "#F5A623" : "#2A2A2A",
                        color:      form.phase === p ? "#0D0D0D" : "#3A3A3A",
                        fontWeight: form.phase === p ? 700 : 400,
                      }}
                    >
                      {i > 0 && <span style={{ marginRight: 2, opacity: 0.4 }}>›</span>}
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Target date + Price + Margin */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Target date</label>
              <input
                type="date"
                className={FIELD}
                value={form.target_date}
                onChange={e => set("target_date", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Price (€)</label>
              <input
                type="number"
                className={FIELD}
                placeholder="0"
                value={form.selling_price}
                onChange={e => set("selling_price", e.target.value)}
              />
            </div>
            <div>
              <label className={LABEL} style={{ color: "#8E8E93" }}>Margin %</label>
              <input
                type="number"
                className={FIELD}
                placeholder="0"
                value={form.margin_pct}
                onChange={e => set("margin_pct", e.target.value)}
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className={LABEL} style={{ color: "#8E8E93" }}>Summary</label>
            <textarea
              className={FIELD}
              rows={3}
              placeholder="One-paragraph project description…"
              value={form.summary}
              onChange={e => set("summary", e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg transition-colors"
              style={{ background: "#2A2A2A", color: "#8E8E93" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{
                background: saving ? "#C47D0E" : "#F5A623",
                color: "#0D0D0D",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
