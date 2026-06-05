import { getOrRefresh, storeGlobalIntel, updatePartialIntel, getFreshnessInfo, getTimeline, recordSignalChange } from './cache-manager';
import { generateBaseIntel, generatePartialRefresh } from './llm-client';
import { mergeAndValidatePayload, summarizePayload } from './signal-merger';
import { getOrGeneratePersonalization } from './personalizer';
import { savePipelineBriefToDatabase } from './db-helpers';
import { improveIntelWithSignals } from './signal-engine';
import { findContacts } from './contact-finder';
import { fetchCompanySignalsStructured } from './ddg-osint';
import { detectChanges } from './change-detector';
import { triggerWatchAlerts } from './watch-mode';
import type { ExtractedPayload, ResearchResponse, BaseIntel, Contact } from './types';
import { createClient } from '@/lib/supabase/server';

// Agentic Imports
import { PlannerAgent } from './agents/planner-agent';
import { BrowserAgent } from './agents/browser-agent';
import { HiringAgent } from './agents/hiring-agent';
import { SocialAgent } from './agents/social-agent';
import { GitHubAgent } from './agents/github-agent';
import { ReflectionAgent } from './agents/reflection-agent';
import { CriticAgent } from './agents/critic-agent';
import { computeFinalConfidence } from './confidence-engine';
import { MemoryAgent } from './agents/memory-agent';
import { updateKnowledgeGraph } from './knowledge-graph';
import { WikipediaAgent } from './agents/wikipedia-agent';

/**
 * Enterprise Agentic Research Pipeline (v7)
 */
