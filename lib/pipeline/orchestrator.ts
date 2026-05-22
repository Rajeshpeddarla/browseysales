// ============================================================
// Pipeline Orchestrator — Main Research Pipeline Entry Point
// Coordinates cache → extraction → LLM → personalization
// ============================================================

import { getOrRefresh, storeGlobalIntel, updatePartialIntel, getFreshnessInfo, getTimeline, recordSignalChange } from './cache-manager';
import { generateBaseIntel, generatePartialRefresh } from './llm-client';
import { mergeAndValidatePayload, summarizePayload } from './signal-merger';
import { getOrGeneratePersonalization } from './personalizer';
import { savePipelineBriefToDatabase } from './db-helpers';
import { improveIntelWithSignals } from './signal-engine';
import type { ExtractedPayload, ResearchResponse, BaseIntel } from './types';

/**
 * Main research pipeline — the core function that handles everything
 */
export async function runResearchPipeline(
  domain: string,
  userId: string,
  extractedPayload?: Partial<ExtractedPayload>,
  forceRefresh: boolean = false
): Promise<ResearchResponse> {
  const startTime = Date.now();

  // 1. Check cache
  const cacheResult = await getOrRefresh(domain, null, forceRefresh);

  let baseIntel: BaseIntel;
  let isDegraded = false;
  let wasCached = false;

  if (cacheResult.needsFullPipeline) {
    // 2. Full pipeline — process extracted payload through LLM
    if (!extractedPayload?.homepage) {
      // Server-side fallback: try to fetch the homepage
      const fallbackPayload = await serverSideFetch(domain);
      extractedPayload = fallbackPayload;
    }

    const payload = mergeAndValidatePayload(extractedPayload || {});
    console.log(`[Pipeline] Full pipeline for ${domain}: ${summarizePayload(payload)}`);

    // 3. Generate base intel via LLM
    const result = await generateBaseIntel(payload);
    baseIntel = improveIntelWithSignals(result.intel, payload);
    isDegraded = result.degraded;

    // 4. Store to global cache
    await storeGlobalIntel(domain, baseIntel, payload, isDegraded);

    // 5. Record timeline entry
    await recordSignalChange(domain, 'full_research', null, { summary: baseIntel.summary_1_line }, 'client_extraction');

  } else if (cacheResult.needsPartialRefresh && cacheResult.intel) {
    // Partial refresh — only update stale fields
    console.log(`[Pipeline] Partial refresh for ${domain}: stale fields = ${cacheResult.staleFields.join(', ')}`);

    const payload = extractedPayload ? mergeAndValidatePayload(extractedPayload) : null;
    const { updates, degraded } = await generatePartialRefresh(domain, cacheResult.staleFields, payload);

    if (Object.keys(updates).length > 0) {
      // Detect changes for timeline
      const oldIntel = cacheResult.intel.base_intel;
      for (const field of cacheResult.staleFields) {
        const oldVal = (oldIntel as unknown as Record<string, unknown>)[field];
        const newVal = (updates as Record<string, unknown>)[field];
        if (newVal && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          await recordSignalChange(domain, field, oldVal, newVal, 'partial_refresh');
        }
      }
      await updatePartialIntel(domain, updates, cacheResult.staleFields);
    }

    baseIntel = { ...cacheResult.intel.base_intel, ...updates } as BaseIntel;
    isDegraded = degraded;
    wasCached = true;

  } else if (cacheResult.intel) {
    // Fully fresh cache hit
    baseIntel = cacheResult.intel.base_intel as BaseIntel;
    wasCached = true;
    console.log(`[Pipeline] Cache hit for ${domain} (fully fresh)`);
  } else {
    throw new Error(`No cache and no payload for ${domain}`);
  }

  // 6. Personalization layer
  const intelSummary = cacheResult.intel?.base_intel_summary || baseIntel.summary_1_line || null;
  let personalized = null;
  try {
    personalized = await getOrGeneratePersonalization(userId, domain, baseIntel, intelSummary, 'llm');
  } catch (err) {
    console.error(`[Pipeline] Personalization failed for ${domain}:`, err);
  }

  // Save brief to the dashboard database under user's profile
  let savedBrief = null;
  try {
    savedBrief = await savePipelineBriefToDatabase(domain, userId, baseIntel, personalized, extractedPayload);
  } catch (dbErr) {
    console.error(`[Pipeline] Database sync failed for ${domain}:`, dbErr);
  }

  // 7. Get recent timeline
  const timeline = await getTimeline(domain, 10);

  // 8. Build freshness map
  const freshness = cacheResult.intel ? getFreshnessInfo(cacheResult.intel) : {};

  const elapsed = Date.now() - startTime;
  console.log(`[Pipeline] Completed ${domain} in ${elapsed}ms (cached: ${wasCached}, degraded: ${isDegraded})`);

  return {
    domain,
    cached: wasCached,
    freshness,
    base_intel: baseIntel,
    personalized,
    timeline_recent: timeline as ResearchResponse['timeline_recent'],
    generated_at: new Date().toISOString(),
    is_degraded: isDegraded,
    saved_brief: savedBrief,
  };
}

