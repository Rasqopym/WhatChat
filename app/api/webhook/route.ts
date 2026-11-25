import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { markWhatsAppMessageAsRead } from '@/lib/whatsapp';
import { triageMessage } from '@/lib/ai';
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

      let messageText = '';
      if (messageType === 'text') {
        messageText = incoming.text?.body || '';
      } else if (messageType === 'image') {
        messageText = incoming.image?.caption || '[Image received]';
      } else if (messageType === 'audio') {
        messageText = '[Voice note received]';
      } else if (messageType === 'document') {
        messageText = incoming.document?.filename ? `[Document: ${incoming.document.filename}]` : '[Document received]';
      } else {
        messageText = `[${messageType} message]`;
      }

      // Step A: Find or create the Contact
      let { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', fromPhone)
        .single();

      if (!contact) {
        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert({
            phone_number: fromPhone,
            name: customerName,
            tags: ['New Customer'],
          })
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

        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            contact_id: contact.id,
            status: 'open',
            priority: triage.priority,
            last_message_text: messageText,
            unread_count: 1,
          })
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
          status: 'delivered',
          whatsapp_message_id: messageId,
        });

        // Mark incoming WhatsApp message as read/acknowledged
        await markWhatsAppMessageAsRead(messageId);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
