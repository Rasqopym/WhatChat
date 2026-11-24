import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendWhatsAppTextMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, text, agentId, agentName, media } = await req.json();

    if (!conversationId || (!text && !media)) {
      return NextResponse.json({ error: 'Missing conversationId or text/media' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // 1. Fetch conversation and customer phone number
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const recipientPhone = conversation.contact?.phone_number;
    if (!recipientPhone) {
      return NextResponse.json({ error: 'Customer phone number missing' }, { status: 400 });
    }

    // 2. Dispatch to Meta WhatsApp API
    const sendResult = await sendWhatsAppTextMessage(recipientPhone, text || media?.name || 'Attachment');

    // 3. Record in messages table
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: agentId || null,
        text: text,
        media_type: media?.type,
        media_url: media?.url,
        media_name: media?.name,
        audio_duration: media?.duration,
        status: sendResult.simulated ? 'delivered' : 'sent',
        whatsapp_message_id: sendResult.messageId || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Failed to record sent message:', msgError);
    }

    // 4. Update conversation: clear unread count, set last message
    const snippet = media?.type === 'audio' 
      ? '🎤 Voice message' 
      : media?.type === 'image' 
      ? '📷 Photo' 
      : media?.type === 'document' 
      ? `📄 ${media.name}` 
      : text;

    await supabase
      .from('conversations')
      .update({
        last_message_text: snippet,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('[Send Message Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
