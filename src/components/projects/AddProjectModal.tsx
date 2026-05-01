"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface AddProjectModalProps {
  onClose: () => void;
  onCreated: (project: Record<string, unknown>) => void;
}

// ── Category definitions ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id:          "Product",
    icon:        "🤖",
    label:       "AI Products",
    description: "Software, models, platforms",
    accent:      "#7C6AF7",
  },
  {
    id:          "Consultancy",
    icon:        "🔧",
    label:       "Client Engagements",
    description: "RFQs, delivery, invoicing",
    accent:      "#F5A623",
  },
  {
    id:          "Operations",
    icon:        "⚙️",
    label:       "Internal / Platform",
    description: "Infra, tooling, processes",
    accent:      "#4A9EFF",
  },
  {
    id:          "BD",
    icon:        "📈",
    label:       "Business Dev",
    description: "Leads, partnerships, deals",
    accent:      "#34D399",
  },
  {
    id:          "Publishing",
    icon:        "📝",
    label:       "Content & IP",
    description: "Articles, decks, frameworks",
    accent:      "#F472B6",
  },
];

// Category-aware stage ladders
export const STAGES: Record<string, string[]> = {
  Consultancy: ["RFQ", "Submitted", "Negotiation", "Won", "Discovery", "Delivery", "Invoiced", "Lost"],
  Product:     ["Concept", "PoC", "Alpha", "Beta", "Live", "Deprecated"],
  Operations:  ["Discovery", "Build", "Testing", "Live", "Maintenance"],
  BD:          ["Identified", "Researched", "Outreach", "Active", "Closed"],
  Publishing:  ["Outline", "Draft", "Review", "Approved", "Published"],
};

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const STATUSES   = [
  { id: "pending",   label: "Planned"   },
  { id: "active",    label: "Active"    },
  { id: "on_hold",   label: "On Hold"   },
  { id: "completed", label: "Delivered" },
];

const FIELD = "w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder:text-dark-5 focus:outline-none focus:border-gold/60 transition-colors";
const LABEL = "block text-[10px] font-bold uppercase tracking-wider mb-1.5";

