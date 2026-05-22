// ============================================================
// POST /api/pipeline/refresh/[domain] — Force Refresh
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runResearchPipeline } from '@/lib/pipeline';

export async function POST(
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
    const body = await request.json().catch(() => ({}));

    const result = await runResearchPipeline(
      decodeURIComponent(domain),
      user.id,
      body.extracted_payload || undefined,
      true // force refresh
    );

    return NextResponse.json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Refresh failed';
    console.error('[API] Refresh error:', message);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
