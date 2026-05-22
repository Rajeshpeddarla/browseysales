"use client";

import { Plug, CheckCircle, Circle, ArrowRight, ExternalLink } from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/Badge";

const integrations = [
  {
    name: "HubSpot",
    logo: "H",
    color: "bg-[#FF7A59]",
    description: "Sync contacts, companies, notes, and deal activities automatically.",
    tier: "Pro",
    connected: false,
    features: ["Contact upsert", "Company upsert", "Note creation", "Activity logging"],
  },
  {
    name: "Salesforce",
    logo: "SF",
    color: "bg-[#00A1E0]",
    description: "Push leads, accounts, and task records to Salesforce CRM.",
    tier: "Team",
    connected: false,
    features: ["Lead creation", "Account upsert", "Task logging", "Custom fields"],
  },
  {
    name: "Pipedrive",
    logo: "P",
    color: "bg-[#28A745]",
    description: "Create people, organizations, and notes in Pipedrive.",
    tier: "Pro",
    connected: false,
    features: ["Person creation", "Organization upsert", "Note attachment", "Deal linking"],
  },
  {
    name: "Outreach",
    logo: "O",
    color: "bg-[#5951FF]",
    description: "Add prospects and accounts to Outreach sequences.",
    tier: "Team",
    connected: false,
    features: ["Prospect creation", "Account sync", "Sequence enrollment", "Activity tracking"],
  },
  {
    name: "Salesloft",
    logo: "SL",
    color: "bg-[#4A89DC]",
    description: "Sync people and accounts into Salesloft cadences.",
    tier: "Team",
    connected: false,
    features: ["Person creation", "Account sync", "Cadence enrollment", "Call logging"],
  },
  {
    name: "Close",
    logo: "C",
    color: "bg-[#333]",
    description: "Create leads and contacts in Close CRM with API key auth.",
    tier: "Team",
    connected: false,
    features: ["Lead creation", "Contact sync", "Note attachment", "Activity logging"],
  },
  {
    name: "Slack",
    logo: "S",
    color: "bg-[#611F69]",
    description: "Get notifications when briefs are generated or CRM pushes complete.",
    tier: "Team",
    connected: false,
    features: ["Brief notifications", "CRM push alerts", "Team activity feed", "Channel routing"],
  },
  {
    name: "CSV / Excel Export",
    logo: "📊",
    color: "bg-surface-3",
    description: "Export briefs as CSV or Excel files for pipeline reviews.",
    tier: "Pro",
    connected: true,
    features: ["CSV export", "Excel (.xlsx)", "DOCX reports", "Bulk export"],
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <DashTopBar title="Integrations" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Integrations 🔌
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Connect your CRM and communication tools for one-click prospect pushes.
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => (
            <div
              key={i.name}
              className="group rounded-2xl border border-border bg-surface-1 p-5 transition-all hover:border-brand-violet/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${i.color} text-white font-bold text-sm`}>
                    {i.logo}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text">{i.name}</h3>
                    <Badge tone={i.connected ? "brand" : "outline"} className="mt-0.5">
                      {i.connected ? (
                        <><CheckCircle className="mr-1 h-3 w-3" /> Connected</>
                      ) : (
                        <><Circle className="mr-1 h-3 w-3" /> {i.tier}+ required</>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-text-muted">{i.description}</p>

              <ul className="mt-3 space-y-1.5">
                {i.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-text-subtle">
                    <CheckCircle className="h-3 w-3 text-success/60" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition ${
                  i.connected
                    ? "border border-success/30 bg-success/10 text-success"
                    : "border border-border bg-surface-2 text-text hover:bg-surface-3 hover:border-brand-violet/30"
                }`}
              >
                {i.connected ? (
                  <>
                    <CheckCircle className="h-4 w-4" /> Connected
                  </>
                ) : (
                  <>
                    <Plug className="h-4 w-4" /> Connect {i.name}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
