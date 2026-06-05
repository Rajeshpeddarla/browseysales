import type { BaseIntel, ExtractedPayload, GrowthSignal, PainPoint } from './types';
import { inferSourceType, applyTrust } from './source-reliability';
import { computeFreshnessScore, getExpiryHours } from './freshness';
import { correlateSignals } from './signal-correlator';

type Urgency = 'low' | 'medium' | 'high';

interface SignalFinding {
  key: string;
  label: string;
  evidence: string;
  confidence: number;
}

interface SignalAnalysis {
  findings: SignalFinding[];
  pageTypes: Set<string>;
  tech: {
    frontend: string[];
    analytics: string[];
    payments: string[];
    support: string[];
    crm: string[];
  };
}

const uniq = <T>(items: T[]): T[] => Array.from(new Set(items.filter(Boolean)));

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function sentence(text: string, max = 180): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}...`;
}

function getAllText(payload: ExtractedPayload): string {
  return [
    payload.homepage?.meta?.title,
    payload.homepage?.meta?.description,
    payload.homepage?.headings?.h1?.join(' '),
    payload.homepage?.headings?.h2?.join(' '),
    payload.homepage?.visible_text,
    ...(payload.pages || []).flatMap((page) => [page.title, page.visible_text, page.ocr_text || '']),
    ...(payload.social_signals?.linkedin_scraped_posts || []),
    ...(payload.social_signals?.twitter_scraped_posts || []),
  ]
    .filter(Boolean)
    .join('\n');
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function addFinding(findings: SignalFinding[], key: string, label: string, evidence: string, confidence = 0.75) {
  if (findings.some((finding) => finding.key === key)) return;
  findings.push({ key, label, evidence: sentence(evidence), confidence });
}

export function analyzePayloadSignals(payload: ExtractedPayload): SignalAnalysis {
  const findings: SignalFinding[] = [];
  const pageTypes = new Set((payload.pages || []).map((page) => page.type));
  const allTextRaw = getAllText(payload);
  const allText = allTextRaw.toLowerCase();
  const pageUrls = (payload.pages || []).map((page) => `${page.type}: ${page.url}`);

  if (payload.homepage?.has_pricing_table || pageTypes.has('pricing')) {
    addFinding(
      findings,
      'pricing',
      'Pricing or packaging surface detected',
      pageTypes.has('pricing') ? pageUrls.find((url) => url.startsWith('pricing:')) || 'Pricing page crawled' : 'Homepage contains pricing/plans language',
      0.82
    );
  }

  if (pageTypes.has('careers') || has(allText, /\b(careers|jobs|hiring|open roles|join our team)\b/i)) {
    addFinding(
      findings,
      'hiring',
      'Hiring or team expansion signal detected',
      pageUrls.find((url) => url.startsWith('careers:')) || 'Careers/hiring language found in crawled text',
      0.78
    );
  }

  if (pageTypes.has('security') || has(allText, /\b(soc ?2|gdpr|hipaa|iso 27001|sso|saml|audit log|trust center|compliance|security)\b/i)) {
    addFinding(
      findings,
      'enterprise_readiness',
      'Enterprise security/compliance surface detected',
      pageUrls.find((url) => url.startsWith('security:')) || 'Security/compliance terms found in crawled pages',
      0.86
    );
  }

  if (pageTypes.has('integrations') || has(allText, /\b(integration|marketplace|connector|salesforce|hubspot|slack|jira|github)\b/i)) {
    addFinding(
      findings,
      'integrations',
      'Integration ecosystem signal detected',
      pageUrls.find((url) => url.startsWith('integrations:')) || 'Integration/connector language found in crawled pages',
      0.8
    );
  }

  if (pageTypes.has('docs') || pageTypes.has('api_docs') || has(allText, /\b(api|sdk|docs|documentation|developer|cli|webhook)\b/i)) {
    addFinding(
      findings,
      'developer_surface',
      'Developer/docs/API surface detected',
      pageUrls.find((url) => url.startsWith('api_docs:')) || pageUrls.find((url) => url.startsWith('docs:')) || 'Developer documentation terms found',
      0.82
    );
  }

  if (pageTypes.has('customers') || has(allText, /\b(customers|case studies|trusted by|customer stories|logos)\b/i)) {
    addFinding(
      findings,
      'customer_proof',
      'Customer proof or case-study surface detected',
      pageUrls.find((url) => url.startsWith('customers:')) || 'Customer proof language found in crawled pages',
      0.74
    );
  }

  if (pageTypes.has('changelog') || has(allText, /\b(changelog|release notes|latest updates|what'?s new|launched|announcing)\b/i)) {
    addFinding(
      findings,
      'product_velocity',
      'Product velocity signal detected',
      pageUrls.find((url) => url.startsWith('changelog:')) || 'Launch/update language found in crawled pages',
      0.72
    );
  }

  if (has(allText, /\b(contact sales|book a demo|request demo|talk to sales|enterprise plan|enterprise pricing)\b/i)) {
    addFinding(
      findings,
      'sales_motion',
      'Sales-led or enterprise motion detected',
      'Crawled copy contains demo/contact-sales/enterprise language',
      0.8
    );
  }

  // ── NEW: Playwright-enriched enterprise signals ───────────────
  // These are detected deterministically from DOM, not inferred

  if (has(allText, /\bsoc\s*2\b|\bsoc2\b/i)) {
    addFinding(findings, 'soc2', 'SOC 2 compliance detected', 'SOC 2 certification mentioned on site', 0.92);
  }
  if (has(allText, /\bhipaa\b/i)) {
    addFinding(findings, 'hipaa', 'HIPAA compliance detected', 'HIPAA compliance mentioned on site', 0.92);
  }
  if (has(allText, /\bgdpr\b/i)) {
    addFinding(findings, 'gdpr', 'GDPR compliance detected', 'GDPR compliance mentioned on site', 0.88);
  }
  if (has(allText, /\bsso\b|\bsaml\b|\bscim\b/i)) {
    addFinding(findings, 'sso', 'SSO/SAML enterprise auth detected', 'SSO or SAML authentication mentioned — enterprise buyer signal', 0.90);
  }
  if (has(allText, /\baudit log|\baudit trail\b/i)) {
    addFinding(findings, 'audit_logs', 'Audit logs detected', 'Audit log feature mentioned — enterprise compliance signal', 0.88);
  }
  if (has(allText, /\brbac\b|\brole.based access\b|\bpermissions\b/i)) {
    addFinding(findings, 'rbac', 'Role-based access control detected', 'RBAC or permissions system mentioned — enterprise readiness signal', 0.85);
  }
  if (has(allText, /\bsalesforce\b/i)) {
    addFinding(findings, 'salesforce_integration', 'Salesforce integration detected', 'Salesforce integration mentioned — enterprise sales stack signal', 0.88);
  }
  if (has(allText, /\bsnowflake\b|\bbigquery\b|\bredshift\b|\bdatabricks\b/i)) {
    addFinding(findings, 'data_warehouse', 'Data warehouse integration detected', 'Enterprise data warehouse integration mentioned', 0.85);
  }
  if (has(allText, /\bokta\b|\bauth0\b|\bactive directory\b/i)) {
    addFinding(findings, 'enterprise_idp', 'Enterprise identity provider detected', 'Okta/Auth0/Active Directory mentioned — enterprise auth signal', 0.90);
  }
  if (has(allText, /\bdata residency\b|\bprivate cloud\b|\bself.hosted\b|\bon.premise\b/i)) {
    addFinding(findings, 'data_residency', 'Data residency or self-hosting option detected', 'Data residency or self-hosting mentioned — enterprise data control signal', 0.88);
  }

  const frameworks = payload.homepage?.tech_hints?.frameworks || [];
  const analytics = payload.homepage?.tech_hints?.analytics || [];
  const payments = payload.homepage?.tech_hints?.payment || [];
  const support = [
    has(allText, /\bintercom\b/i) ? 'Intercom' : '',
    has(allText, /\bzendesk\b/i) ? 'Zendesk' : '',
    has(allText, /\bfreshdesk\b/i) ? 'Freshdesk' : '',
  ];
  const crm = [
    has(allText, /\bsalesforce\b/i) ? 'Salesforce' : '',
    has(allText, /\bhubspot\b/i) ? 'HubSpot' : '',
  ];

  return {
    findings,
    pageTypes,
    tech: {
      frontend: uniq(frameworks),
      analytics: uniq(analytics),
      payments: uniq(payments),
      support: uniq(support),
      crm: uniq(crm),
    },
  };
}

function buildGrowthSignals(analysis: SignalAnalysis): GrowthSignal[] {
  const now = new Date().toISOString();
  return analysis.findings.map((finding) => {
    const sourceType = inferSourceType(finding.key, finding.evidence);
    const adjustedConfidence = applyTrust(finding.confidence, sourceType);
    // Map signal key to decay type for freshness
    const decayKey = finding.key === 'hiring' ? 'hiring_roles'
      : finding.key === 'product_velocity' ? 'recent_news'
      : finding.key === 'pricing' ? 'pricing'
      : 'default';
    return {
      signal: finding.label,
      evidence: finding.evidence,
      confidence: adjustedConfidence,
      source_type: sourceType,
      trust_level: sourceType === 'careers_page' || sourceType === 'github' || sourceType === 'pricing_page' ? 'high'
        : sourceType === 'ai_inference' ? 'low' : 'medium',
      freshness_score: computeFreshnessScore(now, decayKey),
      detected_at: now,
      reasoning: `Detected via ${sourceType.replace(/_/g, ' ')} with ${Math.round(adjustedConfidence * 100)}% confidence after trust adjustment`,
    };
  });
}

function buildPainPoints(analysis: SignalAnalysis): PainPoint[] {
  const pains: PainPoint[] = [];
  const hasEnterprise = analysis.findings.some((f) => f.key === 'enterprise_readiness');
  const hasDocs = analysis.findings.some((f) => f.key === 'developer_surface');
  const hasIntegrations = analysis.findings.some((f) => f.key === 'integrations');
  const hasHiring = analysis.findings.some((f) => f.key === 'hiring');
  const hasSalesMotion = analysis.findings.some((f) => f.key === 'sales_motion');

  if (hasEnterprise) {
    const finding = analysis.findings.find((f) => f.key === 'enterprise_readiness');
    pains.push({
      pain: 'Maintaining enterprise-grade security and compliance expectations',
      why: 'Trust/security/compliance surfaces indicate larger customers will scrutinize controls, procurement readiness, and reliability.',
      evidence: finding?.evidence || '',
      confidence: applyTrust(finding?.confidence || 0.75, 'pricing_page'),
      source_type: 'pricing_page',
      trust_level: 'high',
      freshness_score: computeFreshnessScore(new Date().toISOString(), 'security_page'),
      supporting_signals: ['enterprise_readiness'],
    });
  }

  if (hasDocs || hasIntegrations) {
    const finding = analysis.findings.find((f) => f.key === 'developer_surface' || f.key === 'integrations');
    pains.push({
      pain: 'Scaling developer and integration ecosystem operations',
      why: 'Docs, APIs, SDKs, or integrations increase support, platform reliability, partner enablement, and developer experience pressure.',
      evidence: finding?.evidence || '',
      confidence: applyTrust(finding?.confidence || 0.72, 'page_text'),
      source_type: 'page_text',
      trust_level: 'high',
      freshness_score: computeFreshnessScore(new Date().toISOString(), 'integrations'),
      supporting_signals: ['developer_surface', 'integrations'].filter((k) => analysis.findings.some((f) => f.key === k)),
    });
  }

  if (hasHiring) {
    const finding = analysis.findings.find((f) => f.key === 'hiring');
    pains.push({
      pain: 'Operational load from team growth',
      why: 'Hiring signals often precede process strain across onboarding, enablement, RevOps, support, and internal tooling.',
      evidence: finding?.evidence || '',
      confidence: applyTrust(finding?.confidence || 0.70, 'careers_page'),
      source_type: 'careers_page',
      trust_level: 'high',
      freshness_score: computeFreshnessScore(new Date().toISOString(), 'hiring_roles'),
      supporting_signals: ['hiring'],
    });
  }

  if (hasSalesMotion) {
    const finding = analysis.findings.find((f) => f.key === 'sales_motion');
    pains.push({
      pain: 'Enterprise pipeline conversion and sales handoff complexity',
      why: 'Demo/contact-sales and enterprise messaging imply a higher-touch sales process with handoff, qualification, and proof requirements.',
      evidence: finding?.evidence || '',
      confidence: applyTrust(finding?.confidence || 0.68, 'page_text'),
      source_type: 'page_text',
      trust_level: 'high',
      freshness_score: computeFreshnessScore(new Date().toISOString(), 'default'),
      supporting_signals: ['sales_motion'],
    });
  }

  return pains;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isUsefulRecommendation(item: string): boolean {
  const text = item.toLowerCase();
  if (text.length < 45) return false;
  if (/^focus on\b|^leverage\b|^consider\b/.test(text)) return false;
  if (!/\b(target|ask|reference|lead with|open with|bring|use|for\s+\w+\s+leaders|compare)\b/.test(text)) return false;
  return true;
}

export function improveIntelWithSignals(intel: BaseIntel, payload: ExtractedPayload): BaseIntel {
  const analysis = analyzePayloadSignals(payload);
  const findings = analysis.findings;
  const evidence = findings.map((finding) => finding.evidence);
  const score = clamp(
    28 +
      findings.length * 7 +
      (findings.some((f) => f.key === 'enterprise_readiness') ? 14 : 0) +
      (findings.some((f) => f.key === 'sales_motion') ? 12 : 0) +
      (findings.some((f) => f.key === 'hiring') ? 10 : 0) +
      (findings.some((f) => f.key === 'integrations') ? 8 : 0)
  );
  const urgency: Urgency = score >= 78 ? 'high' : score >= 55 ? 'medium' : 'low';

  const deterministicGrowth = buildGrowthSignals(analysis);
  const deterministicPains = buildPainPoints(analysis);
  const mergedGrowth = [...deterministicGrowth, ...(intel.growth_signals || [])].slice(0, 8);
  const mergedPains = [...deterministicPains, ...(intel.pain_points || [])].slice(0, 8);

  const likelyNeeds = dedupeStrings([
    findings.some((f) => f.key === 'enterprise_readiness') ? 'security, compliance, procurement, reliability, or trust tooling' : '',
    findings.some((f) => f.key === 'developer_surface') ? 'developer experience, documentation, observability, or platform engineering tooling' : '',
    findings.some((f) => f.key === 'integrations') ? 'integration management, partner ecosystem, workflow automation, or RevOps tooling' : '',
    findings.some((f) => f.key === 'hiring') ? 'onboarding, enablement, recruiting operations, or internal knowledge tooling' : '',
    findings.some((f) => f.key === 'sales_motion') ? 'sales qualification, account intelligence, demo conversion, or enterprise pipeline tooling' : '',
  ]);

  const whyNow = dedupeStrings([
    findings.some((f) => f.key === 'enterprise_readiness') ? 'Enterprise trust/security surfaces indicate current pressure from larger customers and procurement reviews.' : '',
    findings.some((f) => f.key === 'sales_motion') ? 'Demo/contact-sales language suggests active enterprise pipeline capture rather than pure self-serve motion.' : '',
    findings.some((f) => f.key === 'integrations') ? 'Integration ecosystem signals show workflow expansion and partner/customer implementation complexity.' : '',
    findings.some((f) => f.key === 'developer_surface') ? 'Docs/API/developer surfaces show platform usage that can create support, reliability, and developer-experience bottlenecks.' : '',
    findings.some((f) => f.key === 'hiring') ? 'Hiring signals suggest expanding teams and near-term operational strain.' : '',
    ...(intel.why_now || []),
  ]).slice(0, 6);

  const actionRecommendations = dedupeStrings([
    findings.some((f) => f.key === 'enterprise_readiness')
      ? 'Open with the enterprise readiness angle: reference their trust/security surface and ask how procurement, compliance reviews, or reliability expectations are scaling.'
      : '',
    findings.some((f) => f.key === 'developer_surface')
      ? 'Target platform/devrel leaders with a developer-experience angle tied to docs, APIs, SDKs, and support load.'
      : '',
    findings.some((f) => f.key === 'integrations')
      ? 'Use the integration ecosystem as the wedge: ask how they prioritize partner integrations, customer workflow requests, and implementation quality.'
      : '',
    findings.some((f) => f.key === 'sales_motion')
      ? 'For revenue leaders, lead with enterprise pipeline efficiency: demo conversion, account qualification, handoff quality, and proof for high-value accounts.'
      : '',
    findings.some((f) => f.key === 'hiring')
      ? 'Use team-growth pressure as the timing trigger: ask what breaks when onboarding, enablement, or internal processes scale quickly.'
      : '',
    ...(intel.action_recommendations || []).filter(isUsefulRecommendation),
  ]).filter(isUsefulRecommendation).slice(0, 6);

  return {
    ...intel,
    growth_signals: mergedGrowth,
    pain_points: mergedPains,
    tech_stack: uniq([...(intel.tech_stack || []), ...analysis.tech.frontend, ...analysis.tech.analytics, ...analysis.tech.payments]),
    buying_intent: {
      ...(intel.buying_intent || {}),
      score,
      urgency,
      confidence: findings.length >= 5 ? 0.82 : findings.length >= 3 ? 0.68 : 0.48,
      likely_needs: likelyNeeds,
      reasons: findings.map((finding) => finding.label),
      evidence,
    },
    why_now: whyNow,
    technology_intelligence: {
      ...(intel.technology_intelligence || {}),
      frontend: analysis.tech.frontend,
      analytics: analysis.tech.analytics,
      crm: analysis.tech.crm,
      payments: analysis.tech.payments,
      support: analysis.tech.support,
      recent_changes: intel.technology_intelligence?.recent_changes || [],
      confidence: findings.length >= 3 ? 0.74 : 0.5,
      evidence,
    },
    maturity_analysis: {
      ...(intel.maturity_analysis || {}),
      company_stage: intel.growth_stage || 'growth',
      sales_maturity: findings.some((f) => f.key === 'sales_motion') ? 'advanced' : findings.some((f) => f.key === 'pricing') ? 'developing' : 'basic',
      enterprise_readiness: clamp(35 + (findings.some((f) => f.key === 'enterprise_readiness') ? 35 : 0) + (findings.some((f) => f.key === 'sales_motion') ? 15 : 0)),
      product_maturity: clamp(40 + (findings.some((f) => f.key === 'developer_surface') ? 20 : 0) + (findings.some((f) => f.key === 'integrations') ? 15 : 0) + (findings.some((f) => f.key === 'product_velocity') ? 10 : 0)),
      confidence: findings.length >= 4 ? 0.78 : 0.55,
      evidence,
    },
    predictive_intelligence: {
      ...(intel.predictive_intelligence || {}),
      funding_likelihood: clamp(20 + (findings.some((f) => f.key === 'hiring') ? 20 : 0) + (findings.some((f) => f.key === 'product_velocity') ? 10 : 0)),
      scaling_probability: clamp(35 + findings.length * 6 + (findings.some((f) => f.key === 'hiring') ? 14 : 0)),
      enterprise_expansion: clamp(25 + (findings.some((f) => f.key === 'enterprise_readiness') ? 35 : 0) + (findings.some((f) => f.key === 'sales_motion') ? 20 : 0)),
      operational_bottlenecks: mergedPains.map((pain) => pain.pain).slice(0, 5),
      confidence: findings.length >= 4 ? 0.72 : 0.48,
      evidence,
    },
    outreach_strategy: {
      ...(intel.outreach_strategy || {}),
      best_channel: findings.some((f) => f.key === 'sales_motion') ? 'multi-touch' : 'email',
      best_angle: findings.some((f) => f.key === 'enterprise_readiness')
        ? 'risk reduction'
        : findings.some((f) => f.key === 'developer_surface')
          ? 'technical migration'
          : 'growth pain',
      recommended_hook:
        findings.length > 0
          ? `Saw signals around ${findings.slice(0, 2).map((f) => f.label.toLowerCase()).join(' and ')}. Worth comparing how your team is handling the operational pressure behind that growth?`
          : 'Use a discovery-led opener and ask which operational area is under the most pressure right now.',
      likely_objections: ['Already have internal tooling', 'Timing is not urgent', 'Need proof it works for our scale'],
      confidence: findings.length >= 3 ? 0.72 : 0.45,
      evidence,
    },
    stakeholders: (intel.stakeholders?.length ? intel.stakeholders : [
      {
        role: findings.some((f) => f.key === 'developer_surface') ? 'VP Platform / Head of Developer Experience' : 'VP Operations / RevOps Leader',
        influence: 'high' as const,
        department: findings.some((f) => f.key === 'developer_surface') ? 'Engineering' : 'Operations',
        likely_goals: findings.some((f) => f.key === 'developer_surface')
          ? ['Improve developer experience', 'Reduce support load', 'Scale platform reliability']
          : ['Improve process efficiency', 'Increase enterprise conversion', 'Reduce operational drag'],
        best_message_angle: findings.some((f) => f.key === 'enterprise_readiness') ? 'enterprise readiness and risk reduction' : 'scaling pressure and operational leverage',
        confidence: findings.length >= 3 ? 0.68 : 0.45,
        evidence,
      },
    ]).slice(0, 6),
    action_recommendations: actionRecommendations,
    correlated_inferences: correlateSignals(findings.map((f) => f.key)),
  };
}
