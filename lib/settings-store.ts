// Server-side in-memory active credentials & bot settings
export const activeSettings = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'team_whatsapp_secret_2026',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  autoReplyEnabled: process.env.AI_AUTO_REPLY_ENABLED === 'true',
  autoReplyMessage: '',
  autoAssignEnabled: process.env.AUTO_ASSIGN_ENABLED === 'true',
};
