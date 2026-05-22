import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runResearchPipeline } from "@/lib/pipeline";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { url, playbook_id } = body;

    if (!url) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "URL is required" } },
        { status: 400 }
      );
    }

    // Check quota
    let { data: profile } = await supabase
      .from("profiles")
      .select("monthly_brief_used, monthly_brief_quota")
      .eq("id", user.id)
      .single();

    // Fallback: If profile doesn't exist (e.g. SQL trigger didn't run), create it.
    if (!profile) {
      const { data: newProfile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          plan: "free",
        })
        .select()
        .single();
        
      if (profileErr) {
        console.error("Profile fallback insert failed:", profileErr);
        return NextResponse.json(
          { ok: false, error: { code: "PROFILE_CREATION_FAILED", message: `Please run the Supabase schema script. Profile creation failed: ${profileErr.message}` } },
          { status: 500 }
        );
      }
      
      profile = newProfile;
    }

    if (profile && profile.monthly_brief_used >= profile.monthly_brief_quota) {
      return NextResponse.json(
        { ok: false, error: { code: "QUOTA_EXCEEDED", message: "Monthly brief quota exceeded" } },
        { status: 429 }
      );
    }

    // Extract domain
    let domain: string;
    try {
      domain = new URL(url).hostname.replace("www.", "");
    } catch {
      domain = url;
    }

    const pipelineResult = await runResearchPipeline(domain, user.id, undefined, Boolean(body.force_refresh));
    const brief = pipelineResult.saved_brief;
    if (!brief) throw new Error("Pipeline completed but did not return a saved brief");

    // Log usage
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event: "brief_generated",
      meta: { url, domain, cached: pipelineResult.cached, degraded: pipelineResult.is_degraded },
    });

    return NextResponse.json({ ok: true, data: brief });
  } catch (error: any) {
    console.error("Brief API error:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL", message: error.message } },
      { status: 500 }
    );
  }
}
