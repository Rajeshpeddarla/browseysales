-- ============================================================
-- Browsey Optimized Pipeline — Database Schema Extension
-- Run this AFTER the base schema in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- GLOBAL SHARED INTEL (cost-saving heart of the system)
-- One row per company domain, shared across ALL users
-- ============================================================
CREATE TABLE IF NOT EXISTS global_intel (
  domain               TEXT PRIMARY KEY,
  base_intel           JSONB NOT NULL,
  base_intel_summary   TEXT,                 -- compressed for personalization input
  extracted_payload    JSONB,                -- raw extraction from client
  fetch_count          INT DEFAULT 1,
  first_fetched_at     TIMESTAMPTZ DEFAULT NOW(),
  last_refreshed_at    TIMESTAMPTZ DEFAULT NOW(),
  field_timestamps     JSONB DEFAULT '{}',   -- { "hiring": "2026-05-15T...", ... }
  is_degraded          BOOLEAN DEFAULT FALSE,
  llm_version          TEXT DEFAULT 'qwen3-coder-480b',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_intel_refreshed ON global_intel(last_refreshed_at);
CREATE INDEX IF NOT EXISTS idx_global_intel_fetch_count ON global_intel(fetch_count DESC);
CREATE INDEX IF NOT EXISTS idx_global_intel_degraded ON global_intel(is_degraded) WHERE is_degraded = true;

-- ============================================================
-- SIGNAL CHANGE HISTORY (for diff alerts + timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS intel_signals_timeline (
  id           BIGSERIAL PRIMARY KEY,
  domain       TEXT NOT NULL REFERENCES global_intel(domain) ON DELETE CASCADE,
  signal_type  TEXT NOT NULL,                -- "hiring", "funding", "tech_change", "pricing_change"
  old_value    JSONB,
  new_value    JSONB NOT NULL,
  source       TEXT,                         -- "client_extraction", "background_refresh", "manual"
  detected_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_domain_time ON intel_signals_timeline(domain, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_signal_type ON intel_signals_timeline(signal_type);

-- ============================================================
-- PER-USER PERSONALIZATION (private, multi-tenant safe)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_personalization (
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain               TEXT NOT NULL,
  personalized         JSONB NOT NULL,
  user_context_hash    TEXT NOT NULL,        -- invalidate if user changes product/ICP
  generated_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_user_personalization_user ON user_personalization(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personalization_domain ON user_personalization(domain);

-- ============================================================
-- WATCH SUBSCRIPTIONS (alert on signal changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS watches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  signals      TEXT[] NOT NULL,              -- which signals to watch: {"hiring", "funding", ...}
  channel      TEXT NOT NULL DEFAULT 'email', -- email, slack, webhook
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watches_user ON watches(user_id);
CREATE INDEX IF NOT EXISTS idx_watches_domain ON watches(domain);

-- ============================================================
-- CRM PUSH LOG (enhanced from original)
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_crm_pushes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain       TEXT NOT NULL,
  crm_system   TEXT NOT NULL,                -- hubspot, salesforce, pipedrive
  status       TEXT NOT NULL DEFAULT 'pending', -- success, failed, pending, queued
  payload      JSONB,
  response     JSONB,
  retry_count  INT DEFAULT 0,
  pushed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_crm_user ON pipeline_crm_pushes(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_crm_status ON pipeline_crm_pushes(status);

-- ============================================================
-- ADD PIPELINE FIELDS TO PROFILES
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'product_context') THEN
    ALTER TABLE profiles ADD COLUMN product_context TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'icp_definition') THEN
    ALTER TABLE profiles ADD COLUMN icp_definition JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'context_hash') THEN
    ALTER TABLE profiles ADD COLUMN context_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'past_wins') THEN
    ALTER TABLE profiles ADD COLUMN past_wins TEXT;
  END IF;
END $$;

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

-- Global intel: any authenticated user can read (shared cache)
ALTER TABLE global_intel ENABLE ROW LEVEL SECURITY;
CREATE POLICY global_intel_select ON global_intel FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY global_intel_insert ON global_intel FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY global_intel_update ON global_intel FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Timeline: any authenticated user can read (shared data)
ALTER TABLE intel_signals_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY timeline_select ON intel_signals_timeline FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY timeline_insert ON intel_signals_timeline FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User personalization: users see their own only
ALTER TABLE user_personalization ENABLE ROW LEVEL SECURITY;
CREATE POLICY personalization_select ON user_personalization FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY personalization_insert ON user_personalization FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY personalization_update ON user_personalization FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY personalization_delete ON user_personalization FOR DELETE USING (auth.uid() = user_id);

-- Watches: users see their own only
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
CREATE POLICY watches_select ON watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY watches_insert ON watches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY watches_update ON watches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY watches_delete ON watches FOR DELETE USING (auth.uid() = user_id);

-- Pipeline CRM pushes: users see their own
ALTER TABLE pipeline_crm_pushes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pipeline_crm_select ON pipeline_crm_pushes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY pipeline_crm_insert ON pipeline_crm_pushes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PIPELINE FEATURE FLAGS
-- ============================================================
INSERT INTO feature_flags (key, value, description) VALUES
  ('pipeline_enabled', 'true', 'Enable optimized research pipeline'),
  ('pipeline_llm_model', '"qwen/qwen3-coder-480b-a35b-instruct"', 'Active LLM model for pipeline'),
  ('pipeline_max_pages', '5', 'Max pages to crawl per company'),
  ('pipeline_ocr_enabled', 'true', 'Enable client-side OCR'),
  ('pipeline_personalization_mode', '"template"', 'Personalization mode: template or llm'),
  ('pipeline_background_refresh_hours', '24', 'Hours between background refreshes')
ON CONFLICT (key) DO NOTHING;
