import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/aria — return all agents ordered by XP desc
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("aria_agents")
    .select("*")
    .order("xp", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/aria — increment XP and task count for a given agent slug
// Body: { slug: string; xp_gain: number }
export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await req.json();
  const { slug, xp_gain = 10 } = body as { slug: string; xp_gain?: number };

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: agent, error: fetchErr } = await supabase
    .from("aria_agents")
    .select("xp, tasks_count")
    .eq("slug", slug)
    .single();

  if (fetchErr || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("aria_agents")
    .update({
      xp:          agent.xp + xp_gain,
      tasks_count: agent.tasks_count + 1,
      last_active: new Date().toISOString(),
    })
    .eq("slug", slug)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
