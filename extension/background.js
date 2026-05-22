// ============================================================
// Background Service Worker — Pipeline Orchestrator
// Coordinates extraction, caching, and server communication
// ============================================================

const API_BASE = 'http://localhost:3000/api/pipeline';

// --- State ---
let currentResearch = null;

// --- Message Handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_RESEARCH') {
    const tabId = message.tabId || sender.tab?.id;
    handleResearch(message.domain, message.payload, tabId)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'CHECK_CACHE') {
    checkServerCache(message.domain)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_EXTRACTION') {
    // Trigger extraction in the content script
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'EXTRACT_PAGE' }, (response) => {
        sendResponse(response);
      });
    }
    return true;
  }

  if (message.type === 'TOGGLE_SIDEPANEL') {
    chrome.sidePanel.open({ tabId: sender.tab?.id });
    return false;
  }
});

// --- Action click opens sidepanel ---
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// --- Core Research Flow ---
async function handleResearch(domain, extractedPayload, tabId) {
  currentResearch = { domain, status: 'checking_cache', startedAt: Date.now() };
  broadcastStatus(tabId);

  // Step 1: Check server cache
  const cacheStatus = await checkServerCache(domain);

  if (cacheStatus.exists && cacheStatus.fully_fresh) {
    currentResearch.status = 'cache_hit';
    broadcastStatus(tabId);

    // Fetch full intel from server
    const result = await runServerResearch(domain, null, false);
    currentResearch.status = 'complete';
    currentResearch.result = result;
    broadcastStatus(tabId);
    return result;
  }

  // Step 2: Need extraction
  currentResearch.status = 'extracting';
  broadcastStatus(tabId);

  let rawExtracted = extractedPayload;
  if (!rawExtracted && tabId) {
    // Request extraction from content script
    rawExtracted = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PAGE' }, (response) => {
        resolve(response?.payload || null);
      });
    });
  }

  // Ensure payload perfectly matches ExtractedPayload structure
  let payload = null;
  if (rawExtracted) {
    payload = rawExtracted.homepage ? rawExtracted : {
      homepage: rawExtracted,
      pages: [],
      social_signals: {},
      ocr_results: []
    };
  }

  // Step 2.5: Scrape recent LinkedIn and X posts dynamically
  if (payload && payload.homepage && payload.homepage.social_links) {
    const hasLinkedIn = !!payload.homepage.social_links.linkedin;
    const hasTwitter = !!payload.homepage.social_links.twitter;

    if (hasLinkedIn || hasTwitter) {
      currentResearch.status = 'enriching_social';
      broadcastStatus(tabId);

      // Scrape LinkedIn
      if (hasLinkedIn) {
        try {
          console.log('[Background] Harvesting LinkedIn:', payload.homepage.social_links.linkedin);
          const liData = await scrapeSocialProfile(payload.homepage.social_links.linkedin, 'linkedin', tabId);
          if (liData) {
            payload.social_signals.linkedin_scraped_posts = liData.posts;
            payload.social_signals.linkedin_screenshot = liData.screenshot;
          }
        } catch (err) {
          console.warn('LinkedIn harvesting failed:', err);
        }
      }

      // Scrape X/Twitter
      if (hasTwitter) {
        try {
          console.log('[Background] Harvesting Twitter/X:', payload.homepage.social_links.twitter);
          const xData = await scrapeSocialProfile(payload.homepage.social_links.twitter, 'twitter', tabId);
          if (xData) {
            payload.social_signals.twitter_scraped_posts = xData.tweets;
            payload.social_signals.twitter_screenshot = xData.screenshot;
          }
        } catch (err) {
          console.warn('Twitter/X harvesting failed:', err);
        }
      }
    }
  }

  // Step 2.6: Crawl high-value internal pages in background tabs
  if (payload && payload.homepage) {
    currentResearch.status = 'crawling_pages';
    currentResearch.pageCount = 0;
    broadcastStatus(tabId);

    try {
      const crawledPages = await crawlPriorityInternalPages(payload.homepage, tabId, (count) => {
        currentResearch.pageCount = count;
        broadcastStatus(tabId);
      });

      payload.pages = mergeCrawledPages(payload.pages || [], crawledPages);
      currentResearch.pageCount = payload.pages.length;
      console.log(`[Background] Internal crawl collected ${crawledPages.length} pages`);
    } catch (err) {
      console.warn('[Background] Internal page crawl failed:', err);
    }
  }

  // Step 3: Send to server
  currentResearch.status = 'analyzing';
  broadcastStatus(tabId);

  const forceRefresh = !cacheStatus.exists;
  const result = await runServerResearch(domain, payload, forceRefresh);

  currentResearch.status = 'complete';
  currentResearch.result = result;
  broadcastStatus(tabId);

  // Cache locally
  await cacheLocally(domain, result);

  return result;
}

