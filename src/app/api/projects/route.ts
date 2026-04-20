import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  const required = ["code", "name", "category", "priority", "status"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      code:          body.code.trim().toUpperCase(),
      name:          body.name.trim(),
      client:        body.client?.trim() || "Embedia",
      category:      body.category,
      priority:      body.priority,
      status:        body.status,
      stage:         body.stage || "Active",
      phase:         body.phase || null,
      summary:       body.summary || null,
      target_date:   body.target_date || null,
      selling_price: Number(body.selling_price) || 0,
      margin_pct:    Number(body.margin_pct) || 0,
      risks_summary: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  let query = supabase
    .from("projects")
    .select("*")
    .order("priority", { ascending: true })
    .order("updated_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
