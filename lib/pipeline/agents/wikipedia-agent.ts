import { BaseAgent } from './base-agent';
import { AgentContext, AgentResult } from './types';
import { createClient } from '@/lib/supabase/server';

export class WikipediaAgent extends BaseAgent {
  name = 'wikipedia-agent';

  async execute(context: AgentContext): Promise<AgentResult> {
    return this.runWithTiming(async () => {
      console.log(`[WikipediaAgent] Searching Wikipedia for domain: ${context.domain}`);
      
      const companyName = context.domain.split('.')[0];

      try {
        // Query Wikipedia for the exact page title first
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(companyName)}&utf8=&format=json&origin=*`, {
          signal: AbortSignal.timeout(5000),
        });
        
        let exactTitle = companyName;
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData?.query?.search?.[0]?.title) {
            exactTitle = searchData.query.search[0].title;
          }
        }

        // Now fetch the summary using the exact title
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&titles=${encodeURIComponent(exactTitle)}&format=json&origin=*`, {
          signal: AbortSignal.timeout(5000),
        });
        
        if (res.ok) {
          const data = await res.json();
          const pages = data?.query?.pages;
          if (pages) {
            const pageKeys = Object.keys(pages);
            const firstPageKey = pageKeys[0];
            
            if (firstPageKey !== '-1') {
              const extract = pages[firstPageKey].extract;
              // Strip HTML tags for clean text
              const cleanText = extract.replace(/<[^>]*>?/gm, '').trim();

              if (cleanText) {
                console.log(`[WikipediaAgent] Found Wikipedia summary for ${companyName}`);
                
                const supabase = await createClient();
                await supabase.from('agent_runs').insert({
                  research_run_id: context.research_run_id,
                  agent_name: this.name,
                  status: 'success',
                  execution_summary: 'Successfully extracted Wikipedia OSINT summary.',
                  completed_at: new Date().toISOString()
                });

                return {
                  status: 'success',
                  data: { summary: cleanText },
                  confidence: 0.9,
                  execution_summary: 'Successfully extracted Wikipedia summary.',
                };
              }
            }
          }
        }
      } catch (e) {
        console.log(`[WikipediaAgent] Error fetching Wikipedia for ${companyName}:`, e);
      }

      console.log(`[WikipediaAgent] No Wikipedia data found for ${companyName}. Skipping.`);
      return {
        status: 'skipped',
        data: { summary: '' },
        confidence: 1.0,
        execution_summary: 'No Wikipedia profile found.',
      };
    });
  }
}
