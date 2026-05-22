import {
  ShieldCheck,
  Lock,
  EyeOff,
  Trash2,
  KeyRound,
  ServerCog,
} from "lucide-react";
import { Section, SectionTitle } from "@/components/Section";

const items = [
  {
    icon: ShieldCheck,
    title: "End-to-end encrypted",
    desc: "All traffic over TLS 1.3. Data at rest encrypted with AES-256.",
  },
  {
    icon: Lock,
    title: "Secure authentication",
    desc: "Argon2 password hashing, rotating refresh tokens, session revocation.",
  },
  {
    icon: EyeOff,
    title: "Privacy by default",
    desc: "PII filtering before AI calls. History is opt-out at any time.",
  },
  {
    icon: Trash2,
    title: "You control your data",
    desc: "Delete summaries, clear history, or set auto-expiry policies.",
  },
  {
    icon: KeyRound,
    title: "No password collection",
    desc: "Browsey never reads form fields, password managers or banking inputs.",
  },
  {
    icon: ServerCog,
    title: "Hardened infrastructure",
    desc: "Rate limiting, DDoS protection, full audit logs and isolated tenants.",
  },
];

export function SecuritySection() {
  return (
    <Section id="security">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionTitle
            eyebrow="Security"
            title={
              <>
                Trust is the{" "}
                <span className="gradient-text">prerequisite for AI</span> in
                your browser.
              </>
            }
            description="We treat your browsing context like banking data — minimum collection, maximum protection, and clear controls in your hands."
          />
        </div>
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((it) => (
              <div
                key={it.title}
                className="rounded-xl border border-border bg-surface-1 p-5 hover:border-brand-violet/40 transition"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                  <it.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-text">
                  {it.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  {it.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
