import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const {
      conversationId,
      phoneNumber,
      customerName,
      businessId,
      templateName,
      languageCode,
      bodyParams,
      headerMediaType,
      headerMediaUrl,
      previewText,
      agentId,
    } = await req.json();

    if (!templateName || (!conversationId && !phoneNumber)) {
      return NextResponse.json(
        { error: 'templateName and either conversationId or phoneNumber are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    let targetConvId = conversationId;
    let recipientPhone = phoneNumber ? phoneNumber.replace(/\+/g, '').replace(/\s+/g, '') : '';
    let targetBusinessId = businessId || null;

    // If starting a brand-new chat by phone number
    if (!targetConvId && recipientPhone) {
      const validBizId = targetBusinessId && UUID_REGEX.test(targetBusinessId) ? targetBusinessId : null;

      let contactQuery = supabase.from('contacts').select('*').eq('phone_number', recipientPhone);
      if (validBizId) contactQuery = contactQuery.eq('business_id', validBizId);
      let { data: contact } = await contactQuery.maybeSingle();

      if (!contact) {
        const contactPayload: Record<string, any> = {
          phone_number: recipientPhone,
          name: customerName?.trim() || `Customer +${recipientPhone}`,
          tags: ['Outbound'],
        };
        if (validBizId) contactPayload.business_id = validBizId;

        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert(contactPayload)
          .select()
          .single();

        if (contactErr) {
          return NextResponse.json({ error: contactErr.message }, { status: 500 });
        }
        contact = newContact;
      }

      // Find open conversation or create one
      let { data: existingConv } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingConv) {
        const convPayload: Record<string, any> = {
          contact_id: contact.id,
          status: 'open',
          priority: 'normal',
          last_message_text: `Template: ${templateName}`,
          unread_count: 0,
        };
        if (validBizId) convPayload.business_id = validBizId;

        const { data: newConv, error: convErr } = await supabase
          .from('conversations')
          .insert(convPayload)
          .select()
          .single();

        if (convErr) {
          return NextResponse.json({ error: convErr.message }, { status: 500 });
        }
        existingConv = newConv;
      }

      targetConvId = existingConv.id;
      targetBusinessId = existingConv.business_id || validBizId;
    } else if (targetConvId) {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('*, contact:contacts(*)')
        .eq('id', targetConvId)
        .single();

      if (convErr || !conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      recipientPhone = conv.contact?.phone_number || '';
      targetBusinessId = conv.business_id;
    }

    if (!recipientPhone) {
      return NextResponse.json({ error: 'Recipient phone number is missing' }, { status: 400 });
    }

    // Resolve per-business WhatsApp credentials if applicable
    let bizPhoneId: string | null = null;
    let bizToken: string | null = null;
    if (targetBusinessId && UUID_REGEX.test(targetBusinessId)) {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('whatsapp_phone_number_id, whatsapp_access_token')
          .eq('id', targetBusinessId)
          .maybeSingle();
        if (biz) {
          bizPhoneId = biz.whatsapp_phone_number_id;
          bizToken = biz.whatsapp_access_token;
        }
      } catch {}
    }

    // Send Template via Meta Cloud API
    const sendResult = await sendWhatsAppTemplateMessage({
      to: recipientPhone,
      templateName,
      languageCode: languageCode || 'en_US',
      bodyParams: Array.isArray(bodyParams) ? bodyParams : [],
      headerMediaType,
      headerMediaUrl,
      overridePhoneNumberId: bizPhoneId,
      overrideAccessToken: bizToken,
    });

    const validSenderId = agentId && UUID_REGEX.test(agentId) ? agentId : null;
    const storedText = previewText || `Template: ${templateName}`;

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: targetConvId,
        sender_type: 'agent',
        sender_id: validSenderId,
        text: storedText,
        status: sendResult.simulated ? 'delivered' : 'sent',
        whatsapp_message_id: sendResult.messageId || null,
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    await supabase
      .from('conversations')
      .update({
        last_message_text: storedText,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq('id', targetConvId);

    return NextResponse.json({
      success: true,
      conversationId: targetConvId,
      message,
    });
  } catch (err: any) {
    console.error('[Send Template Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
