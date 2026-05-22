// ============================================================
// LLM Client — NVIDIA NIM Wrapper with Retry + JSON Validation
// Single call per company for base intel. Forced JSON output.
// ============================================================

import type { BaseIntel, ExtractedPayload, PersonalizedIntel } from './types';
import { generateWithFallbacks } from '@/lib/llm-providers';
import { analyzePayloadSignals } from './signal-engine';

// --- System Prompts ---

const BASE_INTEL_SYSTEM_PROMPT = `You are Browsey AI Intelligence Engine, a real-time revenue intelligence analyst.
You do not summarize websites. You detect buying intent, growth signals, why-now triggers, operational pain, stakeholders, maturity, competitive positioning, and outreach opportunities.
Use only the provided evidence. Every major inference must include confidence and evidence. If evidence is weak, lower confidence and say what is missing.
Never invent named people, funding rounds, customers, or technologies. Role-level stakeholders are allowed when names are not present.
QUALITY BAR:
- Do not write generic action items like "focus on platform engineering" or repeat the same recommendation.
- Each pain point must state a business consequence and cite a source signal.
- Each recommended action must be a concrete sales move: who to target, what to reference, what question to ask, or what proof to bring.
- Buying intent means "likely to buy a category of software/service soon"; account value alone is not buying intent.
- If the company is a large vendor, distinguish "high-value account" from "high buying intent".
Output ONLY the raw JSON object. No prose. No commentary. No markdown fences.`;

const PERSONALIZATION_SYSTEM_PROMPT = `You are a world-class enterprise B2B sales copywriter and personalization expert. Given company intelligence and a user's sales context (product details, ICP target), generate highly targeted, personalized outreach hooks and talking points.
CRITICAL RULES FOR OUTREACH HOOKS:
1. NEVER start with generic formulas like "I see you use [Tech]", "I noticed you are in the [Industry] space", or "Congrats on the growth!".
2. Connect the value proposition of the USER'S product directly to the TARGET company's specific situation, features, or pain points (e.g. self-hosting, privacy-first, desktop clients, or post-funding challenges).
3. The email hook must be a concise, direct teaser (max 2 sentences) that highlights a clear business outcome.
4. The LinkedIn hook must be highly conversational, casual, and end in a soft, low-friction query (e.g., "Curious if that's a priority for the engineering team right now?").
5. The cold call opener must be a direct, engaging pain-opener hook.
Output ONLY a raw JSON object matching the schema. No prose. No commentary. No markdown fences.`;

// --- Schema Templates ---

const BASE_INTEL_SCHEMA = `{
  "summary_1_line": "string - one sentence company summary",
  "summary_paragraph": "string - 2-3 paragraph detailed summary",
  "industry": "string - primary industry",
  "growth_stage": "early | growth | scale | enterprise",
  "employee_estimate": "MUST be EXACTLY one of: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+'. Use the LOWEST plausible band based on evidence. If uncertain, use '11-50'. NEVER output a range like '50-200'.",
  "tech_stack": ["string array of SPECIFIC technologies only — e.g. React, PostgreSQL, AWS Lambda. NEVER generic terms like 'Cloud Computing' or 'Software'."],
  "growth_signals": [{ "signal": "string", "evidence": "string", "confidence": 0.0-1.0 }],
  "pain_points": [{ "pain": "string", "why": "string", "evidence": "string" }],
  "decision_makers_likely": [{ "role": "string", "why": "string" }],
  "competitors": ["string array"],
  "risk_flags": ["string array"],
  "pricing": { "tiers": ["string"], "model": "string", "starting_price": "string|null" },
  "hiring": { "active_roles": ["string"], "top_role": "string|null", "team_growth_signals": ["string"] },
  "customers": { "logos": ["string"], "case_studies": ["string"] },
  "recent_news": ["string array"]
}`;

