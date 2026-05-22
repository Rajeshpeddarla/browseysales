"use client";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sara K.",
    title: "SDR at SaaS Startup",
    quote: "I used to spend 20 minutes researching each prospect. Now it's 8 seconds. My outbound volume tripled.",
    avatar: "S",
  },
  {
    name: "Marco R.",
    title: "Account Executive",
    quote: "The pain point hypotheses are shockingly accurate. My discovery calls are so much better prepared.",
    avatar: "M",
  },
  {
    name: "Priya S.",
    title: "Sales Manager, 12 reps",
    quote: "Playbooks standardized our team's research. Everyone is now hitting the same quality bar. CRM push rates are up 4x.",
    avatar: "P",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full border border-brand-violet/30 bg-brand-gradient-soft px-3 py-1 text-xs font-medium text-brand-glow">
            Loved by Sales Teams
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Reps close more with <span className="gradient-text">Browsey</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-surface-1 p-6"
            >
              <Quote className="h-5 w-5 text-brand-violet/40 mb-3" />
              <p className="text-sm text-text-muted leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-white text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-text">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
