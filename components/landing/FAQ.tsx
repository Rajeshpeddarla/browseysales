"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section, SectionTitle } from "@/components/Section";
import { cn } from "@/lib/cn";

const faqs = [
  {
    q: "What does Browsey actually do?",
    a: "Browsey is a browser extension that adds an intelligent AI sidebar to every webpage. It reads the page you're on automatically and lets you summarize, ask questions, compare, and extract — without copy-pasting anything.",
  },
  {
    q: "Which browsers are supported?",
    a: "Chrome, Edge, Brave and Opera at launch (Manifest V3). Firefox is on the roadmap. Mobile browsers will follow once mobile extension APIs mature.",
  },
  {
    q: "What pages can it read?",
    a: "Articles, ecommerce product pages, Reddit threads, YouTube videos (transcripts + comments), documentation, search results, dashboards — almost anything that renders text.",
  },
  {
    q: "Is my browsing private?",
    a: "Yes. Browsey only reads the page when you open the sidebar. We never read forms, password fields or financial inputs. Sensitive PII is filtered before any AI call.",
  },
  {
    q: "Do I need to copy-paste content?",
    a: "No. That's the entire point. The sidebar already sees the page. Just ask.",
  },
  {
    q: "Which AI model powers it?",
    a: "Browsey uses Google Gemma 3n E4B at launch with future support for Qwen, Phi, MiniMax and DeepSeek. Pro users get a priority queue and faster responses.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Pro and Team are month-to-month. Cancel from the dashboard and you keep access until the end of the billing period.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes — 20 AI requests per day, basic summaries and single-tab analysis. No credit card needed.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section>
      <SectionTitle
        align="center"
        eyebrow="FAQ"
        title={
          <>
            Questions, <span className="gradient-text">asked and answered</span>.
          </>
        }
      />

      <div className="mx-auto mt-12 max-w-3xl divide-y divide-border-soft rounded-2xl border border-border bg-surface-1">
        {faqs.map((f, i) => (
          <div key={i}>
            <button
              onClick={() => setOpen((v) => (v === i ? null : i))}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
            >
              <span className="text-sm font-medium text-text">{f.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-text-muted transition-transform",
                  open === i && "rotate-180 text-brand-glow"
                )}
              />
            </button>
            <div
              className={cn(
                "grid overflow-hidden px-6 transition-[grid-template-rows,padding] duration-300",
                open === i
                  ? "grid-rows-[1fr] pb-5"
                  : "grid-rows-[0fr] pb-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="text-sm leading-relaxed text-text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
