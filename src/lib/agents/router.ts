import type { AgentType } from "@/lib/supabase/types";

const KEYWORD_MAP: Record<string, AgentType> = {
  // Chief of Staff
  "portfolio": "chief_of_staff",
  "briefing": "chief_of_staff",
  "my plate": "chief_of_staff",
  "status": "chief_of_staff",
  "overdue": "chief_of_staff",
  "kpi": "chief_of_staff",
  "milestone": "chief_of_staff",
  "workstream": "chief_of_staff",
  "sprint": "chief_of_staff",

  // BizDev
  "pipeline": "bizdev",
  "outreach": "bizdev",
  "account": "bizdev",
  "funding": "bizdev",
  "partner": "bizdev",
  "prospect": "bizdev",
  "client scouting": "bizdev",
  "lead": "bizdev",

  // MBSE
  "requirement": "mbse",
  "mbse": "mbse",
  "traceability": "mbse",
  "architecture review": "mbse",
  "sysml": "mbse",
  "e/e": "mbse",

  // Content
  "sow": "content",
  "proposal": "content",
  "deck": "content",
  "presentation": "content",
  "offer": "content",

  // White Paper
  "white paper": "whitepaper",
  "chapter": "whitepaper",
  "publication": "whitepaper",
  "research": "whitepaper",

  // FuSa
  "safety": "fusa",
  "hara": "fusa",
  "fmea": "fusa",
  "asil": "fusa",
  "iso 26262": "fusa",

  // CyberSec
  "cybersec": "cybersec",
  "tara": "cybersec",
  "r155": "cybersec",
  "iso 21434": "cybersec",
  "threat": "cybersec",
};

export function routeToAgent(
  message: string,
  explicitAgent?: AgentType,
  currentAgent?: AgentType
): AgentType {
  // 1. Explicit selection takes priority
  if (explicitAgent) return explicitAgent;

  // 2. Check keywords
  const lower = message.toLowerCase();
  for (const [keyword, agent] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(keyword)) return agent;
  }

  // 3. Stay with current agent if in a conversation
  if (currentAgent) return currentAgent;

  // 4. Default to Chief of Staff
  return "chief_of_staff";
}

export const AGENT_DISPLAY: Record<AgentType, { name: string; icon: string; color: string }> = {
  chief_of_staff: { name: "Chief of Staff", icon: "📋", color: "text-gold" },
  bizdev:         { name: "BizDev Agent", icon: "🤝", color: "text-status-amber" },
  mbse:           { name: "MBSE Agent", icon: "🏗️", color: "text-status-green" },
  fusa:           { name: "FuSa Agent", icon: "🛡️", color: "text-status-blue" },
  cybersec:       { name: "CyberSec Agent", icon: "🔒", color: "text-status-purple" },
  content:        { name: "Content Agent", icon: "✍️", color: "text-cream" },
  whitepaper:     { name: "White Paper Agent", icon: "📝", color: "text-status-blue" },
};
