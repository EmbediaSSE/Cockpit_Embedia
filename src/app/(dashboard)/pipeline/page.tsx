"use client";

import { useState } from "react";
import SectionTitle from "@/components/dashboard/SectionTitle";
import type { PipelineAccount, AccountStatus } from "@/lib/supabase/types";

// ── Seed data ─────────────────────────────────────────────────

const SEED_ACCOUNTS: PipelineAccount[] = [
  {
    id: "1", name: "Continental AG", category: "Tier-1 Supplier", country: "Germany", region: "DACH",
    city: "Hanover", website: "continental.com", icp_segment: "Tier-1 ADAS/EE", status: "contacted",
    notes: "Initial outreach via LinkedIn. Interest in MBSE tooling.",
    last_touch: null, next_action: "Follow up on LinkedIn message; share MBSE whitepaper draft",
    revenue_potential: 0, priority: "P1", created_at: "", updated_at: "",
  },
  {
    id: "2", name: "ZF Friedrichshafen", category: "Tier-1 Supplier", country: "Germany", region: "DACH",
    city: "Friedrichshafen", website: "zf.com", icp_segment: "Tier-1 Chassis/Safety", status: "identified",
    notes: "Strong FuSa needs. Target safety engineering team.",
    last_touch: null, next_action: "Request intro to safety engineering team lead",
    revenue_potential: 0, priority: "P1", created_at: "", updated_at: "",
  },
  {
    id: "3", name: "Volvo Cars", category: "OEM", country: "Sweden", region: "Nordics",
    city: "Gothenburg", website: "volvocars.com", icp_segment: "OEM Premium", status: "qualified",
    notes: "Engineering leadership interested in MBSE adoption roadmap.",
    last_touch: null, next_action: "Send MBSE roadmap white paper; schedule call with engineering VP",
    revenue_potential: 80000, priority: "P0", created_at: "", updated_at: "",
  },
  {
    id: "4", name: "Scania", category: "OEM", country: "Sweden", region: "Nordics",
    city: "Södertälje", website: "scania.com", icp_segment: "OEM Commercial Vehicle", status: "identified",
    notes: "Commercial vehicle focus. Cybersec compliance a known gap.",
    last_touch: null, next_action: "Identify ADAS/cybersec team contacts via LinkedIn",
    revenue_potential: 0, priority: "P2", created_at: "", updated_at: "",
  },
  {
    id: "5", name: "BMW Group", category: "OEM", country: "Germany", region: "DACH",
    city: "Munich", website: "bmwgroup.com", icp_segment: "OEM Premium", status: "identified",
    notes: "Large E/E transformation programme. Long sales cycle.",
    last_touch: null, next_action: "Monitor E/E transformation programme RFI; attend BMW Group supplier day",
    revenue_potential: 150000, priority: "P2", created_at: "", updated_at: "",
  },
  {
    id: "6", name: "Infineon Technologies", category: "Semiconductor", country: "Germany", region: "DACH",
    city: "Neubiberg", website: "infineon.com", icp_segment: "Semiconductor Automotive", status: "contacted",
    notes: "Application engineering team exploring MBSE for SoC development.",
    last_touch: null, next_action: "Share MBSE for semiconductor use case brief; propose PoC scope",
    revenue_potential: 0, priority: "P2", created_at: "", updated_at: "",
  },
  {
    id: "7", name: "KONE", category: "Machinery", country: "Finland", region: "Nordics",
    city: "Espoo", website: "kone.com", icp_segment: "Machinery/Elevator", status: "identified",
    notes: "Mechatronic systems — elevator control. Adjacent to automotive methods.",
    last_touch: null, next_action: "Qualify elevator control MBSE need; connect with engineering director",
    revenue_potential: 0, priority: "P3", created_at: "", updated_at: "",
  },
];

const STAGES: { id: AccountStatus; label: string; color: string }[] = [
  { id: "identified", label: "Identified", color: "border-dark-5" },
  { id: "contacted", label: "Contacted", color: "border-status-amber" },
  { id: "qualified", label: "Qualified", color: "border-status-green" },
  { id: "proposal", label: "Proposal", color: "border-gold" },
  { id: "won", label: "Won", color: "border-status-green" },
];

export default function PipelinePage() {
  const [accounts] = useState<PipelineAccount[]>(SEED_ACCOUNTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = STAGES.map((stage) => ({
    ...stage,
    accounts: accounts.filter((a) => a.status === stage.id),
  }));

  return (
    <div className="max-w-7xl mx-auto px-8 py-6">
      <SectionTitle>BD Pipeline — DACH & Nordics</SectionTitle>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {grouped.map((stage) => (
          <div key={stage.id} className="flex flex-col">
            {/* Column Header */}
            <div className={`bg-dark-2 rounded-t-lg border-t-2 ${stage.color} px-3 py-2.5 flex items-center justify-between`}>
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-grey">{stage.label}</span>
              <span className="text-[10px] font-bold text-dark-5 bg-dark-4 rounded-full w-5 h-5 flex items-center justify-center">
                {stage.accounts.length}
              </span>
            </div>

            {/* Cards */}
            <div className="bg-dark-2/50 rounded-b-lg border border-dark-4 border-t-0 p-2 space-y-2 min-h-[300px]">
              {stage.accounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => setExpandedId(expandedId === account.id ? null : account.id)}
                  className="bg-dark-2 border border-dark-4 rounded-lg p-3 cursor-pointer hover:border-dark-5 transition-all"
                >
                  <div className="font-semibold text-sm">{account.name}</div>
                  <div className="text-[10px] text-dark-5 mt-0.5">{account.category}</div>
                  <div className="text-[10px] text-grey mt-1">
                    {account.city}, {account.country}
                  </div>

                  {expandedId === account.id && (
                    <div className="mt-3 pt-3 border-t border-dark-4">
                      <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5 mb-1">Segment</div>
                      <div className="text-xs text-grey mb-2">{account.icp_segment}</div>
                      <div className="text-[9px] font-bold uppercase tracking-[1px] text-dark-5 mb-1">Notes</div>
                      <div className="text-xs text-grey">{account.notes}</div>
                    </div>
                  )}
                </div>
              ))}

              {stage.accounts.length === 0 && (
                <div className="text-center py-8 text-dark-5 text-xs">No accounts</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 bg-dark-2 rounded-xl border border-dark-4 p-4 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-dark-5">
          Pipeline Summary
        </div>
        <div className="flex gap-6 text-sm">
          <span className="text-grey">Total: <span className="text-white font-bold">{accounts.length}</span></span>
          <span className="text-grey">DACH: <span className="text-white font-bold">{accounts.filter((a) => a.region === "DACH").length}</span></span>
          <span className="text-grey">Nordics: <span className="text-white font-bold">{accounts.filter((a) => a.region === "Nordics").length}</span></span>
        </div>
      </div>
    </div>
  );
}
