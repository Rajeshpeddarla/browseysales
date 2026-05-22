"use client";

import { useEffect, useState } from "react";
import { Search, Users, Loader2, Shield, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setUsers(data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.display_name?.toLowerCase().includes(q);
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-text">User Management</h1>
      <p className="mt-1 text-sm text-text-muted">{users.length} registered users</p>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-surface-2">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">User</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Plan</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Role</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Briefs</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-text-muted">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border-soft last:border-0 hover:bg-surface-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow text-xs font-bold">
                        {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text">{u.display_name || "—"}</p>
                        <p className="text-xs text-text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={u.plan === "pro" ? "brand" : "outline"}>
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs ${u.role === "super_admin" ? "text-danger font-medium" : "text-text-muted"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-muted">
                    {u.monthly_brief_used}/{u.monthly_brief_quota}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-subtle">
                    {new Date(u.created_at).toLocaleDateString()}
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
