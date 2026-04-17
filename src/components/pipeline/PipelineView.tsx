"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GTMView from "./GTMView";
import AddAccountModal from "./AddAccountModal";

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
  notes: string;
  contacts?: Contact[];
}

interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  linkedin_url: string;
  is_decision_maker: boolean;
}

const STAGES = [
  { id: "identified", label: "Identified", color: "bg-dark-5" },
  { id: "contacted", label: "Contacted", color: "bg-blue-500" },
  { id: "qualified", label: "Qualified", color: "bg-amber-500" },
  { id: "proposal", label: "Proposal", color: "bg-purple-500" },
  { id: "won", label: "Won", color: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-500" },
];

export default function PipelineView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [activeTab, setActiveTab] = useState<"bd" | "gtm">("bd");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    const supabase = createClient();
    const { data: accs } = await supabase
      .from("pipeline_accounts")
      .select("*, account_contacts(*)")
      .order("updated_at", { ascending: false });

    if (accs) {
      setAccounts(accs.map((a: Record<string, unknown>) => ({
        ...a,
        contacts: a.account_contacts || [],
      })) as Account[]);
    }
    setLoading(false);
  }

  async function moveAccount(accountId: string, newStatus: string) {
    const supabase = createClient();
    await supabase
      .from("pipeline_accounts")
      .update({ status: newStatus })
      .eq("id", accountId);

    setAccounts((prev) =>
      prev.map((a) => (a.id === accountId ? { ...a, status: newStatus } : a))
    );
  }

  function getAccountsByStage(stage: string) {
    return accounts.filter((a) => a.status === stage);
  }

  if (loading) {
    return <div className="text-center py-20 text-grey text-sm">Loading pipeline...</div>;
  }

  return (
    <div>
      {/* Top tab bar: BD Pipeline vs GTM */}
      <div className="flex items-center gap-1 mb-6">
        <div className="flex gap-1 bg-dark-3 rounded-lg p-0.5 mr-4">
          <button
            onClick={() => setActiveTab("bd")}
            className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "bd" ? "bg-gold text-dark" : "text-grey hover:text-white"
            }`}
          >
            BD Pipeline
          </button>
          <button
            onClick={() => setActiveTab("gtm")}
            className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "gtm" ? "bg-gold text-dark" : "text-grey hover:text-white"
            }`}
          >
            GTM Content
          </button>
        </div>

        {/* BD-only controls */}
        {activeTab === "bd" && (
          <div className="flex items-center justify-between flex-1">
            <div>
              <h2 className="text-xl font-bold text-white">BD Pipeline — DACH & Nordics</h2>
              <p className="text-xs text-grey mt-1">
                {accounts.length} accounts — {accounts.filter((a) => a.status === "won").length} won,{" "}
                {accounts.filter((a) => ["qualified", "proposal"].includes(a.status)).length} in progress
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-dark text-xs font-bold hover:bg-gold/90 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Account
              </button>
              <div className="flex gap-1 bg-dark-3 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "kanban" ? "bg-gold text-dark" : "text-grey hover:text-white"
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    viewMode === "table" ? "bg-gold text-dark" : "text-grey hover:text-white"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GTM tab */}
      {activeTab === "gtm" && <GTMView />}

      {/* BD tab */}
      {activeTab === "bd" && <div>

      {viewMode === "kanban" ? (
        /* ── Kanban Board ──────────────────────────────── */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.filter((s) => s.id !== "lost").map((stage) => {
            const stageAccounts = getAccountsByStage(stage.id);
            return (
              <div key={stage.id} className="min-w-[240px] flex-1">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-grey">
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-dark-5 bg-dark-3 rounded-full px-1.5 py-0.5">
                    {stageAccounts.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {stageAccounts.map((account) => (
                    <div
                      key={account.id}
                      onClick={() => setSelectedAccount(account)}
                      className="bg-dark-2 border border-dark-4 rounded-lg p-3 cursor-pointer hover:border-gold/50 transition-all group"
                    >
                      <div className="text-sm font-semibold text-white group-hover:text-gold transition-colors">
                        {account.name}
                      </div>
                      <div className="text-[10px] text-dark-5 mt-1">{account.category}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] text-grey">
                          {account.country}
                        </span>
                        {account.icp_segment && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-3 text-dark-5">
                            {account.icp_segment}
                          </span>
                        )}
                      </div>
                      {account.contacts && account.contacts.length > 0 && (
                        <div className="mt-2 flex -space-x-1.5">
                          {account.contacts.slice(0, 3).map((c) => (
                            <div
                              key={c.id}
                              title={`${c.name} — ${c.title}`}
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border border-dark-2 ${
                                c.is_decision_maker
                                  ? "bg-gold/30 text-gold"
                                  : "bg-dark-3 text-dark-5"
                              }`}
                            >
                              {c.name[0]}
                            </div>
                          ))}
                          {account.contacts.length > 3 && (
                            <div className="w-5 h-5 rounded-full bg-dark-3 text-dark-5 flex items-center justify-center text-[8px] border border-dark-2">
                              +{account.contacts.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quick move arrows */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {STAGES.filter((s) => s.id !== "lost" && s.id !== account.status).map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveAccount(account.id, s.id);
                            }}
                            className={`text-[8px] px-1.5 py-0.5 rounded ${s.color}/20 text-grey hover:text-white transition-colors`}
                            title={`Move to ${s.label}`}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {stageAccounts.length === 0 && (
                    <div
                      onClick={() => setShowAddModal(true)}
                      className="text-center py-8 text-dark-5 text-xs border border-dashed border-dark-4 rounded-lg cursor-pointer hover:border-gold/40 hover:text-grey transition-all group"
                    >
                      <div className="text-lg mb-1 group-hover:scale-110 transition-transform">+</div>
                      Add account
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ──────────────────────────────── */
        <div className="bg-dark-2 rounded-xl border border-dark-4 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-[9px] font-bold uppercase tracking-[1.5px] text-dark-5 border-b border-dark-4">
                <th className="text-left px-4 py-2.5">Account</th>
                <th className="text-left px-4 py-2.5">Category</th>
                <th className="text-left px-4 py-2.5">Region</th>
                <th className="text-left px-4 py-2.5">ICP</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-left px-4 py-2.5">Contacts</th>
                <th className="text-left px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const stageInfo = STAGES.find((s) => s.id === a.status);
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedAccount(a)}
                    className="border-b border-dark-4 last:border-0 hover:bg-dark-3 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{a.name}</div>
                      <div className="text-[10px] text-dark-5">{a.city}, {a.country}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-grey">{a.category}</td>
                    <td className="px-4 py-3 text-xs text-grey">{a.region}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-dark-3 text-dark-5">
                        {a.icp_segment}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${stageInfo?.color}`} />
                        <span className="text-xs text-grey">{stageInfo?.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-grey">
                      {a.contacts?.length || 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-grey max-w-[200px] truncate">
                      {a.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Account Detail Drawer ──────────────────── */}
      {/* ── Add Account Modal ─────────────────────── */}
      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            loadAccounts();
          }}
        />
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedAccount(null)} />
          <div className="relative w-[480px] bg-dark-2 border-l border-dark-4 overflow-y-auto">
            <div className="sticky top-0 bg-dark-2 border-b border-dark-4 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{selectedAccount.name}</h3>
              <button
                onClick={() => setSelectedAccount(null)}
                className="text-grey hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Category</div>
                  <div className="text-sm text-white">{selectedAccount.category}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Location</div>
                  <div className="text-sm text-white">{selectedAccount.city}, {selectedAccount.country}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">ICP Segment</div>
                  <div className="text-sm text-white">{selectedAccount.icp_segment}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-1">Website</div>
                  <div className="text-sm text-gold">{selectedAccount.website}</div>
                </div>
              </div>

              {/* Status selector */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">Pipeline Stage</div>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        moveAccount(selectedAccount.id, s.id);
                        setSelectedAccount({ ...selectedAccount, status: s.id });
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        selectedAccount.status === s.id
                          ? `${s.color} text-white`
                          : "bg-dark-3 text-grey hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">Notes</div>
                <div className="text-sm text-grey leading-relaxed bg-dark-3 rounded-lg p-3">
                  {selectedAccount.notes || "No notes yet."}
                </div>
              </div>

              {/* Contacts */}
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-dark-5 mb-2">
                  Contacts ({selectedAccount.contacts?.length || 0})
                </div>
                {selectedAccount.contacts && selectedAccount.contacts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAccount.contacts.map((c) => (
                      <div key={c.id} className="bg-dark-3 rounded-lg p-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          c.is_decision_maker ? "bg-gold/20 text-gold" : "bg-dark-4 text-dark-5"
                        }`}>
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">
                            {c.name}
                            {c.is_decision_maker && (
                              <span className="ml-2 text-[8px] px-1.5 py-0.5 bg-gold/15 text-gold rounded uppercase font-bold">
                                DM
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-dark-5">{c.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-dark-5 bg-dark-3 rounded-lg p-3">
                    No contacts added yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>}
    </div>
  );
}
