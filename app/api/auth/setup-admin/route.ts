import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Name, email, and a password of at least 6 characters are required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Ensure no agents exist yet (prevent unauthorized bootstrap)
    const { count } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'An Admin account already exists. Please sign in.' },
        { status: 403 }
      );
    }

    // 1. Create Auth user in Supabase
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), role: 'admin' },
    });

    if (authErr || !authData.user) {
      return NextResponse.json({ error: authErr?.message || 'Failed to create auth user' }, { status: 400 });
    }

    // 2. Insert into public.agents
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: 'admin',
        is_online: true,
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
