import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class CriticAgent extends BaseAgent {
  name = 'critic-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[CriticAgent] Validating research conclusions for domain: ${context.domain}`);
      
      const supabase = await createClient();

      const schema = z.object({
        unsupported_claims: z.array(z.string()),
        reasoning_flaws: z.array(z.string()),
        validation_report: z.string(),
        overall_validity_score: z.number().min(0).max(1)
      });

      const { object } = await generateStructuredOutput({
        schema,
        prompt: `Act as a harsh critic. Review the research for ${context.domain}. Challenge assumptions, find unsupported claims, and expose reasoning flaws. Be rigorous.`,
        agentRole: 'fast'
      });

      // We can store this in reflection_reports or a dedicated table, for now we merge it into agent_runs execution summary
      // Or we can just return it to the orchestrator to factor into confidence score.

      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: object.validation_report,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: { validation: object },
        confidence: object.overall_validity_score,
        execution_summary: `Critic validation complete. Validity score: ${object.overall_validity_score}. ${object.unsupported_claims.length} unsupported claims found.`,
      };
    });
  }
}
