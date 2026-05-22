"use client";

import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Users, Target, MessageSquare } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const samplePlaybooks = [
  {
    name: "SaaS Q2 ICP Research",
    description: "Standardized research template for B2B SaaS companies in the 10-200 employee range. Focuses on tech stack fit and growth signals.",
    icp: "B2B SaaS, 10-200 employees, US/CA/UK",
    tone: "Professional",
    sections: ["Company summary", "Tech stack fit", "Growth signals", "Pain hypotheses", "3 email drafts"],
    author: "Browsey Team",
  },
  {
    name: "Enterprise ABM Deep Dive",
    description: "In-depth account-based research for enterprise targets. Maps org chart, identifies champions, and generates multi-touch sequences.",
    icp: "Enterprise, 500+ employees, Fortune 1000",
    tone: "Consultative",
    sections: ["Org chart mapping", "Champion identification", "Budget cycle timing", "Competitive landscape", "Multi-touch sequence"],
    author: "Browsey Team",
  },
  {
    name: "Startup Founder Outreach",
    description: "Quick, punchy research for startup founders. Short outreach that respects their time and speaks to common founder pain points.",
    icp: "Startups, seed to Series B, tech industry",
    tone: "Casual / Direct",
    sections: ["Funding stage", "Core product", "Team size", "Growth trajectory", "2 casual email drafts"],
    author: "Community",
  },
  {
    name: "Agency Lead Generation",
    description: "Bulk research template for lead-gen agencies. Optimized for speed and volume with automated scoring.",
    icp: "SMB, 5-50 employees, any vertical",
    tone: "Bold",
    sections: ["Quick company summary", "ICP fit score", "Contact info", "1 email template", "CSV export ready"],
    author: "Community",
  },
];

export default function PlaybooksPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative pt-28 pb-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-radial-fade opacity-50" />
          <div className="relative z-10 mx-auto max-w-4xl px-4">
            <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
              Playbook Gallery
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-text sm:text-5xl">
              Proven sales research <span className="gradient-text">playbooks</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-text-muted">
              Standardize how your reps research prospects. Use curated playbooks or create your own.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {samplePlaybooks.map((pb, i) => (
              <motion.div
                key={pb.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-surface-1 p-6 hover:border-brand-violet/30 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient-soft text-brand-glow">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <Badge tone={pb.author === "Browsey Team" ? "brand" : "outline"}>
                    {pb.author}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-text">{pb.name}</h3>
                <p className="mt-2 text-sm text-text-muted">{pb.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-text-muted">
                    <Target className="h-3 w-3" /> {pb.icp}
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-text-muted">
                    <MessageSquare className="h-3 w-3" /> {pb.tone}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-medium uppercase text-text-subtle mb-2">Sections included</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pb.sections.map((s) => (
                      <span key={s} className="rounded-md border border-border-soft bg-surface-2 px-2 py-0.5 text-[10px] text-text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <button className="mt-4 w-full rounded-xl border border-border bg-surface-2 py-2 text-sm text-text hover:bg-surface-3 transition">
                  Use This Playbook
                </button>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition">
              Create Your Own Playbook <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
