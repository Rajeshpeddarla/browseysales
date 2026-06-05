import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class GitHubAgent extends BaseAgent {
  name = 'github-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[GitHubAgent] Analyzing GitHub activity for domain: ${context.domain}`);
      
      const supabase = await createClient();

      let githubIntel = context.extractedPayload?.social_signals?.github;

      if (!githubIntel || !githubIntel.recent_repos || githubIntel.recent_repos.length === 0) {
        // Fallback: try to fetch from public GitHub API
        let orgSlug = context.domain.split('.')[0];
        const githubUrl = context.extractedPayload?.homepage?.social_links?.github;
        if (githubUrl) {
          const m = githubUrl.match(/github\.com\/([^/?#]+)/i);
          if (m) orgSlug = m[1];
        }

        try {
          const res = await fetch(`https://api.github.com/orgs/${orgSlug}/repos?sort=updated&per_page=5`, {
            headers: { 'User-Agent': 'BrowseySalesBot/2.0' },
            signal: AbortSignal.timeout(5000),
          });
          
          if (res.ok) {
            const repos = await res.json();
            if (Array.isArray(repos) && repos.length > 0) {
              console.log(`[GitHubAgent] Autonomously fetched ${repos.length} repos for ${orgSlug}`);
              githubIntel = { recent_repos: repos.map(r => ({ name: r.name, description: r.description, language: r.language, updated_at: r.updated_at })) };
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (!githubIntel || !githubIntel.recent_repos || githubIntel.recent_repos.length === 0) {
        console.log(`[GitHubAgent] No GitHub data provided by extension or API for ${context.domain}. Skipping.`);
        return {
          status: 'skipped',
          data: { activity: [] },
          confidence: 1.0,
          execution_summary: 'No GitHub profile/activity found.',
        };
      }

      const schema = z.object({
        activities: z.array(z.object({
          repo_name: z.string(),
          activity_type: z.enum(['commit', 'release', 'pull_request']),
          title: z.string(),
          description: z.string(),
          language: z.string(),
          contributor_name: z.string()
        })),
        execution_summary: z.string()
      });

      const promptText = `
        Analyze the following real GitHub data extracted by the user's browser extension for ${context.domain}.
        Focus on their primary tech stack, languages used, and open source momentum.

        GitHub Data:
        ${JSON.stringify(githubIntel)}
      `;

      const { object } = await generateStructuredOutput({
        schema,
        prompt: promptText,
        agentRole: 'reasoning'
      });

      const activityToInsert = object.activities.map(a => ({
        company_id: context.company_id,
        repo_name: a.repo_name,
        activity_type: a.activity_type,
        title: a.title,
        description: a.description,
        language: a.language,
        contributor_name: a.contributor_name,
        // Mock embedding
        embedding: Array.from({ length: 384 }, () => 0) // Updated to 384 to match Xenova/bge-small-en-v1.5
      }));

      if (activityToInsert.length > 0) {
        await supabase.from('github_activity').insert(activityToInsert);
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
        data: { activities: object.activities },
        confidence: 0.80,
        execution_summary: `Extracted ${object.activities.length} GitHub activities: ${object.execution_summary}`,
      };
    });
  }
}
