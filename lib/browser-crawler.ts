// ============================================================
// Browser-Side Crawler
// Runs entirely in the USER'S BROWSER — zero server load for extraction.
// Uses the browser's own fetch(), DOM APIs, and html2canvas for screenshots.
//
// Flow:
//   1. Fetch homepage HTML via browser fetch (user's IP, no CORS issues for text)
//   2. Parse HTML to extract links, meta, headings, tech hints
//   3. Rank priority sub-pages deterministically
//   4. Fetch each sub-page in parallel via browser fetch
//   5. Extract DOM signals from each page
//   6. Take screenshot of current viewport via html2canvas
//   7. Return ExtractedPayload to send to /api/pipeline/research
// ============================================================

export interface BrowserCrawlProgress {
  stage: string;
  pagesFound: number;
  pagesDone: number;
  currentUrl: string;
}

export type ProgressCallback = (p: BrowserCrawlProgress) => void;

// Page priority scoring — deterministic, no AI
const PAGE_PRIORITIES: { pattern: RegExp; type: string; score: number }[] = [
  { pattern: /\/pricing|\/plans|\/price/i,                    type: 'pricing',      score: 100 },
  { pattern: /\/careers|\/jobs|\/hiring|\/join/i,             type: 'careers',      score: 95  },
  { pattern: /\/enterprise/i,                                  type: 'enterprise',   score: 90  },
  { pattern: /\/security|\/trust|\/compliance|\/soc2/i,       type: 'security',     score: 88  },
  { pattern: /\/integrations|\/marketplace|\/apps/i,          type: 'integrations', score: 85  },
  { pattern: /\/docs|\/documentation|\/developers/i,          type: 'docs',         score: 80  },
  { pattern: /\/customers|\/case-stud|\/stories/i,            type: 'customers',    score: 75  },
  { pattern: /\/changelog|\/releases|\/whats-new/i,           type: 'changelog',    score: 70  },
  { pattern: /\/about|\/company|\/team/i,                     type: 'about',        score: 65  },
  { pattern: /\/api|\/sdk|\/developer/i,                      type: 'api_docs',     score: 78  },
  { pattern: /\/contact|\/demo|\/sales/i,                     type: 'contact',      score: 60  },
];

// Enterprise signals to detect in page text
const ENTERPRISE_SIGNALS = [
  'SOC 2', 'SOC2', 'HIPAA', 'GDPR', 'ISO 27001', 'FedRAMP',
  'SSO', 'SAML', 'SCIM', 'Okta', 'Auth0', 'Active Directory',
  'Audit Log', 'RBAC', 'Role-Based Access', 'Data Residency',
  'Salesforce', 'HubSpot', 'Snowflake', 'BigQuery', 'Redshift',
];

// ─── HTML helpers ─────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function extractMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
}

function extractHeadings(html: string) {
  const get = (tag: string) =>
    Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')))
      .map(m => htmlToText(m[1]).trim())
      .filter(Boolean)
      .slice(0, 10);
  return { h1: get('h1'), h2: get('h2'), h3: get('h3') };
}

function extractLinks(html: string, baseUrl: string, domain: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  const seen = new Set<string>();
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const m of matches) {
    try {
      const abs = new URL(m[1], baseUrl);
      const linkDomain = abs.hostname.replace('www.', '');
      // Match the domain directly or any subdomain (e.g. careers.snapdeal.com)
      if (linkDomain !== domain && !linkDomain.endsWith('.' + domain)) continue;
      const clean = abs.href.split('#')[0].replace(/\/$/, '');
      if (seen.has(clean)) continue;
      seen.add(clean);
      links.push({ url: abs.href, text: htmlToText(m[2]).trim() });
    } catch { /* skip */ }
  }
  return links;
}

