"use client";
import { useState } from "react";
import {
  User,
  Shield,
  Bell,
  Sparkles,
  Palette,
  Lock,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI preferences", icon: Sparkles },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "privacy", label: "Privacy", icon: Lock },
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
                    <Textarea
                      rows={3}
                      placeholder="A bit about you…"
                    />
                  </Row>
                  <div className="flex justify-end gap-2 px-6 py-4">
                    <Button variant="secondary">Cancel</Button>
                    <Button>Save changes</Button>
                  </div>
                </>
              )}

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
                        <button className="text-xs text-danger hover:underline">
                          Revoke
                        </button>
                      </div>
                    </div>
                  </Row>
                </>
              )}

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

              {active === "ai" && (
                <>
                  <Row title="AI tone" desc="Browsey will match this style by default.">
                    <div className="flex flex-wrap gap-2">
                      {["Neutral", "Friendly", "Concise", "Caveman", "Academic"].map(
                        (t, i) => (
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
                        )
                      )}
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
                      {[
                        "bg-brand-gradient",
                        "bg-success",
                        "bg-warning",
                        "bg-danger",
                        "bg-brand-blue",
                      ].map((c, i) => (
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
