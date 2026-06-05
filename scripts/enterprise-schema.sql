CREATE EXTENSION IF NOT EXISTS vector;

-- Alter existing companies table to add enterprise fields
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS website_type TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS maturity_score FLOAT;

CREATE TABLE company_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  goal TEXT,
  status TEXT,
  confidence_score FLOAT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE research_memories (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  memory_type TEXT,
  page_type TEXT,
  content TEXT,
  summary TEXT,
  confidence FLOAT,
  source_url TEXT,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE action_memories (
  id BIGSERIAL PRIMARY KEY,
  website_type TEXT,
  page_type TEXT,
  goal TEXT,
  action_type TEXT,
  target_text TEXT,
  selector TEXT,
  result_summary TEXT,
  reward_score FLOAT,
  success BOOLEAN DEFAULT FALSE,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE website_patterns (
  id BIGSERIAL PRIMARY KEY,
  website_type TEXT,
  dom_pattern TEXT,
  strategy_summary TEXT,
  confidence FLOAT,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  signal_type TEXT,
  signal_category TEXT,
  signal_value TEXT,
  confidence FLOAT,
  evidence JSONB,
  source_type TEXT,
  freshness_score FLOAT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE signal_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  signal_type TEXT,
  old_value JSONB,
  new_value JSONB,
  significance TEXT,
  summary TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  page_url TEXT,
  page_type TEXT,
  storage_path TEXT,
  ocr_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE screenshot_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screenshot_id UUID REFERENCES screenshots(id) ON DELETE CASCADE,
  ui_type TEXT,
  maturity_score FLOAT,
  detected_patterns JSONB,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  platform TEXT,
  author_name TEXT,
  author_role TEXT,
  post_content TEXT,
  engagement_score FLOAT,
  sentiment TEXT,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  posted_at TIMESTAMPTZ
);

CREATE TABLE github_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  repo_name TEXT,
  activity_type TEXT,
  title TEXT,
  description TEXT,
  language TEXT,
  contributor_name TEXT,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hiring_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role_title TEXT,
  department TEXT,
  location TEXT,
  seniority TEXT,
  urgency_score FLOAT,
  embedding VECTOR(1024),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id UUID REFERENCES company_research_runs(id) ON DELETE CASCADE,
  task_type TEXT,
  task_goal TEXT,
  priority_score FLOAT,
  status TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id UUID REFERENCES company_research_runs(id) ON DELETE CASCADE,
  agent_name TEXT,
  status TEXT,
  execution_summary TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE reflection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id UUID REFERENCES company_research_runs(id) ON DELETE CASCADE,
  missing_evidence JSONB,
  weak_claims JSONB,
  retry_recommendations JSONB,
  reflection_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE confidence_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id UUID REFERENCES company_research_runs(id) ON DELETE CASCADE,
  confidence_score FLOAT,
  evidence_count INT,
  contradiction_score FLOAT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter existing watches table to add enterprise fields
ALTER TABLE watches
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS watch_types JSONB;

CREATE TABLE watch_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id UUID REFERENCES watches(id) ON DELETE CASCADE,
  alert_type TEXT,
  significance TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshot_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE confidence_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_all_companies
ON companies
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_research_runs
ON company_research_runs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_research_memories
ON research_memories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_action_memories
ON action_memories
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_company_signals
ON company_signals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_signal_changes
ON signal_changes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_screenshots
ON screenshots
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_screenshot_analysis
ON screenshot_analysis
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_social_posts
ON social_posts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_github_activity
ON github_activity
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_hiring_signals
ON hiring_signals
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_planner_tasks
ON planner_tasks
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_agent_runs
ON agent_runs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_reflection_reports
ON reflection_reports
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_confidence_reports
ON confidence_reports
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_watches
ON watches
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY authenticated_all_watch_alerts
ON watch_alerts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX idx_research_memories_embedding
ON research_memories
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_action_memories_embedding
ON action_memories
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_social_posts_embedding
ON social_posts
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_github_activity_embedding
ON github_activity
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_hiring_signals_embedding
ON hiring_signals
USING hnsw (embedding vector_cosine_ops);
