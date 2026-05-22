// ============================================================
// Signal Merger — Combine Multiple Extraction Sources
// ============================================================

import type {
  ExtractedPayload, HomepageExtraction, CrawledPage,
  SocialSignals, OCRResult,
} from './types';

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[\x00-\x1F\x7F]/g, '').trim();
}

function dedup<T>(arr: T[], keyFn?: (item: T) => string): T[] {
  if (keyFn) {
    const seen = new Set<string>();
    return arr.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return [...new Set(arr)];
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

function createEmptyHomepage(): HomepageExtraction {
  return {
    url: '', domain: '',
    meta: { title: '', description: '', og_image: null, canonical: null, schema_org: [] },
    headings: { h1: [], h2: [], h3: [] },
    navigation: { main_nav: [], footer_links: [] },
    social_links: { linkedin: null, twitter: null, github: null, youtube: null },
    tech_hints: { frameworks: [], analytics: [], cms: null, payment: [] },
    visible_text: '', buttons: [], forms: [],
    has_pricing_table: false, has_logo_wall: false, logo_wall_count: 0,
  };
}

function normalizeHomepage(raw: Partial<HomepageExtraction> | undefined): HomepageExtraction {
  if (!raw) return createEmptyHomepage();
  return {
    url: raw.url || '', domain: raw.domain || extractDomain(raw.url || ''),
    meta: {
      title: cleanText(raw.meta?.title || ''), description: cleanText(raw.meta?.description || ''),
      og_image: raw.meta?.og_image || null, canonical: raw.meta?.canonical || null,
      schema_org: raw.meta?.schema_org || [],
    },
    headings: {
      h1: dedup(raw.headings?.h1 || []).map(cleanText),
      h2: dedup(raw.headings?.h2 || []).map(cleanText),
      h3: dedup(raw.headings?.h3 || []).map(cleanText).slice(0, 10),
    },
    navigation: {
      main_nav: dedup(raw.navigation?.main_nav || [], (l) => l.href),
      footer_links: dedup(raw.navigation?.footer_links || [], (l) => l.href),
    },
    social_links: {
      linkedin: raw.social_links?.linkedin || null, twitter: raw.social_links?.twitter || null,
      github: raw.social_links?.github || null, youtube: raw.social_links?.youtube || null,
    },
    tech_hints: {
      frameworks: dedup(raw.tech_hints?.frameworks || []), analytics: dedup(raw.tech_hints?.analytics || []),
      cms: raw.tech_hints?.cms || null, payment: dedup(raw.tech_hints?.payment || []),
    },
    visible_text: cleanText(raw.visible_text || '').slice(0, 50000),
    buttons: raw.buttons || [], forms: raw.forms || [],
    has_pricing_table: raw.has_pricing_table || false,
    has_logo_wall: raw.has_logo_wall || false,
    logo_wall_count: raw.logo_wall_count || 0,
  };
}

function normalizePages(raw: Partial<CrawledPage>[]): CrawledPage[] {
  const seen = new Set<string>();
  return raw.filter(p => { const u = p.url || ''; if (seen.has(u)) return false; seen.add(u); return true; })
    .map(p => ({
      url: p.url || '', type: p.type || 'unknown', title: cleanText(p.title || ''),
      visible_text: cleanText(p.visible_text || '').slice(0, 20000),
      ocr_text: p.ocr_text ? cleanText(p.ocr_text).slice(0, 5000) : undefined,
      extracted_at: p.extracted_at || new Date().toISOString(),
    }));
}

function normalizeSocial(raw: Partial<SocialSignals>): SocialSignals {
  const s: SocialSignals = {};
  if (raw.reddit?.posts?.length) {
    s.reddit = { posts: raw.reddit.posts.slice(0, 5).map(p => ({
      title: cleanText(p.title || ''), score: p.score || 0, subreddit: p.subreddit || '', url: p.url || '',
    }))};
  }
  if (raw.github) {
    s.github = { org_name: raw.github.org_name || '', public_repos: raw.github.public_repos || 0,
      followers: raw.github.followers || 0,
      recent_repos: (raw.github.recent_repos || []).slice(0, 5).map(r => ({ name: r.name || '', stars: r.stars || 0, language: r.language || '' })),
    };
  }
  if (raw.producthunt?.products?.length) {
    s.producthunt = { products: raw.producthunt.products.slice(0, 3).map(p => ({ name: p.name || '', tagline: p.tagline || '', votes: p.votes || 0 })) };
  }
  return s;
}

export function mergeAndValidatePayload(raw: Partial<ExtractedPayload>): ExtractedPayload {
  return {
    homepage: normalizeHomepage(raw.homepage),
    pages: normalizePages(raw.pages || []),
    social_signals: normalizeSocial(raw.social_signals || {}),
    ocr_results: (raw.ocr_results || []).filter(r => r.text && r.text.length > 10).map(r => ({
      page_url: r.page_url || '', page_type: r.page_type || 'unknown',
      text: cleanText(r.text || '').slice(0, 5000), confidence: r.confidence || 0,
    })),
  };
}

export function summarizePayload(payload: ExtractedPayload): string {
  return `Domain: ${payload.homepage.domain} | Pages: ${payload.pages.length} | Social: ${Object.keys(payload.social_signals).length} | OCR: ${payload.ocr_results.length}`;
}
