"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Globe, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";

export default function AdminBriefsPage() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("briefs")
        .select("id, url, data, created_at, ai_cost_usd, profiles(email, display_name)")
        .order("created_at", { ascending: false })
        .limit(50);
      setBriefs(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">All Briefs</h1>
      <p className="mt-1 text-sm text-text-muted">{briefs.length} most recent briefs across all users.</p>

      <div className="mt-8 rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
          </div>
        ) : briefs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-text-subtle" />
            <p className="mt-3 text-sm text-text-muted">No briefs generated yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-surface-2">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Company</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">User</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">URL</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">AI Cost</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Created</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b) => (
                <tr key={b.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-md bg-brand-gradient-soft text-brand-glow text-xs font-bold">
                        {b.data?.company?.name?.[0] || "?"}
                      </div>
                      <span className="text-text font-medium">{b.data?.company?.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-muted text-xs">
                    {(b.profiles as any)?.display_name || (b.profiles as any)?.email || "—"}
                  </td>
                  <td className="px-5 py-3">
                    <a href={b.url} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-brand-glow hover:underline">
                      <Globe className="h-3 w-3" />
                      {b.url?.substring(0, 40)}...
                    </a>
                  </td>
                  <td className="px-5 py-3 text-xs text-text-muted">
                    ${(b.ai_cost_usd || 0).toFixed(4)}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-subtle">
                    {new Date(b.created_at).toLocaleString()}
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
