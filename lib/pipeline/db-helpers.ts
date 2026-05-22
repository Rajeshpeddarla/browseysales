import { createClient } from '@/lib/supabase/server';
import type { BaseIntel, PersonalizedIntel } from './types';

/**
 * Capitalizes a clean company name from the page title or domain name
 */
function cleanCompanyName(domain: string, title?: string): string {
  if (title && title.trim()) {
    // Strip trailing suffixes like " | Home", " - Homepage", etc.
    const cleaned = title.split(/[|:-]/)[0].trim();
    if (cleaned && cleaned.length < 50 && !/localhost|http/i.test(cleaned)) {
      return cleaned;
    }
  }
  const part = domain.split('.')[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Saves a pipeline research brief (BaseIntel + PersonalizedIntel) directly to the web dashboard briefs database
 */
export async function savePipelineBriefToDatabase(
  domain: string,
  userId: string,
  baseIntel: BaseIntel,
  personalized: PersonalizedIntel | null,
  extractedPayload?: any
): Promise<any | null> {
  try {
    const supabase = await createClient();

    // 1. Get clean company name
    const title = extractedPayload?.homepage?.meta?.title || '';
    const companyName = cleanCompanyName(domain, title);

    // 2. Map signals
    const signals = (baseIntel.growth_signals || []).map((gs: any) => {
      let type: 'funding' | 'hiring' | 'product' | 'partnership' | 'award' = 'product';
      const cleanSig = (gs.signal || '').toLowerCase();
      if (cleanSig.includes('fund') || cleanSig.includes('invest') || cleanSig.includes('raise')) type = 'funding';
      else if (cleanSig.includes('hire') || cleanSig.includes('hiring') || cleanSig.includes('job')) type = 'hiring';
      else if (cleanSig.includes('partner')) type = 'partnership';
      else if (cleanSig.includes('award') || cleanSig.includes('win') || cleanSig.includes('rank')) type = 'award';

      return {
        type,
        title: `${gs.signal}: ${gs.evidence}`,
        date: new Date().toISOString().split('T')[0],
        source: 'Browsey Pipeline',
      };
    });

    // 3. Map decision makers
    const people = (baseIntel.decision_makers_likely || []).map((dm: any) => {
      let seniority: 'c_level' | 'vp' | 'director' | 'manager' | 'individual' = 'director';
      const roleLower = (dm.role || '').toLowerCase();
      if (
        roleLower.includes('founder') ||
        roleLower.includes('ceo') ||
        roleLower.includes('cto') ||
        roleLower.includes('cfo') ||
        roleLower.includes('chief') ||
        roleLower.includes('c-')
      ) {
        seniority = 'c_level';
      } else if (roleLower.includes('vp') || roleLower.includes('vice president')) {
        seniority = 'vp';
      } else if (roleLower.includes('director')) {
        seniority = 'director';
      } else if (roleLower.includes('manager')) {
        seniority = 'manager';
      } else {
        seniority = 'individual';
      }

      return {
        full_name: dm.role,
        title: dm.role,
        seniority,
        department: 'Sales',
        linkedin_url: '',
        email_guess: `${roleLower.split(' ')[0] || 'info'}@${domain}`,
        email_verified: false,
      };
    });

    // 4. Map pain points
    const pain_hypotheses = dedupeStrings((baseIntel.pain_points || []).map((p: any) => p.pain)).slice(0, 8);
    const pain_details = (baseIntel.pain_points || []).slice(0, 8);

    // 5. Map outreach hooks
    const recommendedHook = baseIntel.outreach_strategy?.recommended_hook || '';
    const outreach = {
      email: (personalized?.top_3_hooks || [])
        .filter((h) => h.channel === 'email')
        .map((h) => h.hook),
      linkedin_dm: (personalized?.top_3_hooks || [])
        .filter((h) => h.channel === 'linkedin')
        .map((h) => h.hook),
      cold_call_opener:
        (personalized?.top_3_hooks || []).find((h) => h.channel === 'call')?.hook || '',
    };
    if (recommendedHook && outreach.email.length === 0) {
      outreach.email = [recommendedHook];
    }
    if (recommendedHook && outreach.linkedin_dm.length === 0) {
      outreach.linkedin_dm = [recommendedHook];
    }

    // 6. Build the BriefData structure fully compatible with dashboard
    const briefData = {
      company: {
        name: companyName,
        domain,
        summary_short: baseIntel.summary_1_line || '',
        summary_long: baseIntel.summary_paragraph || '',
        industry: baseIntel.industry || 'Technology',
        size_band: baseIntel.employee_estimate || '11-50',
        founded: null,
        hq: baseIntel.growth_stage || 'growth',
        logo_url: `https://logo.clearbit.com/${domain}`,
      },
      tech_stack: baseIntel.tech_stack || [],
      signals,
      people,
      pain_hypotheses,
      pain_details,
      outreach,
      company_summary: baseIntel.company_summary,
      buying_intent: baseIntel.buying_intent,
      why_now: baseIntel.why_now || [],
      stakeholders: baseIntel.stakeholders || [],
      outreach_strategy: baseIntel.outreach_strategy,
      competitive_intelligence: baseIntel.competitive_intelligence,
      technology_intelligence: baseIntel.technology_intelligence,
      maturity_analysis: baseIntel.maturity_analysis,
      predictive_intelligence: baseIntel.predictive_intelligence,
      action_recommendations: dedupeStrings(baseIntel.action_recommendations || []).slice(0, 8),
      risk_flags: baseIntel.risk_flags || [],
      playbook_id: null,
      generated_at: new Date().toISOString(),
      ai_cost_usd: 0.01,
    };

    // 7. Upsert the Company record
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .upsert(
        {
          domain,
          name: briefData.company.name,
          industry: briefData.company.industry,
          size_band: briefData.company.size_band,
          hq: briefData.company.hq,
          founded: briefData.company.founded,
          logo_url: briefData.company.logo_url,
          summary: briefData.company.summary_short,
          tech_stack: briefData.tech_stack,
          enriched_at: new Date().toISOString(),
        },
        { onConflict: 'domain' }
      )
      .select('id')
      .single();

    if (companyErr) {
      console.error('[db-helpers] Company upsert failed:', companyErr);
    }

    const companyId = company?.id || null;

    // 8. Check if a brief already exists for this domain & user to prevent duplicates
    const { data: existingBrief } = await supabase
      .from('briefs')
      .select('id')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    if (existingBrief) {
      // Update existing brief with fresh data & update timestamp to bring to top of list
      const { data: updatedBrief, error: updateErr } = await supabase
        .from('briefs')
        .update({
          data: briefData,
          ai_cost_usd: 0.01,
          status: 'generated',
          created_at: new Date().toISOString(), // fresh timestamp
        })
        .eq('id', existingBrief.id)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[db-helpers] Brief update failed:', updateErr);
      } else {
        console.log(`[db-helpers] Successfully updated existing brief for ${domain}`);
        return updatedBrief;
      }
    } else {
      // Insert brand new brief
      const { data: insertedBrief, error: insertErr } = await supabase
        .from('briefs')
        .insert({
          user_id: userId,
          company_id: companyId,
          url: `https://${domain}`,
          data: briefData,
          playbook_id: null,
          ai_cost_usd: 0.01,
          status: 'generated',
        })
        .select('*')
        .single();

      if (insertErr) {
        console.error('[db-helpers] Brief insert failed:', insertErr);
      } else {
        console.log(`[db-helpers] Successfully created new brief for ${domain}`);
        return insertedBrief;
      }
    }
  } catch (error) {
    console.error('[db-helpers] Critical failure in savePipelineBriefToDatabase:', error);
  }

  return null;
}
