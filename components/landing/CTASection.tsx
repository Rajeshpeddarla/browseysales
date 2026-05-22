"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient shadow-glow">
            <Target className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Ready to close more deals?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-text-muted">
            Join hundreds of sales teams who cut prospect research from 20 minutes to 8 seconds.
            Start free — no credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-8 py-3.5 text-sm font-medium text-white shadow-glow hover:opacity-90 transition"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-8 py-3.5 text-sm font-medium text-text hover:bg-surface-3 transition"
            >
              Compare Plans
            </Link>
          </div>
          <p className="mt-6 text-xs text-text-subtle">
            10 free briefs/month · 7-day Pro trial · HubSpot + Salesforce + Pipedrive
          </p>
        </motion.div>
      </div>
    </section>
  );
}
