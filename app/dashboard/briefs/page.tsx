"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Search, Trash2, ExternalLink, Copy, Tag,
  Globe, Calendar, ChevronDown, Loader2, Users, Zap,
  TrendingUp, Mail, Phone, Check, AlertCircle,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/Badge";
import { getBriefs, deleteBrief } from "@/app/actions/sales";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded-md bg-surface-3 px-2 py-1 text-[10px] font-medium text-text-muted hover:bg-brand-violet/20 hover:text-brand-glow transition-all"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    const res = await getBriefs({
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 50,
    });
    if (res.ok && res.data) {
      setBriefs(res.data);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brief?")) return;
    await deleteBrief(id);
    setBriefs((prev) => prev.filter((b) => b.id !== id));
  };

  const getTab = (id: string) => activeTab[id] || "summary";
  const setTab = (id: string, tab: string) =>
    setActiveTab((prev) => ({ ...prev, [id]: tab }));

  const filtered = briefs.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.data?.company?.name?.toLowerCase().includes(q) ||
      b.url?.toLowerCase().includes(q) ||
      b.data?.company?.industry?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <DashTopBar title="Prospect Briefs" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Prospect Briefs
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {loading ? "Loading..." : `${briefs.length} briefs saved`} · All your prospect research in one place
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
            <input
              type="text"
              placeholder="Search by company, URL, or industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none focus:ring-1 focus:ring-brand-violet/40"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text focus:border-brand-violet/60 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="generated">Generated</option>
            <option value="saved">Saved</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Briefs List */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl border border-border bg-surface-1 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface-1 p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-text-subtle" />
              <h3 className="mt-4 text-lg font-semibold text-text">No briefs yet</h3>
              <p className="mt-2 text-sm text-text-muted">
                Generate your first prospect brief from the{" "}
                <Link href="/dashboard" className="text-brand-glow hover:underline">dashboard</Link>
              </p>
            </div>
          ) : (
            filtered.map((brief) => {
              const d = brief.data;
              const tab = getTab(brief.id);
              const isOpen = expandedId === brief.id;

              const hasSummary = !!(d?.company?.summary_short || d?.company?.summary_long);
              const hasTechStack = d?.tech_stack?.length > 0;
              const hasPain = d?.pain_hypotheses?.length > 0;
              const hasSignals = d?.signals?.length > 0;
              const hasPeople = d?.people?.length > 0;
              const hasOutreach = !!(
                d?.outreach?.email?.length ||
                d?.outreach?.linkedin_dm?.length ||
                d?.outreach?.cold_call_opener
              );

              const tabs = [
                { id: "summary", label: "Overview", show: hasSummary || hasTechStack || hasPain },
                { id: "signals", label: `Signals${hasSignals ? ` (${d.signals.length})` : ""}`, show: hasSignals },
                { id: "people", label: `Decision Makers${hasPeople ? ` (${d.people.length})` : ""}`, show: hasPeople },
                { id: "outreach", label: "Outreach", show: hasOutreach },
              ].filter(t => t.show);

              return (
                <div
                  key={brief.id}
                  className="rounded-2xl border border-border bg-surface-1 overflow-hidden transition-all duration-150 hover:border-brand-violet/30"
                >
                  {/* Header Row */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : brief.id)}
                  >
                    <div className="h-11 w-11 rounded-xl bg-brand-gradient grid place-items-center text-white font-bold text-sm shrink-0">
                      {d?.company?.name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-text truncate">
                          {d?.company?.name || "Unknown Company"}
                        </h4>
                        <Badge tone="outline" className="shrink-0">
                          {d?.company?.industry || "Unknown"}
                        </Badge>
                        {hasSignals && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {d.signals.length} signal{d.signals.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-muted flex-wrap">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {d?.company?.domain || brief.url}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(brief.created_at).toLocaleDateString()}
                        </span>
                        {d?.company?.size_band && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {d.company.size_band} employees
                          </span>
                        )}
                        {brief.tags?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {brief.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasPeople && (
                        <span className="hidden sm:flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 text-[10px] text-text-muted">
                          <Users className="h-3 w-3" />{d.people.length} contacts
                        </span>
                      )}
                      {hasOutreach && (
                        <span className="hidden sm:flex items-center gap-1 rounded-md bg-brand-violet/10 px-2 py-1 text-[10px] text-brand-glow">
                          <Mail className="h-3 w-3" /> outreach ready
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  {isOpen && (
                    <div className="border-t border-border-soft bg-surface/50">
                      {/* Tab Bar */}
                      {tabs.length > 1 && (
                        <div className="flex gap-1 px-5 pt-4 overflow-x-auto">
                          {tabs.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setTab(brief.id, t.id)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                                tab === t.id
                                  ? "bg-brand-violet/20 text-brand-glow"
                                  : "text-text-muted hover:bg-surface-3"
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="p-5 space-y-4">

                        {/* ===== OVERVIEW TAB ===== */}
                        {tab === "summary" && (
                          <>
                            {d?.buying_intent && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                  <p className="text-xs font-medium text-brand-glow">Buying Intent</p>
                                  <p className="mt-2 text-2xl font-semibold text-text">{d.buying_intent.score ?? 0}/100</p>
                                  <p className="text-xs text-text-muted">{d.buying_intent.urgency || "unknown"} urgency</p>
                                </div>
                                {d?.maturity_analysis && (
                                  <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                    <p className="text-xs font-medium text-brand-glow">Enterprise Readiness</p>
                                    <p className="mt-2 text-2xl font-semibold text-text">{d.maturity_analysis.enterprise_readiness ?? 0}/100</p>
                                    <p className="text-xs text-text-muted">{d.maturity_analysis.sales_maturity || "unknown"} sales maturity</p>
                                  </div>
                                )}
                                {d?.predictive_intelligence && (
                                  <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                    <p className="text-xs font-medium text-brand-glow">Scaling Probability</p>
                                    <p className="mt-2 text-2xl font-semibold text-text">{d.predictive_intelligence.scaling_probability ?? 0}/100</p>
                                    <p className="text-xs text-text-muted">{Math.round((d.predictive_intelligence.confidence || 0) * 100)}% confidence</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {(d?.company?.summary_long || d?.company?.summary_short) && (
                              <div>
                                <p className="text-xs font-medium text-brand-glow mb-1">Summary</p>
                                <p className="text-sm text-text-muted leading-relaxed">
                                  {d.company.summary_long || d.company.summary_short}
                                </p>
                              </div>
                            )}

                            {hasTechStack && (
                              <div>
                                <p className="text-xs font-medium text-brand-glow mb-2">Tech Stack</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.tech_stack.map((t: string, i: number) => (
                                    <span key={`${t}-${i}`} className="rounded-md border border-border-soft bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted">{t}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasPain && (
                              <div>
                                <p className="text-xs font-medium text-brand-glow mb-2">Pain Hypotheses</p>
                                <div className="space-y-2">
                                  {(d.pain_details || d.pain_hypotheses.map((p: string) => ({ pain: p }))).map((p: any, i: number) => (
                                    <div key={i} className="rounded-xl border border-border-soft bg-surface-2 p-3">
                                      <p className="text-sm font-medium text-text">{p.pain || p}</p>
                                      {p.why && <p className="mt-1 text-xs text-text-muted">{p.why}</p>}
                                      {p.evidence && <p className="mt-1 text-[10px] text-text-subtle">Evidence: {p.evidence}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {d?.why_now?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-brand-glow mb-2">Why Now</p>
                                <ul className="space-y-1.5">
                                  {d.why_now.map((w: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                                      {w}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {d?.action_recommendations?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-brand-glow mb-2">Recommended Next Actions</p>
                                <ol className="space-y-1.5">
                                  {d.action_recommendations.map((a: string, i: number) => (
                                    <li key={i} className="text-sm text-text-muted">{i + 1}. {a}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {!hasSummary && !hasTechStack && !hasPain && (
                              <div className="flex items-center gap-2 text-xs text-text-muted">
                                <AlertCircle className="h-4 w-4" />
                                No overview data available for this brief.
                              </div>
                            )}
                          </>
                        )}

                        {/* ===== SIGNALS TAB ===== */}
                        {tab === "signals" && hasSignals && (
                          <div className="space-y-2">
                            {d.signals.map((s: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 rounded-xl border border-border-soft bg-surface-2 p-4">
                                <span className={`mt-0.5 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                                  s.type === "funding"     ? "bg-success/15 text-success" :
                                  s.type === "hiring"      ? "bg-brand-blue/15 text-brand-blue" :
                                  s.type === "partnership" ? "bg-brand-pink/15 text-brand-pink" :
                                  s.type === "award"       ? "bg-yellow-400/15 text-yellow-400" :
                                                             "bg-brand-violet/15 text-brand-violet"
                                }`}>{s.type}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-text font-medium leading-snug">{s.title}</p>
                                  {s.detail && <p className="mt-0.5 text-xs text-text-muted">{s.detail}</p>}
                                  {s.source && <p className="mt-1 text-[10px] text-text-subtle">Source: {s.source}</p>}
                                </div>
                                {s.date && (
                                  <span className="text-[10px] text-text-subtle shrink-0 mt-0.5">{s.date}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ===== DECISION MAKERS TAB ===== */}
                        {tab === "people" && hasPeople && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {d.people.map((p: any, i: number) => (
                              <div key={i} className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                <div className="flex items-start gap-3">
                                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow font-bold text-sm">
                                    {(p.full_name || p.title || "?")[0]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-text truncate">{p.full_name || p.title}</p>
                                    <p className="text-xs text-text-muted truncate">{p.title}</p>
                                    <span className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                      p.seniority === "c_level"   ? "bg-brand-pink/15 text-brand-pink" :
                                      p.seniority === "vp"        ? "bg-brand-violet/15 text-brand-glow" :
                                      p.seniority === "director"  ? "bg-brand-blue/15 text-brand-blue" :
                                                                    "bg-surface-3 text-text-subtle"
                                    }`}>{(p.seniority || "contact").replace("_", " ")}</span>
                                  </div>
                                </div>
                                {p.email_guess && (
                                  <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-3 px-3 py-2">
                                    <span className="text-[11px] text-text-muted font-mono truncate">{p.email_guess}</span>
                                    <CopyButton text={p.email_guess} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ===== OUTREACH TAB ===== */}
                        {tab === "outreach" && hasOutreach && (
                          <div className="space-y-4">
                            {d.outreach.email?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Mail className="h-3.5 w-3.5 text-brand-glow" />
                                  <p className="text-xs font-medium text-brand-glow">
                                    Cold Email Hook{d.outreach.email.length > 1 ? "s" : ""}
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  {d.outreach.email.map((draft: string, i: number) => (
                                    <div key={i} className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-medium uppercase text-text-subtle">Email Draft {i + 1}</span>
                                        <CopyButton text={draft} />
                                      </div>
                                      <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{draft}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {d.outreach.linkedin_dm?.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="h-3.5 w-3.5 text-brand-glow" />
                                  <p className="text-xs font-medium text-brand-glow">LinkedIn DM</p>
                                </div>
                                <div className="space-y-2">
                                  {d.outreach.linkedin_dm.map((dm: string, i: number) => (
                                    <div key={i} className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-medium uppercase text-text-subtle">LinkedIn DM {i + 1}</span>
                                        <CopyButton text={dm} />
                                      </div>
                                      <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{dm}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {d.outreach.cold_call_opener && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Phone className="h-3.5 w-3.5 text-brand-glow" />
                                  <p className="text-xs font-medium text-brand-glow">Cold Call Opener</p>
                                </div>
                                <div className="rounded-xl border border-border-soft bg-surface-2 p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-medium uppercase text-text-subtle">Call Script</span>
                                    <CopyButton text={d.outreach.cold_call_opener} />
                                  </div>
                                  <p className="whitespace-pre-wrap text-xs text-text-muted leading-relaxed">{d.outreach.cold_call_opener}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border-soft">
                          <button
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(d, null, 2))}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted hover:bg-surface-3"
                          >
                            <Copy className="h-3 w-3" /> Copy JSON
                          </button>
                          <a
                            href={brief.url || `https://${d?.company?.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-text-muted hover:bg-surface-3"
                          >
                            <ExternalLink className="h-3 w-3" /> Visit Site
                          </a>
                          <button
                            onClick={() => handleDelete(brief.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs text-danger hover:bg-danger/20 ml-auto"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </>
  );
}
