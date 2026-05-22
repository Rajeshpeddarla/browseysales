"use client";

import { useEffect, useState } from "react";
import {
  Users, DollarSign, FileText, TrendingUp, Activity,
  Loader2, ArrowUp, ArrowDown,
} from "lucide-react";
import { getAdminStats } from "@/app/actions/sales";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await getAdminStats();
      if (res.ok) setStats(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand-glow" />
      </div>
    );
  }

  const kpis = [
    { label: "Total Users", value: stats?.total_users || 0, icon: Users, color: "text-brand-blue" },
    { label: "MRR", value: `$${stats?.mrr || 0}`, icon: DollarSign, color: "text-success" },
    { label: "Total Briefs", value: stats?.total_briefs || 0, icon: FileText, color: "text-brand-violet" },
    { label: "Briefs Today", value: stats?.briefs_today || 0, icon: Activity, color: "text-brand-pink" },
  ];

  const planData = stats?.plan_breakdown || { free: 0, pro: 0, team: 0, enterprise: 0 };
  const totalUsers = stats?.total_users || 1;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">Admin Overview</h1>
      <p className="mt-1 text-sm text-text-muted">Business metrics and platform health.</p>

      {/* KPI Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-surface-1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{k.label}</p>
                <p className="mt-3 text-3xl font-bold text-text">{k.value}</p>
              </div>
              <k.icon className={`h-5 w-5 ${k.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <h3 className="text-base font-semibold text-text">Plan Distribution</h3>
          <div className="mt-6 space-y-4">
            {Object.entries(planData).map(([plan, count]) => (
              <div key={plan}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize text-text">{plan}</span>
                  <span className="text-text-muted">{count as number} users ({Math.round(((count as number) / totalUsers) * 100)}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${
                      plan === "pro" ? "bg-brand-gradient" :
                      plan === "team" ? "bg-brand-blue" :
                      plan === "enterprise" ? "bg-brand-pink" : "bg-text-subtle"
                    }`}
                    style={{ width: `${Math.max(((count as number) / totalUsers) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ARR Projection */}
        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <h3 className="text-base font-semibold text-text">Revenue</h3>
          <div className="mt-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">Monthly Recurring Revenue</span>
              <span className="text-2xl font-bold text-text">${stats?.mrr || 0}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">Annual Run Rate (ARR)</span>
              <span className="text-2xl font-bold text-success">${(stats?.mrr || 0) * 12}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-muted">Avg Revenue Per User</span>
              <span className="text-lg font-semibold text-text">
                ${totalUsers > 0 ? ((stats?.mrr || 0) / totalUsers).toFixed(2) : "0.00"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Manage Users", href: "/admin/users", icon: Users },
          { label: "Feature Flags", href: "/admin/feature-flags", icon: TrendingUp },
          { label: "View Audit Log", href: "/admin/audit-log", icon: Activity },
        ].map((l) => (
          <a key={l.label} href={l.href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4 text-sm text-text hover:border-brand-violet/30 hover:bg-surface-2 transition">
            <l.icon className="h-4 w-4 text-text-muted" />
            {l.label}
          </a>
        ))}
      </div>
    </main>
  );
}
