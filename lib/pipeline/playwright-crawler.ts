// ============================================================
// Playwright Deep Browser Crawler
// Replaces serverSideFetch() with real browser intelligence:
//   - Multi-tab parallel exploration
//   - Auto-scroll for lazy-loaded content
//   - Full DOM extraction (headings, buttons, pricing, integrations)
//   - Enterprise signal detection (SOC2, SSO, Salesforce, etc.)
//   - Screenshot capture for visual intelligence
//   - Structured signal extraction (deterministic, not AI)
// ============================================================

import type { ExtractedPayload, HomepageExtraction, CrawledPage } from './types';
import { PlaywrightCrawler, log, purgeDefaultStorages, Configuration } from '@crawlee/playwright';

// Page priority scoring — deterministic, no AI
const PAGE_PRIORITIES: { pattern: RegExp; type: string; score: number }[] = [
  { pattern: /\/pricing|\/plans|\/price/i,                    type: 'pricing',      score: 100 },
  { pattern: /\/careers|\/jobs|\/hiring|\/join/i,             type: 'careers',      score: 95  },
  { pattern: /\/enterprise|\/enterprise-plan/i,               type: 'enterprise',   score: 90  },
  { pattern: /\/security|\/trust|\/compliance|\/soc2/i,       type: 'security',     score: 88  },
  { pattern: /\/integrations|\/marketplace|\/apps/i,          type: 'integrations', score: 85  },
  { pattern: /\/docs|\/documentation|\/developers/i,          type: 'docs',         score: 80  },
  { pattern: /\/customers|\/case-stud|\/stories/i,            type: 'customers',    score: 75  },
  { pattern: /\/changelog|\/releases|\/whats-new/i,           type: 'changelog',    score: 70  },
  { pattern: /\/about|\/company|\/team/i,                     type: 'about',        score: 65  },
  { pattern: /\/blog|\/resources|\/news/i,                    type: 'blog',         score: 50  },
  { pattern: /\/api|\/sdk|\/developer/i,                      type: 'api_docs',     score: 78  },
  { pattern: /\/contact|\/demo|\/sales/i,                     type: 'contact',      score: 60  },
];

// Enterprise signals to detect deterministically in DOM
const ENTERPRISE_SIGNALS = {
  compliance: ['SOC 2', 'SOC2', 'HIPAA', 'GDPR', 'ISO 27001', 'ISO27001', 'FedRAMP', 'PCI DSS'],
  auth:       ['SSO', 'SAML', 'SCIM', 'LDAP', 'Active Directory', 'Okta', 'Auth0'],
  security:   ['Audit Log', 'Audit Trail', 'RBAC', 'Role-Based Access', 'Permissions', 'Data Residency'],
  crm:        ['Salesforce', 'HubSpot', 'Pipedrive', 'Dynamics 365', 'Zoho CRM'],
  data:       ['Snowflake', 'BigQuery', 'Redshift', 'Databricks', 'dbt'],
  devtools:   ['GitHub', 'GitLab', 'Jira', 'Linear', 'Slack', 'Zapier', 'Make', 'n8n'],
};

export interface PlaywrightPageResult {
  url: string;
  type: string;
  title: string;
  visible_text: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  buttons: string[];
  pricing_blocks: string[];
  integration_names: string[];
  enterprise_signals: Record<string, string[]>;
  visual_workflow_signals: string[];
  has_pricing_table: boolean;
  has_logo_wall: boolean;
  screenshot_base64?: string;
  ocr_text?: string;
}

export interface PlaywrightCrawlResult {
  homepage: PlaywrightPageResult;
  pages: PlaywrightPageResult[];
  discovered_urls: string[];
  social_links: { linkedin: string | null; twitter: string | null; github: string | null; youtube: string | null };
  tech_hints: { frameworks: string[]; analytics: string[]; cms: string | null; payment: string[] };
  all_enterprise_signals: Record<string, string[]>;
}

