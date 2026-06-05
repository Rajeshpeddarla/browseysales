import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateStructuredOutput } from './agent-llm';
import { z } from 'zod';

export class SocialAgent extends BaseAgent {
  name = 'social-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[SocialAgent] Analyzing social signals for domain: ${context.domain}`);
      
      const supabase = await createClient();

      const socialSignals = context.extractedPayload?.social_signals;
      
      const hasLinkedIn = socialSignals?.linkedin_scraped_posts && socialSignals.linkedin_scraped_posts.length > 0;
      const hasTwitter = socialSignals?.twitter_scraped_posts && socialSignals.twitter_scraped_posts.length > 0;
      const hasNativeContacts = socialSignals?.native_contacts && socialSignals.native_contacts.length > 0;

      if (!hasLinkedIn && !hasTwitter && !hasNativeContacts) {
        console.log(`[SocialAgent] No social data provided by extension for ${context.domain}. Skipping.`);
        return {
          status: 'skipped',
          data: { posts: [] },
          confidence: 1.0,
          execution_summary: 'No social data provided in payload.',
        };
      }

      const schema = z.object({
        posts: z.array(z.object({
          platform: z.string(),
          author_name: z.string(),
          author_role: z.string(),
          post_content: z.string(),
          engagement_score: z.number().min(0).max(100),
          sentiment: z.enum(['positive', 'neutral', 'negative'])
        })),
        execution_summary: z.string()
      });

      const promptText = `
        Analyze the following social media data extracted by the user's browser extension for the company ${context.domain}.
        Extract structured information about the posts and key executives.

        LinkedIn Posts:
        ${JSON.stringify(socialSignals?.linkedin_scraped_posts || [])}

        Twitter Posts:
        ${JSON.stringify(socialSignals?.twitter_scraped_posts || [])}

        Native Contacts (Executives/Employees):
        ${JSON.stringify(socialSignals?.native_contacts || [])}
      `;

      const { object } = await generateStructuredOutput({
        schema,
        prompt: promptText,
        agentRole: 'reasoning'
      });

      const postsToInsert = object.posts.map(p => ({
        company_id: context.company_id,
        platform: p.platform,
        author_name: p.author_name,
        author_role: p.author_role,
        post_content: p.post_content,
        engagement_score: p.engagement_score,
        sentiment: p.sentiment,
        posted_at: new Date().toISOString(),
        // Mock embedding
        embedding: Array.from({ length: 384 }, () => 0) // Updated to 384 to match Xenova/bge-small-en-v1.5
      }));

      if (postsToInsert.length > 0) {
        await supabase.from('social_posts').insert(postsToInsert);
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
        data: { posts: object.posts },
        confidence: 0.85,
        execution_summary: `Analyzed real social payload. Extracted ${object.posts.length} posts. ${object.execution_summary}`,
      };
    });
  }
}
