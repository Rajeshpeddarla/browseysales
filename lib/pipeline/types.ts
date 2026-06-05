// ============================================================
// Browsey Optimized Pipeline — Core Type Definitions
// ============================================================

// ─── P4: Source Reliability (defined first — used by GrowthSignal/PainPoint) ──

export type SourceType =
  | 'careers_page' | 'github' | 'pricing_page' | 'social'
  | 'news' | 'ai_inference' | 'tavily' | 'page_text'
  | 'reddit' | 'g2' | 'glassdoor';

export type TrustLevel = 'high' | 'medium' | 'low';

export interface SourceReliability {
  source_type: SourceType;
  trust_level: TrustLevel;
  trust_multiplier: number;
}

// ─── P2: Change Detection ─────────────────────────────────────

export type ChangeType =
  | 'pricing_added' | 'pricing_changed' | 'pricing_removed'
  | 'cta_changed' | 'tech_added' | 'tech_removed'
  | 'hiring_increased' | 'hiring_decreased'
  | 'integration_added' | 'integration_removed'
  | 'messaging_changed' | 'security_page_added'
  | 'enterprise_tier_added' | 'funding_detected';

export interface DetectedChange {
  type: ChangeType;
  field: string;
  old_value: unknown;
  new_value: unknown;
  significance: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  detected_at: string;
}

// ─── P3: Freshness Scoring ────────────────────────────────────

export interface FreshnessWeightedSignal {
  signal: string;
  freshness_score: number;
  detected_at: string;
  expires_after_hours: number;
  source_type: string;
}

// ─── P5: External Sentiment ───────────────────────────────────

export interface ExternalSentiment {
  source: 'reddit' | 'g2' | 'glassdoor' | 'trustpilot' | 'news';
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  summary: string;
  evidence: string[];
  url?: string;
  detected_at: string;
}

// ─── P6: Signal Correlation ───────────────────────────────────

export interface CorrelatedInference {
  inference: string;
  confidence: number;
  supporting_signals: string[];
  business_implication: string;
  urgency: 'low' | 'medium' | 'high';
}

// ─── Watch Mode ───────────────────────────────────────────────

export interface WatchAlert {
  id: string;
  domain: string;
  user_id: string;
  change: DetectedChange;
  triggered_at: string;
  is_read: boolean;
}

// --- Extracted Payload Types (from Extension) ---

export interface ExtractedMeta {
  title: string;
  description: string;
  og_image: string | null;
  canonical: string | null;
  schema_org: Record<string, unknown>[];
}

export interface ExtractedHeadings {
  h1: string[];
  h2: string[];
  h3: string[];
}

export interface NavLink {
  text: string;
  href: string;
}

export interface SocialLinks {
  linkedin: string | null;
  twitter: string | null;
  github: string | null;
  youtube: string | null;
}

export interface TechHints {
  frameworks: string[];
  analytics: string[];
  cms: string | null;
  payment: string[];
}

export interface ButtonInfo {
  text: string;
  type: 'cta' | 'nav' | 'other';
}

export interface FormInfo {
  fields: string[];
  purpose: string;
}

export interface HomepageExtraction {
  url: string;
  domain: string;
  meta: ExtractedMeta;
  headings: ExtractedHeadings;
  navigation: {
    main_nav: NavLink[];
    footer_links: NavLink[];
  };
  social_links: SocialLinks;
  tech_hints: TechHints;
  visible_text: string;
  buttons: ButtonInfo[];
  forms: FormInfo[];
  has_pricing_table: boolean;
  has_logo_wall: boolean;
  logo_wall_count: number;
}

export interface CrawledPage {
  url: string;
  type: string; // 'pricing' | 'careers' | 'about' | 'customers' | etc.
  title: string;
  visible_text: string;
  ocr_text?: string;
  extracted_at: string;
  // Visual intelligence from Playwright screenshots
  screenshot_base64?: string;
  visual_signals?: string[];  // detected from screenshot: "pricing table", "RBAC UI", "audit logs panel"
  pricing_blocks?: string[];  // extracted pricing text blocks
  integration_names?: string[]; // detected integration names
  enterprise_signals?: Record<string, string[]>; // categorized enterprise signals
}

