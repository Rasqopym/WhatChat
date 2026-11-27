import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendWhatsAppTextMessage, sendWhatsAppMediaMessage } from '@/lib/whatsapp';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { conversationId, text, agentId, media, replyTo } = await req.json();

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

    // 2. Resolve per-business WhatsApp credentials if conversation belongs to a business
    let bizPhoneId: string | null = null;
    let bizToken: string | null = null;
    if (conversation.business_id) {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('whatsapp_phone_number_id, whatsapp_access_token')
          .eq('id', conversation.business_id)
          .maybeSingle();
        if (biz) {
          bizPhoneId = biz.whatsapp_phone_number_id;
          bizToken = biz.whatsapp_access_token;
        }
      } catch {
        // Fallback to default env credentials
      }
    }

    // 3. Dispatch to Meta WhatsApp API using business-specific or default credentials
    let sendResult;
    if (media?.base64 && media?.mimeType && (media.type === 'image' || media.type === 'document' || media.type === 'audio' || media.type === 'video')) {
      sendResult = await sendWhatsAppMediaMessage({
        to: recipientPhone,
        base64Data: media.base64,
        mimeType: media.mimeType,
        mediaType: media.type,
        caption: text || undefined,
        filename: media.name,
        overridePhoneNumberId: bizPhoneId,
        overrideAccessToken: bizToken,
        replyToWamid: replyTo?.wamid || null,
      });
    } else {
      sendResult = await sendWhatsAppTextMessage(
        recipientPhone,
        text || media?.name || 'Attachment',
        bizPhoneId,
        bizToken,
        replyTo?.wamid || null
      );
    }

    // 4. Record in messages table without storing heavy base64 blobs in PostgreSQL
    const validSenderId = agentId && UUID_REGEX.test(agentId) ? agentId : null;
    const safeMediaUrl = media?.url && !media.url.startsWith('data:') ? media.url : null;
    const mediaLabel =
      media?.type === 'image'
        ? `Photo: ${media.name || 'image'}`
        : media?.type === 'video'
        ? `Video: ${media.name || 'video'}`
        : media?.type === 'audio'
        ? 'Voice message'
        : media?.type === 'document'
        ? `Document: ${media.name || 'file'}`
        : '';
    const baseText = media ? (text ? `${mediaLabel}\n${text}` : mediaLabel) : text;
    const cleanQuote = replyTo?.text ? String(replyTo.text).replace(/\s+/g, ' ').slice(0, 90) : '';
    const storedText = cleanQuote ? `> Replying to: "${cleanQuote}"\n${baseText}` : baseText;

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: validSenderId,
        text: storedText,
        media_type: media?.type || null,
        media_url: safeMediaUrl,
        status: sendResult.simulated ? 'delivered' : 'sent',
        whatsapp_message_id: sendResult.messageId || null,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Failed to record sent message:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    // 4. Update conversation: clear unread count, set last message
    const snippet = media?.type === 'audio' 
      ? 'Voice message' 
      : media?.type === 'image' 
      ? 'Photo' 
      : media?.type === 'video'
      ? 'Video'
      : media?.type === 'document' 
      ? `Document: ${media.name}` 
      : text;

    await supabase
      .from('conversations')
      .update({
        last_message_text: snippet,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, simulated: sendResult.simulated, message });
  } catch (error: any) {
    console.error('[Send Message Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
