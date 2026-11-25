// Server-side in-memory active credentials
export const activeSettings = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'team_whatsapp_secret_2026',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
