import {
  BookOpen,
  MessageSquare,
  Bug,
  HelpCircle,
  LifeBuoy,
  Send,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

const tiles = [
  {
    icon: BookOpen,
    title: "Documentation",
    desc: "Learn how to use Browsey at its full power.",
    cta: "Open docs",
  },
  {
    icon: MessageSquare,
    title: "Community",
    desc: "Talk to other power users in our Discord.",
    cta: "Join Discord",
  },
  {
    icon: Bug,
    title: "Report a bug",
    desc: "Found something broken? Send us details.",
    cta: "File a report",
  },
  {
    icon: LifeBuoy,
    title: "Email support",
    desc: "We answer within one business day on Pro.",
    cta: "Email us",
  },
];

const faqs = [
  {
    q: "Why isn't the sidebar appearing on my page?",
    a: "Some pages (Chrome internal pages, the Chrome Web Store, and a few banking sites) restrict extensions for safety. The sidebar will appear automatically on the rest.",
  },
  {
    q: "How do I increase my daily request limit?",
    a: "Upgrade to Pro from your subscription page. Pro plans don't have a daily limit (fair usage applies).",
  },
  {
    q: "Can I run Browsey on a private model?",
    a: "Self-hosted endpoints are on our roadmap (Phase 3). For now Pro users get priority on our shared NIM endpoints.",
  },
];

export default function SupportPage() {
  return (
    <>
      <DashTopBar title="Support" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          We&apos;ve got you
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Docs, community and a humans-only inbox when you need it.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.title}
              className="flex flex-col rounded-2xl border border-border bg-surface-1 p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                <t.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-text">
                {t.title}
              </h3>
              <p className="mt-1 flex-1 text-xs text-text-muted">{t.desc}</p>
              <Button variant="secondary" size="sm" className="mt-4 w-full">
                {t.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <h3 className="text-base font-semibold text-text">
              Contact support
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              We respond within 1 business day on Pro plans.
            </p>
            <form className="mt-5 space-y-4">
              <div>
                <Label>Topic</Label>
                <select className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text outline-none focus:border-brand-violet/60">
                  <option>Billing</option>
                  <option>Bug report</option>
                  <option>Feature request</option>
                  <option>Account access</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input placeholder="Short summary" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea rows={5} placeholder="Tell us what's going on…" />
              </div>
              <Button leftIcon={<Send className="h-4 w-4" />}>
                Send message
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                <HelpCircle className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-text">Top FAQs</h3>
            </div>
            <ul className="mt-5 divide-y divide-border-soft">
              {faqs.map((f) => (
                <li key={f.q} className="py-4">
                  <p className="text-sm font-medium text-text">{f.q}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                    {f.a}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
