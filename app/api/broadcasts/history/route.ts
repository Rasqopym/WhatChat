import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('broadcast_campaigns')
      .select('id, business_id, business_name, agent_id, template_name, target_tag, total_recipients, sent_count, failed_count, preview_text, created_at')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return NextResponse.json({ campaigns: [], warning: error.message });
    }

    return NextResponse.json({ campaigns: data || [] });
  } catch (err: any) {
    return NextResponse.json({ campaigns: [], warning: err?.message });
  }
}
