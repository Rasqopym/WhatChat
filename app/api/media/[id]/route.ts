import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { activeSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mediaId = params.id;
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing media ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const filename = searchParams.get('filename');

    // Resolve access token (per-business if provided, else default)
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;
    if (businessId) {
      try {
        const supabase = getServiceSupabase();
        const { data: biz } = await supabase
          .from('businesses')
          .select('whatsapp_access_token')
          .eq('id', businessId)
          .maybeSingle();
        if (biz?.whatsapp_access_token) {
          accessToken = biz.whatsapp_access_token;
        }
      } catch {
        // Fallback to default token
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'WhatsApp Access Token not configured' }, { status: 500 });
    }

    // 1. Fetch temporary download URL from Meta Graph API
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error?.message || 'Failed to resolve media URL from Meta' },
        { status: metaRes.status }
      );
    }

    const metaInfo = await metaRes.json();
    if (!metaInfo.url) {
      return NextResponse.json({ error: 'No media URL returned by Meta' }, { status: 404 });
    }

    // 2. Download the actual media binary from Meta (requires Bearer token)
    const fileRes = await fetch(metaInfo.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to download media binary' }, { status: fileRes.status });
    }

    const contentType = metaInfo.mime_type || fileRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await fileRes.arrayBuffer();

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=86400',
    };

    if (filename) {
      headers['Content-Disposition'] = `inline; filename="${filename.replace(/"/g, '')}"`;
    }

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error: any) {
    console.error('[Media Proxy Error]', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
