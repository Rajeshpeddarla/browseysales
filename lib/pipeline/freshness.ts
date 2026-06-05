// ============================================================
// P3 — Freshness Scoring
// Every signal gets a freshness_score (0-100) that decays
// over time based on signal-specific decay rates.
// ============================================================

import type { SourceType, FreshnessWeightedSignal } from './types';

// How long (in hours) each signal type stays "fresh" before decaying to 0
const SIGNAL_DECAY_HOURS: Record<string, number> = {
  // High-velocity signals — decay fast
  recent_news:       24,
  social_posts:      12,
  github_activity:   24,
  job_posting:       72,   // 3 days

  // Medium-velocity signals
  hiring_roles:      72,   // 3 days
  funding:           168,  // 7 days
  pricing:           336,  // 14 days
  tech_stack:        336,  // 14 days
  customers:         336,  // 14 days

  // Low-velocity signals — stay fresh longer
  company_description: 720, // 30 days
  integrations:        336, // 14 days
  security_page:       720, // 30 days

  // Default for unknown signal types
  default:           168,  // 7 days
};

/**
 * Compute freshness score (0-100) for a signal detected at a given time.
 * Score = 100 at detection, decays linearly to 0 at expiry.
 */
export function computeFreshnessScore(
  detectedAt: string | Date,
  signalType: string
): number {
  const decayHours = SIGNAL_DECAY_HOURS[signalType] ?? SIGNAL_DECAY_HOURS.default;
  const decayMs = decayHours * 60 * 60 * 1000;

  const detectedMs = new Date(detectedAt).getTime();
  const ageMs = Date.now() - detectedMs;

  if (ageMs <= 0) return 100;
  if (ageMs >= decayMs) return 0;

  return Math.round(100 * (1 - ageMs / decayMs));
}

/**
 * Get expiry hours for a signal type.
 */
export function getExpiryHours(signalType: string): number {
  return SIGNAL_DECAY_HOURS[signalType] ?? SIGNAL_DECAY_HOURS.default;
}

/**
 * Build a FreshnessWeightedSignal from a raw signal.
 */
export function buildFreshnessSignal(
  signal: string,
  signalType: string,
  sourceType: SourceType,
  detectedAt?: string
): FreshnessWeightedSignal {
  const now = detectedAt || new Date().toISOString();
  return {
    signal,
    freshness_score: computeFreshnessScore(now, signalType),
    detected_at: now,
    expires_after_hours: getExpiryHours(signalType),
    source_type: sourceType,
  };
}

/**
 * Freshness label for UI display.
 */
export function freshnessLabel(score: number): string {
  if (score >= 80) return 'live';
  if (score >= 50) return 'recent';
  if (score >= 20) return 'aging';
  return 'stale';
}
