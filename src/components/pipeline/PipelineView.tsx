"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GTMView from "./GTMView";
import AddAccountModal from "./AddAccountModal";
import TalentAccountDrawer from "./TalentAccountDrawer";

// ── Types ─────────────────────────────────────────────────────────────────────

type Swimlane = "customer" | "investor" | "ecosystem" | "talent";

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  is_decision_maker: boolean;
}

interface Engagement {
  id: string;
  code: string;
  name: string;
  type: "delivery" | "rfq" | "retainer" | "advisory" | "historical";
  outcome: "active" | "won" | "lost" | "on_hold";
  value: number;
  date: string | null;
  lost_reason: string | null;
  notes: string;
}

interface Account {
  id: string;
  name: string;
  category: string;
  country: string;
  region: string;
  city: string;
  website: string;
  icp_segment: string;
  status: string;
  swimlane: Swimlane;
  notes: string;
  priority: string;
  revenue_potential: number;
  last_touch: string | null;
  next_action: string;
  contacts?: Contact[];
  customer_engagements?: Engagement[];
}

// ── Swimlane stage configs ─────────────────────────────────────────────────────
// Each swimlane has its own lean stage set reflecting its real-world funnel.

const SWIMLANE_CONFIG: Record<Swimlane, {
  label: string;
  accent: string;       // tailwind bg class for header dot
  headerBg: string;     // header band bg
  stages: { id: string; label: string; dot: string; terminal?: boolean }[];
}> = {
  customer: {
    label: "Customers",
    accent: "bg-amber-500",
    headerBg: "border-amber-500/30 bg-amber-500/5",
    stages: [
      { id: "target",   label: "Target",   dot: "bg-dark-5" },
      { id: "engaged",  label: "Engaged",  dot: "bg-blue-500" },
      { id: "proposal", label: "Proposal", dot: "bg-purple-500" },
      { id: "active",   label: "Active",   dot: "bg-amber-500" },
      { id: "retained", label: "Retained", dot: "bg-green-500" },
      { id: "churned",  label: "Churned",  dot: "bg-red-500", terminal: true },
    ],
  },
  investor: {
    label: "Investors",
    accent: "bg-yellow-400",
    headerBg: "border-yellow-400/30 bg-yellow-400/5",
    stages: [
      { id: "identified",    label: "Identified",    dot: "bg-dark-5" },
      { id: "submitted",     label: "Submitted",     dot: "bg-blue-500" },
      { id: "due_diligence", label: "Due Diligence", dot: "bg-amber-500" },
      { id: "term_sheet",    label: "Term Sheet",    dot: "bg-purple-500" },
      { id: "closed_won",    label: "Closed Won",    dot: "bg-green-500", terminal: true },
      { id: "closed_lost",   label: "Closed Lost",   dot: "bg-red-500",   terminal: true },
    ],
  },
  ecosystem: {
    label: "Ecosystem",
    accent: "bg-cyan-500",
    headerBg: "border-cyan-500/30 bg-cyan-500/5",
    stages: [
      { id: "identified",  label: "Identified",  dot: "bg-dark-5" },
      { id: "researched",  label: "Researched",  dot: "bg-blue-400" },
      { id: "applied",     label: "Applied",     dot: "bg-amber-500" },
      { id: "member",      label: "Member",      dot: "bg-green-500" },
      { id: "ambassador",  label: "Ambassador",  dot: "bg-cyan-500", terminal: true },
    ],
  },
  talent: {
    label: "Talent",
    accent: "bg-violet-500",
    headerBg: "border-violet-500/30 bg-violet-500/5",
    stages: [
      { id: "identified",  label: "Identified",  dot: "bg-dark-5" },
      { id: "researched",  label: "Researched",  dot: "bg-blue-400" },
      { id: "approached",  label: "Approached",  dot: "bg-amber-500" },
      { id: "screening",   label: "Screening",   dot: "bg-violet-400" },
      { id: "placed",      label: "Placed",      dot: "bg-green-500", terminal: true },
    ],
  },
};

