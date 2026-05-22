"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  BookOpen,
  Users,
  Plug,
  BarChart3,
  CreditCard,
  Settings as SettingsIcon,
  Shield,
  HelpCircle,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { LogoWordmark } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { useSidebar } from "./SidebarContext";


const nav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/briefs", label: "Prospect Briefs", icon: FileText },
  { href: "/dashboard/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/support", label: "Support", icon: HelpCircle },
];

export function DashSidebar() {
  const pathname = usePathname() || "/dashboard";
  const { sidebarOpen, setSidebarOpen, profile } = useSidebar();

  const plan = profile?.plan || "free";
  const used = profile?.monthly_brief_used ?? 0;
  const quota = profile?.monthly_brief_quota ?? 10;
  const isUnlimited = quota >= 999999;
  const isAtLimit = !isUnlimited && used >= quota;
  const usagePct = !isUnlimited && quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const showUpgrade = plan === "free";

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "h-screen w-64 shrink-0 border-r border-border-soft bg-bg-soft flex flex-col transition-all duration-300 ease-in-out z-50",
          "fixed top-0 bottom-0 left-0 lg:sticky lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="px-5 py-5">
          <Link href="/" className="inline-flex items-center gap-2">
            <LogoWordmark />
            <span className="rounded-md bg-brand-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Sales
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-subtle">
            Sales Tools
          </p>
          <ul className="space-y-0.5">
            {nav.slice(0, 6).map((n) => {
              const active =
                n.href === "/dashboard"
                  ? pathname === n.href
                  : pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brand-gradient-soft text-text ring-1 ring-brand-violet/40"
                        : "text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <n.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-brand-glow" : "text-text-muted"
                      )}
                    />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-widest text-text-subtle">
            Account
          </p>
          <ul className="space-y-0.5">
            {nav.slice(6).map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-brand-gradient-soft text-text ring-1 ring-brand-violet/40"
                        : "text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <n.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-brand-glow" : "text-text-muted"
                      )}
                    />
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Upgrade / Usage Card */}
        {showUpgrade && (
          <div className="m-3 rounded-2xl border border-brand-violet/30 bg-brand-gradient-soft p-4">
            {isAtLimit ? (
              <>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-danger" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-danger">
                    Limit Reached
                  </p>
                </div>
                <p className="mt-1 text-sm font-medium text-text">
                  {used}/{quota} briefs used. Upgrade to continue.
                </p>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setSidebarOpen(false)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
                >
                  Upgrade to Pro
                  <Sparkles className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-brand-glow" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-glow">
                      Free Plan
                    </p>
                  </div>
                  <span className="text-[10px] text-text-muted">{used}/{quota}</span>
                </div>
                {/* Usage bar */}
                <div className="mt-1 mb-2 h-1.5 w-full rounded-full bg-surface-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePct >= 90 ? "bg-danger" :
                      usagePct >= 70 ? "bg-yellow-500" : "bg-brand-gradient"
                    }`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-text">
                  Upgrade for unlimited briefs + CRM push.
                </p>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setSidebarOpen(false)}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-glow hover:underline"
                >
                  Upgrade → Pro
                  <Sparkles className="h-3 w-3" />
                </Link>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