const ADVANCED_INTEL_SCHEMA = `Also include these advanced revenue-intelligence fields in the same JSON object:
{
  "company_summary": {
    "short": "string",
    "long": "string",
    "industry": "string",
    "business_model": "SaaS | services | marketplace | ecommerce | media | open_source | agency | other | null",
    "target_market": "string|null",
    "growth_stage": "early | growth | scale | enterprise",
    "go_to_market": "product-led | sales-led | hybrid | unknown",
    "confidence": 0.0-1.0,
    "evidence": ["specific source signals"]
  },
  "buying_intent": {
    "score": 0-100,
    "urgency": "low | medium | high",
    "confidence": 0.0-1.0,
    "likely_needs": ["software or services they may buy"],
    "reasons": ["why they are likely to buy"],
    "evidence": ["hiring, pricing, integrations, docs, security, social, changelog, or page signals"]
  },
  "why_now": ["specific timely triggers or missing evidence if none"],
  "stakeholders": [{
    "role": "string role, not invented person name",
    "influence": "low | medium | high",
    "department": "string",
    "likely_goals": ["string"],
    "best_message_angle": "string",
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  }],
  "outreach_strategy": {
    "best_channel": "email | linkedin | call | multi-touch",
    "best_angle": "growth pain | cost savings | risk reduction | revenue expansion | technical migration | other",
    "recommended_hook": "specific hook based on evidence",
    "likely_objections": ["string"],
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  },
  "competitive_intelligence": {
    "primary_competitors": ["string"],
    "positioning": "string",
    "market_strategy": "string",
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  },
  "technology_intelligence": {
    "frontend": ["string"],
    "analytics": ["string"],
    "crm": ["string"],
    "payments": ["string"],
    "support": ["string"],
    "recent_changes": ["string"],
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  },
  "maturity_analysis": {
    "company_stage": "early | growth | scale | enterprise",
    "sales_maturity": "basic | developing | advanced",
    "enterprise_readiness": 0-100,
    "product_maturity": 0-100,
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  },
  "predictive_intelligence": {
    "funding_likelihood": 0-100,
    "scaling_probability": 0-100,
    "enterprise_expansion": 0-100,
    "operational_bottlenecks": ["string"],
    "confidence": 0.0-1.0,
    "evidence": ["source signals"]
  },
  "action_recommendations": ["specific next actions for a sales rep"]
}`;

const PERSONALIZATION_SCHEMA = `{
  "icp_match_score": 0-100,
  "icp_match_reasoning": "string",
  "top_3_hooks": [
    { "hook": "string - the outreach message", "channel": "email | linkedin | call", "why_it_works": "string" }
  ],
  "talking_points": ["string array"],
  "objections_anticipated": ["string array"]
}`;

// --- Core LLM Call ---

interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

async function callLLM(options: LLMCallOptions): Promise<string> {
  const { systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.2 } = options;

  const result = await generateWithFallbacks({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    responseFormatJson: true,
    maxTokens,
    temperature,
    timeoutMs: 60000,
  });

  return result.content;
}

/**
 * Extract JSON from a potentially wrapped response
 */
function extractJSON(raw: string): string {
  let str = raw.trim();

  // Remove markdown fences
  if (str.startsWith('```')) {
    str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Find first { and last }
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    str = str.substring(firstBrace, lastBrace + 1);
  }

  return str;
}

/**
 * Parse and validate JSON with retry
 */
async function parseWithRetry<T>(
  raw: string,
  validator: (obj: unknown) => obj is T,
  retryFn: () => Promise<string>
): Promise<{ data: T; degraded: boolean }> {
  // First attempt
  try {
    const jsonStr = extractJSON(raw);
    const parsed = JSON.parse(jsonStr);
    if (validator(parsed)) {
      return { data: parsed, degraded: false };
    }
  } catch {
    // Parse failed, will retry
  }

  // Retry once
  try {
    const retryRaw = await retryFn();
    const jsonStr = extractJSON(retryRaw);
    const parsed = JSON.parse(jsonStr);
    if (validator(parsed)) {
      return { data: parsed, degraded: false };
    }
  } catch {
    // Second parse also failed
  }

  throw new Error('Failed to parse LLM response after 2 attempts');
}

// --- Validators ---

