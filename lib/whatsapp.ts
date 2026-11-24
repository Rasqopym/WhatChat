/**
 * Meta WhatsApp Cloud API Helper
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

import { activeSettings } from '@/app/api/settings/route';

export async function sendWhatsAppTextMessage(to: string, message: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || activeSettings?.phoneNumberId;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp API] Credentials not configured in .env. Skipping external send.');
    return { success: true, simulated: true };
  }

  // Format phone number to clean E.164 without '+'
  const formattedTo = to.replace(/\+/g, '').replace(/\s+/g, '');

  const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedTo,
      type: 'text',
      text: { preview_url: false, body: message },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[WhatsApp API Error]', data);
    throw new Error(data.error?.message || 'Failed to send WhatsApp message');
  }

  return { success: true, messageId: data.messages?.[0]?.id };
}

export async function markWhatsAppMessageAsRead(messageId: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || activeSettings?.phoneNumberId;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;

  if (!phoneNumberId || !accessToken) return;

  try {
    await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (error) {
    console.error('Failed to mark message as read:', error);
  }
}
