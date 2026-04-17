import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("wbs_tasks")
    .select(`
      id, task_code, name, status, due_date, effort_days, assignee, epic, sprint_name,
      wbs_stages (name, projects (code, name, category))
    `)
    .order("task_code", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { id, status } = await request.json();

  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("wbs_tasks")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
