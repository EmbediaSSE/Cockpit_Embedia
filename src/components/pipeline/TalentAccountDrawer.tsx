"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── TalentAccountDrawer ────────────────────────────────────────────────────────
// Rich prospect-card drawer for Talent swimlane accounts.
// Parses structured JSON from the account's `notes` field and renders
// the full prospect card layout (header · info grid · roles · candidates · timeline).
// Supports adding new candidates (via PDF, URL, or pasted text) and roles
// (via URL or pasted job description) with Claude AI enrichment.

interface TalentAccount {
  id: string;
  name: string;
  category: string;
  country: string;
  region: string;
  city: string;
  website: string;
  icp_segment: string;
  status: string;
  notes: string;
  priority: string;
  created_at: string;
}

// ── Parsed note schema ─────────────────────────────────────────────────────────

interface RoleItem { title: string; tags: string; }
interface Candidate {
  name: string; role: string; match: "strong" | "weak" | "medium";
  target_roles: string; summary: string; tags: string[]; alert?: string;
  linkedin_url?: string;
}
interface NextStep { label: string; date: string; done: boolean; }
interface RichNotes {
  overview?: { type?: string; core_service?: string; markets?: string; };
  opportunity?: { open_roles_count?: string; signal?: string; urgency?: string; };
  roles?: Record<string, RoleItem[]>;
  candidates?: Candidate[];
  next_steps?: NextStep[];
}

function parseNotes(raw: string): RichNotes | null {
  try { return JSON.parse(raw) as RichNotes; } catch { return null; }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:application/pdf;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  identified: "Not Contacted",
  researched: "Researched",
  approached: "Approached",
  screening: "Screening",
  placed: "Placed",
};

const STATUS_COLORS: Record<string, string> = {
  identified: "bg-gold text-dark",
  researched:  "bg-blue-500/20 text-blue-300",
  approached:  "bg-amber-500/20 text-amber-300",
  screening:   "bg-violet-500/20 text-violet-300",
  placed:      "bg-green-500/20 text-green-300",
};

// ── Match badge ────────────────────────────────────────────────────────────────

