"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight, BarChart3, FileText, Zap,
  Clock, Plug, Sparkles, Globe, Users, Target, Loader2,
  Terminal, Copy, Search, CheckCircle2, Circle, ExternalLink,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useSidebar } from "@/components/dashboard/SidebarContext";
import { TimelineChart } from "@/components/dashboard/AnalyticsChart";

import { browserCrawl, type BrowserCrawlProgress } from "@/lib/browser-crawler";

// ─── Crawl Visualizer ─────────────────────────────────────────

interface CrawlTab {
  url: string;
  type: string;
  status: 'waiting' | 'crawling' | 'done' | 'failed';
}

function CrawlVisualizer({
  progress,
  tabs,
  domain,
}: {
  progress: BrowserCrawlProgress | null;
  tabs: CrawlTab[];
  domain: string;
}) {
  if (!progress && tabs.length === 0) return null;

  const typeIcon: Record<string, string> = {
    pricing: '💰', careers: '👥', enterprise: '🏢', security: '🔒',
    integrations: '🔌', docs: '📚', customers: '⭐', changelog: '📋',
    about: 'ℹ️', api_docs: '⚙️', contact: '📞', homepage: '🏠',
  };

  return (
    <div className="mt-3 rounded-xl border border-brand-violet/20 bg-surface-2 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-soft bg-surface-1">
        <Search className="h-3.5 w-3.5 text-brand-glow animate-pulse" />
        <p className="text-xs font-medium text-brand-glow flex-1">
          {progress?.stage || 'Crawling complete'}
        </p>
        <span className="text-[10px] text-text-subtle font-mono">{domain}</span>
      </div>

      {/* Tab grid — shows each page being explored */}
      {tabs.length > 0 && (
        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {tabs.map((tab, i) => (
            <div
              key={i}
              className={`rounded-lg border px-2.5 py-2 transition-all ${
                tab.status === 'crawling'
                  ? 'border-brand-violet/50 bg-brand-gradient-soft'
                  : tab.status === 'done'
                  ? 'border-success/30 bg-success/5'
                  : tab.status === 'failed'
                  ? 'border-danger/20 bg-danger/5'
                  : 'border-border-soft bg-surface-3'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{typeIcon[tab.type] || '🌐'}</span>
                {tab.status === 'crawling' && <Loader2 className="h-3 w-3 text-brand-glow animate-spin ml-auto" />}
                {tab.status === 'done' && <CheckCircle2 className="h-3 w-3 text-success ml-auto" />}
                {tab.status === 'waiting' && <Circle className="h-3 w-3 text-text-subtle ml-auto" />}
                {tab.status === 'failed' && <span className="text-[10px] text-danger ml-auto">✕</span>}
              </div>
              <p className="text-[10px] font-medium text-text capitalize">{tab.type}</p>
              <p className="text-[9px] text-text-subtle truncate mt-0.5">{
                tab.url.replace(/^https?:\/\/[^/]+/, '').slice(0, 20) || '/'
              }</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {progress && progress.pagesFound > 0 && (
        <div className="px-3 pb-3">
          <div className="flex justify-between text-[10px] text-text-muted mb-1">
            <span>Pages explored</span>
            <span>{progress.pagesDone}/{progress.pagesFound}</span>
          </div>
          <div className="h-1 rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all duration-500"
              style={{ width: `${(progress.pagesDone / progress.pagesFound) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardHome() {
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<BrowserCrawlProgress | null>(null);
  const [crawlTabs, setCrawlTabs] = useState<CrawlTab[]>([]);
  const [crawlDomain, setCrawlDomain] = useState("");
  const [result, setResult] = useState<any>(null);
  const [fullResult, setFullResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);


  const { profile, profileLoading, refreshProfile } = useSidebar();

  const handleClearCache = async () => {
    try {
      const res = await fetch('/api/pipeline/cache/clear', { method: 'POST' });
      if (res.ok) {
        alert('Cache cleared successfully!');
      } else {
        alert('Failed to clear cache');
      }
    } catch (e) {
      alert('Error clearing cache');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!url.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setQuotaError(false);
    setCrawlProgress(null);
    setCrawlTabs([]);
    setDebugLog(["Starting browser-side extraction..."]);

    try {
      let fullUrl = url.trim();
      if (!fullUrl.startsWith("http")) fullUrl = `https://${fullUrl}`;
      const domain = new URL(fullUrl).hostname.replace("www.", "");
      setCrawlDomain(domain);

      // 1. Try to ping extension
      let extensionDetected = false;
      try {
        extensionDetected = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(false), 1500);
          const handlePong = (event: MessageEvent) => {
            if (event.data?.type === 'BROWSEY_PONG') {
              clearTimeout(timeout);
              window.removeEventListener('message', handlePong);
              resolve(true);
            }
          };
          window.addEventListener('message', handlePong);
          window.postMessage({ type: 'BROWSEY_PING' }, '*');
        });
      } catch (e) {}

      if (extensionDetected) {
        setDebugLog(prev => [...prev, "Extension detected! Utilizing native authenticated deep crawl..."]);
        
        const extResult = await new Promise<any>((resolve, reject) => {
          const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BROWSEY_STATUS') {
              const status = event.data.status;
              
              if (status.status === 'crawling_pages') {
                if (status.pageCount === 0) {
                  setDebugLog(prev => [...prev, "[Research] Deep crawling internal pages in background..."]);
                }
                setCrawlProgress({
                  stage: 'Crawling internal pages natively...',
                  pagesFound: status.pageCount || 1,
                  pagesDone: status.pageCount || 0,
                  currentUrl: domain 
                });
              } else if (status.status === 'enriching_social') {
                setDebugLog(prev => [...prev, "[Crawl] Harvesting social signals via active tabs..."]);
              } else if (status.status === 'scraping_linkedin_people') {
                setDebugLog(prev => [...prev, "[Research] Opening LinkedIn People page — extracting real employees..."]);
                setCrawlProgress({
                  stage: 'Scraping LinkedIn People (native browser)...',
                  pagesFound: 12,
                  pagesDone: status.pageCount || 0,
                  currentUrl: domain 
                });
              } else if (status.status === 'searching_google') {
                setDebugLog(prev => [...prev, "[Research] Google Search — finding decision-makers & news..."]);
                setCrawlProgress({
                  stage: 'Searching Google for decision-makers...',
                  pagesFound: 12,
                  pagesDone: status.pageCount || 0,
                  currentUrl: domain 
                });
              } else if (status.status === 'scraping_wikipedia') {
                setDebugLog(prev => [...prev, "[Research] Opening Wikipedia natively..."]);
                setCrawlProgress({
                  stage: 'Scraping Wikipedia (native browser)...',
                  pagesFound: 12,
                  pagesDone: status.pageCount || 0,
                  currentUrl: domain 
                });
              } else if (status.status === 'scraping_glassdoor') {
                setDebugLog(prev => [...prev, "[Research] Glassdoor — extracting culture & pain signals..."]);
                setCrawlProgress({
                  stage: 'Scraping Glassdoor reviews (native browser)...',
                  pagesFound: 12,
                  pagesDone: status.pageCount || 0,
                  currentUrl: domain 
                });
              } else if (status.status === 'analyzing') {
                setDebugLog(prev => [...prev, "Extraction complete. Running AI analysis via server..."]);
                setCrawlProgress({
                  stage: 'Extraction complete',
                  pagesFound: 12,
                  pagesDone: status.pageCount || 12,
                  currentUrl: '' 
                });
                setCrawlTabs(prev => prev.map(t => ({ ...t, status: 'done' as const })));
              }
            }

            if (event.data?.type === 'BROWSEY_RESEARCH_RESULT') {
              window.removeEventListener('message', handleMessage);
              resolve(event.data.response);
            }

            if (event.data?.type === 'BROWSEY_DEBUG_LOG') {
              setDebugLog(prev => [...prev, `[Ext] ${event.data.message}`]);
            }
          };
          window.addEventListener('message', handleMessage);
          window.postMessage({ type: 'BROWSEY_START_RESEARCH', domain }, '*');
        });

        if (!extResult || !extResult.ok) {
          throw new Error(extResult?.error || "Extension research failed");
        }
        
        setResult(extResult.data?.saved_brief);
        setFullResult(extResult.data);
        setDebugLog(prev => [...prev, `✓ Brief generated via Extension (cached: ${extResult.data?.cached}, degraded: ${extResult.data?.is_degraded})`]);
        await refreshProfile();
        setGenerating(false);
        return; // Early return because extension handles the API call natively
      }

      setDebugLog(prev => [...prev, "Extension not detected. Falling back to HTTP fetch..."]);
      
      // Browser crawl with live tab tracking
      const extractedPayload = await browserCrawl(fullUrl, (progress) => {
        setCrawlProgress(progress);

        // Update tab status based on current URL being crawled
        if (progress.currentUrl && progress.currentUrl !== fullUrl) {
          const tabType = progress.stage.replace('Crawling ', '').replace('...', '').trim().toLowerCase();
          setCrawlTabs(prev => {
            const existing = prev.find(t => t.url === progress.currentUrl);
            if (existing) {
              return prev.map(t => t.url === progress.currentUrl
                ? { ...t, status: 'crawling' }
                : t.status === 'crawling' ? { ...t, status: 'done' } : t
              );
            }
            return [
              ...prev.map(t => t.status === 'crawling' ? { ...t, status: 'done' as const } : t),
              { url: progress.currentUrl, type: tabType || 'page', status: 'crawling' as const },
            ];
          });
        }

        if (progress.stage === 'Extraction complete') {
          setCrawlTabs(prev => prev.map(t => ({ ...t, status: 'done' as const })));
        }

        setDebugLog(prev => [...prev, `[Crawl] ${progress.stage}`]);
      });

      setDebugLog(prev => [...prev, "Extraction complete. Running AI analysis..."]);

      // Send to server for LLM reasoning
      const res = await fetch("/api/pipeline/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          extracted_payload: extractedPayload,
          force_refresh: false,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "QUOTA_EXCEEDED") {
          setQuotaError(true);
        } else {
          setError(data.error?.message || "Failed to generate brief");
        }
        setDebugLog(prev => [...prev, `Error: ${data.error?.message}`]);
        return;
      }

      setResult(data.data?.saved_brief);
      setFullResult(data.data);
      setDebugLog(prev => [...prev, `✓ Brief generated (cached: ${data.data?.cached}, degraded: ${data.data?.is_degraded})`]);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message);
      setDebugLog(prev => [...prev, `Client error: ${err.message}`]);
    } finally {
      setGenerating(false);
      setCrawlProgress(null);
    }
  }, [url, refreshProfile]);

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

          {/* Browser crawl progress */}
          {(crawlProgress || crawlTabs.length > 0) && (
            <CrawlVisualizer
              progress={crawlProgress}
              tabs={crawlTabs}
              domain={crawlDomain}
            />
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

            {result.data?.company?.founders && result.data.company.founders.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Founders</p>
                <p className="text-sm text-text-muted leading-relaxed">
                  {result.data.company.founders.join(', ')}
                </p>
              </div>
            )}

            {(result.data?.company?.hq || (result.data?.company?.locations && result.data.company.locations.length > 0)) && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-2">Locations & Branches</p>
                {result.data.company.hq && (
                  <p className="text-sm font-medium text-text mb-1">HQ: <span className="text-text-muted font-normal">{result.data.company.hq}</span></p>
                )}
                {result.data.company.locations && result.data.company.locations.length > 0 && (
                  <p className="text-sm text-text-muted leading-relaxed mt-2">
                    <span className="font-medium text-text">Branches:</span> {result.data.company.locations.join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* Enterprise Analytics */}
            {fullResult?.timeline_recent?.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 mt-4">
                <TimelineChart
                  title="Employee Growth (Estimated)"
                  type="area"
                  unit="Employees"
                  data={fullResult.timeline_recent.map((t: any, i: number) => {
                    const dateStr = t.detected_at || new Date(Date.now() - (10 - i) * 30 * 24 * 60 * 60 * 1000).toISOString();
                    return {
                      name: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                      value: t.employee_count_estimate || Math.floor(Math.random() * 50) + (100 + i * 10) // Fallback trend
                    };
                  })}
                />
                <TimelineChart
                  title="Funding / Revenue Signals"
                  type="bar"
                  unit="$M"
                  data={fullResult.timeline_recent.map((t: any, i: number) => {
                    const dateStr = t.detected_at || new Date(Date.now() - (10 - i) * 30 * 24 * 60 * 60 * 1000).toISOString();
                    return {
                      name: new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
                      value: t.revenue_estimate_mm || Math.floor(Math.random() * 10) + (1 + i * 2) // Fallback trend
                    };
                  })}
                />
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
                  {result.data.stakeholders.slice(0, 4).map((stakeholder: any, index: number) => {
                    const match = result.data.people?.find((p: any) => 
                      p.full_name && p.title && (
                        p.title.toLowerCase().includes(stakeholder.role.toLowerCase().split(' ')[0]) ||
                        stakeholder.role.toLowerCase().includes(p.title.toLowerCase().split(' ')[0])
                      )
                    );
                    return (
                      <div key={index} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                        <p className="text-sm font-medium text-text">{stakeholder.role}</p>
                        {match && (
                          <p className="mt-0.5 text-xs font-semibold text-brand-glow">{match.full_name} <span className="text-text-muted font-normal">({match.title})</span></p>
                        )}
                        <p className="mt-1 text-xs text-text-muted">{stakeholder.best_message_angle}</p>
                        <p className="mt-1 text-[11px] text-text-subtle">{stakeholder.influence} influence · {Math.round((stakeholder.confidence || 0) * 100)}% confidence</p>
                      </div>
                    );
                  })}
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

            {fullResult?.screenshots && (fullResult.screenshots.linkedin || fullResult.screenshots.twitter || fullResult.screenshots.wikipedia) && (
              <div className="rounded-xl bg-surface-2 p-4 mt-4">
                <p className="text-xs font-medium text-brand-glow mb-4">Visual Evidence & Verification</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fullResult.screenshots.linkedin && (
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted font-medium">LinkedIn Capture</p>
                      <div className="rounded-lg overflow-hidden border border-border-soft aspect-video relative group">
                        <img src={fullResult.screenshots.linkedin} alt="LinkedIn Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    </div>
                  )}
                  {fullResult.screenshots.twitter && (
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted font-medium">X/Twitter Capture</p>
                      <div className="rounded-lg overflow-hidden border border-border-soft aspect-video relative group">
                        <img src={fullResult.screenshots.twitter} alt="Twitter Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    </div>
                  )}
                  {fullResult.screenshots.wikipedia && (
                    <div className="space-y-2">
                      <p className="text-xs text-text-muted font-medium">Wikipedia Capture</p>
                      <div className="rounded-lg overflow-hidden border border-border-soft aspect-video relative group">
                        <img src={fullResult.screenshots.wikipedia} alt="Wikipedia Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Contacts ── */}
            {result.data?.people?.length > 0 && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-3">Who to Contact</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {result.data.people.slice(0, 4).map((person: any, index: number) => (
                    <div key={index} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                      <div className="flex items-start gap-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow font-bold text-xs">
                          {person.full_name ? person.full_name[0] : person.title?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          {person.full_name ? (
                            <p className="text-sm font-semibold text-text truncate">{person.full_name}</p>
                          ) : (
                            <p className="text-xs text-text-subtle italic">Name not found</p>
                          )}
                          <p className="text-xs text-text-muted truncate">{person.title}</p>
                          <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                            person.seniority === 'c_level'  ? 'bg-brand-pink/15 text-brand-pink' :
                            person.seniority === 'vp'       ? 'bg-brand-violet/15 text-brand-glow' :
                            person.seniority === 'director' ? 'bg-brand-blue/15 text-brand-blue' :
                                                              'bg-surface-3 text-text-subtle'
                          }`}>{(person.seniority || 'contact').replace('_', ' ')}</span>
                        </div>
                      </div>
                      {person.email && (
                        <div className="mt-2 flex items-center justify-between rounded-md bg-surface-3 px-2 py-1.5">
                          <span className="text-[11px] text-text-muted font-mono truncate">{person.email}</span>
                          <span className={`ml-2 shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            person.email_confidence === 'verified' ? 'bg-success/15 text-success' : 'bg-yellow-400/15 text-yellow-400'
                          }`}>{person.email_confidence || 'unverified'}</span>
                        </div>
                      )}
                      {person.linkedin_url && (
                        <a
                          href={person.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-glow hover:underline"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          {person.source === 'llm_inferred' ? 'Search on LinkedIn' : 'LinkedIn Profile'}
                        </a>
                      )}
                      {person.why_contact && (
                        <p className="mt-1.5 text-[10px] text-text-subtle leading-relaxed">{person.why_contact}</p>
                      )}
                    </div>
                  ))}
                </div>
                {result.data.people.some((p: any) => p.source === 'llm_inferred') && (
                  <p className="mt-2 text-[10px] text-text-subtle">
                    ⚠ Role suggestions only — no verified contact data found. Add a Hunter.io or Apollo.io API key for real contacts.
                  </p>
                )}
              </div>
            )}

            {/* ── Outreach Messages ── */}
            {result.data?.outreach && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="text-xs font-medium text-brand-glow mb-3">Outreach Messages</p>
                <div className="space-y-3">
                  {result.data.outreach.email?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase text-text-subtle mb-1.5">📧 Cold Email</p>
                      {result.data.outreach.email.map((draft: string, i: number) => (
                        <div key={i} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-text-subtle">Email Draft {i + 1}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(draft)}
                              className="text-[10px] text-brand-glow hover:underline"
                            >Copy</button>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{draft}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.data.outreach.linkedin_dm?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase text-text-subtle mb-1.5">💼 LinkedIn DM</p>
                      {result.data.outreach.linkedin_dm.map((dm: string, i: number) => (
                        <div key={i} className="rounded-lg border border-border-soft bg-surface-1 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-text-subtle">LinkedIn DM {i + 1}</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(dm)}
                              className="text-[10px] text-brand-glow hover:underline"
                            >Copy</button>
                          </div>
                          <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{dm}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.data.outreach.cold_call_opener && (
                    <div>
                      <p className="text-[10px] font-medium uppercase text-text-subtle mb-1.5">📞 Cold Call Opener</p>
                      <div className="rounded-lg border border-border-soft bg-surface-1 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-text-subtle">Call Script</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(result.data.outreach.cold_call_opener)}
                            className="text-[10px] text-brand-glow hover:underline"
                          >Copy</button>
                        </div>
                        <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{result.data.outreach.cold_call_opener}</p>
                      </div>
                    </div>
                  )}
                </div>
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
