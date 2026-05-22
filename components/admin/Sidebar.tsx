"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Cpu,
  ToggleRight,
  ScrollText,
  Shield,
} from "lucide-react";
import { LogoWordmark } from "@/components/Logo";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/briefs", label: "Briefs", icon: FileText },
  { href: "/admin/ai-costs", label: "AI Costs", icon: Cpu },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: ToggleRight },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname() || "/admin";

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-danger/20 bg-bg-soft lg:flex lg:flex-col">
      <div className="px-5 py-5">
        <Link href="/admin" className="inline-flex items-center gap-2">
          <LogoWordmark />
          <span className="rounded-md bg-danger px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {nav.map((n) => {
            const active = n.href === "/admin"
              ? pathname === n.href
              : pathname.startsWith(n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-danger/10 text-text ring-1 ring-danger/30"
                      : "text-text-muted hover:bg-surface-2 hover:text-text"
                  )}
                >
                  <n.icon className={cn("h-4 w-4", active ? "text-danger" : "text-text-muted")} />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-xl border border-danger/20 bg-danger/5 p-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-danger" />
          <span className="text-xs font-semibold uppercase text-danger">{role.replace("_", " ")}</span>
        </div>
        <Link href="/dashboard" className="mt-2 block text-xs text-text-muted hover:text-text">
          ← Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
