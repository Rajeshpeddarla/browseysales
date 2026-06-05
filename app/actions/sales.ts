"use server";

import { createClient } from "@/lib/supabase/server";
import { runResearchPipeline } from "@/lib/pipeline";

// ============================================================
// BRIEF GENERATION
// ============================================================

export async function generateBrief(url: string, playbookId?: string) {
  const startedAt = Date.now();
  const debugLog: string[] = [];
  const log = (message: string) => {
    const elapsedMs = Date.now() - startedAt;
    const line = `[+${elapsedMs}ms] ${message}`;
    debugLog.push(line);
    console.log(`[Brief Debug] ${line}`);
  };

  try {
    log(`Started brief generation for ${url}`);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log("Auth failed: no current user");
      return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" }, debugLog };
    }

    log(`Authenticated user ${user.id}`);

    // Check quota
    log("Checking monthly brief quota");
    let { data: profile } = await supabase
      .from("profiles")
      .select("monthly_brief_used, monthly_brief_quota, plan")
      .eq("id", user.id)
      .single();

    // Fallback: If profile doesn't exist (e.g. SQL trigger didn't run), create it.
    if (!profile) {
      log("Profile missing; creating fallback profile");
      const { data: newProfile, error: profileErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
          plan: "free",
        })
        .select()
        .single();
        
      if (profileErr) {
        console.error("Profile fallback insert failed:", profileErr);
        log(`Profile creation failed: ${profileErr.message}`);
        throw new Error(`Profile creation failed: ${profileErr.message}. Make sure the SQL trigger or RLS insert policy for profiles is set up.`);
      }
      
      profile = newProfile;
      log("Fallback profile created");
    }

    if (profile && profile.monthly_brief_used >= profile.monthly_brief_quota) {
      log(`Quota exceeded: ${profile.monthly_brief_used}/${profile.monthly_brief_quota}`);
      return {
        ok: false,
        error: { code: "QUOTA_EXCEEDED", message: "Monthly brief quota exceeded. Upgrade to Pro for unlimited briefs." },
        debugLog,
      };
    }

    log(`Quota ok: ${profile?.monthly_brief_used ?? 0}/${profile?.monthly_brief_quota ?? "unknown"}`);

    // Get playbook context if provided
    let playbookContext: string | undefined;
    if (playbookId) {
      log(`Loading playbook ${playbookId}`);
      const { data: playbook } = await supabase
        .from("playbooks")
        .select("*")
        .eq("id", playbookId)
        .single();

      if (playbook) {
        playbookContext = `ICP: ${playbook.icp_description || "N/A"}\nTone: ${playbook.outreach_tone}\nFocus: ${playbook.description || "general"}`;
        log(`Loaded playbook "${playbook.name || playbookId}"`);
      } else {
        log(`Playbook ${playbookId} not found`);
      }
    }

    let domain: string;
    try {
      domain = new URL(url).hostname.replace("www.", "");
    } catch {
      domain = url;
    }

    log(`Running shared intelligence pipeline for ${domain}`);
    if (playbookContext) {
      log("Playbook context loaded; personalization will use saved user AI preferences");
    }
    const pipelineResult = await runResearchPipeline(domain, user.id, undefined, false);
    const brief = pipelineResult.saved_brief;
    if (!brief) {
      throw new Error("Pipeline completed but did not return a saved brief");
    }
    log(`Pipeline completed. Cached: ${pipelineResult.cached}. Degraded: ${pipelineResult.is_degraded}`);
    log(`Brief saved with id ${(brief as any).id}`);

    // Increment usage
    log("Incrementing monthly usage");
    const { error: rpcError } = await supabase.rpc("increment_brief_usage", { uid: user.id });
    if (rpcError) {
      // Fallback: direct update if RPC doesn't exist
      log(`Usage RPC failed; applying direct profile update: ${rpcError.message}`);
      await supabase
        .from("profiles")
        .update({ monthly_brief_used: (profile?.monthly_brief_used || 0) + 1 })
        .eq("id", user.id);
    }

    // Log usage event
    log("Writing usage event");
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event: "brief_generated",
      meta: { url, domain, cached: pipelineResult.cached, degraded: pipelineResult.is_degraded },
    });

    log("Brief generation finished successfully");
    return { ok: true, data: brief, debugLog };
  } catch (error: any) {
    console.error("Brief generation error:", error);
    log(`Brief generation failed: ${error.message}`);
    return { ok: false, error: { code: "GENERATION_FAILED", message: error.message }, debugLog };
  }
}

