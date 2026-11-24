import { NextRequest, NextResponse } from 'next/server';
import { draftReply } from '@/lib/ai';
import { Message } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { history, contactName, businessContext } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Valid message history required' }, { status: 400 });
    }

    const draft = await draftReply(history as Message[], contactName, businessContext);

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error('[AI Draft Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to generate draft' }, { status: 500 });
  }
}
