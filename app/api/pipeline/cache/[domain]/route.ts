// ============================================================
// GET /api/pipeline/cache/[domain] — Check Cache Freshness
// Cheap check before extension sends full payload
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkCache } from '@/lib/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const { domain } = await params;
    if (!domain) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'Domain is required' } },
        { status: 400 }
      );
    }

    const cacheStatus = await checkCache(decodeURIComponent(domain));

    return NextResponse.json({ ok: true, data: cacheStatus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cache check failed';
    console.error('[API] Cache check error:', message);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
