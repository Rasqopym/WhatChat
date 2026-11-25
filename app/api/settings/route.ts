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

    // Also update process.env dynamically for the current node process
    if (data.phoneNumberId) process.env.WHATSAPP_PHONE_NUMBER_ID = data.phoneNumberId;
    if (data.accessToken) process.env.WHATSAPP_ACCESS_TOKEN = data.accessToken;
    if (data.verifyToken) process.env.WHATSAPP_VERIFY_TOKEN = data.verifyToken;
    if (data.geminiApiKey) process.env.GEMINI_API_KEY = data.geminiApiKey;

    return NextResponse.json({ success: true, message: 'Settings saved and activated successfully!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
