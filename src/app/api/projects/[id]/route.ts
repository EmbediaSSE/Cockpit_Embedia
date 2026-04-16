import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Fetch project with WBS stages, tasks, documents, and risks
  const [projectRes, stagesRes, docsRes, risksRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("wbs_stages")
      .select("*, wbs_tasks(*)")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_risks")
      .select("*")
      .eq("project_id", id),
  ]);

  if (projectRes.error) {
    return NextResponse.json({ error: projectRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    ...projectRes.data,
    stages: stagesRes.data || [],
    documents: docsRes.data || [],
    risks: risksRes.data || [],
  });
}
