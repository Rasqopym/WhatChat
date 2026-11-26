import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { count, error } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({ hasAgents: false, error: error.message });
    }

    return NextResponse.json({ hasAgents: (count || 0) > 0, count: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ hasAgents: false, error: err.message });
  }
}
