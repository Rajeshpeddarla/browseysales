"use client";
import { Bell, Search, Sparkles, Menu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useSidebar } from "@/components/dashboard/SidebarContext";
import Link from "next/link";

export function DashTopBar({ title }: { title: string }) {
  const { toggleSidebar, profile, profileLoading } = useSidebar();

  const plan = profile?.plan || "free";
  const used = profile?.monthly_brief_used ?? 0;
  const quota = profile?.monthly_brief_quota ?? 10;
  const isUnlimited = quota >= 999999;
  const isNearLimit = !isUnlimited && quota > 0 && used / quota >= 0.8;
  const isAtLimit = !isUnlimited && used >= quota;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border-soft bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-text-muted hover:text-text lg:hidden transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-text">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden md:flex h-9 w-72 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-muted">
          <Search className="h-4 w-4" />
          <input
            placeholder="Search history, pages, prompts…"
            className="w-full bg-transparent outline-none placeholder:text-text-subtle"
          />
          <kbd className="rounded border border-border-soft bg-bg-soft px-1.5 py-0.5 text-[10px] text-text-subtle">
            ⌘K
          </kbd>
        </div>

        {/* Usage pill — real data from shared context */}
        {!profileLoading && (
          isAtLimit ? (
            <Link
              href="/dashboard/billing"
              className="hidden sm:flex items-center gap-2 rounded-full border border-danger/40 bg-danger/10 px-3 py-1.5 text-xs text-danger hover:bg-danger/20 transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Limit reached · Upgrade</span>
            </Link>
          ) : (
            <div className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
              isNearLimit
                ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-400"
                : "border-border bg-surface-1 text-text-muted"
            }`}>
              <Sparkles className="h-3.5 w-3.5 text-brand-glow" />
              <span>
                {used} / {isUnlimited ? "∞" : quota} briefs
              </span>
            </div>
          )
        )}

        <Badge tone="brand">{planLabel}</Badge>

        <button className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-text-muted hover:text-text">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-pink" />
        </button>

        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
          {planLabel[0]}
        </div>
      </div>
    </div>
  );
}
