import {
  ArrowUpRight,
  CreditCard,
  Download,
  Sparkles,
  Check,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const features = [
  "Unlimited webpage chat",
  "Deep analysis & long summaries",
  "Multi-tab research mode",
  "Export to PDF & Markdown",
  "Smart search optimizer",
  "Priority AI queue & speed",
];

const invoices = [
  { id: "INV-1042", date: "May 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-1041", date: "Apr 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-1040", date: "Mar 1, 2026", amount: "$0.00", status: "Paid" },
];

export default function SubscriptionPage() {
  return (
    <>
      <DashTopBar title="Subscription" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Subscription & billing
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Manage your plan, payment methods and invoices.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface-1 p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-text-muted">
                  Current plan
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <h3 className="text-3xl font-semibold text-text">Free</h3>
                  <Badge tone="brand">Active</Badge>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  20 AI requests / day. Single-tab analysis. 7-day history.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary">Compare plans</Button>
                <Button leftIcon={<Sparkles className="h-4 w-4" />}>
                  Upgrade to Pro
                </Button>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border-soft bg-surface px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Today&apos;s usage</span>
                <span className="text-text">12 / 20 requests</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full w-[60%] bg-brand-gradient" />
              </div>
              <p className="mt-2 text-xs text-text-subtle">
                Resets at midnight local time. Hit your limit? Upgrade for
                unlimited.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-brand-violet/40 bg-surface-1 p-6 shadow-glow">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
            <p className="text-xs uppercase tracking-widest text-brand-glow">
              Recommended
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-text">
              Browsey <span className="gradient-text">Pro</span>
            </h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-semibold text-text">$12</span>
              <span className="text-sm text-text-subtle">/month</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-success" />
                  <span className="text-text">{f}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6 w-full" leftIcon={<ArrowUpRight className="h-4 w-4" />}>
              Upgrade now
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">
                Payment method
              </h3>
              <Button size="sm" variant="secondary">
                Update
              </Button>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3">
              <div className="grid h-9 w-12 place-items-center rounded-md bg-bg text-text-muted">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1 text-sm">
                <p className="text-text">Visa ending in 4242</p>
                <p className="text-xs text-text-subtle">Expires 09 / 28</p>
              </div>
              <Badge tone="success">Default</Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">
                Invoices
              </h3>
              <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />}>
                Download all
              </Button>
            </div>
            <ul className="mt-5 divide-y divide-border-soft">
              {invoices.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-text">{i.id}</span>
                  <span className="text-text-muted">{i.date}</span>
                  <span className="text-text">{i.amount}</span>
                  <Badge tone="success">{i.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
