// ============================================================
// P2 — Change Detection Engine
// Diffs old vs new BaseIntel to detect meaningful changes:
// pricing, CTAs, tech stack, hiring, integrations, messaging.
// Produces structured DetectedChange[] for timeline + alerts.
// ============================================================

import type { BaseIntel, DetectedChange, ChangeType } from './types';

function arrDiff<T>(oldArr: T[] = [], newArr: T[] = []): { added: T[]; removed: T[] } {
  const oldSet = new Set(oldArr.map(String));
  const newSet = new Set(newArr.map(String));
  return {
    added: newArr.filter((x) => !oldSet.has(String(x))),
    removed: oldArr.filter((x) => !newSet.has(String(x))),
  };
}

function significanceFromCount(count: number): DetectedChange['significance'] {
  if (count >= 3) return 'critical';
  if (count >= 2) return 'high';
  if (count >= 1) return 'medium';
  return 'low';
}

/**
 * Detect meaningful changes between two versions of BaseIntel.
 * Returns structured DetectedChange[] sorted by significance.
 */
export function detectChanges(
  oldIntel: BaseIntel,
  newIntel: BaseIntel
): DetectedChange[] {
  const changes: DetectedChange[] = [];
  const now = new Date().toISOString();

  // ── Pricing changes ──────────────────────────────────────────
  const oldTiers = oldIntel.pricing?.tiers || [];
  const newTiers = newIntel.pricing?.tiers || [];
  const tierDiff = arrDiff(oldTiers, newTiers);

  if (!oldIntel.pricing && newIntel.pricing) {
    changes.push({
      type: 'pricing_added',
      field: 'pricing',
      old_value: null,
      new_value: newIntel.pricing,
      significance: 'critical',
      summary: `Pricing page added — ${newIntel.pricing.model || 'unknown model'}${newIntel.pricing.starting_price ? ` starting at ${newIntel.pricing.starting_price}` : ''}`,
      detected_at: now,
    });
  } else if (tierDiff.added.length > 0) {
    const isEnterprise = tierDiff.added.some((t) => /enterprise|custom|business/i.test(String(t)));
    changes.push({
      type: isEnterprise ? 'enterprise_tier_added' : 'pricing_changed',
      field: 'pricing.tiers',
      old_value: oldTiers,
      new_value: newTiers,
      significance: isEnterprise ? 'critical' : 'high',
      summary: `New pricing tier${tierDiff.added.length > 1 ? 's' : ''} added: ${tierDiff.added.join(', ')}`,
      detected_at: now,
    });
  } else if (oldIntel.pricing?.starting_price !== newIntel.pricing?.starting_price && newIntel.pricing?.starting_price) {
    changes.push({
      type: 'pricing_changed',
      field: 'pricing.starting_price',
      old_value: oldIntel.pricing?.starting_price,
      new_value: newIntel.pricing?.starting_price,
      significance: 'high',
      summary: `Pricing changed: ${oldIntel.pricing?.starting_price || 'unknown'} → ${newIntel.pricing?.starting_price}`,
      detected_at: now,
    });
  }

  // ── Tech stack changes ───────────────────────────────────────
  const techDiff = arrDiff(oldIntel.tech_stack, newIntel.tech_stack);
  if (techDiff.added.length > 0) {
    const isCRM = techDiff.added.some((t) => /salesforce|hubspot|pipedrive|dynamics/i.test(String(t)));
    changes.push({
      type: isCRM ? 'integration_added' : 'tech_added',
      field: 'tech_stack',
      old_value: techDiff.removed,
      new_value: techDiff.added,
      significance: isCRM ? 'high' : 'medium',
      summary: `New technology detected: ${techDiff.added.join(', ')}`,
      detected_at: now,
    });
  }
  if (techDiff.removed.length > 0) {
    changes.push({
      type: 'tech_removed',
      field: 'tech_stack',
      old_value: techDiff.removed,
      new_value: [],
      significance: 'medium',
      summary: `Technology removed: ${techDiff.removed.join(', ')}`,
      detected_at: now,
    });
  }

  // ── Hiring changes ───────────────────────────────────────────
  const oldRoles = oldIntel.hiring?.active_roles || [];
  const newRoles = newIntel.hiring?.active_roles || [];
  const roleDiff = arrDiff(oldRoles, newRoles);

  if (roleDiff.added.length >= 3) {
    changes.push({
      type: 'hiring_increased',
      field: 'hiring.active_roles',
      old_value: oldRoles.length,
      new_value: newRoles.length,
      significance: significanceFromCount(roleDiff.added.length),
      summary: `Hiring increased by ${roleDiff.added.length} new roles: ${roleDiff.added.slice(0, 3).join(', ')}${roleDiff.added.length > 3 ? '...' : ''}`,
      detected_at: now,
    });
  } else if (roleDiff.added.length > 0) {
    const isRevOps = roleDiff.added.some((r) => /revops|revenue ops|sales ops|sdr|ae|account exec/i.test(String(r)));
    changes.push({
      type: 'hiring_increased',
      field: 'hiring.active_roles',
      old_value: oldRoles,
      new_value: roleDiff.added,
      significance: isRevOps ? 'high' : 'medium',
      summary: `New hiring: ${roleDiff.added.join(', ')}`,
      detected_at: now,
    });
  }

  // ── Security/compliance page added ───────────────────────────
  const oldHasSecurity = (oldIntel.risk_flags || []).some((f) => /security|compliance|soc2/i.test(f)) ||
    (oldIntel.maturity_analysis?.enterprise_readiness || 0) > 60;
  const newHasSecurity = (newIntel.maturity_analysis?.enterprise_readiness || 0) > 70;

  if (!oldHasSecurity && newHasSecurity) {
    changes.push({
      type: 'security_page_added',
      field: 'maturity_analysis.enterprise_readiness',
      old_value: oldIntel.maturity_analysis?.enterprise_readiness,
      new_value: newIntel.maturity_analysis?.enterprise_readiness,
      significance: 'high',
      summary: 'Enterprise security/compliance signals strengthened',
      detected_at: now,
    });
  }

  // ── Messaging/CTA changes ────────────────────────────────────
  const oldAngle = oldIntel.outreach_strategy?.best_angle;
  const newAngle = newIntel.outreach_strategy?.best_angle;
  if (oldAngle && newAngle && oldAngle !== newAngle) {
    changes.push({
      type: 'messaging_changed',
      field: 'outreach_strategy.best_angle',
      old_value: oldAngle,
      new_value: newAngle,
      significance: 'medium',
      summary: `Messaging angle shifted: ${oldAngle} → ${newAngle}`,
      detected_at: now,
    });
  }

  // ── Buying intent score jump ─────────────────────────────────
  const oldScore = oldIntel.buying_intent?.score || 0;
  const newScore = newIntel.buying_intent?.score || 0;
  if (newScore - oldScore >= 15) {
    changes.push({
      type: 'pricing_changed', // reuse as generic "intent jump" signal
      field: 'buying_intent.score',
      old_value: oldScore,
      new_value: newScore,
      significance: newScore >= 80 ? 'critical' : 'high',
      summary: `Buying intent score jumped from ${oldScore} to ${newScore}`,
      detected_at: now,
    });
  }

  // Sort: critical first, then high, medium, low
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return changes.sort((a, b) => (order[a.significance] ?? 3) - (order[b.significance] ?? 3));
}