export interface NativeContact {
  full_name: string;
  title: string;
  linkedin_url: string | null;
  source: 'linkedin_native' | 'google_native';
  snippet?: string;
}

export interface GlassdoorSignal {
  rating?: string;
  pros: string[];
  cons: string[];
  culture_snippet: string;
}

export interface SocialSignals {
  linkedin_scraped_posts?: string[];
  twitter_scraped_posts?: string[];
  linkedin_screenshot?: string | null;
  twitter_screenshot?: string | null;
  native_contacts?: NativeContact[];
  glassdoor_signals?: GlassdoorSignal;
  github_intel?: any;
  google_search_intel?: string[];
  reddit?: {
    posts: { title: string; score: number; subreddit: string; url: string }[];
  };
  github?: {
    org_name: string;
    public_repos: number;
    followers: number;
    recent_repos: { name: string; stars: number; language: string }[];
  };
  producthunt?: {
    products: { name: string; tagline: string; votes: number }[];
  };
}

export interface OCRResult {
  page_url: string;
  page_type: string;
  text: string;
  confidence: number;
}

export interface ExtractedPayload {
  homepage: HomepageExtraction;
  pages: CrawledPage[];
  social_signals: SocialSignals;
  ocr_results: OCRResult[];
}

// --- Research Request/Response ---

export interface ResearchRequest {
  domain: string;
  user_id: string;
  extracted_payload?: ExtractedPayload;
  force_refresh?: boolean;
}

export interface FieldFreshness {
  field: string;
  status: 'fresh' | 'stale' | 'stale_but_acceptable' | 'missing';
  last_updated: string | null;
  ttl_remaining_ms: number;
}

export interface GrowthSignal {
  signal: string;
  evidence: string;
  confidence: number;
  // P1: Evidence-centric fields
  source_type?: SourceType;
  trust_level?: 'high' | 'medium' | 'low';
  freshness_score?: number;   // 0-100, decays over time
  detected_at?: string;       // ISO timestamp
  reasoning?: string;         // why this signal was inferred
}

export interface PainPoint {
  pain: string;
  why: string;
  evidence: string;
  // P1: Evidence-centric fields
  confidence?: number;
  source_type?: SourceType;
  trust_level?: 'high' | 'medium' | 'low';
  freshness_score?: number;
  supporting_signals?: string[];  // signal keys that back this pain
}

export interface DecisionMaker {
  role: string;
  why: string;
}

export interface BaseIntel {
  summary_1_line: string;
  summary_paragraph: string;
  industry: string;
  founders?: string[];
  growth_stage: 'early' | 'growth' | 'scale' | 'enterprise';
  employee_estimate: string;
  company_summary?: {
    short: string;
    long: string;
    industry: string;
    business_model: string | null;
    target_market: string | null;
    growth_stage: string;
    go_to_market: string | null;
    confidence: number;
    evidence: string[];
  };
  buying_intent?: {
    score: number;
    urgency: 'low' | 'medium' | 'high';
    confidence: number;
    likely_needs: string[];
    reasons: string[];
    evidence: string[];
  };
  why_now?: string[];
  tech_stack: string[];
  growth_signals: GrowthSignal[];
  pain_points: PainPoint[];
  decision_makers_likely: DecisionMaker[];
  stakeholders?: {
    role: string;
    influence: 'low' | 'medium' | 'high';
    department: string;
    likely_goals: string[];
    best_message_angle: string;
    confidence: number;
    evidence: string[];
  }[];
  outreach_strategy?: {
    best_channel: string;
    best_angle: string;
    recommended_hook: string;
    likely_objections: string[];
    confidence: number;
    evidence: string[];
  };
  competitive_intelligence?: {
    primary_competitors: string[];
    positioning: string;
    market_strategy: string;
    confidence: number;
    evidence: string[];
  };
  technology_intelligence?: {
    frontend: string[];
    analytics: string[];
    crm: string[];
    payments: string[];
    support: string[];
    recent_changes: string[];
    confidence: number;
    evidence: string[];
  };
  maturity_analysis?: {
    company_stage: string;
    sales_maturity: string;
    enterprise_readiness: number;
    product_maturity: number;
    confidence: number;
    evidence: string[];
  };
  predictive_intelligence?: {
    funding_likelihood: number;
    scaling_probability: number;
    enterprise_expansion: number;
    operational_bottlenecks: string[];
    confidence: number;
    evidence: string[];
  };
  action_recommendations?: string[];
  competitors: string[];
  risk_flags: string[];
  pricing?: {
    tiers: string[];
    model: string;
    starting_price: string | null;
  };
  hiring?: {
    active_roles: string[];
    top_role: string | null;
    team_growth_signals: string[];
  };
  customers?: {
    logos: string[];
    case_studies: string[];
  };
  recent_news?: string[];
  // P5: External sentiment
  external_sentiment?: ExternalSentiment[];
  // P6: Correlated inferences
  correlated_inferences?: CorrelatedInference[];
  // P2: Recent changes detected
  detected_changes?: DetectedChange[];
  // Data quality: 0-100, higher = deeper crawl (Playwright + more pages)
  data_quality_score?: number;
}