// --- Server Communication ---
async function checkServerCache(domain) {
  try {
    const res = await fetch(`${API_BASE}/cache/${encodeURIComponent(domain)}`, {
      credentials: 'include',
    });
    const data = await res.json();
    return data.ok ? data.data : { exists: false, fully_fresh: false, stale_fields: [] };
  } catch {
    return { exists: false, fully_fresh: false, stale_fields: [] };
  }
}

async function runServerResearch(domain, extractedPayload, forceRefresh) {
  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      domain,
      extracted_payload: extractedPayload,
      force_refresh: forceRefresh,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(data.error?.message || 'Research failed');
  return data.data;
}

// --- Local Cache (IndexedDB) ---
const DB_NAME = 'browsey-pipeline-cache';
const STORE_NAME = 'intel';
const LOCAL_TTL_MS = 1000 * 60 * 30; // 30 minutes

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'domain' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function cacheLocally(domain, data) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ domain, data, cached_at: Date.now() });
  } catch (e) {
    console.warn('Local cache write failed:', e);
  }
}

async function getLocalCache(domain) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(domain);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry) return resolve(null);
        if (Date.now() - entry.cached_at > LOCAL_TTL_MS) return resolve(null);
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// --- Status Broadcasting ---
function broadcastStatus(tabId) {
  const status = {
    type: 'RESEARCH_STATUS',
    ...currentResearch,
  };

  // Send to sidepanel
  chrome.runtime.sendMessage(status).catch(() => {});

  // Send to content script
  if (tabId) {
    chrome.tabs.sendMessage(tabId, status).catch(() => {});
  }
}

/**
 * Silent cookie-based profile scraping & screenshot capture
 * Opens a background tab, waits for render, extracts posts, then closes.
 * Does NOT switch focus to the scraper tab.
 */
async function scrapeSocialProfile(url, type, originalTabId) {
  return new Promise(async (resolve) => {
    let tabId = null;

    // Hard timeout: if scraping takes more than 12 seconds, give up
    const timeout = setTimeout(() => {
      console.warn(`[Background] Social scraping timed out for ${url}`);
      if (tabId) {
        chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      resolve(null);
    }, 12000);

    try {
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        clearTimeout(timeout);
        resolve(null);
        return;
      }

      // Create scraper tab in background — never make it active
      const tab = await chrome.tabs.create({ url, active: false });
      tabId = tab.id;

      // Wait for auth + DOM rendering (6 seconds)
      await new Promise(r => setTimeout(r, 6000));

      let posts = [];
      let tweets = [];

      // Extract raw post text without switching tabs
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: (siteType) => {
            if (siteType === 'linkedin') {
              const feedItems = Array.from(document.querySelectorAll(
                '.feed-shared-update-v2, [data-urn], article, .org-update'
              ));
              return feedItems.slice(0, 4).map(el => {
                const textEl = el.querySelector(
                  '.feed-shared-update-v2__commentary, .break-words, span.break-words'
                );
                return textEl ? textEl.innerText.trim() : el.innerText.trim();
              }).filter(t => t && t.length > 20);
            } else {
              const tweetItems = Array.from(document.querySelectorAll('[data-testid="tweet"]'));
              return tweetItems.slice(0, 4).map(el => {
                const textEl = el.querySelector('[data-testid="tweetText"]');
                return textEl ? textEl.innerText.trim() : el.innerText.trim();
              }).filter(t => t && t.length > 20);
            }
          },
          args: [type]
        });

        if (results && results[0]?.result) {
          if (type === 'linkedin') {
            posts = results[0].result;
          } else {
            tweets = results[0].result;
          }
        }
      } catch (scriptErr) {
        console.warn('[Background] Script injection failed:', scriptErr);
      }

      // Close scraper tab cleanly
      if (tabId) {
        await chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }

      clearTimeout(timeout);
      resolve({ posts, tweets, screenshot: null });
    } catch (err) {
      console.warn(`Social scraping worker failed for ${url}:`, err);
      clearTimeout(timeout);
      if (tabId) {
        chrome.tabs.remove(tabId).catch(() => {});
      }
      resolve(null);
    }
  });
}

// --- Internal Priority Page Crawl ---

