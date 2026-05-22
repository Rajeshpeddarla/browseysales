"use client";
import {
  Sparkles,
  Send,
  ListTree,
  GitCompareArrows,
  Languages,
  ShoppingBag,
  Star,
  Globe,
  X,
  Maximize2,
  Settings,
} from "lucide-react";
import { motion } from "framer-motion";

export function SidebarPreview() {
  return (
    <div className="relative w-full">
      {/* Mock browser frame */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border-soft bg-surface px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-surface-2 px-3 py-1.5 text-xs text-text-muted">
            <Globe className="h-3.5 w-3.5" />
            techcrunch.com/article/openai-new-launch
          </div>
        </div>

        <div className="grid grid-cols-12 gap-0">
          {/* Article side */}
          <div className="col-span-12 md:col-span-7 p-5 sm:p-6">
            <p className="text-[10px] uppercase tracking-widest text-text-subtle">
              TechCrunch · 4 min read
            </p>
            <h3 className="mt-2 text-lg font-semibold text-text">
              OpenAI announces ChatGPT enterprise platform with deep
              integrations
            </h3>
            <div className="mt-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full bg-surface-2"
                  style={{ width: `${[100, 95, 88, 92, 60][i]}%` }}
                />
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 rounded-full bg-surface-2"
                  style={{ width: `${[100, 84, 96, 70][i]}%` }}
                />
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="aspect-video rounded-lg bg-surface-2" />
              <div className="aspect-video rounded-lg bg-surface-2" />
              <div className="aspect-video rounded-lg bg-surface-2" />
            </div>
          </div>

          {/* AI sidebar */}
          <div className="col-span-12 md:col-span-5 border-t md:border-t-0 md:border-l border-border-soft bg-bg-soft">
            <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-gradient text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium text-text">Browsey</span>
                <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                  reading page
                </span>
              </div>
              <div className="flex items-center gap-1 text-text-subtle">
                <Settings className="h-4 w-4" />
                <Maximize2 className="h-4 w-4" />
                <X className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-3 px-4 py-4">
              {/* User message */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-surface-2 px-3 py-2 text-xs text-text"
              >
                Summarize this article in 5 bullets
              </motion.div>

              {/* AI message */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="max-w-[92%] rounded-2xl rounded-tl-sm border border-brand-violet/30 bg-brand-gradient-soft px-3 py-2.5 text-xs text-text"
              >
                <ul className="space-y-1.5 leading-relaxed">
                  <li>
                    OpenAI launching enterprise platform with SSO, audit logs
                    and private deployments.
                  </li>
                  <li>Pricing starts at $25/seat with annual contracts.</li>
                  <li>Targets regulated industries — finance, healthcare.</li>
                  <li>Includes new connector framework for SaaS apps.</li>
                  <li>Beta access begins next quarter.</li>
                </ul>
              </motion.div>

              {/* Suggested chips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex flex-wrap gap-1.5"
              >
                {[
                  { icon: ListTree, label: "Key points" },
                  { icon: GitCompareArrows, label: "Compare to past articles" },
                  { icon: Languages, label: "Explain simply" },
                  { icon: ShoppingBag, label: "Mentioned products" },
                  { icon: Star, label: "Sentiment" },
                ].map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-1 px-2 py-1 text-[10px] text-text-muted"
                  >
                    <c.icon className="h-3 w-3 text-brand-glow" />
                    {c.label}
                  </span>
                ))}
              </motion.div>
            </div>

            <div className="border-t border-border-soft px-3 py-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2">
                <input
                  className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-subtle"
                  placeholder="Ask anything about this page…"
                  readOnly
                />
                <button className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white">
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating glow */}
      <div className="pointer-events-none absolute -inset-x-8 -bottom-12 h-40 bg-radial-fade blur-2xl" />
    </div>
  );
}
