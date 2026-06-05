import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class ReflectionAgent extends BaseAgent {
  name = 'reflection-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[ReflectionAgent] Evaluating research quality for domain: ${context.domain}`);
      
      const supabase = await createClient();

      // In a real implementation, we would query the database for all intel gathered so far in this run
      // and pass it to the LLM for evaluation.
      // Here we just use the goal and domain as a placeholder context.

      const schema = z.object({
        missing_evidence: z.array(z.string()),
        weak_claims: z.array(z.string()),
        retry_recommendations: z.array(z.string()),
        reflection_summary: z.string()
      });

      const { object } = await generateStructuredOutput({
        schema,
        prompt: `Review the research gathered for ${context.domain} (Goal: ${context.goal || 'General Enterprise Research'}). Identify any missing evidence, weak claims, and recommend what should be researched further.`,
        agentRole: 'fast'
      });

      await supabase.from('reflection_reports').insert({
        research_run_id: context.research_run_id,
        missing_evidence: object.missing_evidence,
        weak_claims: object.weak_claims,
        retry_recommendations: object.retry_recommendations,
        reflection_summary: object.reflection_summary
      });

      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: object.reflection_summary,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: { reflection: object },
        confidence: 0.90,
        execution_summary: `Reflection complete: Found ${object.missing_evidence.length} missing areas and ${object.weak_claims.length} weak claims.`,
      };
    });
  }
}