function rankLinks(links: { url: string; text: string }[]): { url: string; type: string; score: number }[] {
  const ranked: { url: string; type: string; score: number }[] = [];
  const seenUrls = new Set<string>();

  // 1. Add priority matches first
  for (const link of links) {
    for (const { pattern, type, score } of PAGE_PRIORITIES) {
      if (pattern.test(link.url + ' ' + link.text)) {
        ranked.push({ url: link.url, type, score });
        seenUrls.add(link.url);
        break;
      }
    }
  }

  // Sort priority matches
  ranked.sort((a, b) => b.score - a.score);

  // 2. Fallback: if we have less than 6 pages, add other internal links to explore
  if (ranked.length < 6) {
    const genericLinks = links
      .filter(l => !seenUrls.has(l.url))
      .map(l => {
        const isNoise = /logout|signout|search|cart|checkout|filter/i.test(l.url + ' ' + l.text);
        const score = isNoise ? 0 : 30 + Math.min(20, l.text.length);
        return { url: l.url, type: 'page', score };
      })
      .filter(l => l.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const gl of genericLinks) {
      if (ranked.length >= 6) break;
      ranked.push(gl);
    }
  }

  return ranked;
}

function detectTech(html: string) {
  const frameworks: string[] = [];
  const analytics: string[] = [];
  const payment: string[] = [];
  let cms: string | null = null;
  if (/_next\/|__NEXT_DATA__/.test(html)) frameworks.push('Next.js');
  if (/react/.test(html)) frameworks.push('React');
  if (/vue\.js|__vue__/.test(html)) frameworks.push('Vue.js');
  if (/angular/.test(html)) frameworks.push('Angular');
  if (/wp-content|wp-includes/.test(html)) { frameworks.push('WordPress'); cms = 'WordPress'; }
  if (/webflow/.test(html)) { frameworks.push('Webflow'); cms = 'Webflow'; }
  if (/shopify/.test(html)) { frameworks.push('Shopify'); cms = 'Shopify'; }
  if (/google-analytics|gtag|googletagmanager/.test(html)) analytics.push('Google Analytics');
  if (/segment\.com|cdn\.segment/.test(html)) analytics.push('Segment');
  if (/hotjar/.test(html)) analytics.push('Hotjar');
  if (/mixpanel/.test(html)) analytics.push('Mixpanel');
  if (/amplitude/.test(html)) analytics.push('Amplitude');
  if (/hubspot/.test(html)) analytics.push('HubSpot');
  if (/intercom/.test(html)) analytics.push('Intercom');
  if (/stripe/.test(html)) payment.push('Stripe');
  if (/paypal/.test(html)) payment.push('PayPal');
  return { frameworks: [...new Set(frameworks)], analytics: [...new Set(analytics)], cms, payment: [...new Set(payment)] };
}

function extractSocialLinks(html: string) {
  const find = (pattern: RegExp) => html.match(pattern)?.[0] || null;
  return {
    linkedin: find(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s"'<>]+/i),
    twitter: find(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i),
    github: find(/https?:\/\/(?:www\.)?github\.com\/[^\s"'<>]+/i),
    youtube: find(/https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>]+/i),
  };
}

function detectEnterpriseSignals(text: string): string[] {
  const lower = text.toLowerCase();
  return ENTERPRISE_SIGNALS.filter(s => lower.includes(s.toLowerCase()));
}

// ─── Fetch a page via browser fetch ──────────────────────────
// Uses a CORS proxy for cross-origin pages, or direct fetch for same-origin.
// Falls back to empty string on failure.

async function fetchPageHtml(url: string, timeoutMs = 10000): Promise<string> {
  try {
    // Try direct fetch first (works for many sites that allow CORS)
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) return await res.text();
    return '';
  } catch {
    // CORS blocked — use our own proxy endpoint
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.text();
    } catch { /* ignore */ }
    return '';
  }
}

// ─── Screenshot via html2canvas ───────────────────────────────
// Only captures the current page (the dashboard). Can't screenshot
// external sites from the browser due to same-origin policy.
// Used to capture the brief generation UI state.

