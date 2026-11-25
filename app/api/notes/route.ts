import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { conversationId, agentId, agentName, content } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 });
    }

    const validAgentId = agentId && UUID_REGEX.test(agentId) ? agentId : null;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('internal_notes')
      .insert({
        conversation_id: conversationId,
        agent_id: validAgentId,
        agent_name: agentName || 'Team Member',
        content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
