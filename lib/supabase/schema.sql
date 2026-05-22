-- ============================================================
-- Browsey for Sales — Full Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "citext";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email CITEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  country TEXT,
  install_source TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  role TEXT NOT NULL DEFAULT 'user',  -- user | super_admin | support_admin | analyst
  stripe_customer_id TEXT,
  byok_provider TEXT,
  byok_key_enc TEXT,
  monthly_brief_quota INT DEFAULT 10,
  monthly_brief_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  stripe_subscription_id TEXT,
  seats_purchased INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'rep',  -- owner | manager | rep
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain CITEXT UNIQUE NOT NULL,
  name TEXT,
  industry TEXT,
  size_band TEXT,
  hq TEXT,
  founded INT,
  logo_url TEXT,
  linkedin_url TEXT,
  summary TEXT,
  tech_stack JSONB DEFAULT '[]',
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PEOPLE (decision makers)
-- ============================================================
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  title TEXT,
  seniority TEXT,  -- c_level | vp | director | manager | individual
  department TEXT,
  linkedin_url TEXT,
  email_guess TEXT,
  email_verified BOOLEAN DEFAULT false,
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PLAYBOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  icp_description TEXT,
  required_fields TEXT[] DEFAULT '{}',
  outreach_tone TEXT DEFAULT 'professional',
  prompt_overrides JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BRIEFS
-- ============================================================
CREATE TABLE IF NOT EXISTS briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  company_id UUID REFERENCES companies(id),
  url TEXT NOT NULL,
  data JSONB NOT NULL,           -- full brief JSON object
  playbook_id UUID REFERENCES playbooks(id),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  ai_cost_usd NUMERIC(10,6) DEFAULT 0,
  enrichment_cost_usd NUMERIC(10,6) DEFAULT 0,
  pushed_to JSONB DEFAULT '[]',  -- ["hubspot","salesforce"]
  status TEXT DEFAULT 'generated', -- generated | saved | archived
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS briefs_user_created ON briefs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS briefs_team_created ON briefs(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS briefs_company ON briefs(company_id);

-- ============================================================
-- CRM CONNECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_connections (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,         -- hubspot | salesforce | pipedrive | outreach | salesloft | close
  account_id TEXT,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  expires_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

-- ============================================================
-- CRM PUSHES
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_pushes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  brief_id UUID REFERENCES briefs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_ids JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',  -- pending | success | failed
  error TEXT,
  pushed_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  stripe_sub_id TEXT UNIQUE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active | past_due | canceled | trialing
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USAGE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  event TEXT NOT NULL,  -- brief_generated | crm_pushed | outreach_generated | email_lookup etc.
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_user_event ON usage_events(user_id, event);
CREATE INDEX IF NOT EXISTS usage_created ON usage_events(created_at DESC);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FEATURE FLAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default feature flags
INSERT INTO feature_flags (key, value, description) VALUES
  ('brief_prompt_version', '"v1.0"', 'Active prompt version for brief generation'),
  ('max_free_briefs', '10', 'Monthly brief limit for free tier'),
  ('max_pro_briefs', '1500', 'Monthly brief limit for pro tier'),
  ('enable_email_finder', 'true', 'Enable email finder feature'),
  ('enable_crm_push', 'true', 'Enable CRM push feature')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pushes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- Companies: any authenticated user can read/insert
CREATE POLICY companies_select ON companies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY companies_insert ON companies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- People: any authenticated user can read
CREATE POLICY people_select ON people FOR SELECT USING (auth.uid() IS NOT NULL);

-- Briefs: users see their own
CREATE POLICY briefs_select ON briefs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY briefs_insert ON briefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY briefs_update ON briefs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY briefs_delete ON briefs FOR DELETE USING (auth.uid() = user_id);

-- Playbooks: users see their own + public ones
CREATE POLICY playbooks_select ON playbooks FOR SELECT USING (
  auth.uid() = user_id OR is_public = true
);
CREATE POLICY playbooks_insert ON playbooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY playbooks_update ON playbooks FOR UPDATE USING (auth.uid() = user_id);

-- CRM connections: users see their own
CREATE POLICY crm_connections_select ON crm_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY crm_connections_insert ON crm_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CRM pushes: users see their own
CREATE POLICY crm_pushes_select ON crm_pushes FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions: users see their own
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Usage events: users see their own
CREATE POLICY usage_select ON usage_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY usage_insert ON usage_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Feature flags: any authenticated user can read
CREATE POLICY flags_select ON feature_flags FOR SELECT USING (auth.uid() IS NOT NULL);

-- Audit log: admin only (handled at API level)
CREATE POLICY audit_select ON audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'support_admin', 'analyst'))
);

-- ============================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, plan, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'free',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
