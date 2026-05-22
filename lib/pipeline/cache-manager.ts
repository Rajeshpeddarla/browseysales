// ============================================================
// Cache Manager — Global Intel Cache with Per-Field TTL
// Shared across all users: one fetch serves thousands
// ============================================================

import { createClient } from '@/lib/supabase/server';
import {
  identifyStaleFields,
  buildFreshnessMap,
  createInitialTimestamps,
} from './ttls';
import type {
  GlobalIntelRow,
  BaseIntel,
  ExtractedPayload,
  CacheCheckResponse,
} from './types';

const INTEL_VERSION = 'browsey-intel-v2';

/**
 * Check if a domain exists in the global cache and whether it's fresh
 */
export async function checkCache(domain: string): Promise<CacheCheckResponse> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('global_intel')
    .select('domain, last_refreshed_at, field_timestamps, is_degraded, llm_version')
    .eq('domain', domain)
    .single();

  if (!data || data.is_degraded || data.llm_version !== INTEL_VERSION) {
    return {
      domain,
      exists: false,
      fully_fresh: false,
      stale_fields: [],
      last_refreshed_at: null,
    };
  }

  const staleFields = identifyStaleFields(data.field_timestamps || {});

  return {
    domain,
    exists: true,
    fully_fresh: staleFields.length === 0,
    stale_fields: staleFields,
    last_refreshed_at: data.last_refreshed_at,
  };
}

/**
 * Get cached global intel for a domain
 */
export async function getCachedIntel(
  domain: string
): Promise<GlobalIntelRow | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('global_intel')
    .select('*')
    .eq('domain', domain)
    .single();

  if (!data) return null;

  // Increment fetch count (fire and forget)
  supabase
    .from('global_intel')
    .update({ fetch_count: (data.fetch_count || 0) + 1 })
    .eq('domain', domain)
    .then(() => {});

  return data as GlobalIntelRow;
}

/**
 * Store new global intel for a domain
 */
export async function storeGlobalIntel(
  domain: string,
  baseIntel: BaseIntel,
  extractedPayload: ExtractedPayload | null,
  isDegraded: boolean = false
): Promise<GlobalIntelRow> {
  const supabase = await createClient();

  const summary = baseIntel.summary_1_line
    ? `${baseIntel.summary_1_line}. ${baseIntel.industry || ''}. ${baseIntel.growth_stage || ''} stage. ${baseIntel.employee_estimate || ''} employees.`
    : null;

  const row = {
    domain,
    base_intel: baseIntel as unknown as Record<string, unknown>,
    base_intel_summary: summary,
    extracted_payload: extractedPayload as unknown as Record<string, unknown>,
    fetch_count: 1,
    first_fetched_at: new Date().toISOString(),
    last_refreshed_at: new Date().toISOString(),
    field_timestamps: createInitialTimestamps(),
    is_degraded: isDegraded,
    llm_version: INTEL_VERSION,
  };

  const { data, error } = await supabase
    .from('global_intel')
    .upsert(row, { onConflict: 'domain' })
    .select()
    .single();

  if (error) throw new Error(`Failed to store global intel: ${error.message}`);
  return data as GlobalIntelRow;
}

/**
 * Update specific fields in cached intel (partial refresh)
 */
export async function updatePartialIntel(
  domain: string,
  updatedFields: Partial<BaseIntel>,
  refreshedFieldNames: string[]
): Promise<void> {
  const supabase = await createClient();

  // Get current intel
  const { data: current } = await supabase
    .from('global_intel')
    .select('base_intel, field_timestamps')
    .eq('domain', domain)
    .single();

  if (!current) throw new Error(`No cached intel for ${domain}`);

  // Merge updated fields
  const mergedIntel = {
    ...(current.base_intel as Record<string, unknown>),
    ...updatedFields,
  };

  // Update field timestamps for refreshed fields
  const timestamps = { ...(current.field_timestamps as Record<string, string>) };
  const now = new Date().toISOString();
  for (const field of refreshedFieldNames) {
    timestamps[field] = now;
  }

  const { error } = await supabase
    .from('global_intel')
    .update({
      base_intel: mergedIntel,
      field_timestamps: timestamps,
      last_refreshed_at: now,
    })
    .eq('domain', domain);

  if (error) throw new Error(`Failed to update partial intel: ${error.message}`);
}

/**
 * Get or refresh intel — the main cache orchestration function
 */
export async function getOrRefresh(
  domain: string,
  extractedPayload: ExtractedPayload | null,
  forceRefresh: boolean = false
): Promise<{
  intel: GlobalIntelRow | null;
  needsFullPipeline: boolean;
  needsPartialRefresh: boolean;
  staleFields: string[];
}> {
  if (forceRefresh) {
    return {
      intel: null,
      needsFullPipeline: true,
      needsPartialRefresh: false,
      staleFields: [],
    };
  }

  const cached = await getCachedIntel(domain);

  if (!cached || cached.is_degraded || cached.llm_version !== INTEL_VERSION) {
    return {
      intel: null,
      needsFullPipeline: true,
      needsPartialRefresh: false,
      staleFields: [],
    };
  }

  // Check field freshness
  const staleFields = identifyStaleFields(cached.field_timestamps || {});

  if (staleFields.length === 0) {
    // Fully fresh — return cached
    return {
      intel: cached,
      needsFullPipeline: false,
      needsPartialRefresh: false,
      staleFields: [],
    };
  }

  // Check if too old (60+ days) → force full refresh
  const ageMs = Date.now() - new Date(cached.last_refreshed_at).getTime();
  const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

  if (ageMs > MAX_AGE_MS) {
    return {
      intel: cached,
      needsFullPipeline: true,
      needsPartialRefresh: false,
      staleFields,
    };
  }

  // Partial refresh needed
  return {
    intel: cached,
    needsFullPipeline: false,
    needsPartialRefresh: true,
    staleFields,
  };
}

/**
 * Record a signal change in the timeline
 */
export async function recordSignalChange(
  domain: string,
  signalType: string,
  oldValue: unknown,
  newValue: unknown,
  source: string = 'client_extraction'
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('intel_signals_timeline').insert({
    domain,
    signal_type: signalType,
    old_value: oldValue as Record<string, unknown>,
    new_value: newValue as Record<string, unknown>,
    source,
  });
}

/**
 * Get recent timeline entries for a domain
 */
export async function getTimeline(
  domain: string,
  limit: number = 20
): Promise<unknown[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('intel_signals_timeline')
    .select('*')
    .eq('domain', domain)
    .order('detected_at', { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get freshness info for cached intel
 */
export function getFreshnessInfo(
  cached: GlobalIntelRow
): Record<string, string> {
  return buildFreshnessMap(cached.field_timestamps || {});
}
