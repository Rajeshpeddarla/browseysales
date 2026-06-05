// ============================================================
// GET /api/proxy?url=https://...
// Server-side proxy for the browser crawler.
// The browser calls this when direct fetch is blocked by CORS.
// The server fetches the target URL and returns the HTML.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml', 'text/plain'];
const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2MB

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Only allow http/https
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Block internal/private IPs
  const hostname = parsed.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.')
  ) {
    return NextResponse.json({ error: 'Private URLs not allowed' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Target returned ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || '';
    const isAllowed = ALLOWED_CONTENT_TYPES.some(t => contentType.includes(t));
    if (!isAllowed) {
      return NextResponse.json({ error: 'Content type not allowed' }, { status: 415 });
    }

    // Read with size limit
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'No body' }, { status: 500 });

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.length;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array(0))
    );

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 min cache
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Proxy fetch failed: ${err.message}` },
      { status: 502 }
    );
  }
}
