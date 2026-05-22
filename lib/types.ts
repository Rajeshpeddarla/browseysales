// ============================================================
// Browsey for Sales — Core Type Definitions
// ============================================================

export interface Company {
  id: string;
  domain: string;
  name: string | null;
  industry: string | null;
  size_band: string | null;
  hq: string | null;
  founded: number | null;
  logo_url: string | null;
  linkedin_url: string | null;
  summary: string | null;
  tech_stack: string[];
  enriched_at: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  company_id: string;
  full_name: string | null;
  title: string | null;
  seniority: 'c_level' | 'vp' | 'director' | 'manager' | 'individual';
  department: string | null;
  linkedin_url: string | null;
  email_guess: string | null;
  email_verified: boolean;
}

export interface Signal {
  type: 'funding' | 'hiring' | 'product' | 'partnership' | 'award';
  title: string;
  date: string;
  source_url?: string;
  source?: string;
}

export interface OutreachDraft {
  email: string[];
  linkedin_dm: string[];
  cold_call_opener: string;
}

export interface BriefData {
  company: {
    name: string;
    domain: string;
    summary_short: string;
    summary_long: string;
    industry: string;
    size_band: string;
    founded: number | null;
    hq: string;
    logo_url: string;
  };
  tech_stack: string[];
  signals: Signal[];
  people: Person[];
  pain_hypotheses: string[];
  outreach: OutreachDraft;
  playbook_id: string | null;
  generated_at: string;
  ai_cost_usd: number;
}

export interface Brief {
  id: string;
  user_id: string;
  team_id: string | null;
  company_id: string | null;
  url: string;
  data: BriefData;
  playbook_id: string | null;
  notes: string | null;
  tags: string[];
  ai_cost_usd: number;
  enrichment_cost_usd: number;
  pushed_to: string[];
  status: 'generated' | 'saved' | 'archived';
  created_at: string;
}

export interface Playbook {
  id: string;
  team_id: string | null;
  user_id: string;
  name: string;
  description: string | null;
  icp_description: string | null;
  required_fields: string[];
  outreach_tone: string;
  prompt_overrides: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  seats_purchased: number;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'rep';
  joined_at: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  role: 'user' | 'super_admin' | 'support_admin' | 'analyst';
  monthly_brief_quota: number;
  monthly_brief_used: number;
  created_at: string;
  last_seen_at: string;
}

export interface CRMConnection {
  user_id: string;
  provider: 'hubspot' | 'salesforce' | 'pipedrive' | 'outreach' | 'salesloft' | 'close';
  account_id: string | null;
  connected_at: string;
}

export interface CRMPush {
  id: string;
  user_id: string;
  brief_id: string;
  provider: string;
  external_ids: Record<string, string>;
  status: 'pending' | 'success' | 'failed';
  error: string | null;
  pushed_at: string;
}

export interface UsageEvent {
  id: number;
  user_id: string;
  team_id: string | null;
  event: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface FeatureFlag {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

// API request/response types
export interface GenerateBriefRequest {
  url: string;
  playbook_id?: string;
}

export interface APIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AdminStats {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_briefs: number;
  briefs_today: number;
  crm_pushes_today: number;
  mrr: number;
  plan_breakdown: {
    free: number;
    pro: number;
    team: number;
    enterprise: number;
  };
}

export type PlanType = 'free' | 'pro' | 'team' | 'enterprise';

export interface PricingPlan {
  id: PlanType;
  name: string;
  monthly: number;
  annual: number;
  features: string[];
  cta: string;
  popular?: boolean;
}
