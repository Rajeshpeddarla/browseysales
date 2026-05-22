import {
  Folder,
  Plus,
  Tag,
  Search,
  FileText,
  Star,
  Download,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const folders = [
  { name: "AI research", count: 14, tone: "brand" },
  { name: "Product comparisons", count: 9, tone: "default" },
  { name: "Reading list", count: 27, tone: "default" },
  { name: "Work decisions", count: 4, tone: "default" },
];

const cards = Array.from({ length: 9 }).map((_, i) => ({
  id: i,
  title: [
    "Postgres connection pooling deep dive",
    "Why ToyotaThink chose Anthropic",
    "How Linear engineers ship 3x faster",
    "Reddit thread: best DAW in 2025",
    "AirPods Pro 3 vs Sony XM6 — sound quality",
    "Stripe pricing changes — explained",
    "Substack newsletter growth playbook",
    "Tailwind v4 migration tips",
    "Designing for AI-native interfaces",
  ][i],
  site: [
    "supabase.com",
    "anthropic.com",
    "linear.app",
    "reddit.com",
    "wired.com",
    "stripe.com",
    "growthhackers.com",
    "tailwindcss.com",
    "smashingmag.com",
  ][i],
  folder: ["AI research", "AI research", "Work decisions", "Reading list", "Product comparisons", "Work decisions", "Reading list", "AI research", "AI research"][i],
}));

export default function SavedSummariesPage() {
  return (
    <>
      <DashTopBar title="Saved summaries" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Saved summaries
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Your private knowledge base, organized in folders.
            </p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />}>New folder</Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="rounded-2xl border border-border bg-surface-1 p-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Folders
              </p>
              <ul className="mt-3 space-y-1">
                {folders.map((f, i) => (
                  <li key={f.name}>
                    <button
                      className={
                        i === 0
                          ? "flex w-full items-center justify-between rounded-lg bg-brand-gradient-soft px-3 py-2 text-sm text-text ring-1 ring-brand-violet/40"
                          : "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        <Folder
                          className={
                            i === 0 ? "h-4 w-4 text-brand-glow" : "h-4 w-4"
                          }
                        />
                        {f.name}
                      </span>
                      <span className="text-xs text-text-muted">{f.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="mt-3 inline-flex items-center gap-1.5 px-3 text-xs text-text-muted hover:text-brand-glow">
                <Plus className="h-3.5 w-3.5" /> New folder
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-surface-1 p-4">
              <p className="px-2 text-xs font-semibold uppercase tracking-widest text-text-muted">
                Tags
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 px-1">
                {["#ai", "#research", "#shopping", "#reddit", "#deep-dive", "#urgent"].map(
                  (t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-surface px-2 py-0.5 text-[11px] text-text-muted"
                    >
                      <Tag className="h-3 w-3" /> {t}
                    </span>
                  )
                )}
              </div>
            </div>
          </aside>

          <section className="lg:col-span-9">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm">
                <Search className="h-4 w-4 text-text-muted" />
                <input
                  placeholder="Search saved summaries…"
                  className="w-full bg-transparent outline-none placeholder:text-text-subtle"
                />
              </div>
              <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
                Export folder
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="group flex flex-col rounded-2xl border border-border bg-surface-1 p-5 transition-all hover:border-brand-violet/40"
                >
                  <div className="flex items-center justify-between">
                    <Badge tone="brand">{c.folder}</Badge>
                    <button className="text-text-muted hover:text-warning">
                      <Star className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-3 text-sm font-medium leading-snug text-text">
                    {c.title}
                  </h3>
                  <p className="mt-1 text-xs text-text-subtle">{c.site}</p>
                  <div className="mt-4 space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-surface-2" />
                    <div className="h-1.5 w-[88%] rounded-full bg-surface-2" />
                    <div className="h-1.5 w-[72%] rounded-full bg-surface-2" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border-soft pt-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-text-muted">
                      <FileText className="h-3.5 w-3.5" /> 4 key points
                    </span>
                    <span className="text-text-subtle">Apr 18</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
