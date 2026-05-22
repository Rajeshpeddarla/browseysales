"use client";

import { DollarSign, TrendingUp, ArrowUp, Users } from "lucide-react";

export default function RevenuePage() {
  const metrics = [
    { label: "MRR", value: "$0", change: "+0%", icon: DollarSign },
    { label: "ARR", value: "$0", change: "+0%", icon: TrendingUp },
    { label: "Avg Revenue/User", value: "$0.00", change: "—", icon: ArrowUp },
    { label: "Paid Users", value: "0", change: "+0", icon: Users },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">Revenue</h1>
      <p className="mt-1 text-sm text-text-muted">Monthly & annual revenue tracking.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-surface-1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{m.label}</p>
                <p className="mt-3 text-3xl font-bold text-text">{m.value}</p>
                <p className="mt-1 text-xs text-success">{m.change}</p>
              </div>
              <m.icon className="h-5 w-5 text-success" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="text-base font-semibold text-text mb-4">MRR Trend (Last 6 Months)</h3>
        <div className="flex items-end gap-4 h-40">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full max-w-[40px] bg-brand-gradient rounded-t-lg" style={{ height: "4px" }} />
              <span className="text-[10px] text-text-subtle">{month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="text-base font-semibold text-text mb-4">Revenue by Plan</h3>
        <div className="space-y-3">
          {[
            { plan: "Pro ($29/mo)", users: 0, mrr: 0, color: "bg-brand-gradient" },
            { plan: "Team ($49/seat/mo)", users: 0, mrr: 0, color: "bg-brand-blue" },
            { plan: "Enterprise (Custom)", users: 0, mrr: 0, color: "bg-brand-pink" },
          ].map((p) => (
            <div key={p.plan} className="flex items-center gap-4">
              <span className="w-48 text-sm text-text">{p.plan}</span>
              <div className="flex-1 h-2 rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${p.color}`} style={{ width: `${Math.max(2, (p.mrr / 1) * 100)}%` }} />
              </div>
              <span className="text-sm font-medium text-text w-20 text-right">${p.mrr}</span>
              <span className="text-xs text-text-muted w-20 text-right">{p.users} users</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
