"use client";

import { useState } from "react";
import { Check, Sparkles, Crown, Building2, Zap, Loader2, AlertCircle } from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/Badge";
import { upgradeUserPlan } from "@/app/actions/sales";
import { useSidebar } from "@/components/dashboard/SidebarContext";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    icon: Zap,
    monthly: 0,
    quota: 10,
    features: [
      "10 briefs/month",
      "Basic company summary",
      "Tech stack detection",
      "Manual CRM copy-paste",
      "1 device",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    icon: Sparkles,
    monthly: 29,
    quota: 999999,
    popular: true,
    features: [
      "Unlimited briefs",
      "AI outreach drafts (Email/LinkedIn/Call)",
      "Full signals & decision makers",
      "HubSpot + Pipedrive push",
      "50 email lookups/mo",
      "Export DOCX/Excel",
    ],
  },
  {
    id: "team" as const,
    name: "Team",
    icon: Crown,
    monthly: 49,
    quota: 999999,
    features: [
      "Everything in Pro",
      "Shared playbooks",
      "Team analytics",
      "Salesforce + Outreach",
      "500 email lookups/seat/mo",
      "Audit log",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    icon: Building2,
    monthly: -1,
    quota: 999999,
    features: [
      "Everything in Team",
      "SSO + SCIM",
      "SOC 2 Type II",
      "Private data routing",
      "Dedicated CSM",
    ],
  },
];

export default function BillingPage() {
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const { profile, profileLoading, refreshProfile } = useSidebar();

  const handleUpgrade = async (planId: 'free' | 'pro' | 'team' | 'enterprise') => {
    if (upgrading) return;
    setUpgrading(planId);
    setUpgradeError(null);
    setUpgradeSuccess(null);

    const res = await upgradeUserPlan(planId);
    if (res.ok) {
      setUpgradeSuccess(planId);
      await refreshProfile(); // refresh shared context
      setTimeout(() => setUpgradeSuccess(null), 4000);
    } else {
      setUpgradeError(res.error?.message || 'Upgrade failed');
    }
    setUpgrading(null);
  };

  const currentPlan = profile?.plan || 'free';
  const briefsUsed = profile?.monthly_brief_used ?? 0;
  const briefsQuota = profile?.monthly_brief_quota ?? 10;
  const usagePct = briefsQuota > 0 ? Math.min(100, (briefsUsed / briefsQuota) * 100) : 0;
  const currentPlanInfo = PLANS.find(p => p.id === currentPlan) || PLANS[0];
  const CurrentIcon = currentPlanInfo.icon;

  return (
    <>
      <DashTopBar title="Billing" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-text">Billing &amp; Plan 💳</h2>
        <p className="mt-1 text-sm text-text-muted">Manage your subscription and usage.</p>

        {/* Upgrade success banner */}
        {upgradeSuccess && (
          <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <Check className="h-5 w-5 text-success shrink-0" />
            <p className="text-sm text-success font-medium">
              Successfully upgraded to {PLANS.find(p => p.id === upgradeSuccess)?.name}! Your plan is now active.
            </p>
          </div>
        )}
        {upgradeError && (
          <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger shrink-0" />
            <p className="text-sm text-danger">{upgradeError}</p>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="mt-8 rounded-2xl border border-brand-violet/30 bg-surface-1 p-6 shadow-glow/10">
          {profileLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                    <CurrentIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text capitalize">{currentPlan} Plan</h3>
                    <p className="text-xs text-text-muted">
                      {currentPlan === 'free' ? '10 briefs/month' : 'Unlimited briefs'} · Active
                    </p>
                  </div>
                </div>
                <Badge tone="brand">Current Plan</Badge>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-text-muted">Monthly Usage</span>
                  <span className="text-xs text-text-muted font-medium">
                    {briefsUsed} / {briefsQuota >= 999999 ? '∞' : briefsQuota} briefs used
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePct >= 90 ? 'bg-danger' :
                      usagePct >= 70 ? 'bg-yellow-500' : 'bg-brand-gradient'
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {usagePct >= 90 && currentPlan === 'free' && (
                  <p className="mt-2 text-xs text-danger flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    You're almost at your limit! Upgrade now to keep researching.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Plan Comparison Grid */}
        <h3 className="mt-10 text-lg font-semibold text-text">Choose Your Plan</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((p) => {
            const isCurrent = p.id === currentPlan;
            const isUpgrading = upgrading === p.id;
            const PlanIcon = p.icon;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${
                  isCurrent ? "border-brand-violet/60 bg-surface-1 shadow-glow" :
                  p.popular ? "border-brand-violet/40 bg-surface-1 hover:border-brand-violet/60" :
                  "border-border bg-surface-1 hover:border-brand-violet/30"
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-0.5 text-[9px] font-bold uppercase text-white">
                    Recommended
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-success/20 border border-success/30 px-3 py-0.5 text-[9px] font-bold uppercase text-success">
                    Active
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <PlanIcon className="h-5 w-5 text-brand-glow" />
                  <h4 className="text-base font-semibold text-text">{p.name}</h4>
                </div>

                <div className="mb-4">
                  {p.monthly === 0 ? (
                    <><span className="text-2xl font-bold text-text">$0</span><span className="text-sm text-text-muted">/mo</span></>
                  ) : p.monthly === -1 ? (
                    <span className="text-xl font-bold text-text">Custom</span>
                  ) : (
                    <><span className="text-2xl font-bold text-text">${p.monthly}</span><span className="text-sm text-text-muted">/{p.id === 'team' ? 'seat/mo' : 'mo'}</span></>
                  )}
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-muted">
                      <Check className="mt-0.5 h-3 w-3 text-success shrink-0" /> {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || isUpgrading || upgrading !== null}
                  onClick={() => !isCurrent && p.monthly !== -1 && handleUpgrade(p.id)}
                  className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isCurrent ? "border border-success/30 bg-success/10 text-success cursor-default" :
                    p.popular ? "bg-brand-gradient text-white hover:opacity-90 disabled:opacity-50" :
                    p.monthly === -1 ? "border border-border bg-surface-2 text-text hover:bg-surface-3" :
                    "border border-border bg-surface-2 text-text hover:bg-surface-3 disabled:opacity-50"
                  }`}
                >
                  {isUpgrading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Upgrading...</>
                  ) : isCurrent ? (
                    <><Check className="h-4 w-4" /> Current Plan</>
                  ) : p.monthly === -1 ? (
                    'Contact Sales'
                  ) : (
                    `Upgrade to ${p.name}`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Invoice History */}
        <h3 className="mt-10 text-lg font-semibold text-text">Invoice History</h3>
        <div className="mt-4 rounded-2xl border border-border bg-surface-1 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-surface-2">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-6 text-center text-text-muted text-xs" colSpan={3}>
                  No invoices yet
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
