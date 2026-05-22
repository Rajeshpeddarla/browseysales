// ============================================================
// Personalizer — Template + LLM Personalization Engine
// Template-first (free), LLM for premium tier
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { generatePersonalization } from './llm-client';
import type { BaseIntel, PersonalizedIntel } from './types';
import crypto from 'crypto';

// --- Template-Based Personalization (Free, Zero LLM Cost) ---

interface TemplateContext {
  intel: BaseIntel;
  user: { product: string | null; icp: Record<string, unknown> | null; industry?: string };
}

type HookTemplate = (ctx: TemplateContext) => { hook: string; channel: 'email' | 'linkedin' | 'call'; why_it_works: string } | null;

const HOOK_TEMPLATES: Record<string, HookTemplate> = {
  hiring_growth: (ctx) => {
    const topRole = ctx.intel.hiring?.top_role;
    if (!topRole) return null;
    return {
      hook: `Noticed ${ctx.intel.summary_1_line ? 'your team' : 'the company'} is hiring ${topRole}. Many of our customers use us to help new ${topRole}s ramp faster.`,
      channel: 'email',
      why_it_works: 'Hiring signals indicate growth — new hires need tools to be productive.',
    };
  },
  tech_alignment: (ctx) => {
    const tech = ctx.intel.tech_stack?.[0];
    if (!tech) return null;
    return {
      hook: `I see you use ${tech}. Our product plugs directly into ${tech} workflows — curious if that resonates?`,
      channel: 'linkedin',
      why_it_works: 'Tech stack alignment shows direct integration opportunity.',
    };
  },
  pain_point_hook: (ctx) => {
    const pain = ctx.intel.pain_points?.[0];
    if (!pain) return null;
    return {
      hook: `I noticed companies in ${ctx.intel.industry || 'your space'} often struggle with ${pain.pain}. We built a solution specifically for this — worth a quick chat?`,
      channel: 'email',
      why_it_works: 'Addressing a known pain point shows you understand their challenges.',
    };
  },
  growth_stage_hook: (ctx) => {
    if (!ctx.intel.growth_stage) return null;
    const stageMessages: Record<string, string> = {
      early: "scaling their first 10 customers",
      growth: "optimizing for rapid growth",
      scale: "standardizing processes across teams",
      enterprise: "modernizing their tech stack",
    };
    const msg = stageMessages[ctx.intel.growth_stage];
    if (!msg) return null;
    return {
      hook: `For companies ${msg}, we typically see a 30% improvement. Would love to share specifics.`,
      channel: 'call',
      why_it_works: `Stage-appropriate messaging for ${ctx.intel.growth_stage} companies.`,
    };
  },
  competitor_displacement: (ctx) => {
    const competitor = ctx.intel.competitors?.[0];
    if (!competitor) return null;
    return {
      hook: `I noticed ${competitor} is in your competitive landscape. We help teams differentiate — here's how.`,
      channel: 'email',
      why_it_works: 'Competitive awareness demonstrates market understanding.',
    };
  },
  funding_momentum: (ctx) => {
    const growthSignal = ctx.intel.growth_signals?.find(s => s.signal.toLowerCase().includes('fund'));
    if (!growthSignal) return null;
    return {
      hook: `Congrats on the momentum! Companies at your stage typically invest in ${ctx.user.product || 'tools like ours'} — timing might be right.`,
      channel: 'linkedin',
      why_it_works: 'Post-funding companies are actively investing in growth.',
    };
  },
  customer_proof: (ctx) => {
    if (!ctx.intel.customers?.logos?.length) return null;
    return {
      hook: `We work with companies similar to yours. Happy to share how they approached ${ctx.intel.pain_points?.[0]?.pain || 'scaling'}.`,
      channel: 'email',
      why_it_works: 'Social proof from similar companies builds trust.',
    };
  },
};

/**
 * Generate template-based personalization (zero LLM cost)
 */