// ─── Dynamic interactions ─────────────────────────────────────
// Click pricing toggles, expand accordions, open menus to reveal hidden content

export async function performDynamicInteractions(page: import('playwright').Page, type: string): Promise<void> {
  try {
    // Click pricing period toggles (monthly/annual)
    if (type === 'pricing') {
      const toggleSelectors = [
        '[class*="toggle"]', '[class*="switch"]', '[class*="period"]',
        'button:has-text("Annual")', 'button:has-text("Yearly")', 'button:has-text("Monthly")',
        '[role="switch"]', '[aria-label*="annual"]', '[aria-label*="yearly"]',
      ];
      for (const sel of toggleSelectors) {
        try {
          const el = await page.$(sel);
          if (el) {
            await el.click({ timeout: 2000 });
            await page.waitForTimeout(800);
            break;
          }
        } catch { /* skip */ }
      }
    }

    // Expand accordions and "show more" sections
    const expandSelectors = [
      '[class*="accordion"] button', '[class*="expand"]', '[class*="collapse"]',
      'button:has-text("Show more")', 'button:has-text("See all")', 'button:has-text("View all")',
      'details summary', '[aria-expanded="false"]',
    ];
    for (const sel of expandSelectors) {
      try {
        const els = await page.$$(sel);
        for (const el of els.slice(0, 3)) {
          await el.click({ timeout: 1500 }).catch(() => {});
          await page.waitForTimeout(300);
        }
      } catch { /* skip */ }
    }

    // Open navigation dropdowns to discover hidden pages
    if (type === 'homepage') {
      const navDropdowns = await page.$$('nav [aria-haspopup], nav button, header button');
      for (const el of navDropdowns.slice(0, 5)) {
        try {
          await el.hover({ timeout: 1000 });
          await page.waitForTimeout(400);
        } catch { /* skip */ }
      }
    }
  } catch { /* non-fatal */ }
}

export async function autoScroll(page: import('playwright').Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
  // Wait for lazy content to load after scroll
  await page.waitForTimeout(1500);
}

// ─── DOM extraction helpers ───────────────────────────────────

