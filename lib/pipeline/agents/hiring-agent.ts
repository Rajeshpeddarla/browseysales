import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class HiringAgent extends BaseAgent {
  name = 'hiring-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[HiringAgent] Analyzing hiring signals for domain: ${context.domain}`);
      
      const supabase = await createClient();

      const careersPage = context.extractedPayload?.pages?.find((p: any) => p.type === 'careers');
      const glassdoorSignals = context.extractedPayload?.social_signals?.glassdoor_signals;

      const hasCareersData = careersPage?.visible_text && careersPage.visible_text.trim().length > 0;
      const hasGlassdoorData = glassdoorSignals?.pros?.length || glassdoorSignals?.cons?.length || glassdoorSignals?.culture_snippet;

      if (!hasCareersData && !hasGlassdoorData) {
        console.log(`[HiringAgent] No hiring or Glassdoor data provided by extension for ${context.domain}. Skipping.`);
        return {
          status: 'skipped',
          data: { signals: [] },
          confidence: 1.0,
          execution_summary: 'No hiring/careers data provided in payload.',
        };
      }

      const schema = z.object({
        signals: z.array(z.object({
          role_title: z.string(),
          department: z.string(),
          location: z.string(),
          seniority: z.string(),
          urgency_score: z.number().min(0).max(1)
        })),
        execution_summary: z.string()
      });

      const promptText = `
        Analyze the following hiring and employee data extracted by the user's browser extension for ${context.domain}.
        Extract current open roles, hiring trends, and department scaling. Focus on enterprise AE roles, RevOps, customer success, platform engineering, and AI teams.

        Careers Page Text:
        ${careersPage?.visible_text || "None provided"}

        Glassdoor Employee Sentiment (Pros/Cons/Culture):
        ${JSON.stringify(glassdoorSignals || {})}
      `;

      const { object } = await generateStructuredOutput({
        schema,
        prompt: promptText,
        agentRole: 'reasoning'
      });

      const signalsToInsert = object.signals.map(s => ({
        company_id: context.company_id,
        role_title: s.role_title,
        department: s.department,
        location: s.location,
        seniority: s.seniority,
        urgency_score: s.urgency_score,
        detected_at: new Date().toISOString(),
        // Mock embedding
        embedding: Array.from({ length: 384 }, () => 0) // Updated to 384 to match Xenova/bge-small-en-v1.5
      }));

      if (signalsToInsert.length > 0) {
        await supabase.from('hiring_signals').insert(signalsToInsert);
      }

      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: object.execution_summary,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: { signals: object.signals },
        confidence: 0.8,
        execution_summary: `Analyzed real hiring payload. Found ${object.signals.length} roles. ${object.execution_summary}`,
      };
    });
  }
}
