// ============================================================
// POST /api/pipeline/personalize — Re-personalize Cached Intel
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCachedIntel, getOrGeneratePersonalization } from '@/lib/pipeline';
import type { BaseIntel } from '@/lib/pipeline';

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

    const body = await request.json();
    const { domain, user_context_changed } = body;

    if (!domain) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'Domain is required' } },
        { status: 400 }
      );
    }

    // If user context changed, delete old personalization first
    if (user_context_changed) {
      await supabase
        .from('user_personalization')
        .delete()
        .eq('user_id', user.id)
        .eq('domain', domain);
    }

    // Get cached intel
    const cached = await getCachedIntel(domain);
    if (!cached) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: 'No cached intel for this domain. Run research first.' } },
        { status: 404 }
      );
    }

    const personalized = await getOrGeneratePersonalization(
      user.id,
      domain,
      cached.base_intel as BaseIntel,
      cached.base_intel_summary,
      'llm'
    );

    return NextResponse.json({ ok: true, data: { domain, personalized } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Personalization failed';
    console.error('[API] Personalization error:', message);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