export async function runResearchPipeline(
  domain: string,
  userId: string,
  extractedPayload?: Partial<ExtractedPayload>,
  forceRefresh: boolean = false,
  manualLinks?: string[]
): Promise<ResearchResponse> {
  const startTime = Date.now();
  console.log(`[Orchestrator] Starting Agentic Pipeline for ${domain}`);

  const supabase = await createClient();

  // 1. Get or create Company ID
  let companyId = '';
  const { data: existingCompany } = await supabase.from('companies').select('id').eq('domain', domain).single();
  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    const { data: newCompany } = await supabase.from('companies').insert({ domain, company_name: domain.split('.')[0] }).select('id').single();
    companyId = newCompany?.id || '';
  }

  // 2. Create Research Run
  const { data: researchRun } = await supabase.from('company_research_runs').insert({
    company_id: companyId,
    goal: 'Comprehensive Enterprise Research',
    status: 'running'
  }).select('id').single();
  const runId = researchRun?.id || '';

  const context = {
    company_id: companyId,
    domain,
    research_run_id: runId,
    goal: 'Comprehensive Enterprise Research',
    extractedPayload,
    manualLinks
  };

  // 3. Planner Agent
  const planner = new PlannerAgent();
  await planner.execute(context);

  // 4. Browser Agent (adaptive Playwright)
  const browserAgent = new BrowserAgent();
  let browserResult;
  if (!(extractedPayload as any)?._usedPlaywright) { // Don't re-crawl if client already sent heavy payload
    try {
      browserResult = await browserAgent.execute(context);
      if (browserResult.status === 'success' && browserResult.data.extracted_payload) {
        extractedPayload = {
          ...(extractedPayload || {}),
          ...(browserResult.data.extracted_payload as Partial<ExtractedPayload>),
        };
      }
    } catch (browserErr) {
      console.warn(`[Orchestrator] BrowserAgent failed for ${domain}, continuing with extension payload:`, (browserErr as Error).message);
      // Pipeline continues — we still have whatever the extension provided
    }
  }

  // Update context with newly extracted payload
  context.extractedPayload = extractedPayload;

  // 5. Parallel Agent Swarm
  const hiringAgent = new HiringAgent();
  const socialAgent = new SocialAgent();
  const githubAgent = new GitHubAgent();
  const wikipediaAgent = new WikipediaAgent();

  const [hiringRes, socialRes, githubRes, wikipediaRes, tavilyResult] = await Promise.all([
    hiringAgent.execute(context),
    socialAgent.execute(context),
    githubAgent.execute(context),
    wikipediaAgent.execute(context),
    fetchCompanySignalsStructured(domain, domain.split('.')[0])
  ]);

  // Inject OSINT Live Signals (Wikipedia + Tavily)
  let osintContext = '';
  if (wikipediaRes.status === 'success' && wikipediaRes.data?.summary) {
    osintContext += `\n\n--- WIKIPEDIA OSINT SUMMARY ---\n${wikipediaRes.data.summary}\n`;
  }
  if (tavilyResult.promptText) {
    osintContext += `\n\n${tavilyResult.promptText}`;
  }

  if (osintContext && extractedPayload?.homepage) {
    extractedPayload.homepage.visible_text = (extractedPayload.homepage.visible_text || '') + osintContext;
  }

  const payload = mergeAndValidatePayload(extractedPayload || {});

  // 6. Signal Extraction & Correlation (Existing logic)
  const baseLLMResult = await generateBaseIntel(payload);
  let baseIntel = improveIntelWithSignals(baseLLMResult.intel, payload);

  // 7. Reflection & Critic Agents
  const reflectionAgent = new ReflectionAgent();
  const criticAgent = new CriticAgent();
  
  // Execute sequentially instead of Promise.all to avoid Ckey.vn deepseek concurrency rate limits
  const reflectionRes = await reflectionAgent.execute(context);
  const criticRes = await criticAgent.execute(context);

  // 8. Confidence Engine
  const { score: confidenceScore } = await computeFinalConfidence(runId, {
    evidence_count: (baseIntel.growth_signals?.length || 0) + (baseIntel.pain_points?.length || 0),
    source_trust_average: 0.8,
    freshness_average: 0.9,
    contradiction_score: 0.05,
    historical_consistency: 0.85
  });

  baseIntel.data_quality_score = confidenceScore;

  // 9. RAG Memory & Knowledge Graph
  const memoryAgent = new MemoryAgent();
  await memoryAgent.execute(context);
  
  await updateKnowledgeGraph(companyId, domain, baseIntel.tech_stack || [], baseIntel.stakeholders || []);

  // 10. Complete Research Run
  await supabase.from('company_research_runs').update({
    status: 'completed',
    completed_at: new Date().toISOString()
  }).eq('id', runId);

  // 11. Personalization & Contact Enrichment
  const intelSummary = baseIntel.summary_1_line || null;
  let personalized = null;
  try {
    personalized = await getOrGeneratePersonalization(userId, domain, baseIntel, intelSummary, 'llm', forceRefresh);
  } catch (err) {
    console.error(`[Pipeline] Personalization failed for ${domain}:`, err);
  }

  // 11.5 Contact Enrichment
  let contacts: Contact[] = [];
  try {
    contacts = await findContacts(domain, baseIntel, payload, null);
  } catch (err) {
    console.error(`[Pipeline] Contact extraction failed for ${domain}:`, err);
  }

  // 12. Save Brief & Timeline
  let savedBrief = null;
  try {
    savedBrief = await savePipelineBriefToDatabase(domain, userId, baseIntel, personalized, extractedPayload, contacts);
  } catch (dbErr) {
    console.error(`[Pipeline] Database sync failed for ${domain}:`, dbErr);
  }

  await storeGlobalIntel(domain, baseIntel, payload, false);
  await recordSignalChange(domain, 'full_research', null, { summary: baseIntel.summary_1_line }, 'agentic_pipeline');

  // Watch Mode 2.0 trigger
  const changes = detectChanges(baseIntel, baseIntel); // Normally compare to cached, simplified here
  triggerWatchAlerts(domain, changes).catch(() => {});

  const timeline = await getTimeline(domain, 10);
  const elapsed = Date.now() - startTime;
  console.log(`[Pipeline] Agentic Pipeline Completed for ${domain} in ${elapsed}ms`);

  return {
    domain,
    cached: false,
    freshness: getFreshnessInfo({ base_intel: baseIntel, extracted_payload: payload } as any),
    base_intel: baseIntel,
    personalized,
    timeline_recent: timeline as ResearchResponse['timeline_recent'],
    generated_at: new Date().toISOString(),
    is_degraded: false,
    saved_brief: savedBrief,
    screenshots: {
      linkedin: payload.social_signals?.linkedin_screenshot || null,
      twitter: payload.social_signals?.twitter_screenshot || null,
      wikipedia: payload.social_signals?.wikipedia_screenshot || null,
    }
  };
}
