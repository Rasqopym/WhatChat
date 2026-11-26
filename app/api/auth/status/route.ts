import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { count, error } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json(
        { hasAgents: false, error: error.message },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      );
    }

    return NextResponse.json(
      { hasAgents: (count || 0) > 0, count: count || 0 },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { hasAgents: false, error: err.message },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }
}
