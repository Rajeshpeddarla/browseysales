import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";
import { LogoWordmark } from "./Logo";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Overview" },
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations", label: "CRM Integrations" },
      { href: "/playbooks", label: "Playbook Gallery" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "#", label: "For SDRs & BDRs" },
      { href: "#", label: "For Account Executives" },
      { href: "#", label: "For Sales Leaders" },
      { href: "#", label: "For Founders" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "#", label: "Sales Blog" },
      { href: "#", label: "Cold Email Templates" },
      { href: "#", label: "Help Center" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
      { href: "#", label: "Security (SOC 2)" },
      { href: "#", label: "DPA" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-border-soft">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-brand-gradient opacity-50" />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <LogoWordmark showTagline />
            <p className="mt-5 max-w-sm text-sm text-text-muted">
              AI-powered prospect research in 8 seconds. Push to CRM in one click. 
              Built for high-performing sales teams.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Github, Twitter, Linkedin].map((I, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-1 text-text-muted hover:border-brand-violet/50 hover:text-text"
                >
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-muted hover:text-text"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border-soft pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-text-subtle">
            © {new Date().getFullYear()} Browsey, Inc. All rights reserved.
          </p>
          <p className="text-xs text-text-subtle">
            Made for the browser. Built for thinking.
          </p>
        </div>
      </div>
    </footer>
  );
}
