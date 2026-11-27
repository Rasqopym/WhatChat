import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { businessId, contacts, defaultTag } = await req.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts provided for import.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const validBizId = businessId && businessId !== 'all' && UUID_REGEX.test(businessId) ? businessId : null;
    const extraTag = typeof defaultTag === 'string' && defaultTag.trim() ? defaultTag.trim() : null;

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const item of contacts) {
      const rawPhone = String(item?.phone || '').replace(/[^\d]/g, '');
      if (rawPhone.length < 7) {
        skippedCount += 1;
        continue;
      }

      const cleanName = String(item?.name || '').trim() || `Customer +${rawPhone}`;
      const rowTags = Array.isArray(item?.tags)
        ? item.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : [];
      const mergedIncomingTags = Array.from(
        new Set([...(extraTag ? [extraTag] : []), ...rowTags])
      );

      let query = supabase.from('contacts').select('*').eq('phone_number', rawPhone);
      if (validBizId) query = query.eq('business_id', validBizId);
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const nextTags = Array.from(
          new Set([...(existing.tags || []), ...(mergedIncomingTags.length > 0 ? mergedIncomingTags : [])])
        );
        const updatePayload: Record<string, any> = { tags: nextTags };
        if (item?.name && String(item.name).trim()) {
          updatePayload.name = String(item.name).trim();
        }
        await supabase.from('contacts').update(updatePayload).eq('id', existing.id);
        updatedCount += 1;
      } else {
        const contactPayload: Record<string, any> = {
          phone_number: rawPhone,
          name: cleanName,
          tags: mergedIncomingTags.length > 0 ? mergedIncomingTags : ['Imported'],
        };
        if (validBizId) contactPayload.business_id = validBizId;

        const { data: newContact, error: contactErr } = await supabase
          .from('contacts')
          .insert(contactPayload)
          .select()
          .single();

        if (contactErr || !newContact) {
          skippedCount += 1;
          continue;
        }

        const convPayload: Record<string, any> = {
          contact_id: newContact.id,
          status: 'open',
          priority: 'normal',
          last_message_text: 'Imported via CSV',
          unread_count: 0,
        };
        if (validBizId) convPayload.business_id = validBizId;

        await supabase.from('conversations').insert(convPayload);
        importedCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      updatedCount,
      skippedCount,
    });
  } catch (err: any) {
    console.error('[CSV Import Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
