import { NextRequest, NextResponse } from 'next/server';
import { activeSettings } from '@/lib/settings-store';

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
    bodyText: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta.',
  },
];

export async function GET(req: NextRequest) {
  try {
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;

    if (!wabaId || !accessToken) {
      return NextResponse.json({ templates: FALLBACK_TEMPLATES, source: 'default' });
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/message_templates?status=APPROVED&limit=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ templates: FALLBACK_TEMPLATES, source: 'fallback' });
    }

    const data = await res.json();
    const mapped: WhatsAppTemplateItem[] = (data.data || []).map((t: any) => {
      const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
      return {
        name: t.name,
        language: t.language || 'en_US',
        category: t.category || 'UTILITY',
        bodyText: bodyComp?.text || `Template: ${t.name}`,
      };
    });

    return NextResponse.json({
      templates: mapped.length > 0 ? mapped : FALLBACK_TEMPLATES,
      source: 'meta',
    });
  } catch {
    return NextResponse.json({ templates: FALLBACK_TEMPLATES, source: 'fallback' });
  }
}
