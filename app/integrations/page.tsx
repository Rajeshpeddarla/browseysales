"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Plug } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

const crms = [
  { name: "HubSpot", tier: "Pro", color: "#FF7A59", actions: ["Contact upsert", "Company upsert", "Note creation", "Activity logging", "Deal linking"] },
  { name: "Salesforce", tier: "Team", color: "#00A1E0", actions: ["Lead creation", "Account upsert", "Task logging", "Custom fields", "Opportunity linking"] },
  { name: "Pipedrive", tier: "Pro", color: "#28A745", actions: ["Person creation", "Organization upsert", "Note attachment", "Deal linking"] },
  { name: "Outreach", tier: "Team", color: "#5951FF", actions: ["Prospect creation", "Account sync", "Sequence enrollment", "Activity tracking"] },
  { name: "Salesloft", tier: "Team", color: "#4A89DC", actions: ["Person creation", "Account sync", "Cadence enrollment", "Call logging"] },
  { name: "Close", tier: "Team", color: "#333", actions: ["Lead creation", "Contact sync", "Note attachment", "Activity logging"] },
];

export default function IntegrationsPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className="relative pt-28 pb-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-radial-fade opacity-50" />
          <div className="relative z-10 mx-auto max-w-4xl px-4">
            <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
              Integrations
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-text sm:text-5xl">
              Push to your CRM in <span className="gradient-text">one click</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-text-muted">
              Browsey for Sales connects to all major CRMs. Contacts, companies, notes, and activities sync automatically.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {crms.map((crm, i) => (
              <motion.div
                key={crm.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-surface-1 p-6 hover:border-brand-violet/30 transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl text-white font-bold text-lg" style={{ backgroundColor: crm.color }}>
                    {crm.name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text">{crm.name}</h3>
                    <span className="text-xs text-text-muted">{crm.tier}+ plan</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-brand-glow mb-3">What syncs:</p>
                <ul className="space-y-2">
                  {crm.actions.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm text-text-muted">
                      <CheckCircle className="h-3.5 w-3.5 text-success" /> {a}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition">
              <Plug className="h-4 w-4" /> Get Started — Connect Your CRM
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
