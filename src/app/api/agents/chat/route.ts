import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { CHIEF_OF_STAFF_PROMPT, CHIEF_OF_STAFF_TOOLS } from "@/lib/agents/prompts/chief-of-staff";
import { routeToAgent } from "@/lib/agents/router";
import type { AgentType, CoworkTaskType } from "@/lib/supabase/types";

// ── Model config ──────────────────────────────────────────────────────────────
//
// Default: Haiku  — fast, cheap, covers >95% of cockpit queries
// Deep mode:      — Sonnet, triggered by ?deep=true or { deep: true } in body
//                   Reserved for complex analysis the user consciously requests

const MODEL_HAIKU  = "claude-haiku-4-5-20251001";
const MODEL_SONNET = "claude-sonnet-4-20250514";
const MAX_HISTORY  = 6;   // messages kept in context (3 turns)
const MAX_TOKENS   = 1024; // sufficient for cockpit answers; saves cost

// ── Agent prompt registry ─────────────────────────────────────────────────────

const AGENT_PROMPTS: Record<AgentType, string> = {
  chief_of_staff: CHIEF_OF_STAFF_PROMPT,
  bizdev: `You are the Business Development Agent for Embedia.io, serving Safouen Selmi (Founder & CEO).
You help manage the BD pipeline, track accounts and contacts, draft outreach messages, and qualify prospects.
Focus on the automotive and mechatronic industry in DACH and Nordics.
Be specific, data-driven, and action-oriented. Use pipeline data from tools when available.`,
  mbse: `You are the MBSE Agent for Embedia.io.
You assist with model-based systems engineering: SysML reviews, requirements traceability, architecture analysis, and E/E system design.
Answer with engineering precision. Reference standards (ISO 15288, SysML v2) where relevant.`,
  fusa: `You are the Functional Safety Agent for Embedia.io.
You support ISO 26262 compliance: HARA, FMEA, ASIL decomposition, safety concepts, and safety case reviews.
Always cite the relevant ISO 26262 part and clause when applicable.`,
  cybersec: `You are the Cybersecurity Agent for Embedia.io.
You support ISO/SAE 21434 and UN R155 compliance: TARA, threat modelling, risk assessment, and cybersecurity management plans.
Reference specific clauses and work products from the standards.`,
  content: `You are the Content Agent for Embedia.io.
You help draft proposals, statements of work, presentations, and consulting deliverables.
Write in Embedia's tone: precise, senior, engineering-grade. No buzzwords. Pyramid Principle structure.`,
  whitepaper: `You are the White Paper Agent for Embedia.io.
You assist with writing chapters, structuring arguments, finding references, and reviewing technical content for Embedia's white papers.
Academic rigour with practitioner accessibility. IEEE/SAE citation format.`,
};

// ── Agentic task detection ────────────────────────────────────────────────────
//
// When a message requests heavy/agentic work, we dispatch it to the Cowork
// task queue (processed every 1h by the desktop app) instead of calling
// the API directly. This avoids large token usage for long-running tasks.

const AGENTIC_PATTERNS: Array<{ re: RegExp; type: CoworkTaskType }> = [
  { re: /\b(go\s+research|research\s+and\s+compile|deep\s+dive\s+into|investigate)\b/i, type: "research" },
  { re: /\b(write\s+(a|the|me)\s+(full|complete|detailed)|draft\s+(a|the)\s+(proposal|sow|report|brief|spec)|create\s+(a|the)\s+(document|doc|report|brief))\b/i, type: "document" },
  { re: /\b(build\s+(me\s+)?(a|the)\s+(deck|presentation|slides)|prepare\s+(a|the)\s+(deck|presentation))\b/i, type: "deck" },
  { re: /\b(write\s+(a|the|me)\s+(email|message)\s+to|draft\s+(an?\s+)?email)\b/i, type: "email" },
  { re: /\b(analyse|analyze)\s+(all|the|our)\s+(pipeline|projects?|data|metrics)\b/i, type: "analysis" },
];

function detectAgenticTask(message: string): { isAgentic: boolean; type: CoworkTaskType; title: string } {
  for (const { re, type } of AGENTIC_PATTERNS) {
    if (re.test(message)) {
      const title = message.length > 80 ? message.slice(0, 77) + "…" : message;
      return { isAgentic: true, type, title };
    }
  }
  return { isAgentic: false, type: "other", title: "" };
}

// ── Supabase service-role client (bypasses RLS) ───────────────────────────────

function getServiceClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, svcKey, { auth: { persistSession: false } });
}

