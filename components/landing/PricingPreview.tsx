"use client";
import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Building2 } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    monthly: 0,
    annual: 0,
    description: "Get started with basic prospect research",
    features: [
      "10 prospect briefs/month",
      "Company summary + tech stack",
      "Manual copy-paste to CRM",
      "1 device, no sync",
      "BYOK AI key option",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Sparkles,
    monthly: 29,
    annual: 249,
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
    cta: "Start 7-Day Free Trial",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    icon: Crown,
    monthly: 49,
    annual: 399,
    description: "For sales teams of 5-200 reps",
    features: [
      "Everything in Pro",
      "Shared playbooks + ICP scoring",
      "Shared brief library + notes",
      "Salesforce + Outreach + Salesloft",
      "Activity push to CRM timeline",
      "Team analytics + leaderboard",
      "Email finder (500 lookups/seat/mo)",
      "Custom AI prompt templates",
      "Slack / MS Teams notifications",
      "Audit log",
    ],
    cta: "Start 14-Day Team Trial",
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    monthly: -1,
    annual: -1,
    description: "For organizations with 200+ seats",
    features: [
      "Everything in Team",
      "SSO via SAML + Okta + Azure AD",
      "SCIM provisioning",
      "Private data routing (EU/US)",
      "SOC 2 Type II report",
      "DPA + custom MSA",
      "Dedicated CSM",
      "Volume discounts",
      "On-prem LLM option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function PricingPreview() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-radial-fade opacity-60" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Simple, transparent pricing.{" "}
            <span className="gradient-text">No surprise charges.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-text-muted">
            Start free. Upgrade when you need unlimited briefs and CRM integrations.
            No credit card required for trials.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? "border-brand-violet/60 bg-surface-1 shadow-glow"
                  : "border-border bg-surface-1 hover:border-brand-violet/30"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most Popular
                </span>
              )}
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                <plan.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
              <p className="mt-1 text-xs text-text-muted">{plan.description}</p>

              <div className="mt-4 flex items-baseline gap-1">
                {plan.monthly === 0 ? (
                  <span className="text-3xl font-bold text-text">$0</span>
                ) : plan.monthly === -1 ? (
                  <span className="text-2xl font-bold text-text">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-text">${plan.monthly}</span>
                    <span className="text-sm text-text-muted">
                      /{plan.id === "team" ? "seat/mo" : "mo"}
                    </span>
                  </>
                )}
              </div>
              {plan.annual > 0 && (
                <p className="mt-1 text-xs text-text-subtle">
                  or ${plan.annual}/{plan.id === "team" ? "seat" : ""}/yr (save{" "}
                  {Math.round(100 - (plan.annual / (plan.monthly * 12)) * 100)}%)
                </p>
              )}

              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.id === "enterprise" ? "/contact" : "/signup"}
                className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-medium transition-all ${
                  plan.popular
                    ? "bg-brand-gradient text-white shadow-glow hover:opacity-90"
                    : "border border-border bg-surface-2 text-text hover:bg-surface-3 hover:border-brand-violet/30"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-text-subtle">
          PPP regional pricing available for India and SEA. All plans include a 7-day money-back guarantee.
        </p>
      </div>
    </section>
  );
}
