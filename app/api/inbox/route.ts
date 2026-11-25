import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = getServiceSupabase();

    // 1. Fetch all conversations with their contact details
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .order('last_message_at', { ascending: false });

    if (convError) {
      console.error('[Inbox API] Conversations error:', convError);
      return NextResponse.json({ error: convError.message }, { status: 500 });
    }

    // 2. Fetch all messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[Inbox API] Messages error:', msgError);
    }

    // 3. Fetch all internal notes
    const { data: notes, error: notesError } = await supabase
      .from('internal_notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('[Inbox API] Notes error:', notesError);
    }

    // 4. Fetch businesses (graceful if migration hasn't run yet)
    let businesses: any[] = [];
    try {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, display_phone_number, whatsapp_phone_number_id, brand_color, ai_context, created_at')
        .order('created_at', { ascending: true });
      if (bizData) businesses = bizData;
    } catch {
      // Ignore if businesses table doesn't exist yet
    }

    const normalizedConversations = (conversations || []).map((c: any) => ({
      ...c,
      assigned_agent_id: c.assigned_agent_id || c.assigned_agent_key || null,
    }));

    return NextResponse.json(
      {
        conversations: normalizedConversations,
        messages: messages || [],
        notes: notes || [],
        businesses,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('[Inbox API] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
