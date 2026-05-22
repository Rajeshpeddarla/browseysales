import {
  Shield,
  Smartphone,
  Laptop,
  Globe2,
  LogOut,
  KeyRound,
  ScanFace,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

const devices = [
  {
    icon: Laptop,
    name: "MacBook Pro 14",
    where: "San Francisco, CA · Chrome 132",
    when: "Active now",
    current: true,
  },
  {
    icon: Smartphone,
    name: "iPhone 15 Pro",
    where: "Mumbai, IN · Safari 17",
    when: "2 hours ago",
    current: false,
  },
  {
    icon: Globe2,
    name: "Unknown browser",
    where: "Bangalore, IN · Firefox 121",
    when: "May 10, 2026",
    current: false,
  },
];

const logs = [
  { ip: "203.0.113.42", where: "San Francisco, CA", when: "May 15, 2026 · 14:22", status: "Success" },
  { ip: "49.36.182.10", where: "Mumbai, IN", when: "May 15, 2026 · 09:01", status: "Success" },
  { ip: "117.96.34.5", where: "Bangalore, IN", when: "May 10, 2026 · 18:44", status: "Failed" },
  { ip: "203.0.113.42", where: "San Francisco, CA", when: "May 9, 2026 · 10:08", status: "Success" },
];

export default function SecurityPage() {
  return (
    <>
      <DashTopBar title="Security" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Security</h2>
        <p className="mt-1 text-sm text-text-muted">
          Lock down your account. Review sessions and recent activity.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                <KeyRound className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-text">
                Change password
              </h3>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <Label>Current password</Label>
                <Input type="password" placeholder="••••••••••••" />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <Label>New password</Label>
                  <Input type="password" />
                </div>
                <div>
                  <Label>Confirm new</Label>
                  <Input type="password" />
                </div>
              </div>
              <Button className="mt-2">Update password</Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-1 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
                <ScanFace className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-text">
                Two-factor authentication
              </h3>
            </div>
            <p className="mt-3 text-sm text-text-muted">
              Add an extra layer of protection. We&apos;ll roll out
              authenticator app support in the next release.
            </p>
            <Badge tone="warning" className="mt-4">Coming soon</Badge>
            <Button variant="secondary" className="mt-5" disabled>
              Set up 2FA
            </Button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text">
              Active devices
            </h3>
            <Button variant="secondary" size="sm" leftIcon={<LogOut className="h-4 w-4" />}>
              Sign out everywhere
            </Button>
          </div>
          <ul className="mt-5 divide-y divide-border-soft">
            {devices.map((d) => (
              <li key={d.name} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-text-muted">
                    <d.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-text">{d.name}</p>
                    <p className="text-xs text-text-subtle">{d.where}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">{d.when}</span>
                  {d.current ? (
                    <Badge tone="success">This device</Badge>
                  ) : (
                    <Button variant="danger" size="sm">
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-surface-1 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow ring-1 ring-brand-violet/30">
              <Shield className="h-4 w-4" />
            </div>
            <h3 className="text-base font-semibold text-text">
              Recent login activity
            </h3>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-text-muted">
                  <th className="py-2 font-medium">IP</th>
                  <th className="py-2 font-medium">Location</th>
                  <th className="py-2 font-medium">When</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {logs.map((l, i) => (
                  <tr key={i}>
                    <td className="py-3 font-mono text-xs text-text">{l.ip}</td>
                    <td className="py-3 text-text-muted">{l.where}</td>
                    <td className="py-3 text-text-muted">{l.when}</td>
                    <td className="py-3">
                      {l.status === "Success" ? (
                        <Badge tone="success">Success</Badge>
                      ) : (
                        <Badge tone="danger">Failed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
