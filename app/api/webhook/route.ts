import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { markWhatsAppMessageAsRead, sendWhatsAppTextMessage } from '@/lib/whatsapp';
import { triageMessage, generateAutoReply } from '@/lib/ai';
import { activeSettings } from '@/lib/settings-store';

/**
 * 1. GET /api/webhook
 * Meta Webhook Verification Challenge
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Built-in diagnostic test: /api/webhook?simulate=true
  if (searchParams.get('simulate') === 'true') {
    try {
      const supabase = getServiceSupabase();
      const testPhone = '2348161354532';

      let { data: contact, error: findErr } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', testPhone)
        .maybeSingle();

      if (findErr) {
        return NextResponse.json({ step: 'find_contact', error: findErr }, { status: 500 });
      }

      if (!contact) {
        const { data: newContact, error: createErr } = await supabase
          .from('contacts')
          .insert({ phone_number: testPhone, name: 'Test Customer', tags: ['Test'] })
          .select()
          .single();

        if (createErr) {
          return NextResponse.json({ step: 'create_contact', error: createErr }, { status: 500 });
        }
        contact = newContact;
      }

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          status: 'open',
          priority: 'normal',
          last_message_text: 'Hello! Testing live Supabase connection.',
          unread_count: 1,
        })
        .select()
        .single();

      if (convErr) {
        return NextResponse.json({ step: 'create_conversation', error: convErr }, { status: 500 });
      }

      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender_type: 'customer',
        text: 'Hello! Testing live Supabase connection.',
        status: 'delivered',
      });

      if (msgErr) {
        return NextResponse.json({ step: 'create_message', error: msgErr }, { status: 500 });
      }

      return NextResponse.json({ success: true, conversationId: conv.id });
    } catch (err: any) {
      return NextResponse.json({ step: 'exception', error: err.message }, { status: 500 });
    }
  }

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || activeSettings.verifyToken;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[Webhook] Verification failed');
  return new Response('Forbidden', { status: 403 });
}

/**
 * 2. POST /api/webhook
 * Incoming WhatsApp Messages & Status Updates from Meta
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Webhook POST] Received payload:', JSON.stringify(body));

    const supabase = getServiceSupabase();

    // Support Meta Production format, Meta Test payload with entry[], and direct field/value format
    const value =
      body.entry?.[0]?.changes?.[0]?.value ||
      (body.field === 'messages' ? body.value : null);

    if (!value) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Handle delivery/read status updates
    if (value?.statuses && value.statuses.length > 0) {
      const statusUpdate = value.statuses[0];
      const messageId = statusUpdate.id;
      const newStatus = statusUpdate.status; // 'sent' | 'delivered' | 'read'

      if (['sent', 'delivered', 'read'].includes(newStatus)) {
        await supabase
          .from('messages')
          .update({ status: newStatus })
          .eq('whatsapp_message_id', messageId);
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Handle incoming messages
    if (value?.messages && value.messages.length > 0) {
      const incoming = value.messages[0];
      const contactInfo = value.contacts?.[0];

      const fromPhone = incoming.from; // Customer phone number
      const customerName = contactInfo?.profile?.name || `Customer +${fromPhone}`;
      const messageId = incoming.id;
      const messageType = incoming.type;
      const incomingPhoneNumberId = value.metadata?.phone_number_id;

      // Multi-Business Resolution: look up which business owns this Phone Number ID
      let resolvedBusinessId: string | null = null;
      let resolvedBusiness: {
        id: string;
        name: string;
        ai_context?: string;
        whatsapp_phone_number_id?: string;
        whatsapp_access_token?: string;
      } | null = null;

      if (incomingPhoneNumberId) {
        try {
          const { data: biz } = await supabase
            .from('businesses')
            .select('id, name, ai_context, whatsapp_phone_number_id, whatsapp_access_token')
            .eq('whatsapp_phone_number_id', incomingPhoneNumberId)
            .maybeSingle();
          if (biz?.id) {
            resolvedBusinessId = biz.id;
            resolvedBusiness = biz;
          }
        } catch {
          // Graceful fallback if businesses table hasn't been migrated yet
        }
      }

      let messageText = '';
      let inboundMediaType: string | null = null;
      let inboundMediaUrl: string | null = null;

      const buildMediaProxyUrl = (mediaId?: string, filename?: string) => {
        if (!mediaId) return null;
        const params = new URLSearchParams();
        if (resolvedBusinessId) params.set('businessId', resolvedBusinessId);
        if (filename) params.set('filename', filename);
        const qs = params.toString();
        return `/api/media/${mediaId}${qs ? `?${qs}` : ''}`;
      };

      if (messageType === 'text') {
        messageText = incoming.text?.body || '';
      } else if (messageType === 'image') {
        inboundMediaType = 'image';
        inboundMediaUrl = buildMediaProxyUrl(incoming.image?.id);
        messageText = incoming.image?.caption || '📷 Photo';
      } else if (messageType === 'video') {
        inboundMediaType = 'video';
        inboundMediaUrl = buildMediaProxyUrl(incoming.video?.id);
        messageText = incoming.video?.caption || '🎥 Video';
      } else if (messageType === 'audio') {
        inboundMediaType = 'audio';
        inboundMediaUrl = buildMediaProxyUrl(incoming.audio?.id);
        messageText = '🎤 Voice message';
      } else if (messageType === 'document') {
        inboundMediaType = 'document';
        const docName = incoming.document?.filename || 'Document';
        inboundMediaUrl = buildMediaProxyUrl(incoming.document?.id, docName);
        messageText = incoming.document?.caption ? `${docName} — ${incoming.document.caption}` : `📄 ${docName}`;
      } else {
        messageText = `[${messageType} message]`;
      }

      // Step A: Find or create the Contact (scoped to business if resolved)
      let contactQuery = supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', fromPhone);
      if (resolvedBusinessId) {
        contactQuery = contactQuery.eq('business_id', resolvedBusinessId);
      }
      let { data: contact } = await contactQuery.maybeSingle();

      if (!contact) {
        const contactPayload: Record<string, any> = {
          phone_number: fromPhone,
          name: customerName,
          tags: ['New Customer'],
        };
        if (resolvedBusinessId) contactPayload.business_id = resolvedBusinessId;

        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert(contactPayload)
          .select()
          .single();

        if (contactErr) console.error('Error creating contact:', contactErr);
        contact = newContact;
      }

      if (!contact) {
        return NextResponse.json({ error: 'Failed to resolve contact' }, { status: 500 });
      }

      // Step B: Find or create Open/Pending Conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contact.id)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!conversation) {
        // Triage message using AI to determine priority and initial category
        let triage: { priority: 'normal' | 'urgent'; tags: string[] } = { priority: 'normal', tags: ['Support'] };
        try {
          if (messageText) triage = await triageMessage(messageText);
        } catch (e) {
          console.warn('Triage failed:', e);
        }

        const convPayload: Record<string, any> = {
          contact_id: contact.id,
          status: 'open',
          priority: triage.priority,
          last_message_text: messageText,
          unread_count: 1,
        };
        if (resolvedBusinessId) convPayload.business_id = resolvedBusinessId;

        const { data: newConv } = await supabase
          .from('conversations')
          .insert(convPayload)
          .select()
          .single();

        conversation = newConv;
      }

      if (conversation) {
        // Step C: Insert incoming message
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          text: messageText,
          media_type: inboundMediaType,
          media_url: inboundMediaUrl,
          status: 'delivered',
          whatsapp_message_id: messageId,
        });

        // Mark incoming WhatsApp message as read/acknowledged
        await markWhatsAppMessageAsRead(messageId);

        // Step D: 24/7 AI Auto-Responder (runs only on unassigned, non-escalated text chats when enabled)
        const autoReplyOn =
          process.env.AI_AUTO_REPLY_ENABLED === 'true' || activeSettings.autoReplyEnabled;
        const isUnassigned = !conversation.assigned_agent_id && !conversation.assigned_agent_key;

        if (autoReplyOn && isUnassigned && conversation.priority !== 'urgent' && messageType === 'text' && messageText) {
          try {
            const { data: recentMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: true })
              .limit(10);

            const { reply, shouldHandoff } = await generateAutoReply({
              latestMessage: messageText,
              history: (recentMsgs || []) as any[],
              contactName: customerName,
              businessName: resolvedBusiness?.name,
              businessContext: resolvedBusiness?.ai_context,
              welcomeFallback: activeSettings.autoReplyMessage || undefined,
            });

            if (reply) {
              const sendRes = await sendWhatsAppTextMessage(
                fromPhone,
                reply,
                resolvedBusiness?.whatsapp_phone_number_id || incomingPhoneNumberId,
                resolvedBusiness?.whatsapp_access_token
              );

              await supabase.from('messages').insert({
                conversation_id: conversation.id,
                sender_type: 'bot',
                text: reply,
                status: sendRes.simulated ? 'delivered' : 'sent',
                whatsapp_message_id: sendRes.messageId || null,
              });

              if (shouldHandoff) {
                await supabase
                  .from('conversations')
                  .update({ priority: 'urgent', last_message_text: reply })
                  .eq('id', conversation.id);
              }
            }
          } catch (botErr) {
            console.warn('[AI Auto-Responder Error]', botErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