export interface PersonalizationHook {
  hook: string;
  subject_line?: string | null;
  channel: 'email' | 'linkedin' | 'call';
  why_it_works: string;
}

// ─── Contact / People Enrichment ─────────────────────────────

export interface Contact {
  full_name: string | null;
  title: string;
  seniority: 'c_level' | 'vp' | 'director' | 'manager' | 'individual';
  department: string;
  email: string | null;
  email_confidence: 'verified' | 'guessed' | 'pattern' | null;
  linkedin_url: string | null;
  phone: string | null;
  source: 'hunter' | 'linkedin' | 'google' | 'github' | 'crunchbase' | 'page_extraction' | 'llm_inferred';
  why_contact: string;
}

export interface PersonalizedIntel {
  icp_match_score: number;
  icp_match_reasoning: string;
  top_3_hooks: PersonalizationHook[];
  talking_points: string[];
  objections_anticipated: string[];
}

export interface TimelineEntry {
  id: number;
  domain: string;
  signal_type: string;
  old_value: unknown;
  new_value: unknown;
  source: string;
  detected_at: string;
}

export interface ResearchResponse {
  domain: string;
  cached: boolean;
  freshness: Record<string, string>;
  base_intel: BaseIntel;
  personalized: PersonalizedIntel | null;
  timeline_recent: TimelineEntry[];
  generated_at: string;
  is_degraded: boolean;
  saved_brief?: unknown;
}

// --- Cache Types ---

export interface CacheCheckResponse {
  domain: string;
  exists: boolean;
  fully_fresh: boolean;
  stale_fields: string[];
  last_refreshed_at: string | null;
}

// --- Global Intel DB Row ---

export interface GlobalIntelRow {
  domain: string;
  base_intel: BaseIntel;
  base_intel_summary: string | null;
  extracted_payload: ExtractedPayload | null;
  fetch_count: number;
  first_fetched_at: string;
  last_refreshed_at: string;
  field_timestamps: Record<string, string>;
  is_degraded: boolean;
  llm_version: string;
}

// --- User Profile Extensions ---

export interface UserPipelineContext {
  product_context: string | null;
  icp_definition: Record<string, unknown> | null;
  context_hash: string | null;
  past_wins: string | null;
}

// --- Watch Types ---

export interface WatchSubscription {
  id: string;
  user_id: string;
  domain: string;
  signals: string[];
  channel: 'email' | 'slack' | 'webhook';
  is_active: boolean;
  created_at: string;
}

// --- Extension Message Types ---

export type ExtensionMessageType =
  | 'CACHE_CHECK'
  | 'FULL_PIPELINE'
  | 'PARTIAL_REFRESH'
  | 'RENDER_REPORT';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload: unknown;
}

// --- Smart Router Types ---

export interface RouteCandidate {
  url: string;
  text: string;
  score: number;
  type: string;
}
