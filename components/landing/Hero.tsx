"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 bg-grid bg-[size:32px_32px] opacity-40" />
      <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-brand-violet/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-4 py-1.5 text-xs font-medium text-brand-glow">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Sales Intelligence
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="mt-8 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="text-text">Visit any company site.</span>
          <br />
          <span className="gradient-text">Get a sales-ready brief</span>
          <br />
          <span className="text-text">in 8 seconds.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-text-muted sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          AI-powered prospect briefs with pain points, tech stack, decision-makers
          and personalized outreach — pushed to your CRM in one click.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button 
            onClick={() => {
              const el = document.getElementById("start-btn-icon");
              if (el) el.innerHTML = '<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
              window.location.href = "/signup";
            }}
            size="lg" 
            leftIcon={<span id="start-btn-icon" className="h-5 w-5 flex items-center justify-center"><Zap className="h-5 w-5" /></span>}
          >
            Start Free — No Card Required
          </Button>
          <Button href="/pricing" variant="secondary" size="lg">
            View Pricing <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-text-subtle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-brand-glow" /> 7-day Pro trial
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-brand-glow" /> 10 free briefs/month
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-glow" /> HubSpot + Salesforce + Pipedrive
          </span>
        </motion.div>

        {/* Demo Preview */}
        <motion.div
          className="relative mx-auto mt-16 max-w-4xl"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="absolute -inset-4 rounded-3xl bg-brand-gradient opacity-20 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-glow">
            {/* Mock browser chrome */}
            <div className="flex items-center gap-2 border-b border-border-soft bg-surface-1 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-danger/60" />
                <span className="h-3 w-3 rounded-full bg-warning/60" />
                <span className="h-3 w-3 rounded-full bg-success/60" />
              </div>
              <div className="ml-4 flex-1 rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-text-muted">
                acme.com — Browsey Sales Drawer
              </div>
            </div>
            {/* Brief preview */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_380px]">
              {/* Website content mock */}
              <div className="border-r border-border-soft p-6">
                <div className="space-y-3">
                  <div className="h-8 w-48 rounded-lg bg-surface-2 animate-pulse" />
                  <div className="h-4 w-full rounded bg-surface-2/60" />
                  <div className="h-4 w-5/6 rounded bg-surface-2/60" />
                  <div className="h-4 w-4/6 rounded bg-surface-2/60" />
                  <div className="mt-6 h-32 w-full rounded-xl bg-surface-2/40" />
                  <div className="h-4 w-full rounded bg-surface-2/60" />
                  <div className="h-4 w-3/4 rounded bg-surface-2/60" />
                </div>
              </div>
              {/* Sales drawer mock */}
              <div className="bg-surface-1 p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-gradient grid place-items-center text-white font-bold text-sm">A</div>
                  <div>
                    <p className="text-sm font-semibold text-text">Acme Inc</p>
                    <p className="text-xs text-text-muted">B2B SaaS · Series A · SF, CA</p>
                  </div>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <p className="text-xs font-medium text-brand-glow mb-1">Company Summary</p>
                  <p className="text-xs text-text-muted leading-relaxed">Acme builds developer tools for API management. Recently raised $8M Series A.</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-brand-glow mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["React", "Node.js", "AWS", "Stripe", "HubSpot"].map(t => (
                      <span key={t} className="rounded-md border border-border-soft bg-surface-2 px-2 py-0.5 text-[10px] text-text-muted">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-brand-glow mb-2">Pain Hypotheses</p>
                  <ul className="space-y-1 text-xs text-text-muted">
                    <li className="flex items-start gap-1.5"><span className="mt-1 h-1 w-1 rounded-full bg-brand-violet shrink-0" />API scaling challenges at growth stage</li>
                    <li className="flex items-start gap-1.5"><span className="mt-1 h-1 w-1 rounded-full bg-brand-violet shrink-0" />Manual onboarding reducing conversion</li>
                  </ul>
                </div>
                <button className="w-full rounded-xl bg-brand-gradient px-3 py-2 text-xs font-medium text-white">
                  Push to HubSpot →
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
