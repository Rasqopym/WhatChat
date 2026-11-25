/**
 * Meta WhatsApp Cloud API Helper
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

import { activeSettings } from '@/lib/settings-store';

export async function sendWhatsAppTextMessage(
  to: string,
  message: string,
  overridePhoneNumberId?: string | null,
  overrideAccessToken?: string | null
) {
  const phoneNumberId = overridePhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || activeSettings?.phoneNumberId;
  const accessToken = overrideAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;

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

export async function sendWhatsAppMediaMessage(params: {
  to: string;
  base64Data: string;
  mimeType: string;
  mediaType: 'image' | 'document' | 'audio' | 'video';
  caption?: string;
  filename?: string;
  overridePhoneNumberId?: string | null;
  overrideAccessToken?: string | null;
}) {
  const phoneNumberId = params.overridePhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || activeSettings?.phoneNumberId;
  const accessToken = params.overrideAccessToken || process.env.WHATSAPP_ACCESS_TOKEN || activeSettings?.accessToken;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp Media API] Credentials not configured. Skipping external send.');
    return { success: true, simulated: true };
  }

  // 1. Upload media binary to Meta Media endpoint
  const buffer = Buffer.from(params.base64Data, 'base64');
  const blob = new Blob([buffer], { type: params.mimeType });
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', params.mimeType);
  formData.append('file', blob, params.filename || `upload.${params.mimeType.split('/')[1] || 'bin'}`);

  const uploadRes = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.id) {
    console.error('[WhatsApp Media Upload Error]', uploadData);
    throw new Error(uploadData.error?.message || 'Failed to upload media to WhatsApp');
  }

  // 2. Send the media message using the uploaded Media ID
  const formattedTo = params.to.replace(/\+/g, '').replace(/\s+/g, '');
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: params.mediaType,
  };

  if (params.mediaType === 'image') {
    payload.image = { id: uploadData.id };
    if (params.caption) payload.image.caption = params.caption;
  } else if (params.mediaType === 'video') {
    payload.video = { id: uploadData.id };
    if (params.caption) payload.video.caption = params.caption;
  } else if (params.mediaType === 'document') {
    payload.document = { id: uploadData.id, filename: params.filename || 'document' };
    if (params.caption) payload.document.caption = params.caption;
  } else if (params.mediaType === 'audio') {
    payload.audio = { id: uploadData.id };
  }

  const msgRes = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const msgData = await msgRes.json();
  if (!msgRes.ok) {
    console.error('[WhatsApp Media Send Error]', msgData);
    throw new Error(msgData.error?.message || 'Failed to send WhatsApp media message');
  }

  return { success: true, messageId: msgData.messages?.[0]?.id };
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
