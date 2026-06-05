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
function sendLog(tabId, message) {
  console.log(`[Extension] ${message}`);
  chrome.tabs.sendMessage(tabId, { type: 'DEBUG_LOG', message }).catch(() => {});
}

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
  sendLog(tabId, `Checking payload...`);

  let rawExtracted = extractedPayload;
  if (!rawExtracted) {
    sendLog(tabId, `No payload provided. Opening background tab for ${domain}...`);
    rawExtracted = await new Promise(async (resolve) => {
      let targetTabId = null;
      const timeout = setTimeout(() => {
        sendLog(tabId, `Homepage extraction timed out after 15s`);
        if (targetTabId) chrome.tabs.remove(targetTabId).catch(() => {});
        resolve(null);
      }, 15000);

      try {
        const tab = await chrome.tabs.create({ url: `https://${domain}`, active: false });
        targetTabId = tab.id;
        sendLog(tabId, `Created tab ${targetTabId}. Waiting for load...`);

        await waitForTabComplete(targetTabId, 10000);
        sendLog(tabId, `Tab loaded. Waiting 2s for hydration...`);
        await new Promise(r => setTimeout(r, 2000)); // wait for hydration

        sendLog(tabId, `Sending EXTRACT_PAGE to tab...`);
        chrome.tabs.sendMessage(targetTabId, { type: 'EXTRACT_PAGE' }, async (response) => {
          sendLog(tabId, `Received EXTRACT_PAGE response`);
          clearTimeout(timeout);
          if (targetTabId) await chrome.tabs.remove(targetTabId).catch(() => {});
          resolve(response?.payload || null);
        });
      } catch (err) {
        sendLog(tabId, `Failed to extract homepage: ${err.message}`);
        clearTimeout(timeout);
        if (targetTabId) chrome.tabs.remove(targetTabId).catch(() => {});
        resolve(null);
      }
    });
  }

  sendLog(tabId, `Payload ready: ${rawExtracted ? 'Yes' : 'No'}`);

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
    sendLog(tabId, `Checking social links for recent posts...`);
    const hasLinkedIn = !!payload.homepage.social_links.linkedin;
    const hasTwitter = !!payload.homepage.social_links.twitter;

    if (hasLinkedIn || hasTwitter) {
      currentResearch.status = 'enriching_social';
      broadcastStatus(tabId);

      // Scrape LinkedIn
      if (hasLinkedIn) {
        try {
          sendLog(tabId, `Harvesting LinkedIn...`);
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
          sendLog(tabId, `Harvesting Twitter/X...`);
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
    sendLog(tabId, `Starting internal page crawl...`);

    try {
      const crawledPages = await crawlPriorityInternalPages(payload.homepage, tabId, (count) => {
        currentResearch.pageCount = count;
        broadcastStatus(tabId);
        sendLog(tabId, `Crawled internal page ${count}/12`);
      });

      payload.pages = mergeCrawledPages(payload.pages || [], crawledPages);
      currentResearch.pageCount = payload.pages.length;
      sendLog(tabId, `Internal crawl collected ${crawledPages.length} pages`);
    } catch (err) {
      sendLog(tabId, `Internal page crawl failed: ${err.message}`);
    }
  }

  // Step 2.7: Native LinkedIn People scrape (authenticated via user's session)
  if (payload && payload.homepage) {
    currentResearch.status = 'scraping_linkedin_people';
    broadcastStatus(tabId);
    sendLog(tabId, `Starting native LinkedIn People scrape...`);

    try {
      const linkedinUrl = payload.homepage.social_links?.linkedin;
      const linkedinResult = await scrapeLinkedInPeopleNative(domain, linkedinUrl, tabId);
      
      if (linkedinResult.contacts && linkedinResult.contacts.length > 0) {
        payload.social_signals.native_contacts = linkedinResult.contacts;
        sendLog(tabId, `Native LinkedIn scrape found ${linkedinResult.contacts.length} contacts`);
      }
      if (linkedinResult.location) {
        payload.metadata.headquarters = linkedinResult.location;
      }
      if (linkedinResult.screenshot) {
        payload.social_signals.linkedin_screenshot = linkedinResult.screenshot;
      }
    } catch (err) {
      sendLog(tabId, `Native LinkedIn scrape failed: ${err.message}`);
    }
  }

  // Step 2.8: Native Google Search scrape (decision-makers + news)
  if (payload && payload.homepage) {
    currentResearch.status = 'searching_google';
    broadcastStatus(tabId);
    sendLog(tabId, `Starting native Google Search scrape...`);

    try {
      const companyName = domain.split('.')[0];
      const googleIntel = await scrapeGoogleSearchNative(domain, companyName, tabId);
      if (googleIntel.contacts.length > 0) {
        const existing = payload.social_signals.native_contacts || [];
        payload.social_signals.native_contacts = [...existing, ...googleIntel.contacts];
      }
      if (googleIntel.snippets.length > 0) {
        payload.social_signals.google_search_intel = googleIntel.snippets;
      }
      sendLog(tabId, `Google scrape: ${googleIntel.contacts.length} contacts, ${googleIntel.snippets.length} snippets`);
    } catch (err) {
      sendLog(tabId, `Google scrape failed: ${err.message}`);
    }
  }

  // Step 2.9: Native Glassdoor culture scrape
  if (payload && payload.homepage) {
    currentResearch.status = 'scraping_glassdoor';
    broadcastStatus(tabId);
    sendLog(tabId, `Starting native Glassdoor scrape...`);

    try {
      const companyName = domain.split('.')[0];
      const glassdoorData = await scrapeGlassdoorNative(companyName, tabId);
      if (glassdoorData) {
        payload.social_signals.glassdoor_signals = glassdoorData;
        sendLog(tabId, `Glassdoor scrape: rating=${glassdoorData.rating}`);
      }
    } catch (err) {
      sendLog(tabId, `Glassdoor scrape failed: ${err.message}`);
    }
  }

  // Step 2.10: Native GitHub scrape
  if (payload && payload.homepage && payload.homepage.social_links?.github) {
    currentResearch.status = 'scraping_github';
    broadcastStatus(tabId);
    sendLog(tabId, `Starting native GitHub scrape...`);
    try {
      const githubUrl = payload.homepage.social_links.github;
      const githubData = await scrapeGithubNative(githubUrl, tabId);
      if (githubData) {
        payload.social_signals.github_intel = githubData;
        sendLog(tabId, `GitHub scrape: ${githubData.stars} stars, ${githubData.contributors.length} contributors`);
      }
    } catch (err) {
      sendLog(tabId, `GitHub scrape failed: ${err.message}`);
    }
  }

  // Step 2.11: Native Wikipedia Scrape
  if (payload && payload.homepage) {
    currentResearch.status = 'scraping_wikipedia';
    broadcastStatus(tabId);
    sendLog(tabId, `Starting native Wikipedia scrape...`);
    try {
      const wikiData = await scrapeWikipediaNative(domain, tabId);
      if (wikiData) {
        payload.social_signals.wikipedia_summary = wikiData.summary;
        if (wikiData.screenshot) payload.social_signals.wikipedia_screenshot = wikiData.screenshot;
        sendLog(tabId, `Wikipedia scrape completed`);
      }
    } catch (err) {
      sendLog(tabId, `Wikipedia scrape failed: ${err.message}`);
    }
  }

  // Step 3: Send to server
  currentResearch.status = 'analyzing';
  broadcastStatus(tabId);
  sendLog(tabId, `Sending payload to server for analysis...`);

  const forceRefresh = !cacheStatus.exists;
  
  // Keep service worker alive during long API request (prevents 30s idle timeout)
  const keepAlive = setInterval(() => {
    sendLog(tabId, `Still analyzing server-side...`);
  }, 20000);

  let result;
  try {
    result = await runServerResearch(domain, payload, forceRefresh);
  } finally {
    clearInterval(keepAlive);
  }

  currentResearch.status = 'complete';
  currentResearch.result = result;
  broadcastStatus(tabId);
  sendLog(tabId, `Research complete!`);

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

    // Hard timeout: if scraping takes more than 25 seconds, give up
    const timeout = setTimeout(() => {
      console.warn(`[Background] Social scraping timed out for ${url}`);
      if (tabId) {
        chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      resolve(null);
    }, 25000);

    try {
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        clearTimeout(timeout);
        resolve(null);
        return;
      }

      // Force active to allow user to visually verify and for screenshots
      const tab = await chrome.tabs.create({ url, active: true });
      tabId = tab.id;

      // Wait for auth + DOM rendering
      await waitForTabComplete(tabId, 10000);
      await new Promise(r => setTimeout(r, 4000));

      let posts = [];
      let tweets = [];

      try {
        // Scroll down to load posts/tweets
        await chrome.scripting.executeScript({
          target: { tabId },
          func: async () => {
            for (let i = 0; i < 4; i++) {
              window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
              await new Promise(resolve => setTimeout(resolve, 800));
            }
          }
        });

        // Small wait for content to settle
        await new Promise(r => setTimeout(r, 1000));

        // Take a screenshot
        const screenshot = await captureScreenshot(tabId);

        // Extract posts/tweets
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

        if (tabId) {
          await chrome.tabs.remove(tabId).catch(() => {});
          tabId = null;
        }
        clearTimeout(timeout);

        resolve({ posts, tweets, screenshot });
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
    
    // Allow the link if it's internal, OR if it's a known external ATS/Careers site
    const knownAtsDomains = [
      'ashbyhq.com', 'greenhouse.io', 'lever.co', 
      'workable.com', 'breezy.hr', 'myworkdayjobs.com', 
      'applytojob.com', 'bamboohr.com'
    ];
    const isAts = knownAtsDomains.some(ats => host.includes(ats));
    
    if (host !== domain && !isAts) continue;
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

async function crawlPageInBackgroundTab(url, pageType, originalTabId) {
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
      
      // Capture screenshot natively
      if (page) {
        try {
          await chrome.tabs.update(tabId, { active: true });
          await new Promise(r => setTimeout(r, 300)); // wait for paint
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 60 });
          page.screenshot_base64 = dataUrl;
          if (originalTabId) {
            await chrome.tabs.update(originalTabId, { active: true });
          }
        } catch (e) {
          console.warn('Screenshot capture failed', e);
        }
      }

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

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Also check if already complete to prevent hanging if it loaded too fast
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return;
      if (tab && tab.status === 'complete') {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    });
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

// ============================================================
// Native LinkedIn People Scraper (v2)
// Strategy:
//   1. If we have a company LinkedIn URL → open /company/{slug}/people/
//   2. If that yields 0 contacts OR no slug → fall back to LinkedIn Search
//   3. Use robust DOM extraction that walks from profile links upward
// ============================================================

async function scrapeLinkedInPeopleNative(domain, linkedinCompanyUrl, originalTabId) {
  const companyName = domain.split('.')[0];
  
  // Strategy 1: Try company people page first if we have a slug
  let contacts = [];
  if (linkedinCompanyUrl && linkedinCompanyUrl.includes('/company/')) {
    const m = linkedinCompanyUrl.match(/linkedin\.com\/company\/([^/?#]+)/i);
    const slug = m?.[1];
    if (slug) {
      sendLog(originalTabId, `LinkedIn: trying company page /company/${slug}/people/`);
      contacts = await _scrapeLinkedInPage(
        `https://www.linkedin.com/company/${slug}/people/`,
        originalTabId
      );
      sendLog(originalTabId, `LinkedIn company page: found ${contacts.length} contacts`);
    }
  }

  // Strategy 2: If company page yielded nothing, do a LinkedIn People Search
  if (contacts.length === 0) {
    const searchQuery = `${companyName}`;
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery)}&origin=GLOBAL_SEARCH_HEADER`;
    sendLog(originalTabId, `LinkedIn: falling back to search "${searchQuery}"`);
    contacts = await _scrapeLinkedInPage(searchUrl, originalTabId);
    sendLog(originalTabId, `LinkedIn search: found ${contacts.length} contacts`);
  }

  return contacts;
}

/**
 * Opens a LinkedIn URL in a background tab, scrolls, and extracts people.
 * Works for both /company/slug/people/ AND /search/results/people/ pages.
 */
async function _scrapeLinkedInPage(url, originalTabId) {
  return new Promise(async (resolve) => {
    let tabId = null;
    const timeout = setTimeout(() => {
      sendLog(originalTabId, `LinkedIn: timed out after 35s`);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve({ contacts: [], location: null, screenshot: null });
    }, 35000);

    try {
      // Force active to allow user to verify and to allow screenshots
      const tab = await chrome.tabs.create({ url, active: true });
      tabId = tab.id;

      await waitForTabComplete(tabId, 15000);
      // LinkedIn SPA needs extra hydration time
      await new Promise(r => setTimeout(r, 8000));

      // Scroll slowly like a human to trigger lazy-loading
      await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => {
          for (let i = 0; i < 6; i++) {
            window.scrollBy({ top: window.innerHeight * 0.7, behavior: 'smooth' });
            await new Promise(r => setTimeout(r, 1000));
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
          await new Promise(r => setTimeout(r, 500));
        }
      });
      await new Promise(r => setTimeout(r, 1500));

      // Extract people from the DOM
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const people = [];
          const seenNames = new Set();

          // ── JUNK FILTER ──
          const JUNK_PATTERNS = [
            /^linkedin\s+member$/i,
            /^actively\s+hiring$/i,
            /^current\s+compan/i,
            /^all\s+filters?$/i,
            /^locations?$/i,
            /^connect$/i,
            /^follow$/i,
            /^message$/i,
            /^people$/i,
            /^connections?$/i,
            /united\s+states/i,
            /^greater\s+/i,
            /^\w+,\s+\w+,\s+\w+/,  // "City, State, Country" pattern
            /^(show|view|see|load|more|page|next|prev)/i,
            /^(sign|log)\s+(in|up|out)/i,
            /premium/i,
          ];
          
          function isJunkName(name) {
            if (!name || name.length < 3 || name.length > 60) return true;
            // Must have at least 2 words (first + last name)
            if (name.split(/\s+/).length < 2) return true;
            // Check against junk patterns
            return JUNK_PATTERNS.some(p => p.test(name));
          }

          // ── STRATEGY A: Find all profile links and walk up to their card ──
          const profileLinks = document.querySelectorAll('a[href*="/in/"]');
          profileLinks.forEach(link => {
            const href = link.href || '';
            if (!href.includes('linkedin.com/in/')) return;
            
            // Get name from the link text or nearby span
            let name = '';
            const nameSpan = link.querySelector('span[aria-hidden="true"]');
            if (nameSpan) {
              name = nameSpan.innerText?.trim();
            }
            if (!name) {
              name = link.innerText?.trim();
            }
            // Strip "View X's profile" patterns
            name = name.replace(/^view\s+/i, '').replace(/'s\s+profile$/i, '').trim();

            if (isJunkName(name)) return;
            
            const nameKey = name.toLowerCase();
            if (seenNames.has(nameKey)) return;
            seenNames.add(nameKey);

            // Walk up 3-4 levels to find the card container, then look for title
            let title = '';
            let container = link;
            for (let i = 0; i < 5; i++) {
              container = container.parentElement;
              if (!container) break;
            }
            if (container) {
              // Try multiple subtitle selectors
              const titleEl = container.querySelector(
                '.artdeco-entity-lockup__subtitle, ' +
                '.entity-result__primary-subtitle, ' +
                '.org-people-profile-card__profile-info, ' +
                '.t-14.t-normal, ' +
                '.lt-line-clamp--single-line'
              );
              title = titleEl?.innerText?.trim() || '';
              // Clean up title
              title = title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            }
            
            // Don't add contacts that look like titles are actually junk
            if (title && /^(connect|follow|message|pending|LinkedIn)/i.test(title)) {
              title = '';
            }

            people.push({
              full_name: name,
              title: title || 'Employee',
              linkedin_url: href.split('?')[0],
              source: 'linkedin_native',
            });
          });

          // ── STRATEGY B: Company People page cards (different DOM) ──
          if (people.length === 0) {
            const cards = document.querySelectorAll('.org-people-profile-card');
            cards.forEach(card => {
              const nameEl = card.querySelector('.org-people-profile-card__profile-title');
              const titleEl = card.querySelector('.artdeco-entity-lockup__subtitle');
              const linkEl = card.querySelector('a[href*="/in/"]');
              
              const name = nameEl?.innerText?.trim();
              if (isJunkName(name)) return;
              
              const nameKey = name.toLowerCase();
              if (seenNames.has(nameKey)) return;
              seenNames.add(nameKey);

              people.push({
                full_name: name,
                title: titleEl?.innerText?.trim() || 'Employee',
                linkedin_url: linkEl?.href?.split('?')[0] || null,
                source: 'linkedin_native',
              });
            });
          }

          // ── STRATEGY C: Last resort — parse visible text ──
          if (people.length === 0) {
            const bodyText = document.body.innerText || '';
            const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
            for (let i = 0; i < lines.length - 1; i++) {
              const maybeName = lines[i];
              const maybeTitle = lines[i + 1];
              if (
                maybeName.split(/\s+/).length >= 2 &&
                maybeName.length < 50 &&
                /^[A-Z]/.test(maybeName) &&
                !isJunkName(maybeName) &&
                maybeTitle.length > 3 &&
                maybeTitle.length < 100 &&
                !/^(show|view|see|load|more|page|connect|follow|message)/i.test(maybeTitle)
              ) {
                const nameKey = maybeName.toLowerCase();
                if (seenNames.has(nameKey)) continue;
                seenNames.add(nameKey);
                
                people.push({
                  full_name: maybeName,
                  title: maybeTitle,
                  linkedin_url: null,
                  source: 'linkedin_native',
                });
                i++; // skip title line
              }
            }
          }
          // ── STRATEGY D: Extract Location ──
          const locationEl = document.querySelector('.org-top-card-summary-info-list__info-item, .org-top-card-summary__headquarter');
          const location = locationEl?.innerText?.trim() || null;

          return { people, location };
        }
      });

      const { people: contacts, location } = results?.[0]?.result || { people: [], location: null };

      // Capture screenshot before closing
      const screenshot = await captureScreenshot(tabId);

      if (tabId) {
        await chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      clearTimeout(timeout);

      resolve({ contacts, location, screenshot });
    } catch (err) {
      console.warn('[Background] LinkedIn native scrape failed:', err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve([]);
    }
  });
}

// ============================================================
// Native Wikipedia Scraper
// Opens Wikipedia natively to capture a screenshot and extract summary
// ============================================================

async function scrapeWikipediaNative(domain, originalTabId) {
  const companyName = domain.split('.')[0];
  const searchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(companyName)}`;

  return new Promise(async (resolve) => {
    let tabId = null;
    const timeout = setTimeout(() => {
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve(null);
    }, 20000);

    try {
      const tab = await chrome.tabs.create({ url: searchUrl, active: true });
      tabId = tab.id;

      await waitForTabComplete(tabId, 10000);
      await new Promise(r => setTimeout(r, 2000));

      const screenshot = await captureScreenshot(tabId);

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const firstParagraph = document.querySelector('.mw-parser-output > p:not(.mw-empty-elt)');
          return firstParagraph ? firstParagraph.innerText : null;
        }
      });

      if (tabId) {
        await chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      clearTimeout(timeout);

      resolve({
        summary: results?.[0]?.result,
        screenshot
      });
    } catch (err) {
      console.warn('[Background] Wikipedia scrape failed:', err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

// ============================================================
// Native Google Search Scraper
// Opens Google in a background tab with targeted search formulas
// to find decision-makers and company intelligence.
// ============================================================

async function scrapeGoogleSearchNative(domain, companyName, originalTabId) {
  const allContacts = [];
  const allSnippets = [];

  // Search formula 1: LinkedIn decision-makers
  const queries = [
    `site:linkedin.com/in/ ("VP" OR "Head of" OR "Director" OR "CTO" OR "CEO" OR "Founder") "${companyName}" "${domain}"`,
    `"${companyName}" "${domain}" (funding OR raised OR acquisition OR partnership OR launch) 2024 OR 2025`,
    `site:glassdoor.com "${companyName}" "${domain}" reviews`,
  ];

  for (const query of queries) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=15`;
    const result = await scrapeGoogleResultsPage(searchUrl, domain, companyName, originalTabId);
    if (result) {
      allContacts.push(...result.contacts);
      allSnippets.push(...result.snippets);
    }
  }

  // Dedupe contacts by name
  const seen = new Set();
  const deduped = allContacts.filter(c => {
    const key = c.full_name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { contacts: deduped.slice(0, 10), snippets: allSnippets.slice(0, 20) };
}

async function scrapeGoogleResultsPage(searchUrl, domain, companyName, originalTabId) {
  return new Promise(async (resolve) => {
    let tabId = null;
    const timeout = setTimeout(() => {
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve({ contacts: [], snippets: [] });
    }, 15000);

    try {
      const tab = await chrome.tabs.create({ url: searchUrl, active: true });
      tabId = tab.id;

      await waitForTabComplete(tabId, 10000);
      await new Promise(r => setTimeout(r, 2000));

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (compName) => {
          const contacts = [];
          const snippets = [];

          // Extract search result titles and snippets
          const resultDivs = document.querySelectorAll('#search .g, [data-sokoban-container], [data-hveid]');

          resultDivs.forEach(div => {
            const titleEl = div.querySelector('h3');
            const snippetEl = div.querySelector('.VwiC3b, [data-sncf], .IsZvec, span[style*="-webkit-line-clamp"]');
            const linkEl = div.querySelector('a[href]');

            const title = titleEl?.innerText?.trim() || '';
            const snippet = snippetEl?.innerText?.trim() || '';
            const href = linkEl?.getAttribute('href') || '';

            // Capture snippet for intelligence
            if (snippet && snippet.length > 20) {
              snippets.push(snippet.slice(0, 300));
            }

            // Parse LinkedIn people results: "First Last - Title - Company | LinkedIn"
            if (href.includes('linkedin.com/in/')) {
              const liMatch = title.match(/^([A-Z][a-zÀ-ÿ]+ [A-Z][a-zA-ZÀ-ÿ\-']+(?:\s[A-Z][a-zA-ZÀ-ÿ]+)?)\s*[-–|]\s*(.+?)(?:\s*[-–|]\s*.+)?$/);
              if (liMatch) {
                const name = liMatch[1].trim();
                const role = liMatch[2].trim().replace(/\s*\|?\s*LinkedIn\s*$/i, '');
                if (name.split(' ').length >= 2 && name.length < 50 && !/linkedin|google/i.test(name)) {
                  contacts.push({
                    full_name: name,
                    title: role,
                    linkedin_url: href.startsWith('http') ? href.split('?')[0] : `https://www.linkedin.com/in/${href.match(/linkedin\.com\/in\/([^/?]+)/)?.[1] || ''}`,
                    source: 'google_native',
                    snippet: snippet.slice(0, 150),
                  });
                }
              }
            }
          });

          return { contacts, snippets };
        },
        args: [companyName]
      });

      const data = results?.[0]?.result || { contacts: [], snippets: [] };

      if (tabId) {
        await chrome.tabs.remove(tabId).catch(() => {});
        tabId = null;
      }
      clearTimeout(timeout);
      resolve(data);
    } catch (err) {
      console.warn('[Background] Google results scrape failed:', err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve({ contacts: [], snippets: [] });
    }
  });
}

