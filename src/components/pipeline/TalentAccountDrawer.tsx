"use client";

// ── TalentAccountDrawer ────────────────────────────────────────────────────────
// Rich prospect-card drawer for Talent swimlane accounts.
// Parses structured JSON from the account's `notes` field and renders
// the full prospect card layout (header · info grid · roles · candidates · timeline).
// Falls back to plain notes display if JSON parsing fails.

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
  const rich = parseNotes(account.notes);
  const stages = ["identified", "researched", "approached", "screening", "placed"];
  const createdDate = account.created_at
    ? new Date(account.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "—";

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

              {/* Open Roles */}
              {rich.roles && Object.keys(rich.roles).length > 0 && (
                <div>
                  <SectionLabel>Open Roles</SectionLabel>
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
                </div>
              )}

              {/* Candidates */}
              {rich.candidates && rich.candidates.length > 0 && (
                <div>
                  <SectionLabel>Candidate Match Analysis</SectionLabel>
                  <div className="space-y-3">
                    {rich.candidates.map((c, i) => (
                      <div key={i} className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="text-sm font-bold text-white">{c.name}</div>
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
                </div>
              )}

              {/* Next Steps */}
              {rich.next_steps && rich.next_steps.length > 0 && (
                <div>
                  <SectionLabel>Next Steps</SectionLabel>
                  <div className="bg-dark-2 rounded-xl border border-dark-4 p-5">
                    <div className="space-y-0">
                      {rich.next_steps.map((step, i) => (
                        <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                          {/* Connector line */}
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
