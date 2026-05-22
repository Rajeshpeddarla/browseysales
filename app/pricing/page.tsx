"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Crown, Building2, ArrowRight } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { motion } from "framer-motion";
import Link from "next/link";

const plans = [
  {
    id: "free", name: "Free", icon: Zap, monthly: 0, annual: 0,
    description: "Get started with basic prospect research",
    features: [
      "10 prospect briefs/month",
      "Company summary + tech stack",
      "Manual copy-paste to CRM",
      "1 device, no sync",
      "BYOK AI key option",
    ],
    notIncluded: ["AI synthesis", "CRM push", "Email finder", "Playbooks"],
    cta: "Get Started Free", popular: false,
  },
  {
    id: "pro", name: "Pro", icon: Sparkles, monthly: 29, annual: 249,
    description: "For individual reps and founders",
    features: [
      "Unlimited prospect briefs",
      "AI synthesis: pain points, hooks, outreach",
      "Tech stack detection (1500+ techs)",
      "Recent news + funding signals",
      "Decision-maker enrichment (top 5)",
      "One-click CRM push (HubSpot, Pipedrive)",
      "Email finder (50 lookups/mo)",
      "DOCX / Excel export",
      "Cross-device sync",
      "$4 hosted LLM credit included",
    ],
    notIncluded: [],
    cta: "Start 7-Day Free Trial", popular: true,
  },
  {
    id: "team", name: "Team", icon: Crown, monthly: 49, annual: 399,
    description: "For sales teams of 5–200 reps",
    features: [
      "Everything in Pro, plus:",
      "Shared playbooks + ICP scoring",
      "Shared brief library + notes",
      "Salesforce + Outreach + Salesloft + Close",
      "Activity push to CRM timeline",
      "Team analytics + leaderboard",
      "Email finder (500 lookups/seat/mo)",
      "Custom AI prompt templates",
      "Slack / MS Teams notifications",
      "Audit log",
    ],
    notIncluded: [],
    cta: "Start 14-Day Team Trial", popular: false,
  },
  {
    id: "enterprise", name: "Enterprise", icon: Building2, monthly: -1, annual: -1,
    description: "For organizations with 200+ seats",
    features: [
      "Everything in Team, plus:",
      "SSO via SAML + Okta + Azure AD",
      "SCIM provisioning",
      "Private data routing (EU/US)",
      "SOC 2 Type II report",
      "DPA + custom MSA",
      "Dedicated CSM",
      "Volume discounts",
      "On-prem LLM option",
    ],
    notIncluded: [],
    cta: "Contact Sales", popular: false,
  },
];

const faqs = [
  { q: "Is there really a free plan?", a: "Yes — 10 prospect briefs per month, forever. No card required." },
  { q: "What happens after the 7-day trial?", a: "You'll be downgraded to Free. No charges unless you explicitly subscribe." },
  { q: "Can I use my own AI API key?", a: "Yes, all plans support BYOK (Bring Your Own Key) for OpenAI or Anthropic." },
  { q: "How does per-seat billing work?", a: "Team plan is $49/seat/month. Add or remove seats anytime. Prorated." },
  { q: "Do you offer regional pricing?", a: "Yes — India: Pro ₹999/mo, Team ₹1,799/seat/mo. More regions coming." },
  { q: "What CRMs do you support?", a: "HubSpot and Pipedrive on Pro. Salesforce, Outreach, Salesloft, and Close on Team." },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <SiteNav />
      <main className="relative">
        <div className="pointer-events-none absolute inset-0 bg-radial-fade opacity-50" />

        {/* Hero */}
        <section className="relative z-10 pt-28 pb-16 text-center">
          <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
            Pricing
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Simple pricing. <span className="gradient-text">Serious ROI.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-text-muted">
            Start free. Upgrade when you need unlimited briefs, CRM push, and team playbooks.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-surface-1 p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!annual ? "bg-brand-gradient text-white" : "text-text-muted"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${annual ? "bg-brand-gradient text-white" : "text-text-muted"}`}
            >
              Annual <span className="text-[10px] text-success ml-1">Save 28%</span>
            </button>
          </div>
        </section>

        {/* Plans */}
        <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-brand-violet/60 bg-surface-1 shadow-glow"
                    : "border-border bg-surface-1"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-0.5 text-[10px] font-bold uppercase text-white">
                    Most Popular
                  </span>
                )}
                <plan.icon className="h-6 w-6 text-brand-glow mb-3" />
                <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
                <p className="text-xs text-text-muted mt-1">{plan.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  {plan.monthly === 0 ? (
                    <span className="text-3xl font-bold text-text">$0</span>
                  ) : plan.monthly === -1 ? (
                    <span className="text-2xl font-bold text-text">Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-text">
                        ${annual ? Math.round(plan.annual / 12) : plan.monthly}
                      </span>
                      <span className="text-sm text-text-muted">
                        /{plan.id === "team" ? "seat/mo" : "mo"}
                      </span>
                    </>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.id === "enterprise" ? "/contact" : "/signup"}
                  className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-medium transition ${
                    plan.popular
                      ? "bg-brand-gradient text-white hover:opacity-90"
                      : "border border-border bg-surface-2 text-text hover:bg-surface-3"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="relative z-10 mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <h2 className="text-2xl font-bold text-text text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-medium text-text">{faq.q}</span>
                  <ArrowRight className={`h-4 w-4 text-text-muted transition-transform ${openFaq === i ? "rotate-90" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm text-text-muted">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
