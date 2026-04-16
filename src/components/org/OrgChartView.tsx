"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

// Embedia org structure: CEO + AI Agent Team + Human team from Supabase
const AI_AGENTS = [
  { id: "chief-of-staff", name: "Chief of Staff", type: "AI Agent", desc: "Daily briefing, portfolio overview, decision support", status: "active" },
  { id: "bizdev", name: "BizDev Agent", type: "AI Agent", desc: "Pipeline management, outreach, lead qualification", status: "active" },
  { id: "mbse", name: "MBSE Agent", type: "AI Agent", desc: "Model-based systems engineering, SysML, architecture", status: "in_dev" },
  { id: "fusa", name: "FuSa Agent", type: "AI Agent", desc: "ISO 26262, HARA, FMEA, safety case generation", status: "planned" },
  { id: "cybersec", name: "CyberSec Agent", type: "AI Agent", desc: "ISO 21434, UN R155, TARA, threat modelling", status: "planned" },
  { id: "content", name: "Content Agent", type: "AI Agent", desc: "White papers, proposals, technical documentation", status: "active" },
  { id: "whitepaper", name: "White Paper Agent", type: "AI Agent", desc: "Long-form publishing, research synthesis", status: "active" },
];

const DEPARTMENTS = [
  {
    name: "Executive",
    color: "gold",
    description: "Strategy, vision, client relationships",
  },
  {
    name: "Consultancy Delivery",
    color: "blue-400",
    description: "Client projects, MBSE, process optimisation",
  },
  {
    name: "Product & Engineering",
    color: "purple-400",
    description: "AI agents, cockpit platform, tooling",
  },
  {
    name: "Business Development",
    color: "green-400",
    description: "Pipeline, partnerships, market expansion",
  },
  {
    name: "Operations & Publishing",
    color: "amber-400",
    description: "Content, brand, internal processes",
  },
];

export default function OrgChartView() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("id, email, full_name, role, created_at")
        .order("created_at", { ascending: true });
      if (data) setTeam(data);
      setLoading(false);
    }
    load();
  }, []);

  const activeAgents = AI_AGENTS.filter((a) => a.status === "active").length;
  const totalCapacity = team.length + activeAgents;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Organisation</h2>
          <p className="text-xs text-grey mt-1">
            {team.length} team member{team.length !== 1 ? "s" : ""} + {AI_AGENTS.length} AI agents ({activeAgents} active) — {totalCapacity} total capacity
          </p>
        </div>
      </div>

      {/* Org Tree */}
      <div className="flex flex-col items-center">

        {/* CEO Node */}
        <div className="bg-dark-2 border-2 border-gold rounded-xl px-8 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gold text-dark flex items-center justify-center text-lg font-bold mx-auto mb-2">
            SS
          </div>
          <div className="text-sm font-bold text-white">Safouen Selmi</div>
          <div className="text-[10px] text-gold font-semibold uppercase tracking-wider">Founder & CEO</div>
          <div className="text-[10px] text-dark-5 mt-1">Embedia.io</div>
        </div>

        {/* Connector */}
        <div className="w-px h-8 bg-dark-4" />

        {/* Department Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl">

          {/* Human Team */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-gold" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Team</h3>
            </div>
            {loading ? (
              <div className="text-xs text-dark-5">Loading...</div>
            ) : team.length === 0 ? (
              <div className="text-xs text-dark-5">No team members yet</div>
            ) : (
              <div className="space-y-2">
                {team.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[10px] font-bold">
                      {(m.full_name || m.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{m.full_name || m.email.split("@")[0]}</div>
                      <div className="text-[9px] text-dark-5">{m.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Agents — Active */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-400">Active Agents</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "active").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Agents — In Development */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">In Development</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "in_dev").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Agents — Planned */}
          <div className="bg-dark-2 border border-dark-4 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-dark-5" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-dark-5">Planned</h3>
            </div>
            <div className="space-y-2">
              {AI_AGENTS.filter((a) => a.status === "planned").map((agent) => (
                <div key={agent.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-dark-4 text-dark-5 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-medium text-grey">{agent.name}</div>
                    <div className="text-[9px] text-dark-5">{agent.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Departments Overview */}
        <div className="w-full max-w-5xl mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-dark-5 mb-4">Functional Areas</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {DEPARTMENTS.map((dept) => (
              <div key={dept.name} className={`bg-dark-2 border border-dark-4 rounded-lg p-4 border-t-2 border-t-${dept.color}`}>
                <div className="text-xs font-bold text-white mb-1">{dept.name}</div>
                <div className="text-[10px] text-dark-5 leading-relaxed">{dept.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
