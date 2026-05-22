"use client";

import { useEffect, useState } from "react";
import { ScrollText, Loader2, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    })();
  }, []);

  const eventColor = (event: string) => {
    if (event.includes("delete")) return "danger";
    if (event.includes("create") || event.includes("generate")) return "success";
    if (event.includes("update") || event.includes("edit")) return "brand";
    return "outline";
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">Audit Log</h1>
      <p className="mt-1 text-sm text-text-muted">Immutable record of all platform actions for compliance.</p>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="mx-auto h-10 w-10 text-text-subtle" />
            <p className="mt-3 text-sm text-text-muted">No audit events recorded yet.</p>
            <p className="mt-1 text-xs text-text-subtle">Events will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-surface-2">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Event</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Actor</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Details</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">IP</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <Badge tone={eventColor(log.event) as any}>{log.event}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-muted font-mono">
                    {log.actor_id?.substring(0, 8)}...
                  </td>
                  <td className="px-5 py-3 text-xs text-text-muted max-w-xs truncate">
                    {JSON.stringify(log.meta || {}).substring(0, 60)}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-subtle font-mono">
                    {log.ip || "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-subtle">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
