"use client";
import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Bell,
  Sparkles,
  Palette,
  Lock,
  Plug,
  Eye,
  EyeOff,
  Check,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { saveApiKey, getApiKeys } from "@/app/actions/sales";

const tabs = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "integrations",  label: "Integrations",  icon: Plug },
  { id: "security",      label: "Security",      icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai",            label: "AI preferences",icon: Sparkles },
  { id: "theme",         label: "Theme",         icon: Palette },
  { id: "privacy",       label: "Privacy",       icon: Lock },
] as const;

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-border-soft px-6 py-5 md:grid-cols-3">
      <div>
        <p className="text-sm font-medium text-text">{title}</p>
        {desc && <p className="mt-1 text-xs text-text-muted">{desc}</p>}
      </div>
      <div className="md:col-span-2">{children}</div>
    </div>
  );
}

function Toggle({ on = true }: { on?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        on ? "bg-brand-gradient" : "bg-surface-3"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ─── Hunter.io BYOK row ───────────────────────────────────────

function HunterKeyRow() {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApiKeys().then((res) => {
      if (res.ok && res.data) {
        setMaskedKey(res.data.hunter || null);
        setConnected(res.data.hunter_connected);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setError(null);
    const res = await saveApiKey("hunter", keyInput.trim());
    if (res.ok) {
      setSaved(true);
      setConnected(true);
      setMaskedKey(`${keyInput.slice(0, 4)}${"•".repeat(Math.min(keyInput.length - 8, 20))}${keyInput.slice(-4)}`);
      setKeyInput("");
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(res.error?.message || "Failed to save key");
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    setSaving(true);
    const res = await saveApiKey("hunter", "");
    if (res.ok) {
      setConnected(false);
      setMaskedKey(null);
      setKeyInput("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {/* Status badge */}
      {!loading && (
        <div className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          connected
            ? "bg-success/10 text-success"
            : "bg-surface-3 text-text-muted"
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-success" : "bg-text-subtle")} />
          {connected ? `Connected · ${maskedKey}` : "Not connected"}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? "text" : "password"}
            placeholder={connected ? "Enter new key to replace…" : "Paste your Hunter.io API key…"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-4 pr-10 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none focus:ring-1 focus:ring-brand-violet/40 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !keyInput.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:opacity-90 transition"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <><Check className="h-4 w-4" /> Saved</>
          ) : (
            "Save"
          )}
        </button>
        {connected && (
          <button
            onClick={handleRemove}
            disabled={saving}
            className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 transition disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <p className="text-xs text-text-subtle">
        Your key is stored securely in your profile and never shared.
        Get a free key at{" "}
        <a
          href="https://hunter.io/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-glow hover:underline inline-flex items-center gap-0.5"
        >
          hunter.io/api-keys <ExternalLink className="h-3 w-3" />
        </a>
        {" "}— free plan includes 25 searches/month.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("profile");

  return (
    <>
      <DashTopBar title="Settings" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-text-muted">
          Manage your account, preferences and privacy controls.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <ul className="rounded-2xl border border-border bg-surface-1 p-2">
              {tabs.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActive(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                      active === t.id
                        ? "bg-brand-gradient-soft text-text ring-1 ring-brand-violet/40"
                        : "text-text-muted hover:bg-surface-2 hover:text-text"
                    )}
                  >
                    <t.icon
                      className={cn(
                        "h-4 w-4",
                        active === t.id ? "text-brand-glow" : ""
                      )}
                    />
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="lg:col-span-9">
            <div className="overflow-hidden rounded-2xl border border-border bg-surface-1">
              <div className="border-b border-border-soft px-6 py-5">
                <h3 className="text-base font-semibold text-text">
                  {tabs.find((t) => t.id === active)?.label}
                </h3>
              </div>

              {/* ── Profile ── */}
              {active === "profile" && (
                <>
                  <Row title="Avatar" desc="JPG or PNG. Max 2MB.">
                    <div className="flex items-center gap-4">
                      <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-gradient text-xl font-semibold text-white">
                        SM
                      </div>
                      <Button variant="secondary" size="sm">
                        Upload new
                      </Button>
                    </div>
                  </Row>
                  <Row title="Full name">
                    <Input defaultValue="Siddarth Modi" />
                  </Row>
                  <Row title="Email" desc="Used for login and receipts.">
                    <Input defaultValue="siddarthmodi@gmail.com" />
                  </Row>
                  <Row title="Bio" desc="Optional. Helps us tailor your AI tone.">
                    <Textarea rows={3} placeholder="A bit about you…" />
                  </Row>
                  <div className="flex justify-end gap-2 px-6 py-4">
                    <Button variant="secondary">Cancel</Button>
                    <Button>Save changes</Button>
                  </div>
                </>
              )}

              {/* ── Integrations (BYOK) ── */}
              {active === "integrations" && (
                <>
                  <div className="px-6 py-4 border-b border-border-soft bg-surface-2/50">
                    <p className="text-xs text-text-muted leading-relaxed">
                      Browsey uses your own API keys — we never charge you for third-party data.
                      Keys are stored encrypted in your profile and only used when you generate a brief.
                    </p>
                  </div>

                  <Row
                    title="Hunter.io"
                    desc="Finds real email addresses and names for decision-makers at any company. Used in the 'Who to Contact' section of every brief."
                  >
                    <HunterKeyRow />
                  </Row>

                  <div className="px-6 py-5">
                    <p className="text-xs text-text-subtle">
                      More integrations coming soon: LinkedIn Sales Navigator, Clearbit, Lusha.
                    </p>
                  </div>
                </>
              )}

              {/* ── Security ── */}
              {active === "security" && (
                <>
                  <Row title="Change password" desc="Use 12+ chars with a symbol.">
                    <div className="space-y-3">
                      <Input type="password" placeholder="Current password" />
                      <Input type="password" placeholder="New password" />
                      <Input type="password" placeholder="Confirm new password" />
                    </div>
                  </Row>
                  <Row title="Two-factor authentication" desc="Coming soon.">
                    <Toggle on={false} />
                  </Row>
                  <Row title="Active sessions">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-2.5">
                        <span>MacBook Pro · Chrome · San Francisco</span>
                        <span className="text-xs text-success">Current</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border-soft bg-surface px-4 py-2.5">
                        <span>iPhone · Safari · Mumbai</span>
                        <button className="text-xs text-danger hover:underline">Revoke</button>
                      </div>
                    </div>
                  </Row>
                </>
              )}

              {/* ── Notifications ── */}
              {active === "notifications" && (
                <>
                  <Row title="Product updates" desc="New features, releases.">
                    <Toggle />
                  </Row>
                  <Row title="Usage alerts" desc="Tell me when I'm near my daily limit.">
                    <Toggle />
                  </Row>
                  <Row title="Security alerts" desc="New sign-ins on this account.">
                    <Toggle />
                  </Row>
                  <Row title="Marketing emails" desc="Tips, customer stories.">
                    <Toggle on={false} />
                  </Row>
                </>
              )}

              {/* ── AI preferences ── */}
              {active === "ai" && (
                <>
                  <Row title="AI tone" desc="Browsey will match this style by default.">
                    <div className="flex flex-wrap gap-2">
                      {["Neutral", "Friendly", "Concise", "Caveman", "Academic"].map((t, i) => (
                        <button
                          key={t}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs",
                            i === 2
                              ? "border-brand-violet/40 bg-brand-gradient-soft text-text"
                              : "border-border-soft text-text-muted hover:text-text"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title="Summary length" desc="Default summary depth.">
                    <div className="flex gap-2">
                      {["Short", "Standard", "Deep"].map((s, i) => (
                        <button
                          key={s}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-sm",
                            i === 1
                              ? "border-brand-violet/40 bg-brand-gradient-soft text-text"
                              : "border-border-soft text-text-muted"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title="Auto-summarize new pages" desc="Generate a TL;DR the moment you open the sidebar.">
                    <Toggle />
                  </Row>
                </>
              )}

              {/* ── Theme ── */}
              {active === "theme" && (
                <>
                  <Row title="Appearance">
                    <div className="grid grid-cols-3 gap-3">
                      {["Dark (default)", "Light", "System"].map((s, i) => (
                        <button
                          key={s}
                          className={cn(
                            "rounded-xl border p-4 text-left text-sm",
                            i === 0
                              ? "border-brand-violet/40 bg-brand-gradient-soft"
                              : "border-border-soft hover:bg-surface-2"
                          )}
                        >
                          <div className="mb-2 h-10 rounded-md bg-bg" />
                          {s}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <Row title="Accent color">
                    <div className="flex gap-2">
                      {["bg-brand-gradient", "bg-success", "bg-warning", "bg-danger", "bg-brand-blue"].map((c, i) => (
                        <button
                          key={c}
                          className={cn(
                            "h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface-1",
                            i === 0 ? "ring-brand-violet" : "ring-transparent",
                            c
                          )}
                        />
                      ))}
                    </div>
                  </Row>
                </>
              )}

              {/* ── Privacy ── */}
              {active === "privacy" && (
                <>
                  <Row title="Save history" desc="Keep records of summaries and questions.">
                    <Toggle />
                  </Row>
                  <Row title="Auto-delete history" desc="Automatically delete entries after N days.">
                    <div className="flex items-center gap-2">
                      <Input className="w-32" defaultValue={30} />
                      <span className="text-sm text-text-muted">days</span>
                    </div>
                  </Row>
                  <Row title="Allow analytics" desc="Helps us improve. Never identifies you.">
                    <Toggle />
                  </Row>
                  <Row title="Export all data">
                    <Button variant="secondary">Download data archive</Button>
                  </Row>
                  <Row title="Delete account" desc="Permanently erase your data. Cannot be undone.">
                    <Button variant="danger">Delete account</Button>
                  </Row>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
