import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Supabase server client ──────────────────────────────────────

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

// ── GET /api/panel/[type]/[id] ─────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  const supabase = await createClient();
  const { type, id } = params;

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
