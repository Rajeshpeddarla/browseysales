import type { BaseIntel, ExtractedPayload } from './types';
import { generateWithFallbacks } from '@/lib/llm-providers';

async function callSinglePass(context: string): Promise<any> {
  console.log(`[Multi-Pass] Starting unified extraction pass...`);
  
  const systemPrompt = `You are Browsey AI Intelligence Engine.
Extract specific signals from the provided company context.
Output ONLY a valid JSON object matching the EXACT schema provided. No prose, no markdown fences.`;

  const schema = `{
  "core": {
    "summary_1_line": "string",
    "summary_paragraph": "string",
    "industry": "string",
    "founders": ["string"],
    "growth_stage": "early | growth | scale | enterprise",
    "employee_estimate": "1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1000+",
    "competitors": ["string"],
    "recent_news": ["string"]
  },
  "security": {
    "enterprise_readiness": 0-100,
    "risk_flags": ["string"],
    "security_signals": [{ "signal": "string", "evidence": "string", "confidence": 0-1 }]
  },
  "hiring": {
    "active_roles": ["string"],
    "top_role": "string|null",
    "team_growth_signals": ["string"]
  },
  "pricing": {
    "tiers": ["string"],
    "model": "string",
    "starting_price": "string|null",
    "business_model": "SaaS | services | marketplace | other"
  },
  "tech": {
    "tech_stack": ["string"],
    "technology_intelligence": {
      "frontend": ["string"],
      "crm": ["string"],
      "recent_changes": ["string"],
      "confidence": 0-1,
      "evidence": ["string"]
    }
  },
  "gtm": {
    "decision_makers_likely": [{ "role": "string", "why": "string" }],
    "stakeholders": [{ "role": "string", "influence": "high|medium|low", "department": "string", "best_message_angle": "string", "confidence": 0-1, "evidence": ["string"] }],
    "buying_intent": { "score": 0-100, "urgency": "low|medium|high", "confidence": 0-1, "likely_needs": ["string"], "reasons": ["string"], "evidence": ["string"] }
  },
  "product": {
    "pain_points": [{ "pain": "string", "why": "string", "evidence": "string" }],
    "growth_signals": [{ "signal": "string", "evidence": "string", "confidence": 0-1 }]
  }
}`;

  const userPrompt = `CONTEXT:
${context}

OUTPUT SCHEMA:
${schema}`;

  const result = await generateWithFallbacks({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    responseFormatJson: true, 
    maxTokens: 4000,
    temperature: 0.1,
    agentRole: 'formatting', 
    timeoutMs: 120000,
  });

  let raw = result.content.trim();
  
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    raw = raw.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Multi-Pass] Failed to parse unified JSON. Returning empty object. Raw output was:`, raw.slice(0, 150));
    return {};
  }
}

export async function executeMultiPassExtraction(
  payload: ExtractedPayload,
  contextString: string
): Promise<BaseIntel> {
  const extracted = await callSinglePass(contextString);

  const core = extracted.core || {};
  const security = extracted.security || {};
  const hiring = extracted.hiring || {};
  const pricing = extracted.pricing || {};
  const tech = extracted.tech || {};
  const gtm = extracted.gtm || {};
  const product = extracted.product || {};

  // Merge into BaseIntel
  const baseIntel: BaseIntel = {
    summary_1_line: core.summary_1_line || '',
    summary_paragraph: core.summary_paragraph || '',
    industry: core.industry || 'Unknown',
    founders: core.founders || [],
    growth_stage: core.growth_stage || 'growth',
    employee_estimate: core.employee_estimate || 'Unknown',
    tech_stack: tech.tech_stack || [],
    growth_signals: product.growth_signals || [],
    pain_points: product.pain_points || [],
    decision_makers_likely: gtm.decision_makers_likely || [],
    competitors: core.competitors || [],
    risk_flags: security.risk_flags || [],
    pricing: {
      tiers: pricing.tiers || [],
      model: pricing.model || 'Unknown',
      starting_price: pricing.starting_price || null
    },
    hiring: {
      active_roles: hiring.active_roles || [],
      top_role: hiring.top_role || null,
      team_growth_signals: hiring.team_growth_signals || []
    },
    recent_news: core.recent_news || [],
    company_summary: {
      short: core.summary_1_line || '',
      long: core.summary_paragraph || '',
      industry: core.industry || 'Unknown',
      business_model: pricing.business_model || null,
      target_market: null,
      growth_stage: core.growth_stage || 'growth',
      go_to_market: null,
      confidence: 0.8,
      evidence: []
    },
    buying_intent: gtm.buying_intent || {
      score: 50,
      urgency: 'low',
      confidence: 0.5,
      likely_needs: [],
      reasons: [],
      evidence: []
    },
    stakeholders: gtm.stakeholders || [],
    technology_intelligence: tech.technology_intelligence || {
      frontend: [],
      crm: [],
      recent_changes: [],
      confidence: 0.5,
      evidence: []
    },
    maturity_analysis: {
      company_stage: core.growth_stage || 'growth',
      sales_maturity: 'developing',
      enterprise_readiness: security.enterprise_readiness || 50,
      product_maturity: 50,
      confidence: 0.8,
      evidence: (security.security_signals || []).map((s: any) => s.signal) || []
    }
  };

  return baseIntel;
}