const VALID_EMPLOYEE_BANDS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

/**
 * Normalize employee_estimate to a valid band.
 * Handles cases where LLM returns "50-200", "200", "~100", etc.
 */
function normalizeEmployeeBand(raw: unknown): string {
  if (typeof raw !== 'string') return '11-50';
  const s = raw.trim();
  // Already valid
  if (VALID_EMPLOYEE_BANDS.includes(s)) return s;

  // Try to extract a number from the string
  const nums = s.match(/\d+/g);
  if (!nums) return '11-50';

  // Use the lower bound of any range given
  const lower = parseInt(nums[0], 10);
  if (lower <= 10) return '1-10';
  if (lower <= 50) return '11-50';
  if (lower <= 200) return '51-200';
  if (lower <= 500) return '201-500';
  if (lower <= 1000) return '501-1000';
  return '1000+';
}

function isBaseIntel(obj: unknown): obj is BaseIntel {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  // Normalize employee_estimate to a valid band
  if (o.employee_estimate !== undefined) {
    o.employee_estimate = normalizeEmployeeBand(o.employee_estimate);
  }
  // Minimal validation — must have at least summary and industry
  return (
    typeof o.summary_1_line === 'string' ||
    typeof o.summary_paragraph === 'string' ||
    typeof o.industry === 'string'
  );
}

function isPersonalizedIntel(obj: unknown): obj is PersonalizedIntel {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.icp_match_score === 'number' || Array.isArray(o.top_3_hooks);
}

// --- Public API ---

/**
 * Build the user prompt from merged payload
 */
