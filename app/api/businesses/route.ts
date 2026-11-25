import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name, display_phone_number, whatsapp_phone_number_id, brand_color, ai_context, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ businesses: [], error: error.message }, { status: 200 });
    }
    return NextResponse.json({ businesses: data || [] });
  } catch (err: any) {
    return NextResponse.json({ businesses: [], error: err.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, display_phone_number, whatsapp_phone_number_id, whatsapp_access_token, brand_color, ai_context } = body;

    if (!name || !whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'Business name and Phone Number ID are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        name,
        display_phone_number: display_phone_number || '',
        whatsapp_phone_number_id,
        whatsapp_access_token: whatsapp_access_token || null,
        brand_color: brand_color || '#128C7E',
        ai_context: ai_context || '',
      })
      .select('id, name, display_phone_number, whatsapp_phone_number_id, brand_color, ai_context, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, business: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, display_phone_number, whatsapp_phone_number_id, whatsapp_access_token, brand_color, ai_context } = body;

    if (!id || !name || !whatsapp_phone_number_id) {
      return NextResponse.json({ error: 'Business ID, name, and Phone Number ID are required' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      name,
      display_phone_number: display_phone_number || '',
      whatsapp_phone_number_id,
      brand_color: brand_color || '#128C7E',
      ai_context: ai_context || '',
      updated_at: new Date().toISOString(),
    };

    if (whatsapp_access_token) {
      updatePayload.whatsapp_access_token = whatsapp_access_token;
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('businesses')
      .update(updatePayload)
      .eq('id', id)
      .select('id, name, display_phone_number, whatsapp_phone_number_id, brand_color, ai_context, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, business: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
