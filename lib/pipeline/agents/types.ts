export interface AgentContext {
  company_id: string;
  domain: string;
  research_run_id: string;
  goal: string;
  extractedPayload?: any; // The payload from the browser extension
  manualLinks?: string[];
}

export interface AgentResult {
  agent_name: string;
  status: 'success' | 'partial' | 'failed' | 'skipped';
  data: Record<string, unknown>;
  confidence: number;
  execution_summary: string;
  duration_ms: number;
}

export interface PlannerTask {
  id?: string;
  research_run_id: string;
  task_type: string;
  task_goal: string;
  priority_score: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface ResearchRun {
  id: string;
  company_id: string;
  goal: string;
  status: 'pending' | 'planning' | 'running' | 'reflecting' | 'completed' | 'failed';
  confidence_score?: number;
}
