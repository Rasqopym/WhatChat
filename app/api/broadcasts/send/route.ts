import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { sendWhatsAppTemplateMessage } from '@/lib/whatsapp';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const {
      businessId,
      targetTag,
      templateName,
      languageCode,
      bodyParams,
      previewText,
      agentId,
      fallbackRecipients,
    } = await req.json();

    if (!templateName) {
      return NextResponse.json({ error: 'templateName is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const validBizId = businessId && businessId !== 'all' && UUID_REGEX.test(businessId) ? businessId : null;

    // 1. Resolve per-business WhatsApp credentials if applicable
    let bizPhoneId: string | null = null;
    let bizToken: string | null = null;
    if (validBizId) {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('whatsapp_phone_number_id, whatsapp_access_token')
          .eq('id', validBizId)
          .maybeSingle();
        if (biz) {
          bizPhoneId = biz.whatsapp_phone_number_id;
          bizToken = biz.whatsapp_access_token;
        }
      } catch {}
    }

    // 2. Fetch matching contacts from Supabase
    let contactsQuery = supabase.from('contacts').select('*');
    if (validBizId) {
      contactsQuery = contactsQuery.eq('business_id', validBizId);
    }
    if (targetTag && targetTag !== 'ALL') {
      contactsQuery = contactsQuery.contains('tags', [targetTag]);
    }

    const { data: dbContacts } = await contactsQuery;

    // Deduplicate by phone number
    const uniqueRecipients = new Map<string, { id?: string; phone: string; name: string }>();
    (dbContacts || []).forEach((c: any) => {
      const cleanPhone = (c.phone_number || '').replace(/\+/g, '').replace(/\s+/g, '');
      if (cleanPhone && !uniqueRecipients.has(cleanPhone)) {
        uniqueRecipients.set(cleanPhone, { id: c.id, phone: cleanPhone, name: c.name || cleanPhone });
      }
    });

    // Include any fallback recipients passed if DB had none (e.g. demo contacts)
    if (uniqueRecipients.size === 0 && Array.isArray(fallbackRecipients)) {
      fallbackRecipients.forEach((r: any) => {
        const cleanPhone = (r.phone || '').replace(/\+/g, '').replace(/\s+/g, '');
        if (cleanPhone && !uniqueRecipients.has(cleanPhone)) {
          uniqueRecipients.set(cleanPhone, { phone: cleanPhone, name: r.name || cleanPhone });
        }
      });
    }

    const recipients = Array.from(uniqueRecipients.values());
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No contacts matched the selected business and label.' }, { status: 400 });
    }

    // 3. Dispatch template to each recipient sequentially
    const validSenderId = agentId && UUID_REGEX.test(agentId) ? agentId : null;
    const storedText = previewText || `📢 Broadcast Template: ${templateName}`;
    const results: Array<{ phone: string; name: string; status: 'sent' | 'failed'; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const sendResult = await sendWhatsAppTemplateMessage({
          to: recipient.phone,
          templateName,
          languageCode: languageCode || 'en_US',
          bodyParams: Array.isArray(bodyParams) ? bodyParams : [],
          overridePhoneNumberId: bizPhoneId,
          overrideAccessToken: bizToken,
        });

        // Log inside Supabase conversation if this contact exists in DB
        if (recipient.id && UUID_REGEX.test(recipient.id)) {
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('contact_id', recipient.id)
            .neq('status', 'closed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingConv?.id) {
            await supabase.from('messages').insert({
              conversation_id: existingConv.id,
              sender_type: 'agent',
              sender_id: validSenderId,
              text: storedText,
              status: sendResult.simulated ? 'delivered' : 'sent',
              whatsapp_message_id: sendResult.messageId || null,
            });

            await supabase
              .from('conversations')
              .update({
                last_message_text: storedText,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', existingConv.id);
          }
        }

        results.push({ phone: recipient.phone, name: recipient.name, status: 'sent' });
      } catch (err: any) {
        results.push({ phone: recipient.phone, name: recipient.name, status: 'failed', error: err.message });
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sentCount,
      failedCount,
      results,
    });
  } catch (err: any) {
    console.error('[Broadcast Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