export async function extractPageData(
  page: import('playwright').Page,
  url: string,
  type: string,
  captureScreenshot = false
): Promise<PlaywrightPageResult> {
  const title = await page.title().catch(() => '');

  // Extract headings
  const headings = await page.evaluate(() => ({
    h1: Array.from(document.querySelectorAll('h1')).map(e => e.innerText.trim()).filter(Boolean).slice(0, 10),
    h2: Array.from(document.querySelectorAll('h2')).map(e => e.innerText.trim()).filter(Boolean).slice(0, 15),
    h3: Array.from(document.querySelectorAll('h3')).map(e => e.innerText.trim()).filter(Boolean).slice(0, 15),
  })).catch(() => ({ h1: [], h2: [], h3: [] }));

  // Extract all visible text
  const visible_text = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(s => s.remove());
    return (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 15000);
  }).catch(() => '');

  // Extract buttons and CTAs
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], [role="button"]'))
      .map(e => (e as HTMLElement).innerText?.trim())
      .filter(t => t && t.length < 60)
      .slice(0, 20)
  ).catch(() => []);

  // Extract pricing blocks
  const pricing_blocks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="pricing"], [class*="plan"], [class*="tier"], [id*="pricing"]'))
      .map(e => (e as HTMLElement).innerText?.trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 5)
  ).catch(() => []);

  // Detect integration names from logos/text
  const integration_names = await page.evaluate((signals) => {
    const text = document.body?.innerText?.toLowerCase() || '';
    const found: string[] = [];
    for (const name of signals) {
      if (text.includes(name.toLowerCase())) found.push(name);
    }
    return found;
  }, [...ENTERPRISE_SIGNALS.crm, ...ENTERPRISE_SIGNALS.devtools, ...ENTERPRISE_SIGNALS.data]).catch(() => []);

  // Detect enterprise signals
  const enterprise_signals: Record<string, string[]> = {};
  const pageText = visible_text.toLowerCase();
  for (const [category, terms] of Object.entries(ENTERPRISE_SIGNALS)) {
    const found = terms.filter(t => pageText.includes(t.toLowerCase()));
    if (found.length > 0) enterprise_signals[category] = found;
  }

  const has_pricing_table = pricing_blocks.length > 0 ||
    /pricing|plans|per month|per year|\$\d+/i.test(visible_text);
  const has_logo_wall = await page.evaluate(() =>
    document.querySelectorAll('[class*="logo"], [class*="customer"], [class*="partner"]').length > 3
  ).catch(() => false);

  // Visual workflow detection — detect UI patterns that indicate product maturity
  const visual_workflow_signals = await page.evaluate(() => {
    const signals: string[] = [];
    const html = document.documentElement.innerHTML.toLowerCase();
    const text = document.body?.innerText?.toLowerCase() || '';

    // Onboarding wizard
    if (/onboard|get.started|setup.wizard|step \d of \d|welcome.to/i.test(text)) signals.push('onboarding_wizard');
    // Workflow builder
    if (/workflow.builder|automation.builder|drag.and.drop|canvas|node.editor/i.test(text)) signals.push('workflow_builder');
    // Analytics dashboard
    if (/analytics|dashboard|metrics|chart|graph|report/i.test(text) &&
        document.querySelectorAll('[class*="chart"], [class*="graph"], [class*="metric"], canvas').length > 0) {
      signals.push('analytics_dashboard');
    }
    // Admin settings
    if (/admin|settings|configuration|permissions|roles/i.test(text) &&
        document.querySelectorAll('[class*="admin"], [class*="setting"], [class*="config"]').length > 2) {
      signals.push('admin_settings');
    }
    // Integrations marketplace
    if (document.querySelectorAll('[class*="integration"], [class*="connector"], [class*="app"]').length > 5) {
      signals.push('integrations_marketplace');
    }
    // Usage metering
    if (/usage|quota|limit|seat|credit|billing/i.test(text)) signals.push('usage_metering');
    // AI copilot
    if (/ai.copilot|ai.assistant|ai.powered|llm|gpt|claude|gemini/i.test(text)) signals.push('ai_copilot');

    return signals;
  }).catch(() => [] as string[]);

  // Screenshot + OCR (only for high-value pages)
  let screenshot_base64: string | undefined;
  let ocr_text: string | undefined;
  if (captureScreenshot) {
    try {
      const buf = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 70 });
      screenshot_base64 = buf.toString('base64');

      // Run OCR on the screenshot to extract text from images/rendered content
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const { data } = await worker.recognize(buf);
        await worker.terminate();
        // Only keep OCR text that adds value beyond what DOM already has
        if (data.text && data.confidence > 40) {
          ocr_text = data.text.replace(/\s+/g, ' ').trim().slice(0, 3000);
          console.log(`[Playwright] OCR on ${type} page: ${ocr_text.length} chars, confidence ${Math.round(data.confidence)}%`);
        }
      } catch (ocrErr) {
        console.log(`[Playwright] OCR failed for ${type}: ${(ocrErr as Error).message}`);
      }
    } catch { /* non-fatal */ }
  }

  return {
    url, type, title, visible_text, headings, buttons,
    pricing_blocks, integration_names, enterprise_signals,
    visual_workflow_signals,
    has_pricing_table, has_logo_wall, screenshot_base64,
    ocr_text,
  };
}

// ─── Link discovery and ranking ──────────────────────────────

