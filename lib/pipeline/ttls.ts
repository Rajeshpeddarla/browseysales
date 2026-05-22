// ============================================================
// Per-Field TTL Configuration
// Different facts go stale at different rates
// ============================================================

export interface TTLConfig {
  field: string;
  ttl_ms: number;
  label: string;
}

// TTL durations in milliseconds
const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

export const FIELD_TTLS: Record<string, number> = {
  company_description: 30 * DAY,
  summary_1_line: 30 * DAY,
  summary_paragraph: 30 * DAY,
  industry: 30 * DAY,
  growth_stage: 14 * DAY,
  employee_estimate: 14 * DAY,
  tech_stack: 14 * DAY,
  pricing: 14 * DAY,
  customers: 14 * DAY,
  competitors: 14 * DAY,
  funding: 7 * DAY,
  hiring: 3 * DAY,
  hiring_roles: 3 * DAY,
  recent_news: 24 * HOUR,
  social_posts: 12 * HOUR,
  github_activity: 24 * HOUR,
  growth_signals: 7 * DAY,
  pain_points: 14 * DAY,
  decision_makers_likely: 14 * DAY,
  risk_flags: 7 * DAY,
};

/**
 * Get TTL for a specific field in milliseconds
 */
export function getFieldTTL(field: string): number {
  return FIELD_TTLS[field] ?? 7 * DAY; // Default: 7 days
}

/**
 * Check if a field is stale based on its timestamp
 */
export function isFieldStale(field: string, lastUpdated: string | null): boolean {
  if (!lastUpdated) return true;
  const age = Date.now() - new Date(lastUpdated).getTime();
  return age > getFieldTTL(field);
}

/**
 * Get remaining TTL for a field in milliseconds
 */
export function getFieldTTLRemaining(field: string, lastUpdated: string | null): number {
  if (!lastUpdated) return 0;
  const age = Date.now() - new Date(lastUpdated).getTime();
  const ttl = getFieldTTL(field);
  return Math.max(0, ttl - age);
}

/**
 * Identify all stale fields from field_timestamps
 */
export function identifyStaleFields(
  fieldTimestamps: Record<string, string>
): string[] {
  const stale: string[] = [];

  for (const field of Object.keys(FIELD_TTLS)) {
    const timestamp = fieldTimestamps[field] || null;
    if (isFieldStale(field, timestamp)) {
      stale.push(field);
    }
  }

  return stale;
}

/**
 * Build a freshness map for all tracked fields
 */
export function buildFreshnessMap(
  fieldTimestamps: Record<string, string>
): Record<string, string> {
  const map: Record<string, string> = {};

  for (const field of Object.keys(FIELD_TTLS)) {
    const timestamp = fieldTimestamps[field] || null;
    if (!timestamp) {
      map[field] = 'missing';
    } else {
      const remaining = getFieldTTLRemaining(field, timestamp);
      const ttl = getFieldTTL(field);
      if (remaining <= 0) {
        map[field] = 'stale';
      } else if (remaining < ttl * 0.25) {
        map[field] = 'stale_but_acceptable';
      } else {
        map[field] = 'fresh';
      }
    }
  }

  return map;
}

/**
 * Create initial field timestamps (all set to now)
 */
export function createInitialTimestamps(): Record<string, string> {
  const now = new Date().toISOString();
  const timestamps: Record<string, string> = {};
  for (const field of Object.keys(FIELD_TTLS)) {
    timestamps[field] = now;
  }
  return timestamps;
}
