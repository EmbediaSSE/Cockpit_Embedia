import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ── Supabase server client (anon, for reads) ───────────────────

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );
}

// ── Supabase service-role client (bypasses RLS, for writes) ────

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET /api/panel/[type]/[id] ─────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const supabase = await createClient();
  const { type, id } = await params;

  try {
    switch (type) {

      // ── project ───────────────────────────────────────────────
      case "project": {
        // Try fetching by code first (e.g. "MBSE-001"), then by UUID
        const isUuid = /^[0-9a-f-]{36}$/.test(id);
        const query = supabase
          .from("projects")
          .select(`
            *,
            wbs_stages (
              id, name, sort_order,
              wbs_tasks (id, task_code, name, effort_days, rate, status, assignee, due_date, epic, sprint_name)
            ),
            project_risks (id, level, description, mitigation, status),
            milestones (id, name, target_date, status, unlocks, sort_order)
          `);

        const { data, error } = await (isUuid ? query.eq("id", id) : query.eq("code", id)).single();
        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Flatten to panel shape
        const allTasks = (data.wbs_stages || []).flatMap((s: { wbs_tasks: unknown[] }) => s.wbs_tasks || []);
        const doneCount = allTasks.filter((t: { status: string }) => t.status === "done").length;
        const progress  = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

        const stages = (data.wbs_stages || [])
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
          .map((s: { name: string; wbs_tasks: unknown[] }) => ({
            stage: s.name,
            tasks: (s.wbs_tasks || []).map((t: unknown) => t),
          }));

        return NextResponse.json({
          type:              "project",
          id:                data.id,
          code:              data.code,
          name:              data.name,
          client:            data.client,
          category:          data.category,
          priority:          data.priority,
          status:            data.status,
          stage:             data.stage,
          phase:             data.phase,
          summary:           data.summary,
          selling_price:     data.selling_price,
          margin_pct:        data.margin_pct,
          target_date:       data.target_date,
          dependencies_text: data.dependencies_text,
          progress,
          taskCount:         allTasks.length,
          doneCount,
          risks:             data.project_risks || [],
          stages,
          milestones:        (data.milestones || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
        });
      }

      // ── account ───────────────────────────────────────────────
      case "account": {
        const { data, error } = await supabase
          .from("pipeline_accounts")
          .select(`*, account_contacts (*)`)
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
          type:              "account",
          id:                data.id,
          name:              data.name,
          category:          data.category,
          country:           data.country,
          city:              data.city,
          icp_segment:       data.icp_segment,
          status:            data.status,
          priority:          data.priority || "P2",
          notes:             data.notes,
          last_touch:        data.last_touch,
          next_action:       data.next_action,
          revenue_potential: data.revenue_potential || 0,
          contacts:          data.account_contacts || [],
        });
      }

      // ── milestone ─────────────────────────────────────────────
      case "milestone": {
        const { data, error } = await supabase
          .from("milestones")
          .select(`*, projects (code, name)`)
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
          type:         "milestone",
          id:           data.id,
          name:         data.name,
          target_date:  data.target_date,
          status:       data.status,
          unlocks:      data.unlocks,
          dependencies: data.dependencies,
          project:      data.projects ? { code: data.projects.code, name: data.projects.name } : null,
        });
      }

      // ── decision ──────────────────────────────────────────────
      case "decision": {
        const { data, error } = await supabase
          .from("decisions")
          .select(`*, projects (code, name)`)
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
          type:     "decision",
          id:       data.id,
          code:     data.code,
          text:     data.text,
          owner:    data.owner,
          deadline: data.deadline,
          status:   data.status,
          note:     data.note,
          project:  data.projects ? { code: data.projects.code, name: data.projects.name } : null,
        });
      }

      // ── task ──────────────────────────────────────────────────
      case "task": {
        const { data, error } = await supabase
          .from("wbs_tasks")
          .select(`
            id, task_code, name, status, due_date, effort_days, rate, assignee, epic, sprint_name,
            wbs_stages (
              id, name,
              projects (id, code, name, client)
            )
          `)
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const stage = (data.wbs_stages as { name: string; projects?: { id: string; code: string; name: string; client: string } } | null);

        return NextResponse.json({
          type:        "task",
          id:          data.id,
          task_code:   data.task_code,
          name:        data.name,
          status:      data.status,
          due_date:    data.due_date,
          effort_days: data.effort_days,
          rate:        data.rate,
          assignee:    data.assignee,
          epic:        data.epic,
          sprint_name: data.sprint_name,
          stage_name:  stage?.name || null,
          project:     stage?.projects ? {
            code:   stage.projects.code,
            name:   stage.projects.name,
            client: stage.projects.client,
          } : null,
        });
      }

      // ── news ──────────────────────────────────────────────────
      case "news": {
        const { data, error } = await supabase
          .from("news_items")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
          type:            "news",
          id:              data.id,
          title:           data.title,
          source:          data.source,
          url:             data.url,
          summary:         data.summary,
          category:        data.category,
          relevance_score: data.relevance_score,
          published_at:    data.published_at,
        });
      }

      // ── content ───────────────────────────────────────────────
      case "content": {
        const { data, error } = await supabase
          .from("content_assets")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json({
          type:         "content",
          id:           data.id,
          title:        data.title,
          asset_type:   data.asset_type,
          status:       data.status,
          progress_pct: data.progress_pct,
          audience:     data.audience,
          channel:      data.channel,
          target_date:  data.target_date,
          summary:      data.summary,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown panel type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[panel API]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH /api/panel/[type]/[id] ──────────────────────────────
// Allowed fields per type — whitelist keeps the API safe.

const ALLOWED_FIELDS: Record<string, string[]> = {
  project:   ["status", "stage", "phase", "priority", "summary", "target_date", "selling_price", "margin_pct"],
  task:      ["status", "assignee", "due_date", "sprint_name", "effort_days"],
  milestone: ["status", "target_date", "name"],
  decision:  ["status", "owner", "deadline", "note"],
  account:   ["status", "priority", "notes", "next_action", "last_touch"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const allowed = ALLOWED_FIELDS[type];
  if (!allowed) return NextResponse.json({ error: `Updates not supported for type: ${type}` }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Strip fields not in the whitelist
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  const tableMap: Record<string, string> = {
    project:   "projects",
    task:      "wbs_tasks",
    milestone: "milestones",
    decision:  "decisions",
    account:   "pipeline_accounts",
  };

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from(tableMap[type])
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[panel PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
