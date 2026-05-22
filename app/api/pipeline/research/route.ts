// ============================================================
// POST /api/pipeline/research — Main Research Pipeline Entry
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runResearchPipeline } from '@/lib/pipeline';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // ── Quota Check ────────────────────────────────────────────
    let { data: profile } = await supabase
      .from('profiles')
      .select('plan, monthly_brief_used, monthly_brief_quota')
      .eq('id', user.id)
      .single();

    // Auto-create profile if missing
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          plan: 'free',
          monthly_brief_quota: 10,
          monthly_brief_used: 0,
        })
        .select()
        .single();
      profile = newProfile;
    }

    const used = profile?.monthly_brief_used ?? 0;
    const quota = profile?.monthly_brief_quota ?? 10;

    if (used >= quota) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: `Monthly limit of ${quota} briefs reached. Upgrade your plan to continue.`,
            upgrade_url: '/dashboard/billing',
            used,
            quota,
            plan: profile?.plan || 'free',
          },
        },
        { status: 429 }
      );
    }
    // ──────────────────────────────────────────────────────────

    const body = await request.json();
    const { domain, extracted_payload, force_refresh } = body;

    if (!domain) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'Domain is required' } },
        { status: 400 }
      );
    }

    // Normalize domain
    let cleanDomain = domain;
    try {
      cleanDomain = new URL(domain.startsWith('http') ? domain : `https://${domain}`).hostname.replace('www.', '');
    } catch {
      cleanDomain = domain.replace('www.', '');
    }

    // Run the full pipeline
    const result = await runResearchPipeline(
      cleanDomain,
      user.id,
      extracted_payload || undefined,
      force_refresh || false
    );

    // Increment usage after successful pipeline
    const { error: rpcError } = await supabase.rpc('increment_brief_usage', { uid: user.id });
    if (rpcError) {
      // Fallback direct update
      await supabase
        .from('profiles')
        .update({ monthly_brief_used: used + 1 })
        .eq('id', user.id);
    }

    // Log usage (non-blocking)
    void supabase.from('usage_events').insert({
      user_id: user.id,
      event: 'pipeline_research',
      meta: {
        domain: cleanDomain,
        cached: result.cached,
        degraded: result.is_degraded,
      },
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pipeline failed';
    console.error('[API] Pipeline research error:', message);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
