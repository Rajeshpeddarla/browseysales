import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { playwrightCrawl, playwrightResultToPayload } from '../playwright-crawler';
import { createClient } from '@/lib/supabase/server';

export class BrowserAgent extends BaseAgent {
  name = 'browser-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[BrowserAgent] Starting crawl for domain: ${context.domain}`);
      
      // 1. Run the deep Playwright crawl
      const crawlResult = await playwrightCrawl(context.domain, context.manualLinks);
      
      if (!crawlResult) {
        throw new Error('Playwright crawl failed to return results.');
      }

      // 2. Convert to standardized payload format
      const extractedPayload = playwrightResultToPayload(context.domain, crawlResult);
      
      // 3. Website Classification
      const websiteType = this.classifyWebsite(extractedPayload);
      
      // 4. Store Website Pattern
      await this.storeWebsitePattern(context.company_id, websiteType, crawlResult);

      // 5. Store action memories (mocked from interactions in playwright-crawler)
      await this.storeActionMemories(context.company_id, websiteType, crawlResult);

      const pageCount = crawlResult.pages.length + 1; // +1 for homepage
      const executionSummary = `Successfully crawled ${pageCount} pages. Website classified as ${websiteType}. Discovered ${Object.keys(crawlResult.all_enterprise_signals).length} enterprise signal categories.`;

      const supabase = await createClient();
      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: executionSummary,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: {
          website_type: websiteType,
          extracted_payload: extractedPayload,
          raw_crawl_result: crawlResult
        },
        confidence: 0.85,
        execution_summary: executionSummary,
      };
    });
  }

  private classifyWebsite(payload: any): string {
    const text = payload.homepage?.visible_text?.toLowerCase() || '';
    if (text.includes('saas') || text.includes('software as a service')) return 'SaaS';
    if (text.includes('developer') && text.includes('api')) return 'Developer Tools';
    if (text.includes('enterprise') && text.includes('platform')) return 'Enterprise SaaS';
    if (text.includes('ecommerce') || text.includes('shop')) return 'E-commerce';
    if (text.includes('agency') || text.includes('consulting')) return 'Agency';
    return 'Corporate / General';
  }

  private async storeWebsitePattern(companyId: string, websiteType: string, crawlResult: any) {
    try {
      const supabase = await createClient();
      const patternSummary = `Detected ${websiteType} site. Tech stack: ${crawlResult.tech_hints.frameworks.join(', ')}. Discovered priority pages: ${crawlResult.pages.map((p: any) => p.type).join(', ')}.`;
      
      await supabase.from('website_patterns').insert({
        website_type: websiteType,
        dom_pattern: JSON.stringify(crawlResult.tech_hints),
        strategy_summary: patternSummary,
        confidence: 0.8,
        // Mock embedding for now
        embedding: Array.from({ length: 384 }, () => 0), 
        metadata: {
          company_id: companyId,
          page_count: crawlResult.pages.length + 1
        }
      });
    } catch (e) {
      console.error('[BrowserAgent] Failed to store website pattern', e);
    }
  }

  private async storeActionMemories(companyId: string, websiteType: string, crawlResult: any) {
    try {
      const supabase = await createClient();
      const actions = [];

      // Create synthetic action memories for each successful page crawl
      for (const page of crawlResult.pages) {
        if (page.enterprise_signals && Object.keys(page.enterprise_signals).length > 0) {
          actions.push({
            website_type: websiteType,
            page_type: page.type,
            goal: 'Extract enterprise signals',
            action_type: 'scroll_and_extract',
            target_text: 'Enterprise features',
            selector: 'body',
            result_summary: `Found signals: ${Object.keys(page.enterprise_signals).join(', ')}`,
            reward_score: 25.0,
            success: true,
            embedding: Array.from({ length: 384 }, () => 0),
            metadata: { company_id: companyId, url: page.url }
          });
        }
      }

      if (actions.length > 0) {
        await supabase.from('action_memories').insert(actions);
      }
    } catch (e) {
      console.error('[BrowserAgent] Failed to store action memories', e);
    }
  }
}
