import { NextRequest, NextResponse } from 'next/server';
import { summarizeConversation } from '@/lib/ai';
import { Message } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json();

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Valid message history required' }, { status: 400 });
    }

    const summary = await summarizeConversation(history as Message[]);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('[AI Summary Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to generate summary' }, { status: 500 });
  }
}
