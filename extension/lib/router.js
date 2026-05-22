// ============================================================
// Smart Page Router — Extension Scorer
// Prioritizes pages to visit/scrape in a multi-page crawl
// ============================================================

const PRIORITY_PATTERNS = [
  { regex: /\/pricing|plans|cost|pricing-plan/i, score: 100, type: 'pricing' },
  { regex: /\/careers|jobs|hiring|work-at/i, score: 90, type: 'careers' },
  { regex: /\/about|company|team|our-story/i, score: 70, type: 'about' },
  { regex: /\/customers|case-studies|testimonials|clients/i, score: 80, type: 'customers' },
  { regex: /\/integrations|partners|ecosystem/i, score: 60, type: 'integrations' },
  { regex: /\/blog|news|press|releases/i, score: 50, type: 'blog' },
  { regex: /\/security|compliance|trust|privacy/i, score: 40, type: 'security' },
];

/**
 * Score a single link candidate
 */
export function scoreLink(href, text) {
  let bestScore = 0;
  let detectedType = 'other';

  const path = href.toLowerCase();
  const label = text.toLowerCase();

  for (const pattern of PRIORITY_PATTERNS) {
    if (pattern.regex.test(path) || pattern.regex.test(label)) {
      if (pattern.score > bestScore) {
        bestScore = pattern.score;
        detectedType = pattern.type;
      }
    }
  }

  return { score: bestScore, type: detectedType };
}

/**
 * Select the top N internal links to crawl
 */
export function routePages(allLinks, currentDomain, maxPages = 5) {
  const candidates = [];
  const seenUrls = new Set();

  for (const link of allLinks) {
    try {
      const urlObj = new URL(link.href);
      
      // Make sure it's an internal link
      const linkDomain = urlObj.hostname.replace('www.', '');
      if (linkDomain !== currentDomain) continue;

      // Clean fragment / query
      urlObj.hash = '';
      const cleanUrl = urlObj.href;

      if (seenUrls.has(cleanUrl)) continue;
      seenUrls.add(cleanUrl);

      const scoreInfo = scoreLink(urlObj.pathname, link.text);

      if (scoreInfo.score > 0) {
        candidates.push({
          url: cleanUrl,
          text: link.text,
          score: scoreInfo.score,
          type: scoreInfo.type,
        });
      }
    } catch {}
  }

  // Sort by highest score first, then return up to maxPages
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages);
}
