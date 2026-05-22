"use client";

import { useState } from "react";
import {
  Chrome,
  Globe,
  Download,
  ShieldCheck,
  Layers,
  Code2,
  CheckCircle2,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Section, SectionTitle } from "@/components/Section";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const browsers = [
  { name: "Chrome", status: "available", icon: Chrome },
  { name: "Edge", status: "available", icon: Globe },
  { name: "Brave", status: "available", icon: Globe },
  { name: "Opera", status: "available", icon: Globe },
  { name: "Firefox", status: "soon", icon: Globe },
  { name: "Safari", status: "planned", icon: Globe },
];

const steps = [
  {
    n: 1,
    title: "Download the extension",
    desc: "Use the button for your browser, or grab the manual ZIP build.",
  },
  {
    n: 2,
    title: "Open your browser extensions page",
    desc: "chrome://extensions, edge://extensions, brave://extensions etc.",
  },
  {
    n: 3,
    title: "Enable developer mode",
    desc: "Toggle the switch in the top right while we're in early beta.",
  },
  {
    n: 4,
    title: "Load unpacked / install",
    desc: "Point it at the unzipped folder. Pin Browsey to your toolbar.",
  },
];

const permissions = [
  {
    icon: Layers,
    title: "activeTab",
    desc: "Reads the page you're on only when the sidebar is open.",
  },
  {
    icon: Code2,
    title: "scripting",
    desc: "Injects the AI sidebar UI into the current tab.",
  },
  {
    icon: ShieldCheck,
    title: "storage",
    desc: "Stores your preferences and session token locally and encrypted.",
  },
  {
    icon: Globe,
    title: "host_permissions",
    desc: "Lets Browsey read text content from any site you choose to use it on.",
  },
];

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);

  const handleManualDownload = () => {
    setDownloading(true);
    // Simulate a short delay for that premium feel, then trigger download
    setTimeout(() => {
      setDownloading(false);
      const link = document.createElement("a");
      link.href = "/browsey-beta.zip";
      link.download = "browsey-beta.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1200);
  };

  return (
    <>
      <SiteNav />
      <main>
        <Section className="pt-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <SectionTitle
                eyebrow="Install · 60 seconds"
                title={
                  <>
                    Add Browsey to your browser
                    <br />
                    in <span className="gradient-text">under a minute</span>.
                  </>
                }
                description="Install the extension, sign in, and the sidebar shows up on every webpage you visit."
              />

              <div className="mt-8 flex flex-wrap gap-3">
                <Button 
                  size="lg" 
                  leftIcon={<Chrome className="h-5 w-5" />}
                  href="https://chromewebstore.google.com/"
                  target="_blank"
                >
                  Add to Chrome
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  leftIcon={<Globe className="h-5 w-5" />}
                  href="https://microsoftedge.microsoft.com/addons/"
                  target="_blank"
                >
                  Add to Edge
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  leftIcon={downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDownToLine className="h-5 w-5" />}
                  onClick={handleManualDownload}
                  disabled={downloading}
                >
                  {downloading ? "Downloading..." : "Download .zip"}
                </Button>
              </div>

              <p className="mt-4 text-xs text-text-muted">
                Manifest V3 · ~600KB · works offline for sidebar UI · model
                calls require an internet connection.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border bg-surface-1 p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Browser support
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {browsers.map((b) => (
                    <li
                      key={b.name}
                      className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-3 py-2.5"
                    >
                      <span className="inline-flex items-center gap-2 text-sm text-text">
                        <b.icon className="h-4 w-4 text-brand-glow" />
                        {b.name}
                      </span>
                      {b.status === "available" && (
                        <Badge tone="success">Available</Badge>
                      )}
                      {b.status === "soon" && (
                        <Badge tone="warning">Soon</Badge>
                      )}
                      {b.status === "planned" && (
                        <Badge tone="outline">Planned</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle
            eyebrow="Install steps"
            title="Four steps, no terminal required"
          />

          <ol className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <li
                key={s.n}
                className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-6"
              >
                <div className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-glow">
                  {s.n}
                </div>
                <h3 className="pr-12 text-base font-semibold text-text">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionTitle
                eyebrow="Permissions"
                title={
                  <>
                    Minimal permissions.{" "}
                    <span className="gradient-text">Maximum transparency.</span>
                  </>
                }
                description="Browsey only asks for what it needs. Every permission below is explained in plain English — and we tell you what we don't do too."
              />

              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Never reads password fields or autofill",
                  "Never reads form inputs you're typing",
                  "Never reads banking or payment fields",
                  "Never sells your data — ever",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-text-muted">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {permissions.map((p) => (
                  <div
                    key={p.title}
                    className="rounded-xl border border-border bg-surface-1 p-5"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                      <p.icon className="h-4 w-4" />
                    </div>
                    <h4 className="mt-4 font-mono text-sm text-text">
                      {p.title}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
