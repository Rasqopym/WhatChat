import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ agents: [], error: error.message });
    }

    return NextResponse.json({ agents: data || [] });
  } catch (err: any) {
    return NextResponse.json({ agents: [], error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Name, email, and a password of at least 6 characters are required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // 1. Create Supabase Auth User
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: role === 'admin' ? 'admin' : 'agent' },
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create agent account' }, { status: 400 });
    }

    // 2. Insert into public.agents
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: role === 'admin' ? 'admin' : 'agent',
        is_online: false,
      })
      .select()
      .single();

    if (agentErr) {
      return NextResponse.json({ error: agentErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { agentId, role, isOnline } = await req.json();
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (role !== undefined) updatePayload.role = role === 'admin' ? 'admin' : 'agent';
    if (isOnline !== undefined) updatePayload.is_online = isOnline;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('agents')
      .update(updatePayload)
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
