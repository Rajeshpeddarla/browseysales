# Browsey — Fully Optimized Pipeline

**Autonomous AI Sales Intelligence System — Cost-Optimized Architecture**

Version: 2.0
Date: 2026-05-19
Status: Architecture spec, ready to build

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cost Targets](#2-cost-targets)
3. [System Overview](#3-system-overview)
4. [Client-Side Pipeline (Browser Extension)](#4-client-side-pipeline-browser-extension)
5. [Server-Side Pipeline (Backend)](#5-server-side-pipeline-backend)
6. [Shared Global Cache](#6-shared-global-cache)
7. [LLM Strategy](#7-llm-strategy)
8. [OCR Strategy](#8-ocr-strategy)
9. [Database Schema](#9-database-schema)
10. [API Contracts](#10-api-contracts)
11. [Personalization Layer](#11-personalization-layer)
12. [Failure Handling](#12-failure-handling)
13. [Build Plan](#13-build-plan)
14. [Infrastructure](#14-infrastructure)

---

## 1. Executive Summary

Browsey researches companies for sales teams. Old approach hit paid APIs → stale data + cost. New approach:

- **Client browser does extraction + OCR** (free user compute)
- **Server runs LLM + cache** (one free NIM endpoint)
- **Shared global cache** across all users (one fetch serves thousands)
- **Per-field TTLs** (refresh only stale parts)
- **Personalization layer** (cheap LLM call per user, base intel reused)

Result: 99% cost reduction vs naive approach, fresher data, faster UX.

---

## 2. Cost Targets

| Item | Target |
|------|--------|
| Server compute per new company | <$0.01 |
| Server compute per cached lookup | $0 |
| LLM calls per new company | 1 base + 1 personalization |
| LLM calls per cached lookup | 0 or 1 (personalization only) |
| OCR calls server-side | 0 (client does it) |
| Total infra fixed cost | <$20/month for MVP |

---

## 3. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Chrome Extension (MV3)                              │    │
│  │  - Content scripts                                   │    │
│  │  - Service worker                                    │    │
│  │  - Tesseract.js OCR (WASM)                          │    │
│  │  - DOM extraction                                    │    │
│  │  - Screenshot capture                                │    │
│  │  - Smart router                                      │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                    HTTPS — extracted JSON only
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND SERVER                         │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │
│  │  API       │→ │  Cache     │→ │  LLM Orchestrator    │  │
│  │  Gateway   │  │  Layer     │  │  (NVIDIA NIM)        │  │
│  └────────────┘  └────────────┘  └──────────────────────┘  │
│         │                                    │              │
│         ▼                                    ▼              │
│  ┌────────────┐                    ┌──────────────────────┐│
│  │ Postgres   │                    │  Personalization     ││
│  │ (global +  │                    │  Engine              ││
│  │  user)     │                    │  (templates + LLM)   ││
│  └────────────┘                    └──────────────────────┘│
│         │                                                    │
│         ▼                                                    │
│  ┌────────────┐                                             │
│  │ Background │                                             │
│  │ Refresher  │  (cron: refresh hot companies)              │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  CRM Webhook Push   │
                   │  (HubSpot/SF/etc)   │
                   └─────────────────────┘
```

---

## 4. Client-Side Pipeline (Browser Extension)

The extension does 80% of the work. Server only handles reasoning + storage.

### 4.1 Architecture

```
extension/
├── manifest.json              (MV3 config)
├── background.js              (service worker, orchestrator)
├── content/
│   ├── extractor.js           (DOM + meta extraction)
│   ├── navigator.js           (multi-page traversal)
│   └── screenshot.js          (capture + crop)
├── workers/
│   ├── ocr-worker.js          (Tesseract.js in Web Worker)
│   └── cleaner-worker.js      (HTML clean, text dedup)
├── lib/
│   ├── router.js              (smart page selection)
│   ├── signals.js             (signal merger)
│   ├── api.js                 (server client)
│   └── cache.js               (IndexedDB local cache)
└── ui/
    ├── popup.html
    ├── sidepanel.html
    └── report.js
```

### 4.2 Trigger Flow

```
1. User opens company website OR pastes URL in extension popup
2. Extension wakes background.js service worker
3. background.js calls api.checkCache(domain)
   ├── HIT (fresh) → fetch intel from server → render report → STOP
   ├── HIT (stale) → run partial refresh (only stale fields)
   └── MISS → run full client pipeline
4. Client pipeline executes (see 4.3)
5. Client sends extracted JSON to server
6. Server returns intel report
7. Extension renders report in sidepanel
```

### 4.3 Full Client Pipeline (when cache miss)

```
STAGE A — Homepage Extraction (instant)
  ├── Inject extractor.js into current tab
  ├── Extract: meta, headings, nav links, footer links,
  │   social links, visible text, button labels, schema.org
  ├── Detect: tech stack (script srcs), CMS, frameworks
  └── Output: homepage.json (~5KB)

STAGE B — Smart Router (rule-based, free)
  ├── Score each discovered link
  ├── Priority: pricing > careers > about > customers > blog
  ├── Pick top 5 internal routes to visit
  └── Pick external sources: linkedin, github, reddit

STAGE C — Multi-Page Crawl (sequential, in user's browser)
  ├── For each priority route:
  │   ├── Open in hidden tab or fetch via background script
  │   ├── Wait for JS render (MutationObserver settle)
  │   ├── Extract DOM + visible text
  │   ├── If text < 200 chars → capture screenshot for OCR
  │   └── Close tab
  └── Output: pages[] array

STAGE D — Selective OCR (client-side WASM)
  ├── Trigger only when DOM extraction failed
  ├── Crop screenshot to relevant region (pricing/logos)
  ├── Send Blob to ocr-worker.js (Tesseract.js)
  ├── Worker processes in Web Worker (UI stays responsive)
  └── Output: ocr_text per page

STAGE E — Social Source Fetches (free public APIs)
  ├── Reddit: fetch reddit.com/search.json?q={company}
  ├── GitHub: fetch api.github.com/orgs/{org}
  ├── LinkedIn: skip authenticated scrape; use Google snippet only
  ├── Product Hunt: fetch GraphQL public API
  └── Output: social_signals.json

STAGE F — Local Signal Merge
  ├── Combine: homepage + pages + ocr_text + social_signals
  ├── Compress: strip duplicates, normalize whitespace
  ├── Validate: required fields present
  └── Output: merged_payload.json (~10-20KB)

STAGE G — Send to Server
  ├── POST /api/research with merged_payload
  ├── Server returns intel report + persists to global cache
  └── Render report in sidepanel
```

### 4.4 Extraction Details

**Homepage extractor returns:**

```json
{
  "url": "https://acme.com",
  "domain": "acme.com",
  "meta": {
    "title": "...",
    "description": "...",
    "og_image": "...",
    "canonical": "...",
    "schema_org": [...]
  },
  "headings": {
    "h1": ["..."],
    "h2": ["..."],
    "h3": ["..."]
  },
  "navigation": {
    "main_nav": [{"text": "Pricing", "href": "/pricing"}],
    "footer_links": [...]
  },
  "social_links": {
    "linkedin": "...",
    "twitter": "...",
    "github": "...",
    "youtube": "..."
  },
  "tech_hints": {
    "frameworks": ["React", "Next.js"],
    "analytics": ["Segment", "GA4"],
    "cms": null,
    "payment": ["Stripe"]
  },
  "visible_text": "...",
  "buttons": [{"text": "Start Free Trial", "type": "cta"}],
  "forms": [{"fields": ["email"], "purpose": "lead_capture"}],
  "has_pricing_table": true,
  "has_logo_wall": true,
  "logo_wall_count": 12
}
```

### 4.5 Smart Router (Page Selection)

Hardcoded rules. No AI. Free.

```js
const PRIORITY_PATTERNS = [
  { regex: /\/pricing|plans|cost/i, score: 100, type: 'pricing' },
  { regex: /\/careers|jobs|hiring/i, score: 90, type: 'careers' },
  { regex: /\/about|company|team/i, score: 70, type: 'about' },
  { regex: /\/customers|case-stud|testimonial/i, score: 80, type: 'customers' },
  { regex: /\/integrations|partners/i, score: 60, type: 'integrations' },
  { regex: /\/blog|news|press/i, score: 50, type: 'blog' },
  { regex: /\/security|compliance|trust/i, score: 40, type: 'security' },
];

function routePages(allLinks, maxPages = 5) {
  return allLinks
    .map(link => ({
      ...link,
      score: scoreLink(link),
    }))
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages);
}
```

### 4.6 Client-Side OCR (Tesseract.js)

**Setup**:

```js
// ocr-worker.js (Web Worker)
import { createWorker } from 'tesseract.js';

let worker = null;

async function getWorker() {
  if (!worker) {
    worker = await createWorker('eng', 1, {
      cachePath: 'idb://tesseract-cache',  // persist model in IndexedDB
    });
  }
  return worker;
}

self.addEventListener('message', async (e) => {
  const { imageBlob, region } = e.data;
  const w = await getWorker();
  const { data } = await w.recognize(imageBlob, {
    rectangle: region,  // crop region only
  });
  self.postMessage({
    text: data.text,
    confidence: data.confidence,
  });
});
```

**OCR only runs when DOM extraction yields <200 chars on a high-value page** (pricing, logos). Most modern sites have proper DOM text — OCR rarely needed.

### 4.7 Local Cache (IndexedDB)

Extension keeps short-term local cache to avoid repeat server calls within same session:

```js
// cache.js
const DB = 'browsey-cache';
const TTL_MS = 1000 * 60 * 30;  // 30 min local cache

async function getLocal(domain) {
  const entry = await idb.get(DB, domain);
  if (!entry) return null;
  if (Date.now() - entry.cached_at > TTL_MS) return null;
  return entry.data;
}

async function setLocal(domain, data) {
  await idb.set(DB, domain, { data, cached_at: Date.now() });
}
```

Server-side cache is the real source of truth. Local cache reduces network round-trips only.

---

## 5. Server-Side Pipeline (Backend)

### 5.1 Endpoints

```
POST  /api/research            (main entry)
GET   /api/cache/:domain       (check cache freshness)
POST  /api/refresh/:domain     (force refresh)
POST  /api/personalize         (re-personalize for user)
GET   /api/timeline/:domain    (signal history)
POST  /api/crm-push            (send to CRM)
GET   /api/watch/:domain       (subscribe to changes)
```

### 5.2 Main Research Endpoint Flow

```
POST /api/research
Body: { domain, user_id, extracted_payload }

1. Validate input
2. Check global_intel[domain]
   ├── FRESH → return cached base_intel
   ├── PARTIALLY STALE → identify stale fields
   ├── FULLY STALE → mark for full refresh
   └── MISSING → full pipeline
3. If new extracted_payload provided AND needed:
   ├── Process payload (validate, normalize)
   ├── Build LLM prompt from payload
   ├── Call NIM (Qwen3-Coder-480B)
   ├── Parse JSON response
   ├── Validate against schema
   └── Store to global_intel
4. Run personalization layer
   ├── Check user_personalization[user_id, domain]
   ├── If exists AND user_context unchanged → return cached
   ├── Else → generate personalized layer (template or LLM)
   └── Store to user_personalization
5. Append timeline entry (signal log)
6. Return combined intel to client
```

### 5.3 Server Components

```
backend/
├── api/
│   ├── routes/
│   │   ├── research.js
│   │   ├── cache.js
│   │   ├── personalize.js
│   │   └── crm.js
│   └── middleware/
│       ├── auth.js
│       ├── ratelimit.js
│       └── validate.js
├── core/
│   ├── cache-manager.js       (TTL, partial refresh logic)
│   ├── llm-client.js          (NIM wrapper, retry, JSON-mode)
│   ├── signal-merger.js       (combine sources)
│   ├── personalizer.js        (template + LLM personalization)
│   └── crm-adapter.js         (HubSpot/SF/Pipedrive)
├── jobs/
│   ├── background-refresh.js  (cron, hot company refresh)
│   ├── timeline-pruner.js     (cron, old signal cleanup)
│   └── watch-notifier.js      (push alerts to subscribers)
├── db/
│   ├── migrations/
│   ├── schema.sql
│   └── queries.js
└── config/
    └── ttls.js                (per-field TTL config)
```

### 5.4 LLM Orchestrator

Single call per company for base intel. Forced JSON output.

```js
// llm-client.js
async function generateBaseIntel(mergedPayload) {
  const prompt = buildPrompt(mergedPayload);

  const response = await fetch(NIM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NIM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3-coder-480b-a35b-instruct',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  const data = await response.json();
  const intel = JSON.parse(data.choices[0].message.content);

  validateSchema(intel, BASE_INTEL_SCHEMA);
  return intel;
}
```

**Retry policy**: 1 retry on JSON parse failure, 1 retry on rate limit (exponential backoff). After failures, mark intel as `partial` and return what we have from extracted_payload directly.

### 5.5 Background Refresher

Cron job runs hourly. Refreshes hot companies proactively so users always get fresh data on demand.

```js
// background-refresh.js
async function refreshHotCompanies() {
  const hot = await db.query(`
    SELECT domain FROM global_intel
    WHERE fetch_count > 10
      AND last_refreshed_at < NOW() - INTERVAL '24 hours'
    ORDER BY fetch_count DESC
    LIMIT 100
  `);

  for (const row of hot) {
    try {
      await refreshDomain(row.domain);
      await sleep(2000);  // rate limit safety
    } catch (e) {
      logger.error(`Refresh failed for ${row.domain}`, e);
    }
  }
}
```

Refresh without user trigger uses server-side fetch fallback (cheap headless fetch of homepage + careers + pricing only — no full extension pipeline).

---

## 6. Shared Global Cache

The cost-saving heart of the system.

### 6.1 Concept

```
User A researches acme.com → full pipeline → cached globally
User B researches acme.com → cache hit → personalization only → instant
User C researches acme.com → cache hit → personalization only → instant
...
```

10,000 users researching same company = 1 base LLM call + 10,000 cheap personalization calls.

### 6.2 What's Shared vs What's Private

**Shared globally (`global_intel` table)**:
- Company description
- Tech stack
- Hiring signals
- Pricing tiers
- Customer logos
- Recent news
- Social public posts
- Growth indicators

**Per-user only (`user_personalization` table)**:
- Outreach hooks (tailored to user's product)
- ICP fit score (vs user's ICP definition)
- Talking points (user's industry context)
- Decision-maker recommendations (mapped to user's deal)

### 6.3 Per-Field TTL

Different facts go stale at different rates:

```js
// config/ttls.js
export const FIELD_TTLS = {
  company_description: '30d',
  tech_stack: '14d',
  pricing: '14d',
  customers: '14d',
  funding: '7d',
  hiring_roles: '3d',
  recent_news: '24h',
  social_posts: '12h',
  github_activity: '24h',
};
```

### 6.4 Partial Refresh Logic

Only refresh stale fields, keep fresh ones.

```js
async function getOrRefresh(domain, extractedPayload) {
  const cached = await db.getGlobalIntel(domain);
  if (!cached) {
    return await fullPipeline(domain, extractedPayload);
  }

  const staleFields = identifyStaleFields(cached);
  if (staleFields.length === 0) {
    return cached.base_intel;
  }

  const refreshed = await partialRefresh(domain, staleFields, extractedPayload);
  return merge(cached.base_intel, refreshed);
}
```

### 6.5 Privacy Boundary

User context **never** crosses into global cache. Personalization queries always filter by `user_id`. Multi-tenant safety enforced at query layer.

---

## 7. LLM Strategy

### 7.1 Provider

NVIDIA NIM (free tier). Model: `qwen/qwen3-coder-480b-a35b-instruct`.

### 7.2 Call Budget

| Operation | Calls |
|-----------|-------|
| New company research | 1 (base intel) |
| Personalization per user | 1 (or 0 if template-based) |
| Partial refresh | 1 (only stale fields, smaller prompt) |
| Cache hit | 0 |

### 7.3 Token Budget Per Call

| Phase | Input tokens | Output tokens |
|-------|--------------|---------------|
| Base intel | 4,000-6,000 | 1,500-2,000 |
| Personalization | 1,500-2,000 | 500-800 |
| Partial refresh | 1,000-2,000 | 500-1,000 |

### 7.4 Prompt Templates

**Base intel system prompt**:

```
You are a B2B sales intelligence analyst. Given structured signals about a company,
output a JSON object matching the provided schema. Be factual. Cite evidence.
If a field cannot be determined, return null. No prose. No commentary.
```

**Base intel user prompt**:

```
COMPANY SIGNALS:
{merged_payload_json}

OUTPUT SCHEMA:
{
  "summary_1_line": string,
  "summary_paragraph": string,
  "industry": string,
  "growth_stage": "early" | "growth" | "scale" | "enterprise",
  "employee_estimate": string,
  "tech_stack": [string],
  "growth_signals": [{ "signal": string, "evidence": string, "confidence": 0-1 }],
  "pain_points": [{ "pain": string, "why": string, "evidence": string }],
  "decision_makers_likely": [{ "role": string, "why": string }],
  "competitors": [string],
  "risk_flags": [string]
}
```

**Personalization prompt**:

```
COMPANY: {base_intel_summary}

USER CONTEXT:
  Product: {user_product}
  ICP: {user_icp}
  Past wins: {user_wins_summary}

GENERATE:
{
  "icp_match_score": 0-100,
  "icp_match_reasoning": string,
  "top_3_hooks": [
    { "hook": string, "channel": "email" | "linkedin" | "call",
      "why_it_works": string }
  ],
  "talking_points": [string],
  "objections_anticipated": [string]
}
```

### 7.5 Output Validation

JSON schema validation at server. Reject malformed responses, retry once. After 2 failures, return partial intel with `degraded: true` flag.

---

## 8. OCR Strategy

### 8.1 Where OCR Runs

**Client-side only** via Tesseract.js (WASM). Zero server GPU cost.

### 8.2 When OCR Triggers

```
For each crawled page:
  if (visibleText.length > 200) → skip OCR (DOM has data)
  else if (isHighValuePage(page)) → run client OCR on screenshot
  else → skip OCR (not worth cost)
```

High-value pages: pricing, customer logos, hero screenshots with text.

### 8.3 Crop Before OCR

Don't OCR full screenshot. Detect region first, crop, then OCR. 10x faster.

```js
function cropForOCR(screenshot, pageType) {
  if (pageType === 'pricing') {
    return cropToSelector(screenshot, '[class*="pricing"], [id*="price"]');
  }
  if (pageType === 'logos') {
    return cropToSelector(screenshot, '[class*="logo"], [class*="customer"]');
  }
  return screenshot;  // full
}
```

### 8.4 OCR Web Worker

Runs off main thread, keeps UI responsive. Tesseract model cached in IndexedDB after first download (~10MB one-time cost per user).

### 8.5 Fallback

If client OCR fails (low-end device, WASM unsupported), skip OCR entirely. Server still processes DOM-only data. Degraded but functional.

---

## 9. Database Schema

```sql
-- Global shared intel (cost-saving heart)
CREATE TABLE global_intel (
  domain               TEXT PRIMARY KEY,
  base_intel           JSONB NOT NULL,
  base_intel_summary   TEXT,                 -- compressed for personalization input
  fetch_count          INT DEFAULT 1,
  first_fetched_at     TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at    TIMESTAMPTZ DEFAULT NOW(),
  field_timestamps     JSONB,                -- { "hiring": "2026-05-15T...", ... }
  is_degraded          BOOLEAN DEFAULT FALSE,
  llm_version          TEXT
);

CREATE INDEX idx_global_intel_refreshed ON global_intel(last_refreshed_at);
CREATE INDEX idx_global_intel_fetch_count ON global_intel(fetch_count DESC);

-- Signal change history (for diff alerts)
CREATE TABLE intel_signals_timeline (
  id           BIGSERIAL PRIMARY KEY,
  domain       TEXT REFERENCES global_intel(domain) ON DELETE CASCADE,
  signal_type  TEXT NOT NULL,                -- "hiring", "funding", "tech_change"
  payload      JSONB NOT NULL,
  source       TEXT,
  detected_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timeline_domain_time ON intel_signals_timeline(domain, detected_at DESC);

-- Per-user personalization (private, multi-tenant safe)
CREATE TABLE user_personalization (
  user_id              UUID NOT NULL,
  domain               TEXT NOT NULL,
  personalized         JSONB NOT NULL,
  user_context_hash    TEXT NOT NULL,        -- invalidate if user changes product/ICP
  generated_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, domain)
);

CREATE INDEX idx_user_personalization_user ON user_personalization(user_id);

-- User profile (product, ICP, etc)
CREATE TABLE users (
  id                UUID PRIMARY KEY,
  email             TEXT UNIQUE NOT NULL,
  product_context   TEXT,
  icp_definition    JSONB,
  context_hash      TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Watch subscriptions (alert on signal change)
CREATE TABLE watches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  domain       TEXT NOT NULL,
  signals      TEXT[] NOT NULL,              -- which signals to watch
  channel      TEXT NOT NULL,                -- email, slack, webhook
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- CRM sync log
CREATE TABLE crm_pushes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  domain       TEXT NOT NULL,
  crm_system   TEXT NOT NULL,                -- hubspot, salesforce, etc
  status       TEXT NOT NULL,                -- success, failed, pending
  payload      JSONB,
  response     JSONB,
  pushed_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 10. API Contracts

### 10.1 POST /api/research

**Request**:

```json
{
  "domain": "acme.com",
  "user_id": "uuid-here",
  "extracted_payload": {
    "homepage": { ... },
    "pages": [ ... ],
    "social_signals": { ... },
    "ocr_results": [ ... ]
  },
  "force_refresh": false
}
```

**Response**:

```json
{
  "domain": "acme.com",
  "cached": false,
  "freshness": {
    "company_description": "fresh",
    "hiring_roles": "fresh",
    "pricing": "stale_but_acceptable"
  },
  "base_intel": { ... },
  "personalized": { ... },
  "timeline_recent": [ ... ],
  "generated_at": "2026-05-19T..."
}
```

### 10.2 GET /api/cache/:domain

Cheap check before sending payload. Client uses this to decide whether to extract.

**Response**:

```json
{
  "domain": "acme.com",
  "exists": true,
  "fully_fresh": false,
  "stale_fields": ["hiring_roles", "social_posts"],
  "last_refreshed_at": "2026-05-18T..."
}
```

### 10.3 POST /api/personalize

For re-personalizing existing cached intel without re-extracting.

**Request**:

```json
{
  "domain": "acme.com",
  "user_id": "uuid",
  "user_context_changed": true
}
```

---

## 11. Personalization Layer

### 11.1 Two Modes

**Mode A — Template-based (free, fast)**:

Pre-defined hook templates filled with user context + base intel slots.

```js
const HOOK_TEMPLATES = {
  hiring_growth: (intel, user) => ({
    hook: `Noticed ${intel.company.name} is hiring ${intel.hiring.top_role}.
           Many of our customers in ${user.industry} use us specifically to
           help new ${intel.hiring.top_role}s ramp faster.`,
    channel: 'email',
  }),
  tech_alignment: (intel, user) => ({
    hook: `Saw ${intel.company.name} uses ${intel.tech_stack[0]}. Our product
           plugs directly into ${intel.tech_stack[0]} workflows for teams like yours.`,
    channel: 'linkedin',
  }),
  // ... 10+ templates
};
```

Pick best 3 templates based on intel + user profile match. Zero LLM cost.

**Mode B — LLM personalization (small call, paid feature)**:

For premium tier or when user wants creative variations.

### 11.2 User Context Hash

User profile changes → invalidate personalization cache.

```js
function hashUserContext(user) {
  return sha256(JSON.stringify({
    product: user.product_context,
    icp: user.icp_definition,
  }));
}
```

When user updates product/ICP → all their personalization entries become stale → regenerate on next view.

---

## 12. Failure Handling

### 12.1 Client Failures

| Failure | Fallback |
|---------|----------|
| Extraction script blocked by CSP | Skip page, continue with others |
| OCR worker crashes | Use DOM-only data |
| Network failure during crawl | Return partial extraction |
| Tab close mid-crawl | Save progress to local cache, resume next time |
| Rate limit on social API | Skip that source, mark in payload |

### 12.2 Server Failures

| Failure | Fallback |
|---------|----------|
| LLM returns malformed JSON | Retry once, then mark intel `degraded` |
| LLM rate limit | Queue request, return cached if exists |
| LLM timeout | Use signal-merger output directly (no AI synthesis) |
| Database down | Return error, no fallback (client retries) |
| CRM push fails | Queue for retry, notify user |

### 12.3 Cache Failures

| Failure | Fallback |
|---------|----------|
| Stale data older than 60d | Force full refresh, ignore cache |
| Schema mismatch (old format) | Re-process payload, migrate to new schema |
| Conflicting updates | Last-write-wins with timeline preservation |

---

## 13. Build Plan

### Week 1 — Foundation
- Postgres schema + migrations
- API skeleton: `/research`, `/cache`
- Extension scaffold: manifest, content script, popup

### Week 2 — Client Extraction
- DOM extractor (homepage)
- Smart router (page selection rules)
- Multi-page crawler (with hidden tabs)
- Local IndexedDB cache

### Week 3 — Server Pipeline
- Signal merger
- LLM client (NIM integration)
- JSON schema validation
- `global_intel` storage

### Week 4 — Shared Cache
- Per-field TTL logic
- Partial refresh
- Background refresher cron
- Timeline log

### Week 5 — OCR + Social
- Tesseract.js Web Worker
- Crop-before-OCR
- Reddit, GitHub, Product Hunt fetchers
- LinkedIn snippet via Google

### Week 6 — Personalization
- User profile schema
- Template-based personalization
- User context hashing + invalidation

### Week 7 — UX Polish
- Sidepanel report UI
- Confidence indicators
- Recency badges
- Diff alerts on revisit

### Week 8 — CRM + Production
- HubSpot adapter
- Salesforce adapter
- Push queue + retry
- Monitoring + logging
- Deploy

---

## 14. Infrastructure

### 14.1 Hosting

| Component | Service | Cost/month |
|-----------|---------|------------|
| API server | Cloudflare Workers or Fly.io | $5-10 |
| Database | Supabase or Neon (free tier OK initially) | $0-25 |
| LLM | NVIDIA NIM (free endpoint) | $0 |
| OCR | Client browsers | $0 |
| Background jobs | Cloudflare Cron or GitHub Actions | $0 |
| Object storage (screenshots if needed) | Cloudflare R2 | $0-5 |
| **Total** | | **$5-40/month** |

### 14.2 Scaling Notes

- Postgres can handle 100K-1M companies on cheap tier
- LLM rate limits = primary bottleneck; mitigate with shared cache hit rate
- Once shared cache hit rate >80%, infra cost flatlines even at 10x user growth

### 14.3 Monitoring

Track:
- Cache hit rate (target: >70% within 4 weeks of launch)
- LLM calls per active user per day (target: <5)
- p95 research latency (target: <8s cold, <500ms warm)
- LLM JSON parse failure rate (target: <2%)
- CRM push success rate (target: >98%)

---

## Appendix A — Glossary

- **Base intel**: company-level facts, shared globally
- **Personalization**: user-specific outreach + scoring
- **Cache hit**: domain already in global_intel, returned without LLM
- **Partial refresh**: only stale fields re-fetched
- **Smart router**: rule-based page priority scorer
- **Signal**: structured business observation (hiring, funding, tech change)
- **Timeline**: chronological log of signals per company
- **Watch**: subscription to signal changes for alerts

---

## Appendix B — Cost Comparison

| Scenario | Naive Cost | Optimized Cost | Savings |
|----------|-----------|----------------|---------|
| 1 user, 100 companies | 100 LLM calls + 100 OCR | 100 LLM + 0 OCR | OCR cost gone |
| 1000 users, same 100 companies | 100,000 LLM calls | 100 + 1000 personalizations | 99% LLM |
| 10,000 users, same 1000 popular companies | 10M LLM calls | 1000 + 10K personalizations | 99.9% LLM |

Shared cache wins more as user base grows.

---

## Appendix C — Key Decisions Locked

1. **Client does extraction + OCR** — saves server compute
2. **Single LLM provider** (NIM free) — no model tiering needed
3. **Shared global cache by domain** — multi-tenant cost saver
4. **Per-field TTLs** — partial refresh > full refresh
5. **Template-first personalization** — LLM only for premium tier
6. **JSON-schema enforced LLM output** — reliability
7. **Background refresh for hot companies** — UX feels instant
8. **Timeline of signals** — diff alerts = retention hook

---

**End of Document.**
