import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("playbooks")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: error.message } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, icp_description, outreach_tone, is_public } = body;

    if (!name) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Name is required" } }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("playbooks")
      .insert({
        name,
        description,
        icp_description,
        outreach_tone: outreach_tone || "professional",
        is_public: is_public || false,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: error.message } }, { status: 500 });
  }
}
