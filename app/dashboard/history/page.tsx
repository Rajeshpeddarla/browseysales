import {
  Bookmark,
  Download,
  FileText,
  Filter,
  Globe,
  MessageSquareText,
  Search,
  Trash2,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const items = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  title: [
    "Summarized: 'A primer on transformer architectures'",
    "Asked: 'is Sonos Era 300 worth it?'",
    "Compared: 'Vercel vs Netlify pricing'",
    "Explained: 'CRDTs simply'",
    "Summarized: 'Apple Q3 earnings call'",
    "Asked: 'what does Reddit think of FastAPI?'",
  ][i % 6],
  site: ["openai.com", "reddit.com", "vercel.com", "tigerbeetle.com", "apple.com", "reddit.com"][i % 6],
  type: ["Summary", "Question", "Research", "Summary", "Summary", "Question"][i % 6],
  time: ["12 min ago", "32 min ago", "2 hr ago", "Yesterday", "Yesterday", "May 12"][i % 6],
}));

export default function HistoryPage() {
  return (
    <>
      <DashTopBar title="History" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">History</h2>
            <p className="mt-1 text-sm text-text-muted">
              Everything Browsey has done with you, searchable and exportable.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-4 w-4" />}>
              Clear all
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-1 p-3">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-border-soft bg-surface px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              placeholder="Search by keyword, website, prompt…"
              className="w-full bg-transparent outline-none placeholder:text-text-subtle"
            />
          </div>
          {["All", "Summaries", "Questions", "Research"].map((t, i) => (
            <button
              key={t}
              className={
                i === 0
                  ? "rounded-lg border border-brand-violet/40 bg-brand-gradient-soft px-3 py-1.5 text-xs text-text"
                  : "rounded-lg border border-border-soft px-3 py-1.5 text-xs text-text-muted hover:text-text"
              }
            >
              {t}
            </button>
          ))}
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border-soft px-3 py-1.5 text-xs text-text-muted">
            <Filter className="h-3.5 w-3.5" /> Date
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface-1">
          <ul className="divide-y divide-border-soft">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start gap-4 px-5 py-4 hover:bg-surface-2/40"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-text-muted">
                  {it.type === "Summary" && <FileText className="h-4 w-4" />}
                  {it.type === "Question" && <MessageSquareText className="h-4 w-4" />}
                  {it.type === "Research" && <Globe className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{it.title}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-text-subtle">
                    <Globe className="h-3 w-3" /> {it.site} · {it.time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="outline">{it.type}</Badge>
                  <button className="text-text-muted hover:text-brand-glow">
                    <Bookmark className="h-4 w-4" />
                  </button>
                  <button className="text-text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
