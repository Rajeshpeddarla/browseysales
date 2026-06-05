import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all intel for testing purposes
    const { error } = await supabase
      .from('company_intel')
      .delete()
      .neq('domain', 'dummy_domain_to_delete_all');

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[API] Cache clear error:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
