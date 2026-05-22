"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BarChart3, FileText, Zap,
  Clock, Plug, Sparkles, Globe, Users, Target, Loader2,
  Terminal, Copy,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { generateBrief } from "@/app/actions/sales";
import { useSidebar } from "@/components/dashboard/SidebarContext";

export default function DashboardHome() {
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  // Use shared profile context — no extra DB call needed
  const { profile, profileLoading, refreshProfile } = useSidebar();

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setQuotaError(false);
    setDebugLog(["Starting request from dashboard..."]);

    try {
      let fullUrl = url.trim();
      if (!fullUrl.startsWith("http")) fullUrl = `https://${fullUrl}`;
      const res = await generateBrief(fullUrl);
      setDebugLog(res.debugLog || []);
      if (res.ok) {
        setResult(res.data);
        // Refresh shared profile context so TopBar + Sidebar update too
        await refreshProfile();
      } else if (res.error?.code === "QUOTA_EXCEEDED") {
        setQuotaError(true);
      } else {
        setError(res.error?.message || "Failed to generate brief");
      }
    } catch (err: any) {
      setError(err.message);
      setDebugLog((prev) => [...prev, `Client error: ${err.message}`]);
    } finally {
      setGenerating(false);
    }
  };

  const copyDebugLog = () => {
    navigator.clipboard.writeText(debugLog.join("\n"));
  };

  const plan = profile?.plan || "free";
  const briefsUsed = profile?.monthly_brief_used ?? 0;
  const briefsQuota = profile?.monthly_brief_quota ?? 10;
  const totalBriefs = profile?.total_briefs ?? 0;
  const hoursSaved = profile?.hours_saved ?? 0;
  const crmPushes = profile?.crm_pushes ?? 0;
  const usagePct = briefsQuota > 0 ? Math.min(100, (briefsUsed / briefsQuota) * 100) : 0;
  const isUnlimited = briefsQuota >= 999999;
  const isAtLimit = !isUnlimited && briefsUsed >= briefsQuota;

  const statCards = [
    {
      label: "Briefs Generated",
      value: profileLoading ? "—" : String(totalBriefs),
      sub: "total all time",
      icon: FileText,
    },
    {
      label: "Hours Saved",
      value: profileLoading ? "—" : String(hoursSaved),
      sub: "~12 min per brief",
      icon: Clock,
    },
    {
      label: "CRM Pushes",
      value: profileLoading ? "—" : String(crmPushes),
      sub: "total",
      icon: Plug,
    },
    {
      label: "Plan",
      value: profileLoading ? "—" : plan.charAt(0).toUpperCase() + plan.slice(1),
      sub: `${briefsUsed} / ${isUnlimited ? "∞" : briefsQuota} this month`,
      icon: Sparkles,
    },
  ] as const;

  return (
    <>
      <DashTopBar title="Sales Dashboard" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Sales Command Center 🎯
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Generate prospect briefs, push to CRM, close more deals.
            </p>
          </div>
          <div className="flex gap-2">
            <Button href="/dashboard/briefs" variant="secondary" leftIcon={<FileText className="h-4 w-4" />}>
              View Briefs
            </Button>
            {plan === "free" && (
              <Button href="/dashboard/billing" leftIcon={<Sparkles className="h-4 w-4" />}>
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>

        {/* Quota Exceeded Banner */}
        {(quotaError || isAtLimit) && (
          <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/20 text-danger">
              <Zap className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-danger">Monthly Limit Reached</p>
              <p className="text-xs text-text-muted mt-0.5">
                You&apos;ve used all {briefsQuota} briefs this month on the {plan} plan.
                Upgrade to Pro for unlimited briefs.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition shrink-0"
            >
              Upgrade →
            </Link>
          </div>
        )}

        {/* Quick Brief Generator */}
        <div className="mt-8 rounded-2xl border border-brand-violet/30 bg-surface-1 p-6 shadow-glow/10">
          <div className="flex items-start gap-3 mb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-text">Quick Brief Generator</h3>
              <p className="text-xs text-text-muted">Enter any company URL to generate a sales-ready prospect brief</p>
            </div>
            {!profileLoading && (
              <div className="text-right shrink-0">
                <p className="text-xs text-text-muted">
                  {briefsUsed} / {isUnlimited ? "∞" : briefsQuota} used
                </p>
                {!isUnlimited && (
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePct >= 90 ? "bg-danger" :
                        usagePct >= 70 ? "bg-yellow-500" : "bg-brand-gradient"
                      }`}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {isAtLimit ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-center">
              <p className="text-sm text-danger font-medium mb-3">
                You&apos;ve reached your {briefsQuota}-brief monthly limit on the Free plan.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro — Unlimited Briefs
              </Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                <input
                  type="url"
                  placeholder="acme.com or https://acme.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  className="w-full rounded-xl border border-border bg-surface-2 py-3 pl-10 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none focus:ring-1 focus:ring-brand-violet/40"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !url.trim()}
                className="flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Zap className="h-4 w-4" /> Generate Brief</>
                )}
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}

          {debugLog.length > 0 && (
            <div className="mt-4 rounded-xl border border-border-soft bg-surface-2">
              <div className="flex items-center justify-between border-b border-border-soft px-4 py-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-brand-glow" />
                  <p className="text-xs font-medium text-text">Generation log</p>
                </div>
                <button
                  type="button"
                  onClick={copyDebugLog}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-1 px-2 py-1 text-[10px] text-text-muted hover:bg-surface-3"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap px-4 py-3 text-[11px] leading-relaxed text-text-muted">
                {debugLog.join("\n")}
              </pre>
            </div>
          )}
        </div>

        {/* Generated Brief Result */}
        {result && (
          <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-brand-gradient grid place-items-center text-white font-bold text-lg">
                {result.data?.company?.name?.[0] || "?"}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text">{result.data?.company?.name || "Company"}</h3>
                <p className="text-xs text-text-muted">
                  {result.data?.company?.industry} · {result.data?.company?.size_band} employees · {result.data?.company?.hq}
                </p>
              </div>
              <Badge tone="brand">Generated</Badge>
            </div>

            {result.data?.company?.summary_short && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Summary</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {result.data.company.summary_long || result.data.company.summary_short}
                </p>
              </div>
            )}

            {(result.data?.buying_intent || result.data?.maturity_analysis) && (
              <div className="grid gap-3 sm:grid-cols-3">
                {result.data?.buying_intent && (
                  <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                    <p className="text-xs font-medium text-brand-glow">Buying Intent</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{result.data.buying_intent.score ?? 0}/100</p>
                    <p className="text-xs text-text-muted">
                      {result.data.buying_intent.urgency || "unknown"} urgency · {Math.round((result.data.buying_intent.confidence || 0) * 100)}% confidence
                    </p>
                  </div>
                )}
                {result.data?.maturity_analysis && (
                  <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                    <p className="text-xs font-medium text-brand-glow">Enterprise Readiness</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{result.data.maturity_analysis.enterprise_readiness ?? 0}/100</p>
                    <p className="text-xs text-text-muted">{result.data.maturity_analysis.sales_maturity || "unknown"} sales maturity</p>
                  </div>
                )}
                {result.data?.predictive_intelligence && (
                  <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                    <p className="text-xs font-medium text-brand-glow">Scaling Probability</p>
                    <p className="mt-2 text-2xl font-semibold text-text">{result.data.predictive_intelligence.scaling_probability ?? 0}/100</p>
                    <p className="text-xs text-text-muted">{Math.round((result.data.predictive_intelligence.confidence || 0) * 100)}% confidence</p>
                  </div>
                )}
              </div>
            )}

            {result.data?.buying_intent?.reasons?.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Buying Intent Evidence</p>
                <ul className="space-y-1.5">
                  {result.data.buying_intent.reasons.slice(0, 5).map((item: string, index: number) => (
                    <li key={index} className="flex gap-2 text-sm text-text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.data?.why_now?.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Why Now</p>
                <ul className="space-y-1.5">
                  {result.data.why_now.slice(0, 4).map((item: string, index: number) => (
                    <li key={index} className="flex gap-2 text-sm text-text-muted">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(result.data?.pain_details?.length > 0 || result.data?.pain_hypotheses?.length > 0) && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Likely Pain Points</p>
                <div className="space-y-2">
                  {(result.data.pain_details || result.data.pain_hypotheses.map((pain: string) => ({ pain }))).slice(0, 5).map((pain: any, index: number) => (
                    <div key={index} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                      <p className="text-sm font-medium text-text">{pain.pain || pain}</p>
                      {pain.why && <p className="mt-1 text-xs text-text-muted">{pain.why}</p>}
                      {pain.evidence && <p className="mt-1 text-[11px] text-text-subtle">Evidence: {pain.evidence}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.data?.stakeholders?.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Likely Stakeholders</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.data.stakeholders.slice(0, 4).map((stakeholder: any, index: number) => (
                    <div key={index} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                      <p className="text-sm font-medium text-text">{stakeholder.role}</p>
                      <p className="mt-1 text-xs text-text-muted">{stakeholder.best_message_angle}</p>
                      <p className="mt-1 text-[11px] text-text-subtle">{stakeholder.influence} influence · {Math.round((stakeholder.confidence || 0) * 100)}% confidence</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.data?.outreach_strategy && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Best Outreach Angle</p>
                <p className="text-sm font-medium text-text">{result.data.outreach_strategy.best_angle}</p>
                <p className="mt-1 text-sm text-text-muted">{result.data.outreach_strategy.recommended_hook}</p>
              </div>
            )}

            {result.data?.action_recommendations?.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Recommended Next Actions</p>
                <ol className="space-y-1.5">
                  {result.data.action_recommendations.slice(0, 4).map((item: string, index: number) => (
                    <li key={index} className="text-sm text-text-muted">{index + 1}. {item}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link
                href="/dashboard/briefs"
                className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-center text-sm font-medium text-text hover:bg-surface-3 transition"
              >
                View All Briefs
              </Link>
              <button className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-medium text-white hover:opacity-90 transition">
                Push to CRM →
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-5"
            >
              {profileLoading && (
                <div className="absolute inset-0 rounded-2xl bg-surface-1/80 animate-pulse" />
              )}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    {s.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-text">{s.value}</p>
                  <p className="mt-1 text-xs text-text-subtle">{s.sub}</p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, label: "View all briefs", href: "/dashboard/briefs" },
            { icon: Users, label: "Manage team", href: "/dashboard/team" },
            { icon: Plug, label: "Connect CRM", href: "/dashboard/integrations" },
            { icon: BarChart3, label: "View analytics", href: "/dashboard/analytics" },
          ].map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="group flex items-center justify-between rounded-2xl border border-border bg-surface-1 p-4 transition-all hover:border-brand-violet/40 hover:bg-surface-2"
            >
              <span className="inline-flex items-center gap-3 text-sm text-text">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                  <q.icon className="h-4 w-4" />
                </span>
                {q.label}
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
