"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Loader2,
  X,
} from "lucide-react";
import { DashTopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/Badge";
import { getTeam, inviteTeamMember } from "@/app/actions/sales";

export default function TeamPage() {
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("rep");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    setLoading(true);
    const res = await getTeam();
    if (res.ok) {
      setTeam(res.data);
    }
    setLoading(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    const res = await inviteTeamMember(inviteEmail, inviteRole);
    if (res.ok) {
      setShowInvite(false);
      setInviteEmail("");
      loadTeam();
    } else {
      setInviteError(res.error?.message || "Failed to invite");
    }
    setInviting(false);
  };

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3 w-3 text-warning" />;
      case "manager": return <Shield className="h-3 w-3 text-brand-glow" />;
      default: return <Users className="h-3 w-3 text-text-subtle" />;
    }
  };

  return (
    <>
      <DashTopBar title="Team" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-text">
              Team Management 👥
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Manage your sales team members, roles, and shared resources.
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </button>
        </div>

        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text">Invite Team Member</h3>
                <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Email</label>
                  <input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-brand-violet/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-text focus:border-brand-violet/60 focus:outline-none"
                  >
                    <option value="rep">Rep</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                {inviteError && (
                  <p className="text-xs text-danger">{inviteError}</p>
                )}
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowInvite(false)} className="flex-1 rounded-xl border border-border bg-surface-2 py-2.5 text-sm text-text hover:bg-surface-3">Cancel</button>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-brand-glow" />
          </div>
        ) : !team ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface-1 p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-text-subtle" />
            <h3 className="mt-4 text-lg font-semibold text-text">No team yet</h3>
            <p className="mt-2 text-sm text-text-muted max-w-sm mx-auto">
              Upgrade to the Team plan to create a shared workspace for your sales team with playbooks, shared briefs, and analytics.
            </p>
            <a
              href="/dashboard/billing"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-medium text-white"
            >
              <Crown className="h-4 w-4" /> Upgrade to Team
            </a>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {/* Team Info */}
            <div className="rounded-2xl border border-border bg-surface-1 p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white font-bold text-lg">
                  {team.team?.name?.[0] || "T"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text">{team.team?.name}</h3>
                  <p className="text-xs text-text-muted">
                    {team.members?.length || 0} members · {team.team?.seats_purchased || 0} seats purchased
                  </p>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="rounded-2xl border border-border bg-surface-1 p-6">
              <h3 className="text-base font-semibold text-text mb-4">Members</h3>
              <div className="space-y-3">
                {team.members?.map((m: any) => (
                  <div key={m.user_id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient-soft text-brand-glow font-bold text-sm">
                      {m.profiles?.display_name?.[0] || m.profiles?.email?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{m.profiles?.display_name || "Unknown"}</p>
                      <p className="text-xs text-text-muted truncate">{m.profiles?.email}</p>
                    </div>
                    <Badge tone={m.role === "owner" ? "brand" : "outline"}>
                      {roleIcon(m.role)}
                      <span className="ml-1 capitalize">{m.role}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