export default function AddProjectModal({ onClose, onCreated }: AddProjectModalProps) {
  const [step,       setStep]       = useState<1 | 2>(1);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    code:          "",
    name:          "",
    client:        "",
    category:      "Product",
    priority:      "P1",
    status:        "active",
    stage:         STAGES["Product"][0],
    summary:       "",
    target_date:   "",
    selling_price: "",
    margin_pct:    "",
  });

  const activeCat = CATEGORIES.find(c => c.id === form.category) ?? CATEGORIES[0];

  // ── Auto-focus name input when entering step 2 ──────────────────────────────
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [step]);

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (step === 1) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx(i => (i + 1) % CATEGORIES.length);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx(i => (i - 1 + CATEGORIES.length) % CATEGORIES.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectCategory(CATEGORIES[focusedIdx].id);
      }
    } else {
      if (e.key === "Escape") { setStep(1); }
    }
  }, [step, focusedIdx, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ── Category selection ───────────────────────────────────────────────────────
  function selectCategory(id: string) {
    setForm(prev => ({ ...prev, category: id, stage: STAGES[id]?.[0] ?? "" }));
    setStep(2);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function set(key: string, value: string) {
    if (key === "category") {
      setForm(prev => ({ ...prev, category: value, stage: STAGES[value]?.[0] ?? "" }));
      return;
    }
    if (key === "name") {
      const slug = value
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map(w => w.slice(0, 4))
        .join("-");
      setForm(prev => ({ ...prev, name: value, code: prev.code || slug }));
      return;
    }
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
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
      function_area: form.category,
      priority:      form.priority,
      status:        form.status,
      stage:         form.stage,
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{
          background: "#151515",
          border: "1px solid #2A2A2A",
          maxWidth: step === 1 ? 560 : 540,
          transition: "max-width 0.2s ease",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #2A2A2A" }}
        >
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white">New Project</h3>
              <p className="text-[10px] mt-0.5" style={{ color: "#8E8E93" }}>
                {step === 1 ? "Pick a category to get started" : `${activeCat.icon} ${activeCat.label}`}
              </p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {[1, 2].map(s => (
                <div
                  key={s}
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: s === step ? activeCat.accent : "#3A3A3A",
                    width: s === step ? 20 : 6,
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="text-grey hover:text-white transition-colors text-lg leading-none"
              style={{ color: "#5A5A5A" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Step 1: Category grid ── */}
        {step === 1 && (
          <div className="px-5 py-5">
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat, idx) => {
                const stages  = STAGES[cat.id] ?? [];
                const preview = stages.slice(0, 4);
                const overflow = stages.length - 4;
                const isFocused = focusedIdx === idx;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectCategory(cat.id)}
                    onMouseEnter={() => setFocusedIdx(idx)}
                    className="text-left rounded-xl p-4 transition-all"
                    style={{
                      background:  isFocused ? `${cat.accent}15` : "#1E1E1E",
                      border:      isFocused ? `1px solid ${cat.accent}60` : "1px solid #2A2A2A",
                      outline:     "none",
                    }}
                  >
                    {/* Icon + label */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span style={{ fontSize: 20, lineHeight: 1 }}>{cat.icon}</span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isFocused ? cat.accent : "#E0E0E0" }}
                      >
                        {cat.label}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] mb-3" style={{ color: "#6A6A6A" }}>
                      {cat.description}
                    </p>

                    {/* Stage preview pills */}
                    <div className="flex flex-wrap gap-1">
                      {preview.map((s, i) => (
                        <span
                          key={s}
                          className="flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{
                            background: isFocused ? `${cat.accent}20` : "#2A2A2A",
                            color:      isFocused ? cat.accent : "#5A5A5A",
                          }}
                        >
                          {i > 0 && <span style={{ opacity: 0.4, fontSize: 8 }}>›</span>}
                          {s}
                        </span>
                      ))}
                      {overflow > 0 && (
                        <span
                          className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: "#2A2A2A", color: "#5A5A5A" }}
                        >
                          +{overflow}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Keyboard hint — spans full width in odd grid */}
              <div
                className="col-span-2 text-center text-[10px] pt-1"
                style={{ color: "#3A3A3A" }}
              >
                ↑↓ navigate · Enter select · Esc close
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Project details ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Stage pipeline preview strip */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={LABEL} style={{ color: "#8E8E93" }}>Stage</label>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[10px] transition-colors"
                  style={{ color: activeCat.accent }}
                >
                  ← Change category
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(STAGES[form.category] ?? []).map((s, i) => {
                  const active = form.stage === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set("stage", s)}
                      className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: active ? activeCat.accent : "#2A2A2A",
                        color:      active ? "#0D0D0D" : "#6A6A6A",
                        border:     active ? "none" : "1px solid #3A3A3A",
                      }}
                    >
                      {i > 0 && <span style={{ opacity: 0.35, fontSize: 9 }}>›</span>}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 1: Code + Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL} style={{ color: "#8E8E93" }}>Code *</label>
                <input
                  className={FIELD}
                  placeholder="VIBESE-001"
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL} style={{ color: "#8E8E93" }}>Name *</label>
                <input
                  ref={nameInputRef}
                  className={FIELD}
                  placeholder="Project name"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                />
              </div>
            </div>

            {/* Row 2: Client + Priority + Status */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL} style={{ color: "#8E8E93" }}>Client</label>
                <input
                  className={FIELD}
                  placeholder="Embedia"
                  value={form.client}
                  onChange={e => set("client", e.target.value)}
                />
              </div>
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
            </div>

            {/* Row 3: Target date + Price + Margin */}
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
                placeholder="One-paragraph project description..."
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
                  background: saving ? `${activeCat.accent}AA` : activeCat.accent,
                  color:      "#0D0D0D",
                  opacity:    saving ? 0.7 : 1,
                }}
              >
                {saving ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