function MatchBadge({ match }: { match: Candidate["match"] }) {
  const cfg = {
    strong: { color: "bg-green-500/15 text-green-400 border border-green-500/30", label: "Strong Match" },
    medium: { color: "bg-amber-500/15 text-amber-400 border border-amber-500/30", label: "Medium Match" },
    weak:   { color: "bg-red-500/15 text-red-400 border border-red-500/30",       label: "Weak Match"   },
  }[match];
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${cfg.color}`}>
      ⬤ {cfg.label}
    </span>
  );
}

// ── Section title ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5 mb-3 pb-2 border-b border-gold/30 inline-block w-full">
      {children}
    </div>
  );
}

// ── Add Candidate form ─────────────────────────────────────────────────────────

function AddCandidateForm({
  onSave,
  onCancel,
}: {
  onSave: (c: Candidate) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile]   = useState<File | null>(null);
  const [url, setUrl]           = useState("");
  const [rawText, setRawText]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [preview, setPreview]   = useState<Candidate | null>(null);

  // Editable preview fields
  const [name, setName]         = useState("");
  const [role, setRole]         = useState("");
  const [match, setMatch]       = useState<Candidate["match"]>("medium");
  const [targets, setTargets]   = useState("");
  const [summary, setSummary]   = useState("");
  const [tagsStr, setTagsStr]   = useState("");
  const [alert, setAlert]       = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") setPdfFile(f);
    else if (f) setError("Please select a PDF file.");
  }

  async function analyze() {
    if (!pdfFile && !url.trim() && !rawText.trim()) {
      setError("Upload a PDF, paste a URL, or paste profile text.");
      return;
    }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      let pdfBase64: string | undefined;
      if (pdfFile) pdfBase64 = await fileToBase64(pdfFile);

      const res = await fetch("/api/talent/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          rawText: rawText.trim() || undefined,
          pdfBase64,
          type: "candidate",
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      const c: Candidate = json.candidate;
      setPreview(c);
      setName(c.name || "");
      setRole(c.role || "");
      setMatch(c.match || "medium");
      setTargets(c.target_roles || "");
      setSummary(c.summary || "");
      setTagsStr((c.tags || []).join(", "));
      setAlert(c.alert || "");
    } catch {
      setError("Request failed. Check connection.");
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!name) { setError("Name is required."); return; }
    onSave({
      name,
      role,
      match,
      target_roles: targets,
      summary,
      tags: tagsStr.split(",").map(t => t.trim()).filter(Boolean),
      ...(url.trim() ? { linkedin_url: url.trim() } : {}),
      ...(alert ? { alert } : {}),
    });
  }

  return (
    <div className="bg-dark-2 border border-violet-500/30 rounded-xl p-5 space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-violet-400 mb-1">
        Add Candidate
      </div>

      {/* ── Input options ── */}
      <div className="space-y-2">
        {/* PDF upload */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer transition-all ${
            pdfFile
              ? "border-violet-500/50 bg-violet-500/10"
              : "border-dashed border-dark-4 hover:border-violet-500/40 hover:bg-dark-3"
          }`}
        >
          <svg className="w-4 h-4 text-violet-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <div className="text-xs font-semibold text-white">
              {pdfFile ? pdfFile.name : "Upload LinkedIn PDF"}
            </div>
            <div className="text-[10px] text-dark-5">
              {pdfFile ? "PDF ready for analysis" : "LinkedIn → Save as PDF → Upload here"}
            </div>
          </div>
          {pdfFile && (
            <button
              onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="ml-auto text-dark-5 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" onChange={onFileChange} className="hidden" />

        <div className="flex items-center gap-2 text-dark-5">
          <div className="flex-1 h-px bg-dark-4" />
          <span className="text-[9px] uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-dark-4" />
        </div>

        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="LinkedIn profile URL (saved for reference)"
          className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-5 focus:outline-none focus:border-violet-500/50"
        />
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="Paste profile text (LinkedIn About + Experience section)"
          rows={4}
          className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-5 resize-none focus:outline-none focus:border-violet-500/50"
        />
      </div>

      {error && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Analyze button */}
      {!preview && (
        <div className="flex gap-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-bold hover:bg-violet-500/30 transition-all disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
          <button onClick={onCancel} className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Editable preview */}
      {preview && (
        <div className="space-y-3 border-t border-dark-4 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-dark-5 mb-2">
            Review & Edit
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Current Role</label>
              <input value={role} onChange={e => setRole(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Match</label>
              <select value={match} onChange={e => setMatch(e.target.value as Candidate["match"])}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white">
                <option value="strong">Strong</option>
                <option value="medium">Medium</option>
                <option value="weak">Weak</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Target Roles</label>
              <input value={targets} onChange={e => setTargets(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Summary</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
              className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white resize-none" />
          </div>
          <div>
            <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Skills (comma-separated)</label>
            <input value={tagsStr} onChange={e => setTagsStr(e.target.value)}
              className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
          </div>
          <div>
            <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Alert / Notes (optional)</label>
            <input value={alert} onChange={e => setAlert(e.target.value)}
              placeholder="e.g. relocation required, salary expectations..."
              className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={confirm}
              className="flex-1 px-4 py-2 bg-gold text-dark rounded-lg text-xs font-bold hover:bg-gold/90 transition-all">
              Add to Pipeline
            </button>
            <button onClick={() => setPreview(null)}
              className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
              Re-analyze
            </button>
            <button onClick={onCancel}
              className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Role form ──────────────────────────────────────────────────────────────

const CLUSTERS = ["Design", "Test / Validation", "Layout", "Verification", "FAE", "Other"];

function AddRoleForm({
  onSave,
  onCancel,
}: {
  onSave: (cluster: string, role: RoleItem) => void;
  onCancel: () => void;
}) {
  const [url, setUrl]           = useState("");
  const [rawText, setRawText]   = useState("");
  const [cluster, setCluster]   = useState(CLUSTERS[0]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [preview, setPreview]   = useState<RoleItem | null>(null);
  const [title, setTitle]       = useState("");
  const [tags, setTags]         = useState("");

  async function analyze() {
    if (!url.trim() && !rawText.trim()) {
      setError("Paste a URL or job description first.");
      return;
    }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch("/api/talent/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          rawText: rawText.trim() || undefined,
          type: "role",
          cluster,
        }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      const r: RoleItem & { cluster?: string } = json.role;
      setPreview(r);
      setTitle(r.title || "");
      setTags(r.tags || "");
      if (r.cluster) setCluster(r.cluster);
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  function confirm() {
    if (!title) { setError("Title is required."); return; }
    onSave(cluster, { title, tags });
  }

  return (
    <div className="bg-dark-2 border border-gold/30 rounded-xl p-5 space-y-4">
      <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-gold mb-1">
        Add Role
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Job posting URL (e.g. careers.imec-int.com/...)"
            className="flex-1 bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-5 focus:outline-none focus:border-gold/40"
          />
          <select value={cluster} onChange={e => setCluster(e.target.value)}
            className="bg-dark-3 border border-dark-4 rounded-lg px-2 py-2 text-xs text-white">
            {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="Or paste the job description here"
          rows={4}
          className="w-full bg-dark-3 border border-dark-4 rounded-lg px-3 py-2 text-xs text-white placeholder-dark-5 resize-none focus:outline-none focus:border-gold/40"
        />
      </div>

      {error && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {!preview && (
        <div className="flex gap-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gold/20 text-gold border border-gold/30 rounded-lg text-xs font-bold hover:bg-gold/30 transition-all disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze →"}
          </button>
          <button onClick={onCancel} className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
            Cancel
          </button>
        </div>
      )}

      {preview && (
        <div className="space-y-3 border-t border-dark-4 pt-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-dark-5 mb-2">
            Review & Edit
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Cluster</label>
              <select value={cluster} onChange={e => setCluster(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white">
                {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-dark-5 uppercase tracking-wider block mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                className="w-full bg-dark-3 border border-dark-4 rounded px-2 py-1.5 text-xs text-white" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={confirm}
              className="flex-1 px-4 py-2 bg-gold text-dark rounded-lg text-xs font-bold hover:bg-gold/90 transition-all">
              Add Role
            </button>
            <button onClick={() => setPreview(null)}
              className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
              Re-analyze
            </button>
            <button onClick={onCancel}
              className="px-3 py-2 text-xs text-dark-5 hover:text-grey transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function TalentAccountDrawer({
  account,
  onClose,
  onMove,
}: {
  account: TalentAccount;
  onClose: () => void;
  onMove: (id: string, status: string) => void;
}) {
  const [rich, setRich] = useState<RichNotes | null>(() => parseNotes(account.notes));
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showAddRole, setShowAddRole]           = useState(false);
  const [saving, setSaving]                     = useState(false);

  const stages = ["identified", "researched", "approached", "screening", "placed"];
  const createdDate = account.created_at
    ? new Date(account.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  // ── Persist updated notes to Supabase ───────────────────────────────────────

  async function saveNotes(updated: RichNotes) {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase
        .from("pipeline_accounts")
        .update({ notes: JSON.stringify(updated), updated_at: new Date().toISOString() })
        .eq("id", account.id);
      setRich(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCandidate(candidate: Candidate) {
    const updated: RichNotes = {
      ...rich,
      candidates: [...(rich?.candidates || []), candidate],
    };
    await saveNotes(updated);
    setShowAddCandidate(false);
  }

  async function handleAddRole(cluster: string, role: RoleItem) {
    const currentRoles = rich?.roles || {};
    const clusterRoles = currentRoles[cluster] || [];
    const updated: RichNotes = {
      ...rich,
      roles: { ...currentRoles, [cluster]: [...clusterRoles, role] },
    };
    await saveNotes(updated);
    setShowAddRole(false);
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-[680px] bg-dark border-l border-dark-4 overflow-y-auto flex flex-col">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-dark-2 border-b border-dark-4 px-7 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[2px] text-dark-5 mb-1">
                Talent Prospect · Embedia Pipeline
              </div>
              <h2 className="text-xl font-bold text-white leading-snug">{account.name}</h2>
              <div className="text-xs text-dark-5 mt-1">
                {[account.city, account.country].filter(Boolean).join(", ")}
                {account.icp_segment && ` · ${account.icp_segment}`}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${STATUS_COLORS[account.status] ?? "bg-dark-3 text-grey"}`}>
                {STATUS_LABELS[account.status] ?? account.status}
              </span>
              <div className="text-[10px] text-dark-5 text-right">
                Created: {createdDate}
              </div>
              {saving && <div className="text-[10px] text-gold">Saving…</div>}
            </div>
          </div>

          {/* Stage selector */}
          <div className="flex gap-1.5 mt-4">
            {stages.map((s) => (
              <button
                key={s}
                onClick={() => onMove(account.id, s)}
                className={`px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                  account.status === s
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                    : "bg-dark-3 text-dark-5 hover:text-grey border border-transparent"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-5 right-6 text-dark-5 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────────── */}
        <div className="flex-1 p-7 space-y-7">

          {rich ? (
            <>
              {/* Company Overview + Opportunity Signal */}
              {(rich.overview || rich.opportunity) && (
                <div className="grid grid-cols-2 gap-4">
                  {rich.overview && (
                    <div className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                      <SectionLabel>Company Overview</SectionLabel>
                      <div className="space-y-2.5">
                        {[
                          ["Type",         rich.overview.type],
                          ["HQ",           [account.city, account.country].filter(Boolean).join(", ")],
                          ["Core service", rich.overview.core_service],
                          ["Markets",      rich.overview.markets],
                          ["Website",      account.website],
                        ].map(([label, val]) => val ? (
                          <div key={label} className="flex justify-between items-start gap-4 text-xs border-b border-dark-4 pb-2 last:border-0 last:pb-0">
                            <span className="text-dark-5 flex-shrink-0">{label}</span>
                            <span className="text-white text-right">{val}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}

                  {rich.opportunity && (
                    <div className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                      <SectionLabel>Opportunity Signal</SectionLabel>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start gap-4 text-xs border-b border-dark-4 pb-2">
                          <span className="text-dark-5 flex-shrink-0">Open Roles</span>
                          <span className="text-gold font-bold text-2xl leading-none">{rich.opportunity.open_roles_count}</span>
                        </div>
                        {[
                          ["Signal",  rich.opportunity.signal],
                          ["Urgency", rich.opportunity.urgency],
                          ["Contact", STATUS_LABELS[account.status] ?? account.status],
                          ["Priority", account.priority],
                        ].map(([label, val]) => val ? (
                          <div key={label} className="flex justify-between items-start gap-4 text-xs border-b border-dark-4 pb-2 last:border-0 last:pb-0">
                            <span className="text-dark-5 flex-shrink-0">{label}</span>
                            <span className={`text-right font-medium ${label === "Contact" && account.status === "identified" ? "text-red-400" : "text-white"}`}>{val}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Open Roles ──────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between">
                  <SectionLabel>Open Roles</SectionLabel>
                  {!showAddRole && (
                    <button
                      onClick={() => setShowAddRole(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-grey hover:text-gold transition-colors pb-2"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Role
                    </button>
                  )}
                </div>

                {showAddRole && (
                  <div className="mb-4">
                    <AddRoleForm onSave={handleAddRole} onCancel={() => setShowAddRole(false)} />
                  </div>
                )}

                {rich.roles && Object.keys(rich.roles).length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(rich.roles).map(([cluster, roles]) => (
                      <div key={cluster} className="bg-dark-2 rounded-xl border border-dark-4 p-4">
                        <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 mb-3">
                          {cluster}
                        </div>
                        <div className="space-y-2">
                          {roles.map((r, i) => (
                            <div key={i} className="border-l-2 border-gold/60 pl-3 py-0.5">
                              <div className="text-xs font-semibold text-white leading-snug">{r.title}</div>
                              <div className="text-[10px] text-dark-5 mt-0.5 leading-snug">{r.tags}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !showAddRole ? (
                  <div
                    onClick={() => setShowAddRole(true)}
                    className="text-center py-6 text-dark-5 text-[10px] border border-dashed border-dark-4 rounded-lg cursor-pointer hover:border-gold/30 hover:text-grey transition-all"
                  >
                    + add role
                  </div>
                ) : null}
              </div>

              {/* ── Candidate Match Analysis ─────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between">
                  <SectionLabel>Candidate Match Analysis</SectionLabel>
                  {!showAddCandidate && (
                    <button
                      onClick={() => setShowAddCandidate(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-grey hover:text-violet-400 transition-colors pb-2"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Candidate
                    </button>
                  )}
                </div>

                {showAddCandidate && (
                  <div className="mb-4">
                    <AddCandidateForm onSave={handleAddCandidate} onCancel={() => setShowAddCandidate(false)} />
                  </div>
                )}

                {rich.candidates && rich.candidates.length > 0 ? (
                  <div className="space-y-3">
                    {rich.candidates.map((c, i) => (
                      <div key={i} className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-white">{c.name}</div>
                              {c.linkedin_url && (
                                <a
                                  href={c.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  LinkedIn ↗
                                </a>
                              )}
                            </div>
                            <div className="text-[11px] text-dark-5 mt-0.5">{c.role}</div>
                          </div>
                          <MatchBadge match={c.match} />
                        </div>
                        <div className="text-[11px] text-grey mb-2 leading-relaxed">
                          <span className="text-dark-5 font-semibold">Target roles: </span>{c.target_roles}
                        </div>
                        <div className="text-[11px] text-grey mb-3 leading-relaxed">{c.summary}</div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {c.tags.map((tag, j) => (
                            <span key={j} className="text-[10px] bg-dark-3 text-dark-5 px-2 py-0.5 rounded border border-dark-4">
                              {tag}
                            </span>
                          ))}
                        </div>
                        {c.alert && (
                          <div className="mt-2 bg-gold/5 border border-gold/20 rounded-lg px-3 py-2 text-[10px] text-gold/80 leading-relaxed">
                            ⚠ {c.alert}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !showAddCandidate ? (
                  <div
                    onClick={() => setShowAddCandidate(true)}
                    className="text-center py-6 text-dark-5 text-[10px] border border-dashed border-dark-4 rounded-lg cursor-pointer hover:border-violet-500/30 hover:text-grey transition-all"
                  >
                    + add candidate
                  </div>
                ) : null}
              </div>

              {/* ── Next Steps ───────────────────────────────────────────────── */}
              {rich.next_steps && rich.next_steps.length > 0 && (
                <div>
                  <SectionLabel>Next Steps</SectionLabel>
                  <div className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                    <div className="space-y-0">
                      {rich.next_steps.map((step, i) => (
                        <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                          {i < rich.next_steps!.length - 1 && (
                            <div className="absolute left-[5px] top-[14px] bottom-0 w-px bg-dark-4" />
                          )}
                          <div className={`w-3 h-3 rounded-full mt-0.5 flex-shrink-0 z-10 ${
                            step.done ? "bg-gold" : "bg-dark border-2 border-dark-4"
                          }`} />
                          <div>
                            <div className={`text-xs font-medium ${step.done ? "text-white" : "text-grey"}`}>
                              {step.done && "✓ "}{step.label}
                            </div>
                            <div className="text-[10px] text-dark-5 mt-0.5">{step.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback: plain text notes */
            <div>
              <SectionLabel>Notes</SectionLabel>
              <div className="bg-dark-2 rounded-xl border border-dark-4 p-5 text-sm text-grey leading-relaxed whitespace-pre-wrap">
                {account.notes || "No notes."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
