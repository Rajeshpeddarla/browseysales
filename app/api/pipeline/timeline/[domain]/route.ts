// ============================================================
// GET /api/pipeline/timeline/[domain] — Signal Change History
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTimeline } from '@/lib/pipeline';

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
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const timeline = await getTimeline(decodeURIComponent(domain), Math.min(limit, 100));

    return NextResponse.json({ ok: true, data: { domain: decodeURIComponent(domain), timeline } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Timeline fetch failed';
    console.error('[API] Timeline error:', message);
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message } },
      { status: 500 }
    );
  }
}
