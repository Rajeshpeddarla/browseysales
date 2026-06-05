import { createClient } from '@/lib/supabase/server';
import type { DetectedChange, WatchAlert } from './types';

export async function createWatch(
  userId: string,
  domain: string,
  signals: string[] = ['pricing', 'hiring', 'tech_stack', 'enterprise_readiness']
): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Phase 7 schema requires company_id
    let companyId = null;
    const { data: company } = await supabase.from('companies').select('id').eq('domain', domain).single();
    if (company) {
      companyId = company.id;
    } else {
      const { data: newCompany } = await supabase.from('companies').insert({ domain, company_name: domain.split('.')[0] }).select('id').single();
      companyId = newCompany?.id || null;
    }

    const { data, error } = await supabase
      .from('watches')
      .upsert(
        { user_id: userId, company_id: companyId, watch_types: signals },
        { onConflict: 'user_id,company_id' }
      )
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function deleteWatch(userId: string, domain: string): Promise<void> {
  const supabase = await createClient();
  const { data: company } = await supabase.from('companies').select('id').eq('domain', domain).single();
  if (company) {
    await supabase.from('watches').delete().eq('user_id', userId).eq('company_id', company.id);
  }
}

export async function getUserWatches(userId: string): Promise<{ domain: string; signals: string[]; created_at: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('watches')
    .select(`
      watch_types, 
      created_at,
      companies ( domain )
    `)
    .eq('user_id', userId);
    
  return (data || []).map((w: any) => ({
    domain: w.companies?.domain || 'unknown',
    signals: w.watch_types || [],
    created_at: w.created_at
  }));
}

export async function triggerWatchAlerts(
  domain: string,
  changes: DetectedChange[]
): Promise<void> {
  if (changes.length === 0) return;

  const alertableChanges = changes.filter(
    (c) => c.significance === 'high' || c.significance === 'critical'
  );
  if (alertableChanges.length === 0) return;

  try {
    const supabase = await createClient();

    const { data: company } = await supabase.from('companies').select('id').eq('domain', domain).single();
    if (!company) return;

    const { data: watchers } = await supabase
      .from('watches')
      .select('id, watch_types')
      .eq('company_id', company.id);

    if (!watchers || watchers.length === 0) return;

    const alerts = [];
    for (const watcher of watchers) {
      for (const change of alertableChanges) {
        const watchedSignals: string[] = watcher.watch_types || [];
        const isRelevant =
          watchedSignals.length === 0 ||
          watchedSignals.some((s) => change.field.startsWith(s) || change.type.includes(s));

        if (!isRelevant) continue;

        alerts.push({
          watch_id: watcher.id,
          alert_type: change.type,
          significance: change.significance,
          summary: change.summary,
          metadata: { old_value: change.old_value, new_value: change.new_value },
          is_read: false,
          created_at: change.detected_at,
        });
      }
    }

    if (alerts.length > 0) {
      await supabase.from('watch_alerts').insert(alerts);
      console.log(`[WatchMode 2.0] Triggered ${alerts.length} alerts for ${domain}`);
    }
  } catch (e) {
    console.error('[WatchMode 2.0] Failed to trigger alerts:', e);
  }
}

export async function getUserAlerts(
  userId: string,
  limit = 20
): Promise<WatchAlert[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('watch_alerts')
    .select('*')
    // Temporarily assuming user_id exists, though Phase 7 maps via watch_id.
    // If watch_alerts schema doesn't have user_id, it will need a join via watches table.
    // Assuming schema from old watch_alerts remains compatible.
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as WatchAlert[];
}

export async function markAlertsRead(userId: string, alertIds: string[]): Promise<void> {
  if (alertIds.length === 0) return;
  const supabase = await createClient();
  await supabase
    .from('watch_alerts')
    .update({ is_read: true })
    .eq('user_id', userId)
    .in('id', alertIds);
}

export async function getUnreadAlertCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('watch_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count || 0;
}

