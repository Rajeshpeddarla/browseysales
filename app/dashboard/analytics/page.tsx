"use client";

import { BarChart3, FileText, Plug, Clock, Target, Activity } from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";

const kpis = [
  { label: "Total Briefs", value: "0", change: "+0%", icon: FileText },
  { label: "CRM Pushes", value: "0", change: "+0%", icon: Plug },
  { label: "Hours Saved", value: "0h", change: "+0%", icon: Clock },
  { label: "Reply Rate", value: "—", change: "—", icon: Activity },
];

const weeklyData = [
  { day: "Mon", briefs: 0 }, { day: "Tue", briefs: 0 },
  { day: "Wed", briefs: 0 }, { day: "Thu", briefs: 0 },
  { day: "Fri", briefs: 0 }, { day: "Sat", briefs: 0 },
  { day: "Sun", briefs: 0 },
];

export default function AnalyticsPage() {
  return (
    <>
      <DashTopBar title="Analytics" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-text">Sales Analytics 📊</h2>
        <p className="mt-1 text-sm text-text-muted">Track prospect research performance.</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-border bg-surface-1 p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{k.label}</p>
              <p className="mt-3 text-3xl font-semibold text-text">{k.value}</p>
              <p className="mt-1 text-xs text-success">{k.change} vs last period</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-6">
          <h3 className="text-base font-semibold text-text">Weekly Activity</h3>
          <div className="mt-6 flex items-end gap-3 h-40">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full max-w-[32px] rounded-t-lg bg-brand-gradient" style={{ height: "4px" }} />
                <span className="text-[10px] text-text-subtle mt-2">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-brand-violet/30 bg-surface-1 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Target className="h-5 w-5 text-brand-glow" />
            <h3 className="text-base font-semibold text-text">North Star: CRM Pushes per Rep per Week</h3>
          </div>
          <p className="text-sm text-text-muted">Target: <span className="font-semibold text-text">15+</span> pushes/week per active rep.</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full bg-surface-2">
              <div className="h-full bg-brand-gradient rounded-full" style={{ width: "0%" }} />
            </div>
            <span className="text-sm font-semibold text-text">0 / 15</span>
          </div>
        </div>
      </main>
    </>
  );
}