export async function discoverAndRankLinks(
  page: import('playwright').Page,
  baseUrl: string,
  domain: string
): Promise<{ url: string; type: string; score: number }[]> {
  const links = await page.evaluate((base) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => {
        try {
          const href = a.getAttribute('href');
          if (!href) return null;
          const url = new URL(href, base);
          return { url: url.href, text: a.textContent?.trim() || '' };
        } catch { return null; }
      })
      .filter((u): u is { url: string; text: string } => u !== null && u.url.startsWith('http'));
  }, baseUrl).catch(() => []);

  const seen = new Set<string>();
  const ranked: { url: string; type: string; score: number }[] = [];
  const seenUrls = new Set<string>();

  // 1. Match priority pages
  for (const item of links) {
    try {
      const parsed = new URL(item.url);
      const host = parsed.hostname.replace('www.', '');
      if (host !== domain && !host.endsWith('.' + domain)) continue;
      const clean = item.url.split('#')[0].replace(/\/$/, '');
      if (seen.has(clean)) continue;
      // Skip binary downloads
      if (/\.(zip|exe|dmg|pdf|png|jpg|jpeg|gif|svg|mp4|webm|csv|xlsx|doc|docx|tar|gz)$/i.test(clean)) continue;
      seen.add(clean);

      for (const { pattern, type, score } of PAGE_PRIORITIES) {
        if (pattern.test(item.url + ' ' + item.text)) {
          ranked.push({ url: item.url, type, score });
          seenUrls.add(item.url);
          break;
        }
      }
    } catch { /* skip */ }
  }

  ranked.sort((a, b) => b.score - a.score);

  // 2. Fallback to generic links if less than 6 pages found
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

// ─── Tech detection from page source ─────────────────────────

export async function detectTech(page: import('playwright').Page): Promise<{
  frameworks: string[]; analytics: string[]; cms: string | null; payment: string[];
}> {
  return page.evaluate(() => {
    const html = document.documentElement.innerHTML;
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
    if (/braintree/.test(html)) payment.push('Braintree');

    return { frameworks: [...new Set(frameworks)], analytics: [...new Set(analytics)], cms, payment: [...new Set(payment)] };
  }).catch(() => ({ frameworks: [], analytics: [], cms: null, payment: [] }));
}

// ─── Social link extraction ───────────────────────────────────

