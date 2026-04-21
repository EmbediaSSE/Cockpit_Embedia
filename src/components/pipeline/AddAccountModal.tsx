"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Swimlane = "customer" | "investor" | "ecosystem" | "talent";

interface AddAccountModalProps {
  onClose: () => void;
  onAdded: () => void;
  defaultSwimlane?: Swimlane;
}

const SWIMLANE_STAGES: Record<Swimlane, { id: string; label: string }[]> = {
  customer: [
    { id: "target",   label: "Target" },
    { id: "engaged",  label: "Engaged" },
    { id: "proposal", label: "Proposal" },
    { id: "active",   label: "Active" },
    { id: "retained", label: "Retained" },
    { id: "churned",  label: "Churned" },
  ],
  investor: [
    { id: "identified",    label: "Identified" },
    { id: "submitted",     label: "Submitted" },
    { id: "due_diligence", label: "Due Diligence" },
    { id: "term_sheet",    label: "Term Sheet" },
    { id: "closed_won",    label: "Closed Won" },
    { id: "closed_lost",   label: "Closed Lost" },
  ],
  ecosystem: [
    { id: "identified",  label: "Identified" },
    { id: "researched",  label: "Researched" },
    { id: "applied",     label: "Applied" },
    { id: "member",      label: "Member" },
    { id: "ambassador",  label: "Ambassador" },
  ],
  talent: [
    { id: "identified",  label: "Identified" },
    { id: "researched",  label: "Researched" },
    { id: "approached",  label: "Approached" },
    { id: "screening",   label: "Screening" },
    { id: "placed",      label: "Placed" },
  ],
};

// Keep legacy STAGES for the NL parser fallback
const STAGES = SWIMLANE_STAGES.customer;

const CATEGORIES = [
  "Tier-1 Supplier",
  "OEM",
  "Tier-2 Supplier",
  "Startup",
  "Investor",
  "Machinery",
  "Talent — ASIC Engineering",
  "Talent — Embedded Software",
  "Talent — Systems Engineering",
  "Talent — Other",
  "Other",
];

const PRIORITIES = ["P1", "P2", "P3"];

interface AccountForm {
  name: string;
  category: string;
  country: string;
  region: string;
  city: string;
  website: string;
  icp_segment: string;
  status: string;
  priority: string;
  notes: string;
  next_action: string;
  revenue_potential: string;
}

const EMPTY_FORM: AccountForm = {
  name: "",
  category: "",
  country: "",
  region: "",
  city: "",
  website: "",
  icp_segment: "",
  status: "identified",
  priority: "P2",
  notes: "",
  next_action: "",
  revenue_potential: "",
};

/** Very lightweight natural-language parser.
 *  Tries to extract known fields from a free-text snippet.
 *  Example: "Garrett Motion, France, Tier-1, MBSE interest, contacted"
 */
