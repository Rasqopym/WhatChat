import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { conversationId, assignedAgentId, status, priority, unreadCount } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};

    if (status !== undefined) updatePayload.status = status;
    if (priority !== undefined) updatePayload.priority = priority;
    if (unreadCount !== undefined) updatePayload.unread_count = unreadCount;

    if (assignedAgentId !== undefined) {
      if (assignedAgentId === null || assignedAgentId === '') {
        updatePayload.assigned_agent_id = null;
        updatePayload.assigned_agent_key = null;
      } else if (UUID_REGEX.test(assignedAgentId)) {
        updatePayload.assigned_agent_id = assignedAgentId;
        updatePayload.assigned_agent_key = assignedAgentId;
      } else {
        updatePayload.assigned_agent_id = null;
        updatePayload.assigned_agent_key = assignedAgentId;
      }
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversation: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