function buildBaseIntelPrompt(payload: ExtractedPayload): string {
  const sections: string[] = ['COMPANY SIGNALS:'];
  const deterministicSignals = analyzePayloadSignals(payload);

  // Homepage data
  if (payload.homepage) {
    sections.push(`\nDOMAIN: ${payload.homepage.domain}`);
    sections.push(`URL: ${payload.homepage.url}`);

    if (payload.homepage.meta) {
      sections.push(`TITLE: ${payload.homepage.meta.title}`);
      sections.push(`DESCRIPTION: ${payload.homepage.meta.description}`);
    }

    if (payload.homepage.headings) {
      const h1 = payload.homepage.headings.h1?.join(', ') || '';
      const h2 = payload.homepage.headings.h2?.slice(0, 5).join(', ') || '';
      if (h1) sections.push(`H1: ${h1}`);
      if (h2) sections.push(`H2: ${h2}`);
    }

    if (payload.homepage.tech_hints) {
      const hints = payload.homepage.tech_hints;
      if (hints.frameworks?.length) sections.push(`DETECTED FRAMEWORKS: ${hints.frameworks.join(', ')}`);
      if (hints.analytics?.length) sections.push(`ANALYTICS: ${hints.analytics.join(', ')}`);
      if (hints.payment?.length) sections.push(`PAYMENT: ${hints.payment.join(', ')}`);
      if (hints.cms) sections.push(`CMS: ${hints.cms}`);
    }

    if (payload.homepage.social_links) {
      const links = Object.entries(payload.homepage.social_links)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (links) sections.push(`SOCIAL: ${links}`);
    }

    if (payload.homepage.buttons?.length) {
      sections.push(`CTA BUTTONS: ${payload.homepage.buttons.map(b => b.text).join(', ')}`);
    }

    sections.push(`HAS PRICING TABLE: ${payload.homepage.has_pricing_table}`);
    sections.push(`HAS LOGO WALL: ${payload.homepage.has_logo_wall} (${payload.homepage.logo_wall_count} logos)`);

    // Truncate visible text
    if (payload.homepage.visible_text) {
      sections.push(`\nHOMEPAGE TEXT (truncated):\n${payload.homepage.visible_text.slice(0, 8000)}`);
    }
  }

  if (deterministicSignals.findings.length) {
    sections.push('\nDETERMINISTIC SIGNALS DETECTED:');
    for (const finding of deterministicSignals.findings) {
      sections.push(`- ${finding.label} (confidence ${finding.confidence}): ${finding.evidence}`);
    }
    sections.push(`PRIORITY PAGE TYPES CRAWLED: ${Array.from(deterministicSignals.pageTypes).join(', ') || 'none'}`);
  }

  // Sub-pages
  if (payload.pages?.length) {
    sections.push('\nSUB-PAGES:');
    for (const page of payload.pages) {
      sections.push(`\n--- ${page.type.toUpperCase()} PAGE: ${page.url} ---`);
      sections.push(page.visible_text.slice(0, 3000));
      if (page.ocr_text) {
        sections.push(`OCR TEXT: ${page.ocr_text.slice(0, 1000)}`);
      }
    }
  }

  // Social signals
  if (payload.social_signals) {
    sections.push('\nSOCIAL SIGNALS:');

    if (payload.social_signals.linkedin_scraped_posts?.length) {
      sections.push('LIVE LINKEDIN POSTS FROM PAST WEEK (first 3-4):');
      for (const post of payload.social_signals.linkedin_scraped_posts) {
        sections.push(`  - "${post.slice(0, 800)}"`);
      }
    }

    if (payload.social_signals.twitter_scraped_posts?.length) {
      sections.push('LIVE TWITTER/X POSTS FROM PAST WEEK (first 3-4):');
      for (const tweet of payload.social_signals.twitter_scraped_posts) {
        sections.push(`  - "${tweet.slice(0, 800)}"`);
      }
    }

    if (payload.social_signals.reddit?.posts?.length) {
      sections.push('REDDIT:');
      for (const post of payload.social_signals.reddit.posts.slice(0, 3)) {
        sections.push(`  - "${post.title}" (r/${post.subreddit}, score: ${post.score})`);
      }
    }

    if (payload.social_signals.github) {
      const gh = payload.social_signals.github;
      sections.push(`GITHUB: ${gh.org_name} — ${gh.public_repos} repos, ${gh.followers} followers`);
      if (gh.recent_repos?.length) {
        sections.push(`  Top repos: ${gh.recent_repos.slice(0, 3).map(r => `${r.name} (★${r.stars})`).join(', ')}`);
      }
    }

    if (payload.social_signals.producthunt?.products?.length) {
      sections.push('PRODUCT HUNT:');
      for (const prod of payload.social_signals.producthunt.products.slice(0, 2)) {
        sections.push(`  - "${prod.name}": ${prod.tagline} (${prod.votes} votes)`);
      }
    }
  }

  // OCR results
  if (payload.ocr_results?.length) {
    sections.push('\nOCR RESULTS:');
    for (const ocr of payload.ocr_results) {
      sections.push(`  ${ocr.page_type}: ${ocr.text.slice(0, 500)} (confidence: ${ocr.confidence})`);
    }
  }

  sections.push(`\nANALYSIS TASK ORDER:
1. Understand company and business model.
2. Detect growth, enterprise, hiring, integration, docs/API, pricing, customer proof, and social signals.
3. Decide buying intent separately from account value.
4. Identify operational pain with evidence.
5. Identify role-level stakeholders without inventing names.
6. Create non-duplicative, concrete next actions.`);

  sections.push(`\nOUTPUT SCHEMA:\n${BASE_INTEL_SCHEMA}\n\n${ADVANCED_INTEL_SCHEMA}`);

  return sections.join('\n');
}

/**
 * Generate base intel from extracted payload
 */
export async function generateBaseIntel(
  payload: ExtractedPayload
): Promise<{ intel: BaseIntel; degraded: boolean }> {
  const userPrompt = buildBaseIntelPrompt(payload);

  const callFn = () =>
    callLLM({
      systemPrompt: BASE_INTEL_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 6000,
      temperature: 0.2,
    });

  try {
    const raw = await callFn();
    const result = await parseWithRetry<BaseIntel>(raw, isBaseIntel, callFn);
    return { intel: result.data, degraded: result.degraded };
  } catch (error) {
    console.error('[LLM Pipeline] generateBaseIntel failed:', error);
    // After 2 failures, return degraded intel from extraction
    return {
      intel: createDegradedIntel(payload),
      degraded: true,
    };
  }
}

