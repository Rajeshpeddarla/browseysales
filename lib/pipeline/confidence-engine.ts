import { createClient } from '@/lib/supabase/server';

export interface ConfidenceFactors {
  evidence_count: number;
  source_trust_average: number;
  freshness_average: number;
  contradiction_score: number;
  historical_consistency: number;
}

export async function computeFinalConfidence(
  researchRunId: string,
  factors: ConfidenceFactors
): Promise<{ score: number; reasoning: string; label: string }> {
  // 1. Calculate raw score
  // Weights: Evidence (30%), Trust (30%), Freshness (20%), Contradiction Penalty (-20%), Consistency (10%)
  
  // Normalize evidence (assume 20 pieces of evidence is max 1.0)
  const normalizedEvidence = Math.min(factors.evidence_count / 20, 1.0);
  
  let score = 
    (normalizedEvidence * 30) +
    (factors.source_trust_average * 30) +
    (factors.freshness_average * 20) +
    (factors.historical_consistency * 10) -
    (factors.contradiction_score * 20);

  // Bound between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // 2. Determine label
  let label = 'unreliable';
  if (score >= 90) label = 'highly verified';
  else if (score >= 70) label = 'strong';
  else if (score >= 50) label = 'moderate';
  else if (score >= 30) label = 'weak';

  // 3. Generate reasoning
  const reasoning = `Computed confidence of ${score} (${label}). Based on ${factors.evidence_count} evidence items with ${Math.round(factors.source_trust_average * 100)}% average trust. Contradiction penalty: ${Math.round(factors.contradiction_score * 100)}%.`;

  // 4. Store in DB
  try {
    const supabase = await createClient();
    await supabase.from('confidence_reports').insert({
      research_run_id: researchRunId,
      confidence_score: score,
      evidence_count: factors.evidence_count,
      contradiction_score: factors.contradiction_score,
      reasoning: reasoning
    });

    // Also update the research run
    await supabase.from('company_research_runs')
      .update({ confidence_score: score })
      .eq('id', researchRunId);

  } catch (e) {
    console.error('[ConfidenceEngine] Failed to save confidence report', e);
  }

  return { score, reasoning, label };
}
