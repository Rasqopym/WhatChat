import { NextRequest, NextResponse } from 'next/server';
import { activeSettings } from '@/lib/settings-store';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface WhatsAppTemplateItem {
  name: string;
  language: string;
  category: string;
  bodyText: string;
}

const FALLBACK_TEMPLATES: WhatsAppTemplateItem[] = [
  {
    name: 'hello_world',
    language: 'en_US',
    category: 'UTILITY',
    bodyText:
      'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta.',
  },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Auto-discover WhatsApp Business Account (WABA) IDs from a Meta access token
 * when WHATSAPP_BUSINESS_ACCOUNT_ID is not explicitly configured.
 */
async function discoverWabaIds(accessToken: string, targetPhoneNumberId?: string | null): Promise<string[]> {
  const discovered: string[] = [];

  // 1. Check debug_token granular_scopes (works for System User & Business tokens)
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`
    );
    if (debugRes.ok) {
      const debugData = await debugRes.json();
      const scopes: any[] = debugData?.data?.granular_scopes || [];
      for (const s of scopes) {
        if (
          (s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging') &&
          Array.isArray(s.target_ids)
        ) {
          for (const id of s.target_ids) {
            if (id && !discovered.includes(String(id))) {
              discovered.push(String(id));
            }
          }
        }
      }
    }
  } catch {
    // Ignore and try next discovery method
  }

  // 2. Fallback: query me/businesses?fields=owned_whatsapp_business_accounts{id}
  if (discovered.length === 0) {
    try {
      const bizRes = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?fields=owned_whatsapp_business_accounts{id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (bizRes.ok) {
        const bizData = await bizRes.json();
        for (const biz of bizData?.data || []) {
          for (const waba of biz?.owned_whatsapp_business_accounts?.data || []) {
            if (waba?.id && !discovered.includes(String(waba.id))) {
              discovered.push(String(waba.id));
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // If we have multiple WABAs and a specific phoneNumberId, prioritize the WABA that owns that phone number
  if (discovered.length > 1 && targetPhoneNumberId) {
    for (const wabaId of discovered) {
      try {
        const pnRes = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (pnRes.ok) {
          const pnData = await pnRes.json();
          const ownsPhone = (pnData?.data || []).some((p: any) => String(p.id) === String(targetPhoneNumberId));
          if (ownsPhone) {
            return [wabaId];
          }
        }
      } catch {
        // Continue checking
      }
    }
  }

  return discovered;
}

export async function GET(req: NextRequest) {
  try {
    const businessId = req.nextUrl.searchParams.get('businessId');

    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken || '';
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || activeSettings?.phoneNumberId || '';

    // Resolve business-specific token & phoneNumberId from Supabase if provided
    if (businessId && businessId !== 'all' && UUID_REGEX.test(businessId)) {
      try {
        const supabase = getServiceSupabase();
        const { data: biz } = await supabase
          .from('businesses')
          .select('whatsapp_phone_number_id, whatsapp_access_token')
          .eq('id', businessId)
          .maybeSingle();

        if (biz?.whatsapp_phone_number_id) phoneNumberId = biz.whatsapp_phone_number_id;
        if (biz?.whatsapp_access_token) accessToken = biz.whatsapp_access_token;
      } catch {
        // Fallback to default credentials
      }
    }

    if (!accessToken || accessToken === 'EAAG...sample_token') {
      return NextResponse.json({
        templates: FALLBACK_TEMPLATES,
        source: 'default',
        warning: 'WhatsApp Access Token is not configured.',
      });
    }

    const explicitWabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const wabaIds = explicitWabaId
      ? [explicitWabaId]
      : await discoverWabaIds(accessToken, phoneNumberId);

    if (wabaIds.length === 0) {
      return NextResponse.json({
        templates: FALLBACK_TEMPLATES,
        source: 'fallback',
        warning:
          'Could not auto-detect your WhatsApp Business Account ID (WABA ID). Add WHATSAPP_BUSINESS_ACCOUNT_ID in Vercel Environment Variables to sync all approved templates.',
      });
    }

    const allMapped: WhatsAppTemplateItem[] = [];
    const seenKeys = new Set<string>();
    let lastError = '';

    for (const wabaId of wabaIds) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        lastError = data?.error?.message || `Meta API HTTP ${res.status}`;
        continue;
      }

      for (const t of data?.data || []) {
        const status = String(t.status || '').toUpperCase();
        if (status && status !== 'APPROVED') continue;

        const lang = t.language || 'en_US';
        const key = `${t.name}::${lang}`;
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);

        const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
        allMapped.push({
          name: t.name,
          language: lang,
          category: t.category || 'UTILITY',
          bodyText: bodyComp?.text || `Template: ${t.name}`,
        });
      }
    }

    if (allMapped.length === 0) {
      return NextResponse.json({
        templates: FALLBACK_TEMPLATES,
        source: 'fallback',
        warning: lastError || 'No approved templates returned from Meta.',
      });
    }

    return NextResponse.json({
      templates: allMapped,
      source: 'meta',
    });
  } catch (err: any) {
    return NextResponse.json({
      templates: FALLBACK_TEMPLATES,
      source: 'fallback',
      warning: err?.message || 'Failed to fetch templates from Meta.',
    });
  }
}