const PRIORITY_PAGE_RULES = [
  { type: 'pricing', pattern: /pricing|plans|price|subscription/i, score: 120 },
  { type: 'careers', pattern: /careers|jobs|hiring|join-us|join us/i, score: 115 },
  { type: 'integrations', pattern: /integrations|apps|marketplace|connectors/i, score: 110 },
  { type: 'customers', pattern: /customers|case-studies|case studies|stories|testimonials/i, score: 105 },
  { type: 'security', pattern: /security|trust|compliance|soc2|gdpr|privacy/i, score: 100 },
  { type: 'docs', pattern: /docs|documentation|help|support|knowledge-base|knowledge base/i, score: 95 },
  { type: 'changelog', pattern: /changelog|release|updates|whats-new|what's new/i, score: 90 },
  { type: 'api_docs', pattern: /api|developers|developer|sdk/i, score: 85 },
  { type: 'comparison', pattern: /compare|alternatives|vs-|versus|migration/i, score: 80 },
  { type: 'blog', pattern: /blog|resources|news|insights/i, score: 75 },
  { type: 'about', pattern: /about|company|team|leadership/i, score: 70 },
  { type: 'contact', pattern: /contact|demo|sales|get-started|get started/i, score: 65 },
];

async function crawlPriorityInternalPages(homepage, originalTabId, onProgress) {
  const candidates = selectPriorityInternalLinks(homepage);
  const maxPages = 8;
  const pages = [];

  for (const candidate of candidates.slice(0, maxPages)) {
    try {
      const page = await crawlPageInBackgroundTab(candidate.url, candidate.type);
      if (page && page.visible_text && page.visible_text.length > 80) {
        pages.push(page);
        onProgress?.(pages.length);
      }
    } catch (err) {
      console.warn(`[Background] Failed crawling ${candidate.url}:`, err);
    }
  }

  return pages;
}

function selectPriorityInternalLinks(homepage) {
  const domain = homepage.domain;
  const rawLinks = [
    ...(homepage.navigation?.main_nav || []),
    ...(homepage.navigation?.footer_links || []),
  ];

  const seen = new Set();
  const candidates = [];

  for (const link of rawLinks) {
    const href = link.href || '';
    if (!href) continue;

    let url;
    try {
      url = new URL(href, homepage.url);
    } catch {
      continue;
    }

    const host = url.hostname.replace('www.', '');
    if (host !== domain) continue;
    if (!['http:', 'https:'].includes(url.protocol)) continue;

    const cleanUrl = url.href.split('#')[0].replace(/\/$/, '');
    if (seen.has(cleanUrl) || cleanUrl === homepage.url.replace(/\/$/, '')) continue;
    seen.add(cleanUrl);

    const haystack = `${cleanUrl} ${link.text || ''}`;
    const rule = PRIORITY_PAGE_RULES.find((r) => r.pattern.test(haystack));
    if (!rule) continue;

    candidates.push({
      url: cleanUrl,
      type: rule.type,
      score: rule.score + Math.max(0, 40 - cleanUrl.length / 6),
      text: link.text || '',
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

async function crawlPageInBackgroundTab(url, pageType) {
  return new Promise(async (resolve) => {
    let tabId = null;

    const timeout = setTimeout(() => {
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve(null);
    }, 16000);

    try {
      const tab = await chrome.tabs.create({ url, active: false });
      tabId = tab.id;

      await waitForTabComplete(tabId, 9000);
      await new Promise((r) => setTimeout(r, 1200));

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (type) => {
          for (let i = 0; i < 4; i++) {
            window.scrollBy(0, Math.floor(window.innerHeight * 0.85));
            await new Promise((resolve) => setTimeout(resolve, 450));
          }
          window.scrollTo(0, 0);
          await new Promise((resolve) => setTimeout(resolve, 250));

          const clean = (text) => String(text || '')
            .replace(/\s+/g, ' ')
            .replace(/[\x00-\x1F\x7F]/g, '')
            .trim();

          const getMeta = (name) => {
            const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
            return el ? el.getAttribute('content') || '' : '';
          };

          const clone = document.documentElement.cloneNode(true);
          clone.querySelectorAll('script, style, noscript, iframe, svg, nav, footer, header').forEach((el) => el.remove());
          const visibleText = clean(clone.innerText || clone.textContent || '').slice(0, 15000);

          const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
            .map((el) => clean(el.innerText))
            .filter(Boolean)
            .slice(0, 20);

          const ctas = Array.from(document.querySelectorAll('button, a[role="button"], a.btn, input[type="submit"], input[type="button"]'))
            .map((el) => clean(el.innerText || el.value || ''))
            .filter((text) => text && text.length < 60)
            .slice(0, 12);

          return {
            url: window.location.href,
            type,
            title: document.title || '',
            meta_description: getMeta('description') || getMeta('og:description'),
            visible_text: visibleText,
            ocr_text: headings.length || ctas.length
              ? `Headings: ${headings.join(' | ')}\nCTAs: ${ctas.join(' | ')}`
              : '',
            extracted_at: new Date().toISOString(),
          };
        },
        args: [pageType],
      });

      const page = results?.[0]?.result || null;
      if (tabId) {
        await chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      clearTimeout(timeout);
      resolve(page);
    } catch (err) {
      console.warn(`[Background] Crawl worker failed for ${url}:`, err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timeout);
      resolve();
    };

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        finish();
      }
    };

    const timeout = setTimeout(finish, timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function mergeCrawledPages(existingPages, newPages) {
  const seen = new Set();
  return [...existingPages, ...newPages].filter((page) => {
    const key = (page.url || '').split('#')[0].replace(/\/$/, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
