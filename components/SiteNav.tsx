"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles, Target } from "lucide-react";
import { LogoWordmark } from "./Logo";
import { Button } from "./ui/Button";
import { cn } from "@/lib/cn";

const links = [
  { href: "/", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/dashboard", label: "Dashboard" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 -z-10 backdrop-blur-xl bg-bg/70 border-b border-border-soft" />
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <LogoWordmark />
          <span className="rounded-md bg-brand-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Sales
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm text-text-muted transition hover:bg-surface-2 hover:text-text"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/signup" size="sm" leftIcon={<Target className="h-4 w-4" />}>
            Start Free
          </Button>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface-2 text-text"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        className={cn(
          "md:hidden overflow-hidden border-b border-border-soft transition-[max-height,opacity]",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <ul className="mx-auto max-w-7xl px-4 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 flex gap-2">
            <Button href="/login" variant="secondary" size="sm" className="flex-1">
              Sign in
            </Button>
            <Button href="/signup" size="sm" className="flex-1">
              Start Free
            </Button>
          </li>
        </ul>
      </div>
    </header>
  );
}
