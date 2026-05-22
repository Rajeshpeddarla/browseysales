import {
  FlaskConical,
  Folder,
  Plus,
  Sparkles,
  ArrowRight,
  Layers,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const projects = [
  {
    title: "Headphones under $400",
    tabs: 7,
    updated: "12 min ago",
    progress: 80,
    tags: ["Shopping", "Audio"],
  },
  {
    title: "AI coding assistants comparison",
    tabs: 12,
    updated: "1 hr ago",
    progress: 60,
    tags: ["Tools", "Work"],
  },
  {
    title: "Best Postgres hosts 2026",
    tabs: 5,
    updated: "Yesterday",
    progress: 40,
    tags: ["Infra"],
  },
  {
    title: "MBA programs in Europe",
    tabs: 9,
    updated: "May 10",
    progress: 25,
    tags: ["Education"],
  },
];

export default function ResearchPage() {
  return (
    <>
      <DashTopBar title="AI research" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              AI research workspace
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Multi-tab projects where Browsey ties pages together for you.
            </p>
          </div>
          <Button leftIcon={<Plus className="h-4 w-4" />}>New project</Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-brand-violet/40 bg-surface-1 p-6 shadow-glow lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient text-white shadow-glow">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-brand-glow">
                  Active project
                </p>
                <h3 className="text-lg font-semibold text-text">
                  Headphones under $400
                </h3>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {["7 tabs analyzed", "4 candidates", "1 winner: Sony XM6"].map(
                (s) => (
                  <div
                    key={s}
                    className="rounded-xl border border-border-soft bg-bg-soft px-4 py-3 text-xs text-text-muted"
                  >
                    {s}
                  </div>
                )
              )}
            </div>

            <div className="mt-6 rounded-xl border border-border-soft bg-bg-soft p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                AI-generated takeaway
              </p>
              <p className="mt-2 text-sm text-text">
                Across Sony XM6, AirPods Max, Sennheiser Momentum 4 and Bose QC
                Ultra, Sony XM6 offers the best balance of ANC, comfort and
                codec support. AirPods Max wins for Apple-only households; Bose
                wins for quiet flights; Sennheiser wins for music critics.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">Sound</Badge>
                <Badge tone="brand">ANC</Badge>
                <Badge tone="brand">Battery</Badge>
                <Badge tone="brand">Codecs</Badge>
                <Badge tone="brand">Price</Badge>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button leftIcon={<Sparkles className="h-4 w-4" />}>
                Generate detailed report
              </Button>
              <Button variant="secondary">Open all tabs side-by-side</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <h3 className="text-base font-semibold text-text">
              Quick actions
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { icon: Layers, label: "Compare all tabs" },
                { icon: FlaskConical, label: "Start new research" },
                { icon: Folder, label: "Move to folder" },
                { icon: ArrowRight, label: "Export as PDF" },
              ].map((q) => (
                <li key={q.label}>
                  <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-text-muted hover:bg-surface-2 hover:text-text">
                    <q.icon className="h-4 w-4 text-brand-glow" />
                    {q.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <h3 className="mt-10 text-base font-semibold text-text">
          All projects
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p) => (
            <div
              key={p.title}
              className="flex flex-col rounded-2xl border border-border bg-surface-1 p-5 hover:border-brand-violet/40 transition"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                  <FlaskConical className="h-4 w-4" />
                </span>
                <span className="text-xs text-text-subtle">{p.updated}</span>
              </div>
              <h4 className="mt-4 text-sm font-medium text-text">{p.title}</h4>
              <p className="mt-1 text-xs text-text-subtle">{p.tabs} tabs</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-brand-gradient"
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <Badge key={t} tone="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
