// ============================================================
// P4 — Source Reliability Engine
// Every signal gets a source_type and trust_level.
// Confidence = base_confidence × trust_multiplier
// ============================================================

import type { SourceType, TrustLevel, SourceReliability } from './types';

// Trust map: how reliable is each source type?
export const SOURCE_TRUST: Record<SourceType, SourceReliability> = {
  careers_page:  { source_type: 'careers_page',  trust_level: 'high',   trust_multiplier: 0.95 },
  github:        { source_type: 'github',         trust_level: 'high',   trust_multiplier: 0.92 },
  pricing_page:  { source_type: 'pricing_page',   trust_level: 'high',   trust_multiplier: 0.90 },
  page_text:     { source_type: 'page_text',      trust_level: 'high',   trust_multiplier: 0.85 },
  news:          { source_type: 'news',           trust_level: 'medium', trust_multiplier: 0.78 },
  tavily:        { source_type: 'tavily',         trust_level: 'medium', trust_multiplier: 0.75 },
  social:        { source_type: 'social',         trust_level: 'medium', trust_multiplier: 0.70 },
  reddit:        { source_type: 'reddit',         trust_level: 'medium', trust_multiplier: 0.65 },
  g2:            { source_type: 'g2',             trust_level: 'medium', trust_multiplier: 0.72 },
  glassdoor:     { source_type: 'glassdoor',      trust_level: 'medium', trust_multiplier: 0.68 },
  ai_inference:  { source_type: 'ai_inference',   trust_level: 'low',    trust_multiplier: 0.55 },
};

/**
 * Apply trust multiplier to a base confidence score.
 * Clamps result to [0, 1].
 */
export function applyTrust(baseConfidence: number, sourceType: SourceType): number {
  const trust = SOURCE_TRUST[sourceType]?.trust_multiplier ?? 0.6;
  return Math.min(1, Math.max(0, baseConfidence * trust));
}

/**
 * Infer source type from a signal key or evidence string.
 */
export function inferSourceType(signalKey: string, evidence: string): SourceType {
  const e = evidence.toLowerCase();
  const k = signalKey.toLowerCase();

  if (/careers|jobs|hiring/.test(k) || /careers\./.test(e)) return 'careers_page';
  if (/github/.test(e)) return 'github';
  if (/pricing|plans|price/.test(k) || /pricing\./.test(e)) return 'pricing_page';
  if (/reddit/.test(e)) return 'reddit';
  if (/g2\.com/.test(e)) return 'g2';
  if (/glassdoor/.test(e)) return 'glassdoor';
  if (/tavily|news|techcrunch|venturebeat|bloomberg/.test(e)) return 'tavily';
  if (/twitter|linkedin|social/.test(e)) return 'social';
  if (/ai inference|inferred|llm/.test(e)) return 'ai_inference';
  return 'page_text';
}

/**
 * Get trust level label for display.
 */
export function getTrustLabel(sourceType: SourceType): TrustLevel {
  return SOURCE_TRUST[sourceType]?.trust_level ?? 'low';
}
