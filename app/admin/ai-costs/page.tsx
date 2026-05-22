"use client";

import { Cpu, DollarSign, TrendingDown, BarChart3 } from "lucide-react";

export default function AICostsPage() {
  const metrics = [
    { label: "Total AI Spend", value: "$0.00", sub: "this month", icon: DollarSign },
    { label: "Cost per Brief", value: "$0.000", sub: "average", icon: Cpu },
    { label: "Total API Calls", value: "0", sub: "this month", icon: BarChart3 },
    { label: "Margin", value: "—", sub: "revenue - AI cost", icon: TrendingDown },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">AI Costs</h1>
      <p className="mt-1 text-sm text-text-muted">Monitor AI provider usage and unit economics.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-surface-1 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{m.label}</p>
                <p className="mt-3 text-3xl font-bold text-text">{m.value}</p>
                <p className="mt-1 text-xs text-text-subtle">{m.sub}</p>
              </div>
              <m.icon className="h-5 w-5 text-brand-glow" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-6">
        <h3 className="text-base font-semibold text-text mb-2">Cost Breakdown by Model</h3>
        <p className="text-xs text-text-muted mb-6">Current routing: NVIDIA NIM primary with OpenRouter fallback</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft">
              <th className="py-2 text-left text-xs font-medium uppercase text-text-muted">Model</th>
              <th className="py-2 text-left text-xs font-medium uppercase text-text-muted">Calls</th>
              <th className="py-2 text-left text-xs font-medium uppercase text-text-muted">Input Tokens</th>
              <th className="py-2 text-left text-xs font-medium uppercase text-text-muted">Output Tokens</th>
              <th className="py-2 text-left text-xs font-medium uppercase text-text-muted">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-soft">
              <td className="py-3 font-mono text-xs text-text">configured fallback chain</td>
              <td className="py-3 text-text-muted">0</td>
              <td className="py-3 text-text-muted">0</td>
              <td className="py-3 text-text-muted">0</td>
              <td className="py-3 text-text-muted">$0.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-2xl border border-warning/30 bg-warning/5 p-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingDown className="h-5 w-5 text-warning" />
          <h3 className="text-base font-semibold text-text">Unit Economics Target</h3>
        </div>
        <p className="text-sm text-text-muted">
          Target: AI cost per brief should stay under <span className="font-semibold text-text">$0.03</span> to maintain healthy margins at the $29/mo Pro tier.
          Current average: <span className="font-semibold text-text">$0.000</span>
        </p>
      </div>
    </main>
  );
}