// ============================================================
// BRIEF CRUD
// ============================================================

export async function getBriefs(filters?: {
  tag?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    let query = supabase
      .from("briefs")
      .select("*, companies(name, domain, logo_url, industry)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 50);

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters?.limit || 50) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

export async function getBrief(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("briefs")
      .select("*, companies(name, domain, logo_url, industry)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

export async function updateBrief(id: string, updates: { notes?: string; tags?: string[]; status?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("briefs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "UPDATE_FAILED", message: error.message } };
  }
}

export async function deleteBrief(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { error } = await supabase
      .from("briefs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: { code: "DELETE_FAILED", message: error.message } };
  }
}

// ============================================================
// PLAYBOOKS
// ============================================================

export async function getPlaybooks() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("playbooks")
      .select("*")
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

export async function createPlaybook(playbook: {
  name: string;
  description?: string;
  icp_description?: string;
  outreach_tone?: string;
  is_public?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("playbooks")
      .insert({
        ...playbook,
        user_id: user.id,
      })
      .select("*")
      .single();

    if (error) throw error;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "CREATE_FAILED", message: error.message } };
  }
}

export async function updatePlaybook(id: string, updates: Partial<{
  name: string;
  description: string;
  icp_description: string;
  outreach_tone: string;
  is_public: boolean;
}>) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("playbooks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: { code: "UPDATE_FAILED", message: error.message } };
  }
}

export async function deletePlaybook(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { error } = await supabase
      .from("playbooks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: { code: "DELETE_FAILED", message: error.message } };
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    // Run all queries in parallel for speed
    const [profileRes, briefsRes, pushesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, plan, monthly_brief_used, monthly_brief_quota, display_name, email, avatar_url")
        .eq("id", user.id)
        .single(),
      supabase
        .from("briefs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("crm_pushes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "success"),
    ]);

    const totalBriefs = briefsRes.count ?? 0;

    return {
      ok: true,
      data: {
        profile: profileRes.data,
        total_briefs: totalBriefs,
        crm_pushes: pushesRes.count ?? 0,
        hours_saved: Math.round((totalBriefs * 12) / 60), // ~12 min per manual research
      },
    };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

// ============================================================
// ADMIN STATS
// ============================================================

export async function getAdminStats() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["super_admin", "support_admin", "analyst"].includes(profile.role)) {
      return { ok: false, error: { code: "FORBIDDEN", message: "Admin access required" } };
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsersRes,
      briefsTodayRes,
      totalBriefsRes,
      planBreakdownRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact" }),
      supabase.from("briefs").select("id", { count: "exact" }).gte("created_at", today.toISOString()),
      supabase.from("briefs").select("id", { count: "exact" }),
      supabase.from("profiles").select("plan"),
    ]);

    const plans = planBreakdownRes.data || [];
    const planCounts = {
      free: plans.filter((p) => p.plan === "free").length,
      pro: plans.filter((p) => p.plan === "pro").length,
      team: plans.filter((p) => p.plan === "team").length,
      enterprise: plans.filter((p) => p.plan === "enterprise").length,
    };

    // Calculate MRR
    const mrr = planCounts.pro * 29 + planCounts.team * 49 + planCounts.enterprise * 299;

    return {
      ok: true,
      data: {
        total_users: totalUsersRes.count || 0,
        active_users_7d: 0, // Would need last_seen_at query
        active_users_30d: 0,
        total_briefs: totalBriefsRes.count || 0,
        briefs_today: briefsTodayRes.count || 0,
        crm_pushes_today: 0,
        mrr,
        plan_breakdown: planCounts,
      },
    };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

// ============================================================
// TEAM MANAGEMENT
// ============================================================

export async function getTeam() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role, teams(*)")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { ok: true, data: null };
    }

    const { data: members } = await supabase
      .from("team_members")
      .select("*, profiles(display_name, email, avatar_url, plan)")
      .eq("team_id", membership.team_id);

    return {
      ok: true,
      data: {
        team: membership.teams,
        my_role: membership.role,
        members: members || [],
      },
    };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

