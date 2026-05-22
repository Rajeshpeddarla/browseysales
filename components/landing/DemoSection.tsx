"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  GraduationCap,
  GitCompareArrows,
  ThumbsUp,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { Section, SectionTitle } from "@/components/Section";
import { cn } from "@/lib/cn";

const prompts = [
  {
    icon: FileText,
    label: "Summarize this article",
    page: "Tech blog post",
    response: [
      "Apple silicon update reduces inference latency by 38%",
      "New MLX framework adds Metal-3 backend",
      "Native models ship with macOS 16 in October",
      "Targeted at on-device LLM use cases",
    ],
  },
  {
    icon: GraduationCap,
    label: "Explain this simply",
    page: "Documentation page",
    response: [
      "Think of vector databases like a smart filing cabinet.",
      "Instead of words, each item is stored as numbers.",
      "Similar items end up close together in space.",
      "That makes 'find me something like this' very fast.",
    ],
  },
  {
    icon: GitCompareArrows,
    label: "Compare pricing plans",
    page: "SaaS pricing page",
    response: [
      "Free → 20 reqs/day, single-tab, 7-day history",
      "Pro $12/mo → unlimited chat, multi-tab, exports",
      "Team $24/seat → workspaces, shared folders, SSO",
      "Best fit for solo researcher: Pro",
    ],
  },
  {
    icon: ThumbsUp,
    label: "What are the pros and cons?",
    page: "Amazon product page",
    response: [
      "Pros: Great battery, sharp display, light to carry",
      "Cons: Coil whine in some units, slow SD card slot",
      "Reviewer sentiment: 82% positive over 1,240 reviews",
      "Best for: students and writers; not power gamers",
    ],
  },
  {
    icon: MessagesSquare,
    label: "What does Reddit think?",
    page: "Reddit megathread",
    response: [
      "Community is split: 56% pro, 38% skeptical",
      "Top concern: pricing changed mid-beta",
      "Top praise: new sync model 'just works'",
      "Recurring ask: native Linux support",
    ],
  },
];

export function DemoSection() {
  const [active, setActive] = useState(0);
  const p = prompts[active];

  return (
    <Section id="demo">
      <SectionTitle
        eyebrow="See it in action"
        title={
          <>
            One sidebar. <span className="gradient-text">Every kind of page.</span>
          </>
        }
        description="Tap a prompt — watch Browsey answer it in context. Try the real thing on your own pages after installing."
      />

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ul className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {prompts.map((pr, i) => {
              const Icon = pr.icon;
              return (
                <li key={pr.label} className="lg:w-full">
                  <button
                    onClick={() => setActive(i)}
                    className={cn(
                      "group w-full whitespace-nowrap lg:whitespace-normal flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                      active === i
                        ? "border-brand-violet/50 bg-brand-gradient-soft text-text"
                        : "border-border bg-surface-1 text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1",
                        active === i
                          ? "bg-brand-gradient text-white ring-transparent"
                          : "bg-surface-2 ring-border text-text-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  <div>
                    <p className="text-sm font-medium">{pr.label}</p>
                    <p className="text-[11px] text-text-subtle">{pr.page}</p>
                  </div>
                </button>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-border bg-surface-1 p-6 shadow-card min-h-[360px]">
            <div className="flex items-center gap-2 border-b border-border-soft pb-4">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-gradient text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium text-text">Browsey</p>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] text-success">
                reading page
              </span>
              <span className="ml-auto text-xs text-text-subtle">{p.page}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-5 space-y-3"
              >
                <div className="ml-auto max-w-fit rounded-2xl rounded-tr-sm bg-surface-2 px-3 py-2 text-sm">
                  {p.label}
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-brand-violet/30 bg-brand-gradient-soft px-4 py-3 text-sm text-text">
                  <ul className="space-y-2 leading-relaxed">
                    {p.response.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-glow" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Section>
  );
}