// ============================================================
// Native Glassdoor Culture Scraper
// Opens Google search for Glassdoor reviews and extracts
// ratings, pros, cons to inform sales pain points.
// ============================================================

async function scrapeGlassdoorNative(companyName, originalTabId) {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`site:glassdoor.com "${companyName}" reviews`)}`;

  return new Promise(async (resolve) => {
    let tabId = null;
    const timeout = setTimeout(() => {
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve(null);
    }, 18000);

    try {
      // First find the Glassdoor URL via Google
      const tab = await chrome.tabs.create({ url: searchUrl, active: true });
      tabId = tab.id;

      await waitForTabComplete(tabId, 8000);
      await new Promise(r => setTimeout(r, 1500));

      // Get the first Glassdoor link from Google results
      const linkResults = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const links = document.querySelectorAll('a[href*="glassdoor.com"]');
          for (const link of links) {
            const href = link.getAttribute('href') || '';
            if (href.includes('glassdoor.com') && (href.includes('Reviews') || href.includes('review'))) {
              // Extract actual URL from Google redirect
              try {
                const url = new URL(href, window.location.href);
                return url.searchParams.get('q') || url.href;
              } catch {
                return href;
              }
            }
          }
          // Also check snippets for Glassdoor data visible in Google
          const snippets = document.querySelectorAll('.VwiC3b, [data-sncf]');
          const texts = [];
          snippets.forEach(s => {
            const t = s.innerText?.trim();
            if (t && t.length > 30) texts.push(t);
          });
          return { snippets: texts };
        }
      });

      const glassdoorResult = linkResults?.[0]?.result;

      // If we got snippets from Google (Glassdoor data shown inline)
      if (glassdoorResult && typeof glassdoorResult === 'object' && glassdoorResult.snippets) {
        if (tabId) { await chrome.tabs.remove(tabId).catch(() => {}); tabId = null; }
        clearTimeout(timeout);

        const allText = glassdoorResult.snippets.join('\n');
        const ratingMatch = allText.match(/(\d\.\d)\s*(?:out of 5|\/5|stars?)/i);

        resolve({
          rating: ratingMatch?.[1] || null,
          pros: extractBullets(allText, /pros?[:.]?\s*/i),
          cons: extractBullets(allText, /cons?[:.]?\s*/i),
          culture_snippet: allText.slice(0, 500),
        });
        return;
      }

      // If we got a direct Glassdoor URL, open it
      if (glassdoorResult && typeof glassdoorResult === 'string' && glassdoorResult.includes('glassdoor')) {
        // Close Google tab
        if (tabId) { await chrome.tabs.remove(tabId).catch(() => {}); tabId = null; }

        const gdTab = await chrome.tabs.create({ url: glassdoorResult, active: false });
        tabId = gdTab.id;

        await waitForTabComplete(tabId, 10000);
        await new Promise(r => setTimeout(r, 3000));

        // Scroll for content
        await chrome.scripting.executeScript({
          target: { tabId },
          func: async () => {
            for (let i = 0; i < 3; i++) {
              window.scrollBy(0, window.innerHeight);
              await new Promise(r => setTimeout(r, 600));
            }
          }
        });
        await new Promise(r => setTimeout(r, 500));

        // Extract review data
        const reviewResults = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            const rating = document.querySelector('[data-test="rating-info"], .rating-num, .v2__EIReviewsRatingsStylesV2__ratingNum')?.innerText?.trim();

            const prosEls = document.querySelectorAll('[data-test="pros"], .gdReview .pros');
            const consEls = document.querySelectorAll('[data-test="cons"], .gdReview .cons');

            const pros = [];
            const cons = [];
            prosEls.forEach(el => { const t = el.innerText?.trim(); if (t && t.length > 10) pros.push(t.slice(0, 200)); });
            consEls.forEach(el => { const t = el.innerText?.trim(); if (t && t.length > 10) cons.push(t.slice(0, 200)); });

            // Also grab general text for culture snippet
            const bodyText = document.body.innerText?.slice(0, 2000) || '';

            return { rating: rating || null, pros: pros.slice(0, 5), cons: cons.slice(0, 5), culture_snippet: bodyText.slice(0, 500) };
          }
        });

        const gdData = reviewResults?.[0]?.result;

        if (tabId) { await chrome.tabs.remove(tabId).catch(() => {}); tabId = null; }
        clearTimeout(timeout);
        resolve(gdData || null);
        return;
      }

      // Nothing found
      if (tabId) { await chrome.tabs.remove(tabId).catch(() => {}); tabId = null; }
      clearTimeout(timeout);
      resolve(null);
    } catch (err) {
      console.warn('[Background] Glassdoor native scrape failed:', err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

function extractBullets(text, headerPattern) {
  const parts = text.split(headerPattern);
  if (parts.length < 2) return [];
  const section = parts[1].slice(0, 500);
  return section.split(/[.;\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200)
    .slice(0, 5);
}

// ============================================================
// Native GitHub Scraper
// Extracts description, stars, languages, and contributors
// ============================================================
async function scrapeGithubNative(githubUrl, originalTabId) {
  return new Promise(async (resolve) => {
    let tabId = null;
    const timeout = setTimeout(() => {
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      resolve(null);
    }, 15000);

    try {
      const tab = await chrome.tabs.create({ url: githubUrl, active: false });
      tabId = tab.id;

      await waitForTabComplete(tabId, 10000);
      await new Promise(r => setTimeout(r, 2000));

      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const description = document.querySelector('p.f4.my-3')?.innerText?.trim();
          
          let stars = null;
          const starsEl = document.querySelector('a[href$="/stargazers"] strong');
          if (starsEl) stars = starsEl.innerText.trim();

          const languages = [];
          document.querySelectorAll('a[data-ga-click="Repository, language stats search click"]').forEach(el => {
            const lang = el.querySelector('span.color-fg-default')?.innerText?.trim();
            if (lang) languages.push(lang);
          });

          const contributors = [];
          document.querySelectorAll('a[data-hovercard-type="user"] img.avatar-user').forEach(img => {
            const name = img.getAttribute('alt');
            if (name && name.startsWith('@')) {
              contributors.push(name.substring(1));
            }
          });

          return {
            description,
            stars,
            languages: [...new Set(languages)].slice(0, 5),
            contributors: [...new Set(contributors)].slice(0, 10)
          };
        }
      });

      const data = results?.[0]?.result || null;
      if (tabId) await chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve(data);
    } catch (err) {
      console.warn('[Background] GitHub native scrape failed:', err);
      if (tabId) chrome.tabs.remove(tabId).catch(() => {});
      clearTimeout(timeout);
      resolve(null);
    }
  });
}
// --- Utility for Screenshots ---
async function captureScreenshot(tabId) {
  return new Promise((resolve) => {
    // Make sure the tab is active before taking screenshot
    chrome.tabs.update(tabId, { active: true }, () => {
      setTimeout(() => {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            console.warn('[Screenshot] Failed:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(dataUrl);
          }
        });
      }, 500); // small delay to ensure rendering
    });
  });
}
