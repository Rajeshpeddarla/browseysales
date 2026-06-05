// ============================================================
// DDG OSINT — Real-Time Company Discovery + External Sentiment
// Replaces Tavily with 100% Free DuckDuckGo HTML Scraper
// ============================================================

import type { ExternalSentiment } from './types';

export interface DDGResult {
  title: string;
  url: string;
  content: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Scrapes DuckDuckGo HTML results safely.
 */
export async function searchDDG(query: string, maxResults: number = 5): Promise<DDGResult[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    
    if (!res.ok) {
      console.error(`[DDG OSINT] HTTP Error ${res.status} for query: ${query}`);
      return [];
    }
    
    const html = await res.text();
    const results: DDGResult[] = [];
    
    const bodyRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
    let match;
    while ((match = bodyRegex.exec(html)) !== null && results.length < maxResults) {
      const bodyHtml = match[1];
      
      const titleMatch = bodyHtml.match(/<h2 class="result__title">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/);
      const snippetMatch = bodyHtml.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/);
      
      if (titleMatch && snippetMatch) {
        let url = titleMatch[1];
        // DDG routes links through //duckduckgo.com/l/?uddg=...
        if (url.includes('uddg=')) {
           const urlParam = url.split('uddg=')[1].split('&')[0];
           if (urlParam) {
             url = decodeURIComponent(urlParam);
           }
        }
        
        const title = titleMatch[2].replace(/<[^>]*>?/gm, '').trim();
        const content = snippetMatch[1].replace(/<[^>]*>?/gm, '').trim();
        
        if (title && content) {
          results.push({ title, url, content });
        }
      }
    }
    
    return results;
  } catch (e) {
    console.error('[DDG OSINT] Search failed for query:', query, e);
    return [];
  }
}

// ─── Sentiment inference from snippet ────────────────────────

function inferSentiment(text: string): ExternalSentiment['sentiment'] {
  const t = text.toLowerCase();
  const positive = (t.match(/\b(great|love|excellent|amazing|best|recommend|fast|easy|helpful|solid|reliable)\b/g) || []).length;
  const negative = (t.match(/\b(bad|slow|broken|terrible|awful|hate|worst|buggy|expensive|frustrating|poor)\b/g) || []).length;
  if (positive > 0 && negative > 0) return 'mixed';
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

// ─── Main export: structured signals + LLM prompt string ─────

export interface CompanySignalsResult {
  promptText: string;                    // inject into LLM prompt
  externalSentiment: ExternalSentiment[]; // structured for UI + correlation
}

export async function fetchCompanySignalsStructured(
  domain: string,
  companyName: string
): Promise<CompanySignalsResult> {
  const name = companyName || domain.split(".")[0];

  // Execute sequentially with a small delay to avoid DDG rate-limiting
  const tasks = [
    () => searchDDG(`${name} ${domain} news funding product launch 2024 2025`, 5),
    () => searchDDG(`${name} hiring jobs team growth engineering sales 2025`, 4),
    () => searchDDG(`${name} competitors customers case study review 2025`, 4),
    () => searchDDG(`${name} site:reddit.com`, 3),
    () => searchDDG(`${name} reviews site:g2.com OR site:glassdoor.com OR site:trustpilot.com`, 3),
    () => searchDDG(`${name} ${domain} founders CEO executives key people headquarters tech stack business model`, 4)
  ];

  const results = [];
  for (const task of tasks) {
    results.push(await task());
    await delay(300); // 300ms delay between requests
  }

  const [newsResults, hiringResults, marketResults, redditResults, reviewResults, firmographicResults] = results;

  // ── Build structured external sentiment ──────────────────────
  const externalSentiment: ExternalSentiment[] = [];
  const now = new Date().toISOString();

  for (const r of redditResults) {
    externalSentiment.push({
      source: 'reddit',
      sentiment: inferSentiment(r.content),
      summary: r.title,
      evidence: [r.content.slice(0, 200)],
      url: r.url,
      detected_at: now,
    });
  }

  for (const r of reviewResults) {
    const source = r.url.includes('g2.com') ? 'g2'
      : r.url.includes('glassdoor.com') ? 'glassdoor'
      : r.url.includes('trustpilot.com') ? 'trustpilot'
      : 'news';
    externalSentiment.push({
      source: source as ExternalSentiment['source'],
      sentiment: inferSentiment(r.content),
      summary: r.title,
      evidence: [r.content.slice(0, 200)],
      url: r.url,
      detected_at: now,
    });
  }

  // ── Build LLM prompt string ───────────────────────────────────
  const sections: string[] = [];

  if (newsResults.length > 0) {
    sections.push("LIVE WEB SIGNALS — RECENT NEWS & PRODUCT:");
    for (const r of newsResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 200)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  if (firmographicResults.length > 0) {
    sections.push("\nLIVE WEB SIGNALS — FIRMOGRAPHIC DATA (Founders, Business Model, Tech):");
    for (const r of firmographicResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 250)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  if (hiringResults.length > 0) {
    sections.push("\nLIVE WEB SIGNALS — HIRING & TEAM GROWTH:");
    for (const r of hiringResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 200)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  if (marketResults.length > 0) {
    sections.push("\nLIVE WEB SIGNALS — MARKET & CUSTOMERS:");
    for (const r of marketResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 200)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  if (redditResults.length > 0) {
    sections.push("\nEXTERNAL SENTIMENT — REDDIT:");
    for (const r of redditResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 150)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  if (reviewResults.length > 0) {
    sections.push("\nEXTERNAL SENTIMENT — REVIEWS (G2/Glassdoor/Trustpilot):");
    for (const r of reviewResults) {
      sections.push(`  • [${r.title}] — ${r.content.slice(0, 150)}`);
      sections.push(`    Source: ${r.url}`);
    }
  }

  const promptText = sections.length === 0 ? "" : [
    "\n--- OSINT REAL-TIME DISCOVERY (live web, not cached) ---",
    ...sections,
    "--- END OSINT ---",
  ].join("\n");

  return { promptText, externalSentiment };
}