/**
 * Server-side fallback fetch when no client payload is available
 * Used for background refresh or when extension isn't available
 */
async function serverSideFetch(domain: string): Promise<Partial<ExtractedPayload>> {
  try {
    const homepageUrl = `https://${domain}`;
    const home = await fetchPage(homepageUrl, domain, 'homepage');
    const navLinks = extractLinks(home.html, homepageUrl, domain);
    const priorityLinks = rankPriorityLinks(navLinks).slice(0, 8);
    const pages = await Promise.all(
      priorityLinks.map((link) => fetchPage(link.url, domain, link.type).catch(() => null))
    );

    return {
      homepage: {
        url: homepageUrl,
        domain,
        meta: {
          title: home.title,
          description: home.description,
          og_image: extractMeta(home.html, 'og:image'),
          canonical: extractCanonical(home.html),
          schema_org: extractJsonLd(home.html),
        },
        headings: extractHeadings(home.html),
        navigation: {
          main_nav: navLinks.slice(0, 20).map((l) => ({ text: l.text, href: l.url })),
          footer_links: navLinks.slice(20, 45).map((l) => ({ text: l.text, href: l.url })),
        },
        social_links: extractSocialLinks(navLinks),
        tech_hints: detectServerTech(home.html),
        visible_text: home.text.slice(0, 50000),
        buttons: extractButtons(home.html),
        forms: extractForms(home.html),
        has_pricing_table: /pricing|plans|price|subscription/i.test(home.html),
        has_logo_wall: /customers|trusted by|logos|case stud/i.test(home.text),
        logo_wall_count: (home.html.match(/<img\b/gi) || []).length,
      },
      pages: pages
        .filter((page): page is NonNullable<typeof page> => Boolean(page))
        .map((page) => ({
          url: page.url,
          type: page.type,
          title: page.title,
          visible_text: page.text.slice(0, 12000),
          extracted_at: new Date().toISOString(),
        })),
      social_signals: {},
      ocr_results: [],
    };
  } catch {
    return { homepage: undefined, pages: [], social_signals: {}, ocr_results: [] };
  }
}

async function fetchPage(url: string, domain: string, type: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BrowseySalesBot/2.0' },
    signal: AbortSignal.timeout(9000),
    cache: 'no-store',
  });
  const html = await res.text();
  return {
    url,
    type,
    html,
    title: cleanHtml(extractTitle(html)),
    description: cleanHtml(extractMeta(html, 'description') || extractMeta(html, 'og:description') || ''),
    text: htmlToText(html),
  };
}

function htmlToText(html: string): string {
  return cleanHtml(
    html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function cleanHtml(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
}

function extractMeta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanHtml(match[1]);
  }
  return null;
}

function extractCanonical(html: string): string | null {
  return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || null;
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];
  const matches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      schemas.push(...items.filter((item) => item && typeof item === 'object'));
    } catch {}
  }
  return schemas.slice(0, 5);
}

function extractHeadings(html: string) {
  const get = (tag: string) =>
    Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')))
      .map((m) => htmlToText(m[1]))
      .filter(Boolean)
      .slice(0, 15);
  return { h1: get('h1'), h2: get('h2'), h3: get('h3') };
}

function extractButtons(html: string) {
  const texts = Array.from(html.matchAll(/<(button|a)[^>]*>([\s\S]*?)<\/\1>/gi))
    .map((m) => htmlToText(m[2]))
    .filter((text) => text && text.length < 50)
    .slice(0, 15);
  return texts.map((text) => ({
    text,
    type: /sign up|start|register|try|demo|free|get started|contact sales/i.test(text) ? 'cta' as const : 'other' as const,
  }));
}