export async function inviteTeamMember(email: string, role: string = "rep") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    // Find user's team
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "manager"].includes(membership.role)) {
      return { ok: false, error: { code: "FORBIDDEN", message: "Only team owners/managers can invite" } };
    }

    // Find invited user
    const { data: invitee } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!invitee) {
      return { ok: false, error: { code: "NOT_FOUND", message: "User not found. They must sign up first." } };
    }

    const { error } = await supabase.from("team_members").insert({
      team_id: membership.team_id,
      user_id: invitee.id,
      role,
    });

    if (error) throw error;

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: { code: "INVITE_FAILED", message: error.message } };
  }
}

// ============================================================
// PLAN UPGRADE (Mock / Simulated checkout)
// ============================================================

export async function upgradeUserPlan(plan: "free" | "pro" | "team" | "enterprise") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const quotaMap: Record<string, number> = {
      free: 10,
      pro: 999999,
      team: 999999,
      enterprise: 999999,
    };

    const { error } = await supabase
      .from("profiles")
      .update({
        plan,
        monthly_brief_quota: quotaMap[plan] ?? 10,
        monthly_brief_used: 0, // reset usage on upgrade
      })
      .eq("id", user.id);

    if (error) throw error;

    // Log upgrade event (non-blocking)
    void supabase.from("usage_events").insert({
      user_id: user.id,
      event: "plan_upgraded",
      meta: { plan },
    });

    return { ok: true, data: { plan } };
  } catch (error: any) {
    console.error("Upgrade error:", error);
    return { ok: false, error: { code: "UPGRADE_FAILED", message: error.message } };
  }
}

// ============================================================
// API KEY MANAGEMENT (BYOK)
// Keys are stored per-user in the profiles table.
// Only the owning user can read or write their own keys.
// ============================================================

export async function saveApiKey(service: 'hunter', apiKey: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const columnMap: Record<string, string> = {
      hunter: 'hunter_api_key',
    };

    const column = columnMap[service];
    if (!column) return { ok: false, error: { code: "INVALID_SERVICE", message: `Unknown service: ${service}` } };

    const { error } = await supabase
      .from('profiles')
      .update({ [column]: apiKey.trim() || null })
      .eq('id', user.id);

    if (error) throw error;
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: { code: "SAVE_FAILED", message: error.message } };
  }
}

export async function getApiKeys() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } };

    const { data, error } = await supabase
      .from('profiles')
      .select('hunter_api_key')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Return masked values — never expose the full key to the client
    return {
      ok: true,
      data: {
        hunter: data?.hunter_api_key
          ? maskKey(data.hunter_api_key)
          : null,
        hunter_connected: !!data?.hunter_api_key,
      },
    };
  } catch (error: any) {
    return { ok: false, error: { code: "FETCH_FAILED", message: error.message } };
  }
}

/** Show first 4 + last 4 chars, mask the middle */
function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.slice(-4)}`;
}

// ============================================================
// WATCH MODE — Track companies, get alerted on changes
// ============================================================

import {
  createWatch,
  deleteWatch,
  getUserWatches,
  getUserAlerts,
  markAlertsRead,
  getUnreadAlertCount,
} from '@/lib/pipeline/watch-mode';

export async function watchDomain(domain: string, signals?: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
  return createWatch(user.id, domain, signals);
}

export async function unwatchDomain(domain: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } };
  await deleteWatch(user.id, domain);
  return { ok: true };
}

export async function getWatches() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, data: [] };
  const watches = await getUserWatches(user.id);
  return { ok: true, data: watches };
}

export async function getAlerts(limit = 20) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, data: [] };
  const alerts = await getUserAlerts(user.id, limit);
  return { ok: true, data: alerts };
}

export async function readAlerts(alertIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await markAlertsRead(user.id, alertIds);
  return { ok: true };
}

export async function getAlertCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, count: 0 };
  const count = await getUnreadAlertCount(user.id);
  return { ok: true, count };
}