async function captureCurrentPageScreenshot(): Promise<string | null> {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(document.body, {
      scale: 0.5,
      useCORS: true,
      allowTaint: false,
      logging: false,
    });
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return null;
  }
}

// ─── Main browser crawl function ─────────────────────────────

export async function browserCrawl(
  targetUrl: string,
  onProgress?: ProgressCallback
): Promise<object> {
  const url = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
  let domain: string;
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = targetUrl.replace('www.', '');
  }

  onProgress?.({ stage: 'Fetching homepage...', pagesFound: 0, pagesDone: 0, currentUrl: url });

  // Step 1: Fetch homepage
  const homeHtml = await fetchPageHtml(url);
  const homeText = htmlToText(homeHtml);
  const homeTitle = extractTitle(homeHtml);
  const homeMeta = extractMeta(homeHtml, 'description') || extractMeta(homeHtml, 'og:description');
  const homeHeadings = extractHeadings(homeHtml);
  const techHints = detectTech(homeHtml);
  const socialLinks = extractSocialLinks(homeHtml);
  const allLinks = extractLinks(homeHtml, url, domain);
  const rankedLinks = rankLinks(allLinks).slice(0, 8);

  onProgress?.({ stage: `Found ${rankedLinks.length} priority pages`, pagesFound: rankedLinks.length, pagesDone: 0, currentUrl: url });

  // Step 2: Fetch priority sub-pages in parallel
  const pageResults = await Promise.all(
    rankedLinks.map(async (link, i) => {
      onProgress?.({ stage: `Crawling ${link.type}...`, pagesFound: rankedLinks.length, pagesDone: i, currentUrl: link.url });
      const html = await fetchPageHtml(link.url, 8000);
      if (!html) return null;
      const text = htmlToText(html);
      const enterpriseSignals = detectEnterpriseSignals(text);

      // Build enriched text with enterprise signals
      let enrichedText = text.slice(0, 8000);
      if (enterpriseSignals.length > 0) {
        enrichedText += `\n\nENTERPRISE SIGNALS DETECTED: ${enterpriseSignals.join(', ')}`;
      }

      return {
        url: link.url,
        type: link.type,
        title: extractTitle(html),
        visible_text: enrichedText,
        extracted_at: new Date().toISOString(),
      };
    })
  );

  const pages = pageResults.filter(Boolean);

  // Step 3: Build homepage enterprise signals
  const homeEnterpriseSignals = detectEnterpriseSignals(homeText);
  let enrichedHomeText = homeText.slice(0, 15000);
  if (homeEnterpriseSignals.length > 0) {
    enrichedHomeText += `\n\nENTERPRISE SIGNALS DETECTED: ${homeEnterpriseSignals.join(', ')}`;
  }

  onProgress?.({ stage: 'Extraction complete', pagesFound: rankedLinks.length, pagesDone: rankedLinks.length, currentUrl: url });

  // Step 4: Build ExtractedPayload
  const payload = {
    homepage: {
      url,
      domain,
      meta: {
        title: homeTitle,
        description: homeMeta,
        og_image: extractMeta(homeHtml, 'og:image') || null,
        canonical: homeHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || null,
        schema_org: [],
      },
      headings: homeHeadings,
      navigation: {
        main_nav: allLinks.slice(0, 20).map(l => ({ text: l.text, href: l.url })),
        footer_links: [],
      },
      social_links: socialLinks,
      tech_hints: techHints,
      visible_text: enrichedHomeText,
      buttons: [],
      forms: [],
      has_pricing_table: /pricing|plans|price|\$\d+/i.test(homeText),
      has_logo_wall: /trusted by|customers|logos/i.test(homeText),
      logo_wall_count: (homeHtml.match(/<img\b/gi) || []).length,
    },
    pages,
    social_signals: {},
    ocr_results: [],
  };

  return payload;
}