function parseNaturalInput(text: string): Partial<AccountForm> {
  const result: Partial<AccountForm> = {};
  const parts = text.split(/[,;|\n]+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return result;

  // First token = name (always)
  result.name = parts[0];

  const lower = text.toLowerCase();

  // Status detection
  for (const s of STAGES) {
    if (lower.includes(s.id) || lower.includes(s.label.toLowerCase())) {
      result.status = s.id;
      break;
    }
  }

  // Priority detection
  for (const p of PRIORITIES) {
    if (lower.includes(p.toLowerCase())) {
      result.priority = p;
      break;
    }
  }

  // Category detection
  const catMap: Record<string, string> = {
    "tier-1": "Tier-1 Supplier",
    "tier1": "Tier-1 Supplier",
    "tier-2": "Tier-2 Supplier",
    "tier2": "Tier-2 Supplier",
    "oem": "OEM",
    "startup": "Startup",
    "investor": "Investor",
    "machinery": "Machinery",
  };
  for (const [key, val] of Object.entries(catMap)) {
    if (lower.includes(key)) {
      result.category = val;
      break;
    }
  }

  // Country detection (simple list)
  const countries = [
    "Germany", "France", "Sweden", "UK", "USA", "Netherlands", "Belgium",
    "Austria", "Switzerland", "Italy", "Spain", "Finland", "Norway", "Denmark",
    "Poland", "UAE", "Japan", "South Korea", "China", "India",
  ];
  for (const c of countries) {
    if (lower.includes(c.toLowerCase())) {
      result.country = c;
      break;
    }
  }

  // Remaining tokens → notes (skip already-matched ones)
  const usedTokens = new Set([parts[0]]);
  const noteParts = parts.slice(1).filter((p) => {
    const pl = p.toLowerCase();
    const isStatus = STAGES.some((s) => pl === s.id || pl === s.label.toLowerCase());
    const isCat = Object.keys(catMap).some((k) => pl.includes(k));
    const isCountry = countries.some((c) => pl.toLowerCase() === c.toLowerCase());
    const isPriority = PRIORITIES.some((pr) => pl === pr.toLowerCase());
    return !isStatus && !isCat && !isCountry && !isPriority && !usedTokens.has(p);
  });
  if (noteParts.length) result.notes = noteParts.join(". ");

  return result;
}

export default function AddAccountModal({ onClose, onAdded, defaultSwimlane = "customer" }: AddAccountModalProps) {
  const [mode, setMode] = useState<"form" | "quick">("quick");
  const [quickText, setQuickText] = useState("");
  const [swimlane, setSwimlane] = useState<Swimlane>(defaultSwimlane);
  const [form, setForm] = useState<AccountForm>({
    ...EMPTY_FORM,
    status: SWIMLANE_STAGES[defaultSwimlane][0].id,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currentStages = SWIMLANE_STAGES[swimlane];

  function applyQuickText() {
    if (!quickText.trim()) return;
    const parsed = parseNaturalInput(quickText);
    setForm((prev) => ({ ...prev, ...parsed }));
    setMode("form");
  }

  function handleField(field: keyof AccountForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Account name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: dbError } = await supabase.from("pipeline_accounts").insert({
        name: form.name.trim(),
        category: form.category,
        country: form.country,
        region: form.region,
        city: form.city,
        website: form.website,
        icp_segment: form.icp_segment,
        status: form.status,
        swimlane,
        priority: form.priority,
        notes: form.notes,
        next_action: form.next_action,
        revenue_potential: form.revenue_potential ? parseFloat(form.revenue_potential) : 0,
      });
      if (dbError) throw dbError;
      onAdded();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-dark-2 border border-dark-4 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-4">
          <div>
            <h2 className="text-base font-bold text-white">Add Account</h2>
            {/* Swimlane selector */}
            <div className="flex gap-1 mt-1.5">
              {(["customer", "investor", "ecosystem", "talent"] as Swimlane[]).map((lane) => (
                <button
                  key={lane}
                  onClick={() => {
                    setSwimlane(lane);
                    setForm((prev) => ({ ...prev, status: SWIMLANE_STAGES[lane][0].id }));
                  }}
                  className={`px-2.5 py-0.5 rounded text-[9px] font-bold transition-all ${
                    swimlane === lane
                      ? lane === "customer" ? "bg-amber-500/20 text-amber-400"
                        : lane === "investor" ? "bg-yellow-400/20 text-yellow-400"
                        : lane === "talent" ? "bg-violet-500/20 text-violet-400"
                        : "bg-cyan-500/20 text-cyan-400"
                      : "text-dark-5 hover:text-grey"
                  }`}
                >
                  {lane.charAt(0).toUpperCase() + lane.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-dark-3 rounded-lg p-0.5">
              <button
                onClick={() => setMode("quick")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  mode === "quick" ? "bg-gold text-dark" : "text-grey hover:text-white"
                }`}
              >
                ⚡ Quick
              </button>
              <button
                onClick={() => setMode("form")}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  mode === "form" ? "bg-gold text-dark" : "text-grey hover:text-white"
                }`}
              >
                Form
              </button>
            </div>
            <button onClick={onClose} className="text-grey hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ── Quick mode ─────────────────────────────── */}
          {mode === "quick" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">
                  Describe the account in plain text
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder={`e.g. "Garrett Motion, France, Tier-1, MBSE interest, contacted last week"\n\nor paste a note from Claude and it will pre-fill the form`}
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-4 py-3 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50 resize-none"
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-dark-3 rounded-lg border border-dark-4">
                <span className="text-lg">🤖</span>
                <p className="text-[10px] text-grey leading-relaxed">
                  Claude can also fill this directly — just say{" "}
                  <span className="text-gold font-medium">"add [company] to the pipeline"</span>{" "}
                  in Cowork and it will push the data automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={applyQuickText}
                  disabled={!quickText.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-gold text-dark text-xs font-bold hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Parse → Fill Form
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg bg-dark-3 text-grey text-xs font-semibold hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Form mode ──────────────────────────────── */}
          {mode === "form" && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Name */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={form.name}
                  onChange={(e) => handleField("name", e.target.value)}
                  placeholder="e.g. Garrett Motion"
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Category + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => handleField("category", e.target.value)}
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 appearance-none"
                  >
                    <option value="">Select…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    Pipeline Stage
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => handleField("status", e.target.value)}
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 appearance-none"
                  >
                    {currentStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Country + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => handleField("country", e.target.value)}
                    placeholder="e.g. France"
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => handleField("priority", e.target.value)}
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/50 appearance-none"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ICP Segment + Website */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    ICP Segment
                  </label>
                  <input
                    type="text"
                    value={form.icp_segment}
                    onChange={(e) => handleField("icp_segment", e.target.value)}
                    placeholder="e.g. Tier-1 ADAS/EE"
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                    Website
                  </label>
                  <input
                    type="text"
                    value={form.website}
                    onChange={(e) => handleField("website", e.target.value)}
                    placeholder="e.g. garrettmotion.com"
                    className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>

              {/* Revenue potential */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                  Revenue Potential (€)
                </label>
                <input
                  type="number"
                  value={form.revenue_potential}
                  onChange={(e) => handleField("revenue_potential", e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => handleField("notes", e.target.value)}
                  placeholder="Context, source of lead, what they need…"
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50 resize-none"
                />
              </div>

              {/* Next action */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1.5">
                  Next Action
                </label>
                <input
                  type="text"
                  value={form.next_action}
                  onChange={(e) => handleField("next_action", e.target.value)}
                  placeholder="e.g. Send intro email by Fri"
                  className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-sm text-white placeholder-dark-5 focus:outline-none focus:border-gold/50"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg bg-gold text-dark text-xs font-bold hover:bg-gold/90 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add to Pipeline"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg bg-dark-3 text-grey text-xs font-semibold hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
