// ============================================================
// P6 — Signal Correlation Engine
// Maps combinations of detected signals to business-state
// inferences. This is the moat: not just "hiring detected"
// but "hiring SDRs + enterprise pricing + Salesforce = outbound GTM expansion"
// ============================================================

import type { CorrelatedInference } from './types';

interface SignalSet {
  keys: string[];           // signal keys that must ALL be present
  anyOf?: string[];         // at least one of these must also be present
  inference: string;
  business_implication: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
}

// Correlation rules — ordered by specificity (most specific first)
const CORRELATION_RULES: SignalSet[] = [
  // Outbound GTM expansion
  {
    keys: ['hiring', 'sales_motion'],
    anyOf: ['integrations', 'enterprise_readiness'],
    inference: 'Outbound GTM expansion in progress',
    business_implication: 'Company is building or scaling an outbound sales motion. High receptivity to sales tools, CRM, enablement, and RevOps solutions.',
    confidence: 0.84,
    urgency: 'high',
  },

  // Enterprise go-to-market pivot
  {
    keys: ['enterprise_readiness', 'sales_motion', 'pricing'],
    inference: 'Enterprise GTM pivot underway',
    business_implication: 'Company is moving upmarket. Procurement, compliance, security tooling, and enterprise deal management are active needs.',
    confidence: 0.88,
    urgency: 'high',
  },

  // Platform/API productization
  {
    keys: ['developer_surface', 'integrations'],
    anyOf: ['product_velocity', 'hiring'],
    inference: 'Platform and API productization in progress',
    business_implication: 'Company is building a developer ecosystem. Developer experience, API management, documentation, and partner tooling are likely needs.',
    confidence: 0.80,
    urgency: 'medium',
  },

  // Rapid scaling under operational pressure
  {
    keys: ['hiring', 'product_velocity'],
    anyOf: ['developer_surface', 'integrations'],
    inference: 'Rapid scaling creating operational pressure',
    business_implication: 'Fast growth is straining internal processes. Onboarding, enablement, internal tooling, and RevOps automation are likely pain points.',
    confidence: 0.76,
    urgency: 'high',
  },

  // Enterprise security compliance push
  {
    keys: ['enterprise_readiness', 'pricing'],
    inference: 'Enterprise security and compliance investment',
    business_implication: 'Company is investing in enterprise trust signals. Security tooling, compliance automation, and audit readiness are active priorities.',
    confidence: 0.82,
    urgency: 'medium',
  },

  // Product-led growth with enterprise upsell
  {
    keys: ['pricing', 'developer_surface', 'customer_proof'],
    inference: 'Product-led growth with enterprise upsell motion',
    business_implication: 'PLG company adding enterprise tier. Account expansion, usage analytics, and enterprise onboarding tooling are likely needs.',
    confidence: 0.78,
    urgency: 'medium',
  },

  // Integration ecosystem expansion
  {
    keys: ['integrations', 'developer_surface'],
    anyOf: ['hiring', 'product_velocity'],
    inference: 'Integration ecosystem expansion',
    business_implication: 'Company is growing its integration marketplace. Partner enablement, integration testing, and workflow automation are active needs.',
    confidence: 0.74,
    urgency: 'medium',
  },

  // Funding-driven growth
  {
    keys: ['hiring', 'product_velocity'],
    inference: 'Post-funding growth acceleration',
    business_implication: 'Company is in a growth sprint. Hiring, tooling, and process investments are happening now — high receptivity to new vendors.',
    confidence: 0.70,
    urgency: 'medium',
  },
];

/**
 * Run correlation rules against detected signal keys.
 * Returns inferences sorted by confidence descending.
 */
export function correlateSignals(detectedSignalKeys: string[]): CorrelatedInference[] {
  const keySet = new Set(detectedSignalKeys);
  const results: CorrelatedInference[] = [];

  for (const rule of CORRELATION_RULES) {
    // All required keys must be present
    const allPresent = rule.keys.every((k) => keySet.has(k));
    if (!allPresent) continue;

    // If anyOf specified, at least one must be present
    if (rule.anyOf && rule.anyOf.length > 0) {
      const anyPresent = rule.anyOf.some((k) => keySet.has(k));
      if (!anyPresent) continue;
    }

    const supporting = [
      ...rule.keys,
      ...(rule.anyOf?.filter((k) => keySet.has(k)) || []),
    ];

    results.push({
      inference: rule.inference,
      confidence: rule.confidence,
      supporting_signals: supporting,
      business_implication: rule.business_implication,
      urgency: rule.urgency,
    });
  }

  // Sort by confidence descending, cap at 4
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
}
