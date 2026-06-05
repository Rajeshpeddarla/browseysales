import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';
import { generateEmbeddings } from '../ai-service';

export class MemoryAgent extends BaseAgent {
  name = 'memory-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[MemoryAgent] Chunking and storing research memory for domain: ${context.domain}`);
      
      const supabase = await createClient();
      const payload = context.extractedPayload;
      
      const chunks: Array<{ content: string; type: string; summary: string }> = [];

      // Semantic Chunking
      if (payload?.homepage?.has_pricing_table && payload.pages) {
        const pricingPage = payload.pages.find((p: any) => p.type === 'pricing');
        if (pricingPage) {
          chunks.push({
            content: pricingPage.visible_text.slice(0, 3000),
            type: 'pricing',
            summary: 'Pricing and packaging signals'
          });
        }
      }

      if (payload?.social_signals?.linkedin_scraped_posts) {
        chunks.push({
          content: payload.social_signals.linkedin_scraped_posts.join('\n'),
          type: 'social',
          summary: 'Recent LinkedIn activity'
        });
      }

      if (payload?.social_signals?.github) {
        chunks.push({
          content: JSON.stringify(payload.social_signals.github),
          type: 'github',
          summary: 'GitHub activity and repositories'
        });
      }

      // Add a general company summary chunk
      chunks.push({
        content: JSON.stringify(payload?.homepage?.meta || { goal: context.goal }),
        type: 'company_summary',
        summary: `General company profile for ${context.domain}`
      });

      // Generate Embeddings via Python AI Service (BGE-M3 1024-d)
      const textsToEmbed = chunks.map(c => `[${c.type.toUpperCase()}] ${c.summary}\n${c.content}`);
      const embeddings = await generateEmbeddings(textsToEmbed);

      // Store in Supabase pgvector
      for (let i = 0; i < chunks.length; i++) {
        await supabase.from('research_memories').insert({
          company_id: context.company_id,
          memory_type: 'semantic_chunk',
          page_type: chunks[i].type,
          content: chunks[i].content,
          summary: chunks[i].summary,
          confidence: 0.9,
          source_url: `https://${context.domain}`,
          embedding: embeddings[i],
          metadata: { research_run_id: context.research_run_id }
        });
      }

      await supabase.from('agent_runs').insert({
        research_run_id: context.research_run_id,
        agent_name: this.name,
        status: 'success',
        execution_summary: `Stored ${chunks.length} semantic memory chunks for ${context.domain}`,
        completed_at: new Date().toISOString()
      });

      return {
        status: 'success',
        data: { stored_chunks: chunks.length },
        confidence: 1.0,
        execution_summary: `Stored ${chunks.length} semantic chunks successfully.`,
      };
    });
  }
}