// ── Tool execution stubs (replaced by Supabase queries in Phase 2) ────────────

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "query_projects": {
      const status = toolInput.status as string | undefined;
      const projects = [
        { code: "CB-TME-001", name: "Codebeamer RM Config",    status: "active",  priority: "P0", stage: "Won"    },
        { code: "MBSE-001",   name: "AI Agent — MBSE",         status: "active",  priority: "P0", stage: "Active" },
        { code: "WP-001",     name: "MBSE Adoption Roadmap",   status: "active",  priority: "P1", stage: "Active" },
        { code: "FUSA-001",   name: "AI Agent — FuSa",         status: "pending", priority: "P1", stage: "Planned"},
        { code: "CYBER-001",  name: "AI Agent — CyberSec",     status: "pending", priority: "P2", stage: "Planned"},
        { code: "COCKPIT-001",name: "CEO War Room Cockpit",     status: "active",  priority: "P0", stage: "Active" },
      ];
      return JSON.stringify(status ? projects.filter(p => p.status === status) : projects);
    }
    case "query_kpis": {
      return JSON.stringify([
        { metric: "revenue_pipeline", value: 247000, unit: "EUR" },
        { metric: "avg_margin",       value: 72,     unit: "%"   },
        { metric: "active_projects",  value: 6                   },
        { metric: "sprint_velocity",  value: 14,     unit: "points" },
      ]);
    }
    case "get_overdue_items": {
      return JSON.stringify([
        { type: "task",      code: "WP-001-T3",    name: "Chapter 4 review", due: "2025-04-14", days_overdue: 1 },
        { type: "milestone", code: "MBSE-001-M2",  name: "Sprint 1 demo",    due: "2025-04-14", days_overdue: 1 },
      ]);
    }
    case "update_task_status": {
      return JSON.stringify({ success: true, task_id: toolInput.task_id, new_status: toolInput.status });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
function sse(data: Record<string, unknown>) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST /api/agents/chat ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agent_type,
      message,
      conversation_history,
      deep = false,     // set to true in client for complex analysis (uses Sonnet)
      user_id,          // passed from client for task ownership
    } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Agentic task dispatch ─────────────────────────────────────────────────
    // Heavy tasks go to the Cowork queue (subscription) instead of the API.

    const { isAgentic, type: taskType, title: taskTitle } = detectAgenticTask(message);

    if (isAgentic) {
      try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
          .from("cowork_tasks")
          .insert({
            type:         taskType,
            title:        taskTitle,
            payload:      { message, agent_type, history: (conversation_history ?? []).slice(-4) },
            priority:     "standard",
            requested_by: user_id ?? null,
          })
          .select("id")
          .single();

        const taskId = data?.id ?? "unknown";
        const queuedMsg = error
          ? "⚠️ Task detected but could not be queued. Please try again or run it manually in Cowork."
          : `✅ Task queued for Cowork (ID: \`${taskId}\`). It will be processed within the next hour when Cowork is active. I'll update the result here when it's ready.`;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(sse({ type: "content_delta", delta: queuedMsg }));
            controller.enqueue(sse({ type: "done", agent: agent_type ?? "chief_of_staff", queued: true, task_id: taskId }));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      } catch {
        // Fall through to normal API call if dispatch fails
      }
    }

    // ── Normal chat call ──────────────────────────────────────────────────────

    const resolvedAgent  = routeToAgent(message, agent_type as AgentType);
    const systemPrompt   = AGENT_PROMPTS[resolvedAgent] ?? AGENT_PROMPTS.chief_of_staff;
    const model          = deep ? MODEL_SONNET : MODEL_HAIKU;

    // Build trimmed history (max MAX_HISTORY messages = MAX_HISTORY/2 turns)
    const messages: Anthropic.MessageParam[] = [];
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history.slice(-MAX_HISTORY)) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const client = new Anthropic({ apiKey });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // First call — may trigger tool use
          // system is passed as an array to enable prompt caching:
          // the identical system text is cached by Anthropic (~10% of normal cost on cache hits)
          let response = await client.messages.create({
            model,
            max_tokens: MAX_TOKENS,
            system: [
              {
                type:          "text",
                text:          systemPrompt,
                cache_control: { type: "ephemeral" }, // cache system prompt
              },
            ],
            messages,
            tools:       resolvedAgent === "chief_of_staff" ? CHIEF_OF_STAFF_TOOLS : [],
            stream:      false,
          });

          // Tool-use loop (max 5 iterations)
          let iterations = 0;
          while (response.stop_reason === "tool_use" && iterations < 5) {
            iterations++;

            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ContentBlock & { type: "tool_use" } => b.type === "tool_use"
            );

            const toolResults: Anthropic.MessageParam = {
              role:    "user",
              content: toolUseBlocks.map(tb => ({
                type:        "tool_result" as const,
                tool_use_id: tb.id,
                content:     "",
              })),
            };

            for (const tb of toolUseBlocks) {
              const result      = await executeToolCall(tb.name, tb.input as Record<string, unknown>);
              const resultContent = toolResults.content as Array<{ type: "tool_result"; tool_use_id: string; content: string }>;
              const entry = resultContent.find(r => r.tool_use_id === tb.id);
              if (entry) entry.content = result;
            }

            controller.enqueue(sse({ type: "tool_use", tools: toolUseBlocks.map(t => t.name) }));

            messages.push({ role: "assistant", content: response.content });
            messages.push(toolResults);

            response = await client.messages.create({
              model,
              max_tokens: MAX_TOKENS,
              system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
              messages,
              tools:  resolvedAgent === "chief_of_staff" ? CHIEF_OF_STAFF_TOOLS : [],
              stream: false,
            });
          }

          // Stream final text in chunks (natural typing feel)
          const fullText = response.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map(b => b.text)
            .join("\n");

          const chunkSize = 12;
          for (let i = 0; i < fullText.length; i += chunkSize) {
            controller.enqueue(sse({ type: "content_delta", delta: fullText.slice(i, i + chunkSize) }));
          }

          controller.enqueue(sse({ type: "done", agent: resolvedAgent, model, deep }));
          controller.close();

        } catch (err) {
          controller.enqueue(sse({ type: "error", message: err instanceof Error ? err.message : "Unknown error" }));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });

  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