/**
 * Generate personalized intel for a user
 */
export async function generatePersonalization(
  baseIntel: BaseIntel,
  userContext: {
    product: string | null;
    icp: Record<string, unknown> | null;
    past_wins: string | null;
  }
): Promise<{ personalized: PersonalizedIntel; degraded: boolean }> {
  const userPrompt = `COMPANY INTEL:
${JSON.stringify(baseIntel, null, 2)}

USER CONTEXT:
  Product: ${userContext.product || 'Not specified'}
  ICP: ${userContext.icp ? JSON.stringify(userContext.icp) : 'Not specified'}
  Past wins: ${userContext.past_wins || 'Not specified'}

GENERATE the following JSON:
${PERSONALIZATION_SCHEMA}`;

  const callFn = () =>
    callLLM({
      systemPrompt: PERSONALIZATION_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 800,
      temperature: 0.3,
    });

  try {
    const raw = await callFn();
    const result = await parseWithRetry<PersonalizedIntel>(
      raw,
      isPersonalizedIntel,
      callFn
    );
    return { personalized: result.data, degraded: result.degraded };
  } catch {
    return {
      personalized: createDegradedPersonalization(),
      degraded: true,
    };
  }
}

/**
 * Generate partial refresh for specific stale fields
 */
export async function generatePartialRefresh(
  domain: string,
  staleFields: string[],
  payload: ExtractedPayload | null
): Promise<{ updates: Partial<BaseIntel>; degraded: boolean }> {
  const fieldsList = staleFields.join(', ');
  const contextText = payload
    ? `Available signals: ${JSON.stringify(payload.homepage?.meta || {}).slice(0, 1000)}`
    : `Domain: ${domain}`;

  const userPrompt = `Refresh ONLY these stale fields for ${domain}: ${fieldsList}

${contextText}

Return JSON with ONLY the requested fields. Example if stale fields are "hiring, recent_news":
{
  "hiring": { "active_roles": [...], "top_role": "...", "team_growth_signals": [...] },
  "recent_news": [...]
}`;

  try {
    const raw = await callLLM({
      systemPrompt: BASE_INTEL_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 1000,
      temperature: 0.2,
    });

    const jsonStr = extractJSON(raw);
    const updates = JSON.parse(jsonStr) as Partial<BaseIntel>;
    return { updates, degraded: false };
  } catch {
    return { updates: {}, degraded: true };
  }
}

// --- Fallback / Degraded Generators ---

function createDegradedIntel(payload: ExtractedPayload): BaseIntel {
  const homepage = payload.homepage;
  return {
    summary_1_line: homepage?.meta?.description || `Company at ${homepage?.domain || 'unknown'}`,
    summary_paragraph: homepage?.visible_text?.slice(0, 500) || '',
    industry: 'Technology',
    growth_stage: 'growth',
    employee_estimate: 'Unknown',
    tech_stack: homepage?.tech_hints?.frameworks || [],
    growth_signals: [],
    pain_points: [],
    decision_makers_likely: [],
    competitors: [],
    risk_flags: ['Data generated in degraded mode — AI synthesis unavailable'],
    pricing: homepage?.has_pricing_table
      ? { tiers: [], model: 'Unknown', starting_price: null }
      : undefined,
    hiring: undefined,
    customers: homepage?.has_logo_wall
      ? { logos: [], case_studies: [] }
      : undefined,
    recent_news: [],
  };
}

function createDegradedPersonalization(): PersonalizedIntel {
  return {
    icp_match_score: 50,
    icp_match_reasoning: 'Unable to generate — personalization ran in degraded mode.',
    top_3_hooks: [
      {
        hook: 'I noticed your company is growing. Would love to share how we help similar teams.',
        channel: 'email',
        why_it_works: 'Generic growth hook — personalization unavailable.',
      },
    ],
    talking_points: ['Growth trajectory', 'Industry challenges', 'Technology adoption'],
    objections_anticipated: ['Budget concerns', 'Existing solutions'],
  };
}
