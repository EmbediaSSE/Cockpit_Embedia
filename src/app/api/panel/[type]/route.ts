import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── POST /api/panel/[type] — create a new record ───────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (type) {

      // ── project ─────────────────────────────────────────────
      case "project": {
        const required = ["code", "name", "category", "priority"];
        for (const f of required) {
          if (!body[f]) return NextResponse.json({ error: `Missing field: ${f}` }, { status: 400 });
        }
        const { data, error } = await supabase
          .from("projects")
          .insert({
            code:          body.code,
            name:          body.name,
            client:        body.client || "",
            category:      body.category,
            stage:         body.stage || "Planned",
            status:        body.status || "active",
            priority:      body.priority || "P2",
            summary:       body.summary || null,
            selling_price: body.selling_price || 0,
            margin_pct:    body.margin_pct || 0,
            target_date:   body.target_date || null,
            phase:         body.phase || null,
          })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data }, { status: 201 });
      }

      // ── task ────────────────────────────────────────────────
      case "task": {
        // Requires project_code + optional stage_name (defaults to "General")
        const { project_code, stage_name, ...taskFields } = body as {
          project_code: string;
          stage_name?: string;
          [k: string]: unknown;
        };
        if (!project_code) return NextResponse.json({ error: "Missing field: project_code" }, { status: 400 });
        if (!taskFields.name) return NextResponse.json({ error: "Missing field: name" }, { status: 400 });

        // Get project id
        const { data: proj } = await supabase
          .from("projects").select("id, code").eq("code", project_code).single();
        if (!proj) return NextResponse.json({ error: `Project not found: ${project_code}` }, { status: 404 });

        // Find or create stage
        const targetStage = stage_name || "General";
        let { data: stage } = await supabase
          .from("wbs_stages")
          .select("id")
          .eq("project_id", proj.id)
          .eq("name", targetStage)
          .single();

        if (!stage) {
          // Get max sort_order
          const { data: stages } = await supabase
            .from("wbs_stages").select("sort_order").eq("project_id", proj.id).order("sort_order", { ascending: false }).limit(1);
          const nextOrder = stages && stages.length > 0 ? (stages[0].sort_order + 1) : 0;
          const { data: newStage, error: stageErr } = await supabase
            .from("wbs_stages").insert({ project_id: proj.id, name: targetStage, sort_order: nextOrder }).select("id").single();
          if (stageErr || !newStage) return NextResponse.json({ error: "Failed to create stage" }, { status: 500 });
          stage = newStage;
        }

        // Generate task_code if not provided
        if (!taskFields.task_code) {
          const { count } = await supabase.from("wbs_tasks").select("*", { count: "exact", head: true })
            .eq("stage_id", stage.id);
          taskFields.task_code = `${project_code}-T${String((count || 0) + 1).padStart(2, "0")}`;
        }

        const { data, error } = await supabase
          .from("wbs_tasks")
          .insert({
            stage_id:    stage.id,
            task_code:   taskFields.task_code,
            name:        taskFields.name,
            status:      taskFields.status || "todo",
            effort_days: taskFields.effort_days || 0,
            rate:        taskFields.rate || 0,
            assignee:    taskFields.assignee || null,
            due_date:    taskFields.due_date || null,
            epic:        taskFields.epic || null,
            sprint_name: taskFields.sprint_name || null,
          })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data }, { status: 201 });
      }

      // ── milestone ───────────────────────────────────────────
      case "milestone": {
        if (!body.name) return NextResponse.json({ error: "Missing field: name" }, { status: 400 });

        let project_id: string | null = null;
        if (body.project_code) {
          const { data: proj } = await supabase
            .from("projects").select("id").eq("code", body.project_code as string).single();
          project_id = proj?.id || null;
        }

        const { data: existing } = await supabase
          .from("milestones").select("sort_order").order("sort_order", { ascending: false }).limit(1);
        const sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

        const { data, error } = await supabase
          .from("milestones")
          .insert({
            name:        body.name,
            target_date: body.target_date || null,
            status:      body.status || "pending",
            unlocks:     body.unlocks || null,
            dependencies: body.dependencies || null,
            project_id,
            sort_order,
          })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data }, { status: 201 });
      }

      // ── decision ────────────────────────────────────────────
      case "decision": {
        if (!body.text) return NextResponse.json({ error: "Missing field: text" }, { status: 400 });

        // Auto-generate code if not provided
        if (!body.code) {
          const { count } = await supabase.from("decisions").select("*", { count: "exact", head: true });
          body.code = `DEC-${String((count || 0) + 1).padStart(3, "0")}`;
        }

        let project_id: string | null = null;
        if (body.project_code) {
          const { data: proj } = await supabase
            .from("projects").select("id").eq("code", body.project_code as string).single();
          project_id = proj?.id || null;
        }

        const { data, error } = await supabase
          .from("decisions")
          .insert({
            code:     body.code,
            text:     body.text,
            owner:    body.owner || null,
            deadline: body.deadline || null,
            status:   body.status || "pending",
            note:     body.note || null,
            project_id,
          })
          .select()
          .single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, data }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: `Creation not supported for type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[panel POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