function generateTemplatePersonalization(
  intel: BaseIntel,
  userContext: { product: string | null; icp: Record<string, unknown> | null }
): PersonalizedIntel {
  const ctx: TemplateContext = { intel, user: userContext };

  // Generate hooks from templates
  const hooks: PersonalizedIntel['top_3_hooks'] = [];
  for (const template of Object.values(HOOK_TEMPLATES)) {
    const result = template(ctx);
    if (result) hooks.push(result);
    if (hooks.length >= 3) break;
  }

  // Simple ICP scoring based on available signals
  let icpScore = 50; // Base score
  if (intel.growth_stage === 'growth' || intel.growth_stage === 'scale') icpScore += 15;
  if (intel.hiring?.active_roles?.length) icpScore += 10;
  if (intel.tech_stack?.length > 3) icpScore += 5;
  if (intel.growth_signals?.length) icpScore += 10;
  if (intel.customers?.logos?.length) icpScore += 5;
  icpScore = Math.min(95, icpScore);

  return {
    icp_match_score: icpScore,
    icp_match_reasoning: `Based on ${intel.growth_stage || 'unknown'} stage, ${intel.tech_stack?.length || 0} technologies, ${intel.growth_signals?.length || 0} growth signals.`,
    top_3_hooks: hooks.length > 0 ? hooks : [{
      hook: 'Would love to share how companies in your space are solving similar challenges.',
      channel: 'email',
      why_it_works: 'Generic value proposition hook.',
    }],
    talking_points: [
      intel.industry ? `Industry trends in ${intel.industry}` : 'Industry challenges',
      intel.growth_stage ? `Typical needs at ${intel.growth_stage} stage` : 'Growth strategy',
      intel.tech_stack?.length ? `Integration with ${intel.tech_stack[0]}` : 'Technology alignment',
    ],
    objections_anticipated: [
      'Already have a solution in place',
      'Budget not allocated for this quarter',
      'Need to involve other stakeholders',
    ],
  };
}

// --- User Context Hashing ---

export function hashUserContext(user: {
  product_context: string | null;
  icp_definition: Record<string, unknown> | null;
}): string {
  const data = JSON.stringify({
    product: user.product_context || '',
    icp: user.icp_definition || {},
  });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

// --- Main Personalization Entry Point ---

export async function getOrGeneratePersonalization(
  userId: string,
  domain: string,
  baseIntel: BaseIntel,
  baseIntelSummary: string | null,
  mode: 'template' | 'llm' = 'llm'
): Promise<PersonalizedIntel> {
  const supabase = await createClient();

  // Get user context
  const { data: profile } = await supabase
    .from('profiles')
    .select('product_context, icp_definition, context_hash, past_wins')
    .eq('id', userId)
    .single();

  const currentHash = hashUserContext({
    product_context: profile?.product_context || null,
    icp_definition: profile?.icp_definition || null,
  });

  // Check cached personalization
  const { data: cached } = await supabase
    .from('user_personalization')
    .select('personalized, user_context_hash')
    .eq('user_id', userId)
    .eq('domain', domain)
    .single();

  // Return cached if context hasn't changed
  if (cached && cached.user_context_hash === currentHash) {
    return cached.personalized as unknown as PersonalizedIntel;
  }

  // Generate new personalization
  let personalized: PersonalizedIntel;

  if (mode === 'llm') {
    const result = await generatePersonalization(baseIntel, {
      product: profile?.product_context || null,
      icp: profile?.icp_definition || null,
      past_wins: profile?.past_wins || null,
    });
    personalized = result.personalized;
  } else {
    personalized = generateTemplatePersonalization(baseIntel, {
      product: profile?.product_context || null,
      icp: profile?.icp_definition || null,
    });
  }

  // Cache the personalization
  await supabase.from('user_personalization').upsert({
    user_id: userId,
    domain,
    personalized: personalized as unknown as Record<string, unknown>,
    user_context_hash: currentHash,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,domain' });

  return personalized;
}