export async function extractSocialLinks(page: import('playwright').Page): Promise<{
  linkedin: string | null; twitter: string | null; github: string | null; youtube: string | null;
}> {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);
    const find = (pattern: RegExp) => links.find(l => pattern.test(l)) || null;
    return {
      linkedin: find(/linkedin\.com\/(company|in)\//i),
      twitter: find(/(?:twitter\.com|x\.com)\//i),
      github: find(/github\.com\//i),
      youtube: find(/youtube\.com\//i),
    };
  }).catch(() => ({ linkedin: null, twitter: null, github: null, youtube: null }));
}

// ─── Main crawler ─────────────────────────────────────────────

export async function playwrightCrawl(domain: string, manualLinks?: string[]): Promise<PlaywrightCrawlResult | null> {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) log.setLevel(log.LEVELS.DEBUG);
  else log.setLevel(log.LEVELS.WARNING);

  let homepageData: PlaywrightPageResult | null = null;
  const pageResults: PlaywrightPageResult[] = [];
  let socialLinks = { linkedin: null, twitter: null, github: null, youtube: null } as PlaywrightCrawlResult['social_links'];
  let techHints = { frameworks: [] as string[], analytics: [] as string[], cms: null as string | null, payment: [] as string[] };
  let discoveredUrls: string[] = [];

  const baseUrl = `https://${domain}`;
  const wwwUrl = `https://www.${domain}`;

  // Purge previous crawl storage so URLs aren't deduplicated across runs
  await purgeDefaultStorages();

  // Mutable ref so the requestHandler always uses the active crawler instance
  let activeCrawler: PlaywrightCrawler | null = null;

  const createCrawler = () => {
    const c = new PlaywrightCrawler({
      maxRequestsPerCrawl: 9, // homepage + 8 subpages
      maxConcurrency: 3,      // prevent overloading the target server
      requestHandlerTimeoutSecs: 90,
      navigationTimeoutSecs: 30,  // don't hang forever on unresponsive pages
      headless: true,
      browserPoolOptions: {
        useFingerprints: true, // Stealth/anti-bot
      },
      preNavigationHooks: [
        async ({ page }) => {
          // Set a realistic user-agent to avoid bot detection
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
          });
        }
      ],
      async requestHandler({ request, page }) {
        const isHomepage = request.userData.label === 'homepage';
        const type = request.userData.type || 'page';

        console.log(`[Crawlee] Processing ${request.url} (${type})`);

        await autoScroll(page);
        await performDynamicInteractions(page, type);

        const captureShot = true;
        const data = await extractPageData(page, request.loadedUrl || request.url, type, captureShot);

        if (isHomepage) {
          homepageData = data;
          socialLinks = await extractSocialLinks(page);
          techHints = await detectTech(page);

          const rankedLinks = await discoverAndRankLinks(page, request.loadedUrl || request.url, domain);
          discoveredUrls = rankedLinks.map(l => l.url);
          
          const topLinks = rankedLinks.slice(0, 8);
          console.log(`[Crawlee] Found ${topLinks.length} priority subpages to explore.`);
          
          // Add priority pages to queue via the active crawler ref
          const requests = topLinks.map(l => ({
            url: l.url,
            userData: { label: 'subpage', type: l.type }
          }));
          if (requests.length > 0 && activeCrawler) {
            await activeCrawler.addRequests(requests);
          }
        } else {
          pageResults.push(data);
        }
      },
      failedRequestHandler({ request, error }) {
        console.log(`[Crawlee] Request ${request.url} failed completely: ${(error as Error)?.message || 'unknown'}`);
      },
    }, new Configuration({ persistStorage: false, purgeOnStart: true }));
    activeCrawler = c;
    return c;
  };

  try {
    console.log(`[Crawlee] Starting crawl for ${domain}`);
    const crawler = createCrawler();
    
    // Inject manual links with highest priority
    const initialRequests = [
      { url: baseUrl, userData: { label: 'homepage', type: 'homepage' } }
    ];
    
    if (manualLinks && manualLinks.length > 0) {
      console.log(`[Crawlee] Injecting ${manualLinks.length} manual links...`);
      for (const link of manualLinks) {
        initialRequests.push({ url: link, userData: { label: 'subpage', type: 'manual_override' } });
      }
    }

    await crawler.run(initialRequests);

    // If homepage failed, retry with www. prefix (many sites redirect there)
    if (!homepageData) {
      console.log(`[Crawlee] Homepage failed for ${domain}, retrying with www. prefix...`);
      const retryCrawler = createCrawler();
      await retryCrawler.run([
        { url: wwwUrl, userData: { label: 'homepage', type: 'homepage' } }
      ]);
    }

    if (!homepageData) {
      console.error(`[Crawlee] Failed to capture homepage data for ${domain}`);
      return null;
    }

    // ── Merge enterprise signals across all pages ─────
    const allEnterpriseSignals: Record<string, string[]> = {};
    const allPages = [homepageData, ...pageResults];

    for (const p of allPages) {
      for (const [cat, terms] of Object.entries(p.enterprise_signals)) {
        if (!allEnterpriseSignals[cat]) allEnterpriseSignals[cat] = [];
        allEnterpriseSignals[cat] = [...new Set([...allEnterpriseSignals[cat], ...terms])];
      }
    }

    console.log(`[Crawlee] Crawl complete for ${domain}: ${allPages.length} pages, enterprise signals: ${Object.keys(allEnterpriseSignals).join(', ') || 'none'}`);

    return {
      homepage: homepageData,
      pages: pageResults,
      discovered_urls: discoveredUrls,
      social_links: socialLinks,
      tech_hints: techHints,
      all_enterprise_signals: allEnterpriseSignals,
    };
  } catch (err) {
    console.error(`[Crawlee] Crawl crashed for ${domain}:`, (err as Error).message);
    return null;
  }
}

