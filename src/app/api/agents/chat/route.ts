import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { CHIEF_OF_STAFF_PROMPT, CHIEF_OF_STAFF_TOOLS } from "@/lib/agents/prompts/chief-of-staff";
import { routeToAgent } from "@/lib/agents/router";
import type { AgentType } from "@/lib/supabase/types";

// ── Agent prompt registry ─────────────────────────────────────────

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

// ── Tool execution stubs (replaced by Supabase queries in Phase 2) ──

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "query_projects": {
      // Stub: return seed data summary
      const status = toolInput.status as string | undefined;
      const projects = [
        { code: "CB-TME-001", name: "Codebeamer RM Config", status: "active", priority: "P0", stage: "Won" },
        { code: "MBSE-001", name: "AI Agent — MBSE", status: "active", priority: "P0", stage: "Active" },
        { code: "WP-001", name: "MBSE Adoption Roadmap", status: "active", priority: "P1", stage: "Active" },
        { code: "FUSA-001", name: "AI Agent — FuSa", status: "pending", priority: "P1", stage: "Planned" },
        { code: "CYBER-001", name: "AI Agent — CyberSec", status: "pending", priority: "P2", stage: "Planned" },
        { code: "COCKPIT-001", name: "CEO War Room Cockpit", status: "active", priority: "P0", stage: "Active" },
      ];
      const filtered = status ? projects.filter((p) => p.status === status) : projects;
      return JSON.stringify(filtered);
    }
    case "query_kpis": {
      return JSON.stringify([
        { metric: "revenue_pipeline", value: 247000, unit: "EUR" },
        { metric: "avg_margin", value: 72, unit: "%" },
        { metric: "active_projects", value: 6 },
        { metric: "sprint_velocity", value: 14, unit: "points" },
      ]);
    }
    case "get_overdue_items": {
      return JSON.stringify([
        { type: "task", code: "WP-001-T3", name: "Chapter 4 review", due: "2025-04-14", days_overdue: 1 },
        { type: "milestone", code: "MBSE-001-M2", name: "Sprint 1 demo", due: "2025-04-14", days_overdue: 1 },
      ]);
    }
    case "update_task_status": {
      return JSON.stringify({ success: true, task_id: toolInput.task_id, new_status: toolInput.status });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ── SSE Stream Handler ────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_type, message, conversation_history } = body;

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

    // Route to correct agent
    const resolvedAgent = routeToAgent(message, agent_type as AgentType);
    const systemPrompt = AGENT_PROMPTS[resolvedAgent] || AGENT_PROMPTS.chief_of_staff;

    // Build conversation messages
    const messages: Anthropic.MessageParam[] = [];

    // Add recent history for context
    if (conversation_history && Array.isArray(conversation_history)) {
      for (const msg of conversation_history.slice(-10)) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    const client = new Anthropic({ apiKey });

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // First call — may trigger tool use
          let response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages,
            tools: resolvedAgent === "chief_of_staff" ? CHIEF_OF_STAFF_TOOLS : [],
            stream: false, // Non-streaming for tool-use loop
          });

          // Tool use loop (max 5 iterations to prevent runaway)
          let iterations = 0;
          while (response.stop_reason === "tool_use" && iterations < 5) {
            iterations++;

            // Extract tool use blocks
            const toolUseBlocks = response.content.filter(
              (block): block is Anthropic.ContentBlock & { type: "tool_use" } =>
                block.type === "tool_use"
            );

            // Execute each tool call
            const toolResults: Anthropic.MessageParam = {
              role: "user",
              content: toolUseBlocks.map((toolBlock) => ({
                type: "tool_result" as const,
                tool_use_id: toolBlock.id,
                content: "", // Will be set below
              })),
            };

            // Execute tools and fill results
            for (const toolBlock of toolUseBlocks) {
              const result = await executeToolCall(
                toolBlock.name,
                toolBlock.input as Record<string, unknown>
              );
              const resultContent = toolResults.content as Array<{
                type: "tool_result";
                tool_use_id: string;
                content: string;
              }>;
              const entry = resultContent.find((r) => r.tool_use_id === toolBlock.id);
              if (entry) entry.content = result;
            }

            // Send tool usage indicator
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "tool_use", tools: toolUseBlocks.map((t) => t.name) })}\n\n`)
            );

            // Continue conversation with tool results
            messages.push({ role: "assistant", content: response.content });
            messages.push(toolResults);

            response = await client.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              system: systemPrompt,
              messages,
              tools: resolvedAgent === "chief_of_staff" ? CHIEF_OF_STAFF_TOOLS : [],
              stream: false,
            });
          }

          // Stream the final text response
          const textBlocks = response.content.filter(
            (block): block is Anthropic.TextBlock => block.type === "text"
          );
          const fullText = textBlocks.map((b) => b.text).join("\n");

          // Stream in chunks for a natural typing feel
          const chunkSize = 12;
          for (let i = 0; i < fullText.length; i += chunkSize) {
            const chunk = fullText.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "content_delta", delta: chunk })}\n\n`)
            );
            // Tiny delay for streaming feel (not needed in prod, SSE handles it)
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", agent: resolvedAgent })}\n\n`)
          );
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