const SWIMLANE_ORDER: Swimlane[] = ["customer", "investor", "ecosystem", "talent"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function engagementOutcomeBadge(outcome: Engagement["outcome"]) {
  const map = {
    won:     "bg-green-500/20 text-green-400",
    lost:    "bg-red-500/20 text-red-400",
    active:  "bg-amber-500/20 text-amber-400",
    on_hold: "bg-dark-5/20 text-dark-5",
  };
  return map[outcome] ?? "bg-dark-3 text-grey";
}

function typeLabel(t: Engagement["type"]) {
  return {
    delivery: "Delivery", rfq: "RFQ", retainer: "Retainer",
    advisory: "Advisory", historical: "Historical",
  }[t] ?? t;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PipelineView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [activeTab, setActiveTab] = useState<"bd" | "gtm">("bd");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForSwimlane, setAddForSwimlane] = useState<Swimlane>("customer");
  // Engagement add form state
  const [showEngForm, setShowEngForm] = useState(false);
  const [engForm, setEngForm] = useState({
    code: "", name: "", type: "delivery" as Engagement["type"],
    outcome: "active" as Engagement["outcome"], value: "", date: "", lost_reason: "", notes: "",
  });
  const [engSaving, setEngSaving] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pipeline_accounts")
      .select("*, account_contacts(*), customer_engagements(*)")
      .order("updated_at", { ascending: false });

    if (data) {
      setAccounts(data.map((a: Record<string, unknown>) => ({
        ...a,
        swimlane: (a.swimlane as Swimlane) || "customer",
        contacts: a.account_contacts || [],
        customer_engagements: a.customer_engagements || [],
      })) as Account[]);
    }
    setLoading(false);
  }

  async function moveAccount(accountId: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("pipeline_accounts").update({ status: newStatus }).eq("id", accountId);
    setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, status: newStatus } : a));
    if (selectedAccount?.id === accountId) {
      setSelectedAccount((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  }

  async function updateAccountNotes(accountId: string, notes: string) {
    const supabase = createClient();
    await supabase.from("pipeline_accounts").update({ notes, updated_at: new Date().toISOString() }).eq("id", accountId);
    setAccounts((prev) => prev.map((a) => a.id === accountId ? { ...a, notes } : a));
    if (selectedAccount?.id === accountId) {
      setSelectedAccount((prev) => prev ? { ...prev, notes } : null);
    }
  }

  async function addEngagement() {
    if (!selectedAccount || !engForm.name) return;
    setEngSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("customer_engagements").insert({
      account_id: selectedAccount.id,
      code: engForm.code,
      name: engForm.name,
      type: engForm.type,
      outcome: engForm.outcome,
      value: parseFloat(engForm.value) || 0,
      date: engForm.date || null,
      lost_reason: engForm.lost_reason || null,
      notes: engForm.notes,
    }).select().single();

    if (!error && data) {
      const newEng = data as Engagement;
      setSelectedAccount((prev) => prev ? {
        ...prev,
        customer_engagements: [...(prev.customer_engagements || []), newEng],
      } : null);
      setAccounts((prev) => prev.map((a) => a.id === selectedAccount.id ? {
        ...a,
        customer_engagements: [...(a.customer_engagements || []), newEng],
      } : a));
      setEngForm({ code: "", name: "", type: "delivery", outcome: "active", value: "", date: "", lost_reason: "", notes: "" });
      setShowEngForm(false);
    }
    setEngSaving(false);
  }

  function getByLaneAndStage(lane: Swimlane, stageId: string) {
    return accounts.filter((a) => (a.swimlane || "customer") === lane && a.status === stageId);
  }

  // ── Summary stats ────────────────────────────────────────────────────────────
  const totalAccounts = accounts.length;
  const customerActive = accounts.filter(a => a.swimlane === "customer" && !["churned"].includes(a.status)).length;
  const investorActive = accounts.filter(a => a.swimlane === "investor" && !["closed_won","closed_lost"].includes(a.status)).length;
  const ecosystemActive = accounts.filter(a => a.swimlane === "ecosystem" && a.status !== "ambassador").length;
  const talentActive = accounts.filter(a => a.swimlane === "talent" && a.status !== "placed").length;

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading pipeline...</div>;
  }

  return (
    <div>
      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-6">
        <div className="flex gap-1 bg-dark-3 rounded-lg p-0.5 mr-4">
          {(["bd", "gtm"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab ? "bg-gold text-dark" : "text-grey hover:text-white"
              }`}>
              {tab === "bd" ? "BD Pipeline" : "GTM Content"}
            </button>
          ))}
        </div>

        {activeTab === "bd" && (
          <div className="flex items-center justify-between flex-1">
            <div>
              <h2 className="text-xl font-bold text-white">BD Pipeline</h2>
              <p className="text-xs text-grey mt-1">
                {totalAccounts} accounts —&nbsp;
                <span className="text-amber-400">{customerActive} customers</span> ·&nbsp;
                <span className="text-yellow-400">{investorActive} investors</span> ·&nbsp;
                <span className="text-cyan-400">{ecosystemActive} ecosystem</span> ·&nbsp;
                <span className="text-violet-400">{talentActive} talent</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-dark-3 rounded-lg p-0.5">
                {(["kanban", "table"] as const).map((m) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      viewMode === m ? "bg-gold text-dark" : "text-grey hover:text-white"
                    }`}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab === "gtm" && <GTMView />}

      {activeTab === "bd" && (
        <div className="space-y-8">
          {viewMode === "kanban" ? (
            /* ── Kanban: one swimlane band per row ───────────────────────────── */
            SWIMLANE_ORDER.map((lane) => {
              const cfg = SWIMLANE_CONFIG[lane];
              const laneAccounts = accounts.filter(a => (a.swimlane || "customer") === lane);
              return (
                <div key={lane}>
                  {/* Swimlane header */}
                  <div className={`flex items-center justify-between border rounded-lg px-4 py-2.5 mb-3 ${cfg.headerBg}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${cfg.accent}`} />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-dark-5 bg-dark-3 rounded-full px-2 py-0.5">
                        {laneAccounts.length}
                      </span>
                    </div>
                    <button
                      onClick={() => { setAddForSwimlane(lane); setShowAddModal(true); }}
                      className="flex items-center gap-1 text-[10px] font-bold text-grey hover:text-white transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>

                  {/* Stage columns */}
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {cfg.stages.map((stage) => {
                      const cards = getByLaneAndStage(lane, stage.id);
                      return (
                        <div key={stage.id} className={`min-w-[210px] flex-1 ${stage.terminal ? "opacity-80" : ""}`}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-grey">
                              {stage.label}
                            </span>
                            <span className="text-[9px] text-dark-5 bg-dark-3 rounded-full px-1.5 py-0.5">
                              {cards.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {cards.map((account) => (
                              <KanbanCard
                                key={account.id}
                                account={account}
                                lane={lane}
                                stages={cfg.stages}
                                onSelect={() => setSelectedAccount(account)}
                                onMove={moveAccount}
                              />
                            ))}
                            {cards.length === 0 && (
                              <div
                                onClick={() => { setAddForSwimlane(lane); setShowAddModal(true); }}
                                className="text-center py-6 text-dark-5 text-[10px] border border-dashed border-dark-4 rounded-lg cursor-pointer hover:border-gold/30 hover:text-grey transition-all"
                              >
                                + add
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            /* ── Table view: swimlane sections ───────────────────────────────── */
            <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
                    <th className="text-left px-4 py-2.5">Account</th>
                    <th className="text-left px-4 py-2.5">Stage</th>
                    <th className="text-left px-4 py-2.5">Region</th>
                    <th className="text-left px-4 py-2.5">Priority</th>
                    <th className="text-left px-4 py-2.5">Revenue / Potential</th>
                    <th className="text-left px-4 py-2.5">Next Action</th>
                    <th className="text-left px-4 py-2.5">Last Touch</th>
                  </tr>
                </thead>
                <tbody>
                  {SWIMLANE_ORDER.map((lane) => {
                    const cfg = SWIMLANE_CONFIG[lane];
                    const laneAccounts = accounts.filter(a => (a.swimlane || "customer") === lane);
                    return (
                      <React.Fragment key={lane}>
                        {/* Swimlane section header */}
                        <tr className={`border-b border-dark-4 ${cfg.headerBg}`}>
                          <td colSpan={7} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${cfg.accent}`} />
                              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white">
                                {cfg.label}
                              </span>
                              <span className="text-[9px] text-dark-5">
                                {laneAccounts.length} account{laneAccounts.length !== 1 ? "s" : ""}
                              </span>
                              <button
                                onClick={() => { setAddForSwimlane(lane); setShowAddModal(true); }}
                                className="ml-auto text-[9px] text-grey hover:text-gold transition-colors font-semibold"
                              >
                                + Add
                              </button>
                            </div>
                          </td>
                        </tr>
                        {laneAccounts.length === 0 && (
                          <tr key={`lane-${lane}-empty`} className="border-b border-dark-4">
                            <td colSpan={7} className="px-4 py-3 text-xs text-dark-5 text-center italic">
                              No {cfg.label.toLowerCase()} yet
                            </td>
                          </tr>
                        )}
                        {laneAccounts.map((a) => {
                          const stageInfo = cfg.stages.find(s => s.id === a.status);
                          const engWon = (a.customer_engagements || []).filter(e => e.outcome === "won").length;
                          const engLost = (a.customer_engagements || []).filter(e => e.outcome === "lost").length;
                          return (
                            <tr
                              key={a.id}
                              onClick={() => setSelectedAccount(a)}
                              className="border-b border-dark-4 last:border-0 hover:bg-dark-3 transition-colors cursor-pointer"
                            >
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-white">{a.name}</div>
                                <div className="text-[10px] text-dark-5">
                                  {a.category}
                                  {lane === "customer" && (a.customer_engagements || []).length > 0 && (
                                    <span className="ml-2">
                                      {engWon > 0 && <span className="text-green-400">{engWon}W</span>}
                                      {engWon > 0 && engLost > 0 && <span className="text-dark-5"> · </span>}
                                      {engLost > 0 && <span className="text-red-400">{engLost}L</span>}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${stageInfo?.dot ?? "bg-dark-5"}`} />
                                  <span className="text-xs text-grey">{stageInfo?.label ?? a.status}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-grey">{a.region || a.country}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  a.priority === "P0" ? "bg-red-500/20 text-red-400" :
                                  a.priority === "P1" ? "bg-amber-500/20 text-amber-400" :
                                  "bg-dark-3 text-dark-5"
                                }`}>{a.priority}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-grey">
                                {a.revenue_potential > 0
                                  ? `€${(a.revenue_potential / 1000).toFixed(0)}k`
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-grey max-w-[180px] truncate">
                                {a.next_action || "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-grey">
                                {a.last_touch || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Add Account Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddAccountModal
          defaultSwimlane={addForSwimlane}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); loadAccounts(); }}
        />
      )}

      {/* ── Account Detail Drawer ────────────────────────────────────────────── */}
      {selectedAccount && selectedAccount.swimlane === "talent" ? (
        <TalentAccountDrawer
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onMove={moveAccount}
        />
      ) : selectedAccount ? (
        <AccountDrawer
          account={selectedAccount}
          onClose={() => setSelectedAccount(null)}
          onMove={moveAccount}
          onNotesUpdate={updateAccountNotes}
          showEngForm={showEngForm}
          setShowEngForm={setShowEngForm}
          engForm={engForm}
          setEngForm={setEngForm}
          onAddEngagement={addEngagement}
          engSaving={engSaving}
        />
      ) : null}
    </div>
  );
}

// ── KanbanCard ─────────────────────────────────────────────────────────────────

function KanbanCard({ account, lane, stages, onSelect, onMove }: {
  account: Account;
  lane: Swimlane;
  stages: { id: string; label: string; dot: string; terminal?: boolean }[];
  onSelect: () => void;
  onMove: (id: string, status: string) => void;
}) {
  const engWon  = (account.customer_engagements || []).filter(e => e.outcome === "won").length;
  const engLost = (account.customer_engagements || []).filter(e => e.outcome === "lost").length;
  const totalEng = (account.customer_engagements || []).length;

  return (
    <div
      onClick={onSelect}
      className="bg-dark-2 border border-dark-4 rounded-lg p-3 cursor-pointer hover:border-gold/40 transition-all group"
    >
      <div className="text-sm font-semibold text-white group-hover:text-gold transition-colors leading-snug">
        {account.name}
      </div>
      <div className="text-[10px] text-dark-5 mt-0.5">{account.category}</div>

      {/* Lane-specific metadata */}
      {lane === "customer" && totalEng > 0 && (
        <div className="flex items-center gap-2 mt-1.5">
          {engWon > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold">
              {engWon} won
            </span>
          )}
          {engLost > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-semibold">
              {engLost} lost
            </span>
          )}
        </div>
      )}

      {lane === "investor" && account.revenue_potential > 0 && (
        <div className="text-[9px] text-yellow-400 mt-1.5 font-semibold">
          €{(account.revenue_potential / 1000).toFixed(0)}k potential
        </div>
      )}

      {lane === "ecosystem" && account.icp_segment && (
        <div className="text-[9px] text-cyan-400 mt-1.5 truncate">{account.icp_segment}</div>
      )}

      {lane === "talent" && account.icp_segment && (
        <div className="text-[9px] text-violet-400 mt-1.5 truncate">{account.icp_segment}</div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {account.country && (
          <span className="text-[9px] text-grey">{account.country}</span>
        )}
        {account.priority && (
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
            account.priority === "P0" ? "bg-red-500/20 text-red-400" :
            account.priority === "P1" ? "bg-amber-500/20 text-amber-400" :
            "bg-dark-3 text-dark-5"
          }`}>{account.priority}</span>
        )}
      </div>

      {/* Quick move buttons */}
      <div className="flex flex-wrap gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {stages.filter(s => s.id !== account.status).map((s) => (
          <button
            key={s.id}
            onClick={(e) => { e.stopPropagation(); onMove(account.id, s.id); }}
            className="text-[8px] px-1.5 py-0.5 rounded bg-dark-3 text-dark-5 hover:text-white transition-colors"
            title={`Move to ${s.label}`}
          >
            → {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── AccountDrawer ──────────────────────────────────────────────────────────────

function AccountDrawer({
  account, onClose, onMove, onNotesUpdate,
  showEngForm, setShowEngForm,
  engForm, setEngForm,
  onAddEngagement, engSaving,
}: {
  account: Account;
  onClose: () => void;
  onMove: (id: string, status: string) => void;
  onNotesUpdate: (id: string, notes: string) => Promise<void>;
  showEngForm: boolean;
  setShowEngForm: (v: boolean) => void;
  engForm: {
    code: string; name: string; type: Engagement["type"];
    outcome: Engagement["outcome"]; value: string; date: string; lost_reason: string; notes: string;
  };
  setEngForm: (v: typeof engForm) => void;
  onAddEngagement: () => void;
  engSaving: boolean;
}) {
  const cfg = SWIMLANE_CONFIG[account.swimlane || "customer"];

  // ── Notes editing state ──────────────────────────────────────────────────
  const [notesText, setNotesText]     = React.useState(account.notes || "");
  const [notesEditing, setNotesEditing] = React.useState(false);
  const [notesSaving, setNotesSaving] = React.useState(false);

  // Sync if account changes (e.g. switching accounts)
  React.useEffect(() => { setNotesText(account.notes || ""); setNotesEditing(false); }, [account.id]);

  // ── Engagement inline editing state ──────────────────────────────────────
  const [editingEngId, setEditingEngId] = React.useState<string | null>(null);
  const [editEng, setEditEng] = React.useState<{
    code: string; name: string; type: Engagement["type"];
    outcome: Engagement["outcome"]; value: string; date: string; lost_reason: string; notes: string;
  }>({ code: "", name: "", type: "delivery", outcome: "active", value: "", date: "", lost_reason: "", notes: "" });
  const [engEditSaving, setEngEditSaving] = React.useState(false);
  const [engEngagements, setEngEngagements] = React.useState<Engagement[]>(account.customer_engagements || []);

  // Sync local engagement list when account changes
  React.useEffect(() => { setEngEngagements(account.customer_engagements || []); setEditingEngId(null); }, [account.id]);

  function startEditEng(eng: Engagement) {
    setEditingEngId(eng.id);
    setEditEng({
      code:        eng.code || "",
      name:        eng.name,
      type:        eng.type,
      outcome:     eng.outcome,
      value:       eng.value > 0 ? String(eng.value) : "",
      date:        eng.date || "",
      lost_reason: eng.lost_reason || "",
      notes:       eng.notes || "",
    });
    setShowEngForm(false); // close add form if open
  }

  async function saveEngEdit() {
    if (!editingEngId || !editEng.name) return;
    setEngEditSaving(true);
    const supabase = createClient();
    const patch = {
      code:        editEng.code || "",
      name:        editEng.name,
      type:        editEng.type,
      outcome:     editEng.type === "historical" ? ("won" as Engagement["outcome"]) : editEng.outcome,
      value:       editEng.value ? parseFloat(editEng.value) : 0,
      date:        editEng.date || null,
      lost_reason: editEng.lost_reason || null,
      notes:       editEng.notes || "",
    };
    const { data, error } = await supabase
      .from("customer_engagements")
      .update(patch)
      .eq("id", editingEngId)
      .select()
      .single();
    if (!error && data) {
      setEngEngagements((prev) => prev.map((e) => e.id === editingEngId ? { ...e, ...patch } : e));
    }
    setEngEditSaving(false);
    setEditingEngId(null);
  }

  async function deleteEng(engId: string) {
    if (!confirm("Delete this engagement? This cannot be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("customer_engagements").delete().eq("id", engId);
    if (!error) setEngEngagements((prev) => prev.filter((e) => e.id !== engId));
  }

  async function saveNotes() {
    setNotesSaving(true);
    await onNotesUpdate(account.id, notesText);
    setNotesSaving(false);
    setNotesEditing(false);
  }

  // ── Won / Historical revenue total — uses local editable list ───────────
  const wonRevenue = engEngagements
    .filter((e) => e.outcome === "won" || e.type === "historical")
    .reduce((sum, e) => sum + (e.value || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-[520px] bg-dark-2 border-l border-dark-4 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-dark-2 border-b border-dark-4 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${cfg.accent}`} />
              <span className="text-[9px] font-bold uppercase tracking-wider text-dark-5">{cfg.label}</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">{account.name}</h3>
          </div>
          <button onClick={onClose} className="text-grey hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stage selector */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">Stage</div>
            <div className="flex flex-wrap gap-1.5">
              {cfg.stages.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onMove(account.id, s.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    account.status === s.id
                      ? `${s.dot} text-white`
                      : "bg-dark-3 text-grey hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Category", account.category],
              ["Location", [account.city, account.country].filter(Boolean).join(", ") || "—"],
              ["Region", account.region || "—"],
              ["Priority", account.priority || "—"],
              ["ICP Segment", account.icp_segment || "—"],
              ["Revenue Potential",
                account.revenue_potential > 0
                  ? `€${account.revenue_potential.toLocaleString()}`
                  : "—"],
              ["Last Touch", account.last_touch || "—"],
              ["Next Action", account.next_action || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">{label}</div>
                <div className="text-sm text-white">{value}</div>
              </div>
            ))}
            {account.website && (
              <div className="col-span-2">
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Website</div>
                <div className="text-sm text-gold">{account.website}</div>
              </div>
            )}
          </div>

          {/* Notes — always editable regardless of status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5">Notes</div>
              {!notesEditing ? (
                <button
                  onClick={() => setNotesEditing(true)}
                  className="text-[9px] font-bold text-grey hover:text-gold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setNotesText(account.notes || ""); setNotesEditing(false); }}
                    className="text-[9px] text-grey hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNotes}
                    disabled={notesSaving}
                    className="text-[9px] font-bold px-2.5 py-1 rounded bg-gold text-dark hover:bg-gold/90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {notesSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
            {notesEditing ? (
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                rows={5}
                placeholder="Add notes about this account…"
                className="w-full bg-dark-3 border border-gold/40 rounded-lg p-3 text-sm text-white placeholder-dark-5 resize-none focus:outline-none focus:border-gold/70 transition-colors"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setNotesEditing(true)}
                className="text-sm text-grey leading-relaxed bg-dark-3 rounded-lg p-3 cursor-text hover:bg-dark-4 transition-colors min-h-[48px] whitespace-pre-wrap"
              >
                {notesText || <span className="italic text-dark-5">Click to add notes…</span>}
              </div>
            )}
          </div>

          {/* Won Revenue total (customer only) */}
          {account.swimlane === "customer" && wonRevenue > 0 && (
            <div className="bg-green/10 border border-green/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-green">
                Total Won Revenue
              </div>
              <div className="text-lg font-bold text-green">
                €{wonRevenue.toLocaleString()}
              </div>
            </div>
          )}

          {/* ── Customer engagements ─────────────────────────────────────────── */}
          {account.swimlane === "customer" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5">
                  Engagements ({engEngagements.length})
                </div>
                <button
                  onClick={() => { setShowEngForm(!showEngForm); setEditingEngId(null); }}
                  className="text-[9px] font-bold text-grey hover:text-gold transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Log engagement
                </button>
              </div>

              {/* Engagement list */}
              {engEngagements.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {engEngagements.map((eng) => (
                    <div key={eng.id}>
                      {/* ── View mode ── */}
                      {editingEngId !== eng.id ? (
                        <div className={`rounded-lg p-3 ${eng.type === "historical" ? "bg-green/5 border border-green/20" : "bg-dark-3"}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              {eng.code && <span className="text-[9px] text-dark-5 font-mono shrink-0">{eng.code}</span>}
                              <span className="text-sm font-semibold text-white">{eng.name}</span>
                              {eng.type === "historical" && (
                                <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-green/20 text-green shrink-0">Historical</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {eng.type !== "historical" && <span className="text-[9px] text-dark-5">{typeLabel(eng.type)}</span>}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${engagementOutcomeBadge(eng.outcome)}`}>
                                {eng.outcome.replace("_", " ")}
                              </span>
                              {/* Edit button */}
                              <button
                                onClick={() => startEditEng(eng)}
                                title="Edit engagement"
                                className="ml-1 p-0.5 text-dark-5 hover:text-gold transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
                                </svg>
                              </button>
                              {/* Delete button */}
                              <button
                                onClick={() => deleteEng(eng.id)}
                                title="Delete engagement"
                                className="p-0.5 text-dark-5 hover:text-red-400 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {eng.value > 0 && (
                            <div className="text-[10px] text-grey">Value: €{eng.value.toLocaleString()}</div>
                          )}
                          {eng.lost_reason && (
                            <div className="text-[10px] text-red-400 mt-1">Lost: {eng.lost_reason}</div>
                          )}
                          {eng.notes && <div className="text-[10px] text-dark-5 mt-1">{eng.notes}</div>}
                          {eng.date && <div className="text-[9px] text-dark-5 mt-1">{eng.date}</div>}
                        </div>
                      ) : (
                        /* ── Edit mode ── */
                        <div className="bg-dark-3 rounded-lg p-4 border border-gold/30 space-y-3">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-gold">Edit Engagement</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="Code"
                              value={editEng.code}
                              onChange={(e) => setEditEng({ ...editEng, code: e.target.value })}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                            />
                            <input
                              placeholder="Engagement name *"
                              value={editEng.name}
                              onChange={(e) => setEditEng({ ...editEng, name: e.target.value })}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                            />
                            <select
                              value={editEng.type}
                              onChange={(e) => {
                                const t = e.target.value as Engagement["type"];
                                setEditEng({ ...editEng, type: t, outcome: t === "historical" ? "won" : editEng.outcome });
                              }}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white"
                            >
                              <option value="delivery">Delivery</option>
                              <option value="rfq">RFQ</option>
                              <option value="retainer">Retainer</option>
                              <option value="advisory">Advisory</option>
                              <option value="historical">Historical (aggregate)</option>
                            </select>
                            <select
                              value={editEng.outcome}
                              disabled={editEng.type === "historical"}
                              onChange={(e) => setEditEng({ ...editEng, outcome: e.target.value as Engagement["outcome"] })}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white disabled:opacity-50"
                            >
                              <option value="active">Active</option>
                              <option value="won">Won</option>
                              <option value="lost">Lost</option>
                              <option value="on_hold">On Hold</option>
                            </select>
                            <input
                              placeholder="Value (€)"
                              value={editEng.value}
                              onChange={(e) => setEditEng({ ...editEng, value: e.target.value })}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                              type="number"
                            />
                            <input
                              placeholder="Date"
                              value={editEng.date}
                              onChange={(e) => setEditEng({ ...editEng, date: e.target.value })}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                              type="date"
                            />
                            {editEng.outcome === "lost" && (
                              <input
                                placeholder="Why lost?"
                                value={editEng.lost_reason}
                                onChange={(e) => setEditEng({ ...editEng, lost_reason: e.target.value })}
                                className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-2"
                              />
                            )}
                            <textarea
                              placeholder="Notes"
                              value={editEng.notes}
                              onChange={(e) => setEditEng({ ...editEng, notes: e.target.value })}
                              rows={2}
                              className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-2 resize-none"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingEngId(null)}
                              className="px-3 py-1.5 text-xs text-grey hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEngEdit}
                              disabled={engEditSaving || !editEng.name}
                              className="px-4 py-1.5 bg-gold text-dark text-xs font-bold rounded hover:bg-gold/90 disabled:opacity-50 transition-all"
                            >
                              {engEditSaving ? "Saving…" : "Save Changes"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-dark-5 bg-dark-3 rounded-lg p-3 mb-3">
                  No engagements logged yet.
                </div>
              )}

              {/* Inline add engagement form */}
              {showEngForm && (
                <div className="bg-dark-3 rounded-lg p-4 border border-dark-4 space-y-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5">
                    Log New Engagement
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Code (e.g. GARRETT-P3)"
                      value={engForm.code}
                      onChange={(e) => setEngForm({ ...engForm, code: e.target.value })}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-1"
                    />
                    <input
                      placeholder="Engagement name *"
                      value={engForm.name}
                      onChange={(e) => setEngForm({ ...engForm, name: e.target.value })}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-1"
                    />
                    <select
                      value={engForm.type}
                      onChange={(e) => {
                        const t = e.target.value as Engagement["type"];
                        setEngForm({ ...engForm, type: t, outcome: t === "historical" ? "won" : engForm.outcome });
                      }}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="delivery">Delivery</option>
                      <option value="rfq">RFQ</option>
                      <option value="retainer">Retainer</option>
                      <option value="advisory">Advisory</option>
                      <option value="historical">Historical (aggregate)</option>
                    </select>
                    {engForm.type === "historical" && (
                      <div className="col-span-2 text-[10px] text-gold bg-gold/10 border border-gold/20 rounded px-2 py-1.5">
                        Use this to log total past business (e.g. &ldquo;Toyota 2018–2024 — all projects&rdquo;). Outcome is set to Won automatically and counted in the revenue total.
                      </div>
                    )}
                    <select
                      value={engForm.outcome}
                      onChange={(e) => setEngForm({ ...engForm, outcome: e.target.value as Engagement["outcome"] })}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="active">Active</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                    <input
                      placeholder="Value (€)"
                      value={engForm.value}
                      onChange={(e) => setEngForm({ ...engForm, value: e.target.value })}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                      type="number"
                    />
                    <input
                      placeholder="Date"
                      value={engForm.date}
                      onChange={(e) => setEngForm({ ...engForm, date: e.target.value })}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5"
                      type="date"
                    />
                    {engForm.outcome === "lost" && (
                      <input
                        placeholder="Why lost?"
                        value={engForm.lost_reason}
                        onChange={(e) => setEngForm({ ...engForm, lost_reason: e.target.value })}
                        className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-2"
                      />
                    )}
                    <textarea
                      placeholder="Notes"
                      value={engForm.notes}
                      onChange={(e) => setEngForm({ ...engForm, notes: e.target.value })}
                      rows={2}
                      className="bg-dark-2 border border-dark-4 rounded px-2 py-1.5 text-xs text-white placeholder-dark-5 col-span-2 resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowEngForm(false)}
                      className="px-3 py-1.5 text-xs text-grey hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onAddEngagement}
                      disabled={engSaving || !engForm.name}
                      className="px-4 py-1.5 bg-gold text-dark text-xs font-bold rounded hover:bg-gold/90 disabled:opacity-50 transition-all"
                    >
                      {engSaving ? "Saving…" : "Log Engagement"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contacts */}
          {(account.contacts || []).length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">
                Contacts ({account.contacts!.length})
              </div>
              <div className="space-y-2">
                {account.contacts!.map((c) => (
                  <div key={c.id} className="bg-dark-3 rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      c.is_decision_maker ? "bg-gold/20 text-gold" : "bg-dark-4 text-dark-5"
                    }`}>
                      {c.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {c.name}
                        {c.is_decision_maker && (
                          <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-gold/15 text-gold rounded uppercase font-bold">DM</span>
                        )}
                      </div>
                      <div className="text-[10px] text-dark-5">{c.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
