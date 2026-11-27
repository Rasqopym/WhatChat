import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendWhatsAppReactionMessage } from '@/lib/whatsapp';

export async function POST(req: NextRequest) {
  try {
    const { conversationId, whatsappMessageId, emoji } = await req.json();

    if (!conversationId || !emoji) {
      return NextResponse.json({ error: 'conversationId and emoji are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
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
      } catch {}
    }

    if (whatsappMessageId) {
      await sendWhatsAppReactionMessage({
        to: recipientPhone,
        messageId: whatsappMessageId,
        emoji,
        overridePhoneNumberId: bizPhoneId,
        overrideAccessToken: bizToken,
      });
    }

    return NextResponse.json({ success: true, simulated: !whatsappMessageId });
  } catch (err: any) {
    console.error('[Reaction Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to send reaction' }, { status: 500 });
  }
}