// ─── Convert Playwright result → ExtractedPayload ────────────

export function playwrightResultToPayload(
  domain: string,
  result: PlaywrightCrawlResult
): Partial<ExtractedPayload> {
  const hp = result.homepage;

  // Merge all integration names across pages
  const allIntegrations = [...new Set(
    [hp, ...result.pages].flatMap(p => p.integration_names)
  )];

  // Build enriched visible text including enterprise signals
  let enrichedText = hp.visible_text;
  if (Object.keys(result.all_enterprise_signals).length > 0) {
    enrichedText += '\n\nDETECTED ENTERPRISE SIGNALS:\n';
    for (const [cat, terms] of Object.entries(result.all_enterprise_signals)) {
      enrichedText += `${cat.toUpperCase()}: ${terms.join(', ')}\n`;
    }
  }
  if (allIntegrations.length > 0) {
    enrichedText += `\nDETECTED INTEGRATIONS: ${allIntegrations.join(', ')}\n`;
  }

  const homepage: HomepageExtraction = {
    url: `https://${domain}`,
    domain,
    meta: {
      title: hp.title,
      description: hp.headings.h1[0] || hp.title,
      og_image: null,
      canonical: null,
      schema_org: [],
    },
    headings: hp.headings,
    navigation: { main_nav: [], footer_links: [] },
    social_links: result.social_links,
    tech_hints: result.tech_hints,
    visible_text: enrichedText.slice(0, 50000),
    buttons: hp.buttons.map(t => ({
      text: t,
      type: /sign up|start|register|try|demo|free|get started|contact sales/i.test(t) ? 'cta' as const : 'other' as const,
    })),
    forms: [],
    has_pricing_table: hp.has_pricing_table || result.pages.some(p => p.has_pricing_table),
    has_logo_wall: hp.has_logo_wall || result.pages.some(p => p.has_logo_wall),
    logo_wall_count: 0,
  };

  const pages: CrawledPage[] = result.pages.map(p => ({
    url: p.url,
    type: p.type,
    title: p.title,
    visible_text: [
      p.visible_text,
      p.pricing_blocks.length > 0 ? `\nPRICING BLOCKS:\n${p.pricing_blocks.join('\n')}` : '',
      Object.keys(p.enterprise_signals).length > 0
        ? `\nENTERPRISE SIGNALS: ${Object.values(p.enterprise_signals).flat().join(', ')}`
        : '',
      p.integration_names.length > 0
        ? `\nINTEGRATIONS DETECTED: ${p.integration_names.join(', ')}`
        : '',
    ].join('').slice(0, 12000),
    ocr_text: p.ocr_text,  // OCR from screenshot — text in images, pricing tables
    extracted_at: new Date().toISOString(),
    screenshot_base64: p.screenshot_base64,
    pricing_blocks: p.pricing_blocks,
    integration_names: p.integration_names,
    enterprise_signals: p.enterprise_signals,
    visual_signals: [
      p.pricing_blocks.length > 0 ? 'pricing table detected' : '',
      p.enterprise_signals.auth?.length ? `enterprise auth UI: ${p.enterprise_signals.auth.join(', ')}` : '',
      p.enterprise_signals.security?.length ? `security controls UI: ${p.enterprise_signals.security.join(', ')}` : '',
      p.enterprise_signals.compliance?.length ? `compliance badges: ${p.enterprise_signals.compliance.join(', ')}` : '',
      p.has_logo_wall ? 'customer logo wall detected' : '',
      p.ocr_text ? `OCR extracted ${p.ocr_text.length} chars of image text` : '',
      ...(p.visual_workflow_signals || []),
    ].filter(Boolean),
  }));

  return {
    homepage,
    pages,
    social_signals: {},
    ocr_results: [],
  };
}
