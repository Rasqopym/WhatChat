import { NextRequest, NextResponse } from 'next/server';
import { activeSettings } from '@/lib/settings-store';

export async function GET() {
  return NextResponse.json({
    phoneNumberId: activeSettings.phoneNumberId,
    verifyToken: activeSettings.verifyToken,
    hasAccessToken: !!activeSettings.accessToken,
    hasGeminiKey: !!activeSettings.geminiApiKey,
  });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (data.phoneNumberId) activeSettings.phoneNumberId = data.phoneNumberId;
    if (data.accessToken) activeSettings.accessToken = data.accessToken;
    if (data.verifyToken) activeSettings.verifyToken = data.verifyToken;
    if (data.geminiApiKey) activeSettings.geminiApiKey = data.geminiApiKey;
    if (typeof data.autoReplyEnabled === 'boolean') activeSettings.autoReplyEnabled = data.autoReplyEnabled;
    if (typeof data.autoReplyMessage === 'string') activeSettings.autoReplyMessage = data.autoReplyMessage;
    if (typeof data.autoAssignEnabled === 'boolean') activeSettings.autoAssignEnabled = data.autoAssignEnabled;

    // Also update process.env dynamically for the current node process
    if (data.phoneNumberId) process.env.WHATSAPP_PHONE_NUMBER_ID = data.phoneNumberId;
    if (data.accessToken) process.env.WHATSAPP_ACCESS_TOKEN = data.accessToken;
    if (data.verifyToken) process.env.WHATSAPP_VERIFY_TOKEN = data.verifyToken;
    if (data.geminiApiKey) process.env.GEMINI_API_KEY = data.geminiApiKey;
    if (typeof data.autoReplyEnabled === 'boolean') {
      process.env.AI_AUTO_REPLY_ENABLED = data.autoReplyEnabled ? 'true' : 'false';
    }
    if (typeof data.autoAssignEnabled === 'boolean') {
      process.env.AUTO_ASSIGN_ENABLED = data.autoAssignEnabled ? 'true' : 'false';
    }

    return NextResponse.json({ success: true, message: 'Settings saved and activated successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
