import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult, PlannerTask } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class PlannerAgent extends BaseAgent {
  name = 'planner-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[PlannerAgent] Planning tasks for domain: ${context.domain}`);
      
      const supabase = await createClient();

      // 1. Ask LLM to decompose the goal into sub-tasks
      // If the goal is empty/generic, we generate a standard deep-dive plan.
      const prompt = context.goal && context.goal.trim() !== ''
        ? `Analyze the following research goal for the company "${context.domain}": "${context.goal}". Break it down into specific tasks that our agent swarm needs to execute. The available tasks are: website_classification, browser_crawl, hiring_analysis, social_analysis, github_analysis. Assign a priority score (0.0 to 1.0) to each.`
        : `Generate a standard comprehensive enterprise research plan for the company "${context.domain}". Include tasks for: website_classification, browser_crawl, hiring_analysis, social_analysis, and github_analysis. Assign standard priority scores.`;

      const schema = z.object({
        tasks: z.array(z.object({
          task_type: z.enum(['website_classification', 'browser_crawl', 'hiring_analysis', 'social_analysis', 'github_analysis']),
          task_goal: z.string().describe("Specific objective for this task"),
          priority_score: z.number().min(0).max(1)
        })),
        execution_summary: z.string()
      });

      const { object } = await generateStructuredOutput({
        schema,
        prompt,
        agentRole: 'reasoning'
      });

      // 2. Write tasks to the planner_tasks table in Supabase
      const tasksToInsert = object.tasks.map(t => ({
        research_run_id: context.research_run_id,
        task_type: t.task_type,
        task_goal: t.task_goal,
        priority_score: t.priority_score,
        status: 'pending'
      }));

      const { data: insertedTasks, error } = await supabase
        .from('planner_tasks')
        .insert(tasksToInsert)
        .select();

      if (error) {
        throw new Error(`Failed to insert planner tasks: ${error.message}`);
      }

      // 3. Record Agent Run
      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: object.execution_summary,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: {
          tasks: insertedTasks,
          plan_summary: object.execution_summary
        },
        confidence: 0.95, // High confidence since this is just planning
        execution_summary: `Created ${insertedTasks.length} tasks for execution graph: ${object.execution_summary}`,
      };
    });
  }
}
