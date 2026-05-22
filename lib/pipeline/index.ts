// ============================================================
// Pipeline — Barrel Export
// ============================================================

export { runResearchPipeline } from './orchestrator';
export { checkCache, getCachedIntel, getTimeline } from './cache-manager';
export { getOrGeneratePersonalization, hashUserContext } from './personalizer';
export { mergeAndValidatePayload } from './signal-merger';
export { FIELD_TTLS, identifyStaleFields, buildFreshnessMap } from './ttls';
export type {
  ExtractedPayload,
  ResearchRequest,
  ResearchResponse,
  BaseIntel,
  PersonalizedIntel,
  CacheCheckResponse,
  GlobalIntelRow,
  HomepageExtraction,
  CrawledPage,
  SocialSignals,
  TimelineEntry,
  WatchSubscription,
} from './types';