function extractForms(html: string) {
  const forms = Array.from(html.matchAll(/<form[\s\S]*?<\/form>/gi)).slice(0, 5);
  return forms.map((form) => {
    const inputs = Array.from(form[0].matchAll(/<input[^>]+type=["']?([^"'\s>]+)/gi)).map((m) => m[1]);
    return {
      fields: inputs,
      purpose: inputs.includes('password') ? 'auth' : inputs.includes('email') ? 'lead_capture' : 'general',
    };
  });
}

function extractLinks(html: string, baseUrl: string, domain: string) {
  const links = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi))
    .map((match) => {
      try {
        const url = new URL(match[1], baseUrl);
        return { url: url.href, host: url.hostname.replace('www.', ''), text: htmlToText(match[2]) };
      } catch {
        return null;
      }
    })
    .filter((link): link is { url: string; host: string; text: string } => Boolean(link))
    .filter((link) => link.url.startsWith('http'));

  const seen = new Set<string>();
  return links.filter((link) => {
    const key = link.url.split('#')[0].replace(/\/$/, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return link.host === domain || isSocialHost(link.host);
  });
}

function rankPriorityLinks(links: { url: string; host: string; text: string }[]) {
  const priorities = [
    ['pricing', /pricing|plans|price/i],
    ['careers', /careers|jobs|hiring|join-us/i],
    ['integrations', /integrations|apps|marketplace/i],
    ['customers', /customers|case-studies|case studies|stories/i],
    ['docs', /docs|documentation|help|support|knowledge/i],
    ['security', /security|trust|compliance|soc2|gdpr|privacy/i],
    ['changelog', /changelog|release|updates|whats-new|what's new/i],
    ['blog', /blog|resources|news/i],
    ['api_docs', /api|developers|sdk/i],
    ['comparison', /compare|alternatives|vs-|versus|migration/i],
    ['about', /about|company|team|leadership/i],
    ['contact', /contact|demo|sales/i],
  ] as const;

  return links
    .map((link) => {
      const haystack = `${link.url} ${link.text}`;
      const match = priorities.find(([, pattern]) => pattern.test(haystack));
      return match ? { ...link, type: match[0], score: priorities.length - priorities.indexOf(match) } : null;
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link))
    .sort((a, b) => b.score - a.score);
}

function extractSocialLinks(links: { url: string; host: string; text: string }[]) {
  const find = (pattern: RegExp) => links.find((link) => pattern.test(link.url))?.url || null;
  return {
    linkedin: find(/linkedin\.com\/(company|in)\//i),
    twitter: find(/(?:twitter\.com|x\.com)\//i),
    github: find(/github\.com\//i),
    youtube: find(/youtube\.com\//i),
  };
}

function isSocialHost(host: string): boolean {
  return /linkedin\.com|x\.com|twitter\.com|github\.com|youtube\.com|reddit\.com|producthunt\.com/i.test(host);
}

function detectServerTech(html: string) {
  const frameworks: string[] = [];
  const analytics: string[] = [];
  const payment: string[] = [];
  let cms: string | null = null;
  if (/_next\/|__NEXT_DATA__/i.test(html)) frameworks.push('Next.js');
  if (/react/i.test(html)) frameworks.push('React');
  if (/wp-content|wp-includes/i.test(html)) {
    frameworks.push('WordPress');
    cms = 'WordPress';
  }
  if (/webflow/i.test(html)) {
    frameworks.push('Webflow');
    cms = 'Webflow';
  }
  if (/google-analytics|gtag|googletagmanager/i.test(html)) analytics.push('Google Analytics');
  if (/segment\.com|cdn\.segment/i.test(html)) analytics.push('Segment');
  if (/hotjar/i.test(html)) analytics.push('Hotjar');
  if (/hubspot/i.test(html)) analytics.push('HubSpot');
  if (/stripe/i.test(html)) payment.push('Stripe');
  if (/paypal/i.test(html)) payment.push('PayPal');
  return {
    frameworks: [...new Set(frameworks)],
    analytics: [...new Set(analytics)],
    cms,
    payment: [...new Set(payment)],
  };
}
