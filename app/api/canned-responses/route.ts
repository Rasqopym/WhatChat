import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { CANNED_RESPONSES } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function normalizeShortcut(raw: string): string {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '-');
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('canned_responses')
      .select('id, business_id, shortcut, title, content, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({
        cannedResponses: CANNED_RESPONSES,
        source: 'default',
        warning: error.message,
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ cannedResponses: CANNED_RESPONSES, source: 'default' });
    }

    return NextResponse.json({ cannedResponses: data, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({
      cannedResponses: CANNED_RESPONSES,
      source: 'default',
      warning: err?.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { shortcut, title, content, business_id } = await req.json();

    if (!shortcut?.trim() || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Shortcut, title, and message content are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('canned_responses')
      .insert({
        shortcut: normalizeShortcut(shortcut),
        title: title.trim(),
        content: content.trim(),
        business_id: business_id || null,
      })
      .select('id, business_id, shortcut, title, content, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cannedResponse: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, shortcut, title, content, business_id } = await req.json();

    if (!id || !shortcut?.trim() || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'ID, shortcut, title, and content are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('canned_responses')
      .update({
        shortcut: normalizeShortcut(shortcut),
        title: title.trim(),
        content: content.trim(),
        business_id: business_id || null,
      })
      .eq('id', id)
      .select('id, business_id, shortcut, title, content, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, cannedResponse: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Canned response ID is required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('canned_responses').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
