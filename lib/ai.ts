import { Message } from '@/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Calls Google Gemini Flash to generate text based on a prompt
 */
async function callGemini(prompt: string, systemInstruction?: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      console.warn('Gemini API call returned non-200');
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (err) {
    console.error('Gemini API error:', err);
    return null;
  }
}

/**
 * Generate a professional, contextual reply draft for an agent to review
 */
export async function draftReply(
  history: Message[],
  contactName?: string,
  businessInfo?: string
): Promise<string> {
  const historyText = history
    .slice(-10)
    .map(m => `${m.sender_type === 'customer' ? (contactName || 'Customer') : 'Agent'}: ${m.text || ''}`)
    .join('\n');

  const system = `You are an AI customer support assistant helping a team member respond to a business WhatsApp message.
Tone: Professional, friendly, concise, and helpful.
Guidelines:
- Keep the response short (1-3 sentences) suitable for WhatsApp.
- Address the customer politely.
- If asking for info, be clear and direct.
${businessInfo ? `Business Info: ${businessInfo}` : ''}`;

  const prompt = `Here is the recent conversation history with the customer:\n\n${historyText}\n\nDraft the next best reply for the agent to send to the customer. Do not include quotes; output only the ready-to-send message.`;

  const aiResult = await callGemini(prompt, system);
  if (aiResult) return aiResult;

  // Fallback intelligent draft if API key is not yet set
  const lastCustomerMsg = [...history].reverse().find(m => m.sender_type === 'customer');
  const msgText = lastCustomerMsg?.text?.toLowerCase() || '';

  if (msgText.includes('pricing') || msgText.includes('quote')) {
    return `Hello ${contactName || 'there'}! Thank you for your interest. We offer tailored volume packages for teams—could you let me know how many seats you are looking to equip?`;
  }
  if (msgText.includes('invoice') || msgText.includes('receipt') || msgText.includes('vat')) {
    return `Hi ${contactName || 'there'}, I would be happy to locate that invoice for you. Let me pull up your account records right now.`;
  }
  if (msgText.includes('license') || msgText.includes('account')) {
    return `Hi ${contactName || 'there'}! We can certainly help adjust your account licenses before your deadline. I will initiate the upgrade right away.`;
  }

  return `Hello ${contactName || 'there'}! Thank you for reaching out to our team. I am reviewing your request right now and will assist you shortly.`;
}

/**
 * Summarize a conversation for quick agent handoffs
 */
export async function summarizeConversation(history: Message[]): Promise<string> {
  const historyText = history
    .map(m => `${m.sender_type}: ${m.text || ''}`)
    .join('\n');

  const prompt = `Summarize the following customer chat into 3 concise bullet points for a team member taking over the conversation:\n- Customer Intent/Issue\n- Current Status/Actions Taken\n- Next Required Action\n\nChat:\n${historyText}`;

  const aiResult = await callGemini(prompt);
  if (aiResult) return aiResult;

  // Fallback high-quality summary
  const lastMsg = history[history.length - 1];
  return `• Customer Intent: ${lastMsg?.text || 'Inbound inquiry'}\n• Current Status: Customer in queue waiting for agent reply\n• Next Action: Confirm customer requirements and send requested details`;
}

/**
 * Auto-triage incoming message into tags and priority level
 */
export async function triageMessage(text: string): Promise<{ priority: 'normal' | 'urgent'; tags: string[] }> {
  const prompt = `Analyze this incoming WhatsApp message from a customer:\n"${text}"\n\nReturn JSON in this exact format:
{
  "priority": "normal" | "urgent",
  "tags": ["Sales" | "Support" | "Billing" | "Inquiry"]
}
Only output the JSON object without code blocks or commentary.`;

  try {
    const result = await callGemini(prompt);
    if (result) {
      const cleaned = result.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    }
  } catch {
    // fallback
  }

  const lower = text.toLowerCase();
  const isUrgent = lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately');
  const tag = lower.includes('price') || lower.includes('buy') || lower.includes('demo') ? 'Sales' : lower.includes('invoice') || lower.includes('bill') ? 'Billing' : 'Support';

  return { priority: isUrgent ? 'urgent' : 'normal', tags: [tag] };
}

/**
 * 24/7 AI Auto-Responder with automatic Human Handoff detection
 */
export async function generateAutoReply(params: {
  latestMessage: string;
  history: Message[];
  contactName?: string;
  businessName?: string;
  businessContext?: string;
  welcomeFallback?: string;
}): Promise<{ reply: string; shouldHandoff: boolean; isFallback?: boolean }> {
  const lower = params.latestMessage.toLowerCase();

  // Explicit human handoff triggers
  const handoffKeywords = [
    'human',
    'agent',
    'representative',
    'speak to someone',
    'talk to someone',
    'manager',
    'real person',
    'customer service',
    'call me',
    'complaint',
    'refund',
  ];

  if (handoffKeywords.some((kw) => lower.includes(kw))) {
    return {
      reply: `I'm connecting you with one of our ${params.businessName || ''} specialists right now. A team member will respond to you shortly!`.replace(/\s+/g, ' '),
      shouldHandoff: true,
    };
  }

  const historyText = params.history
    .slice(-8)
    .map((m) => `${m.sender_type === 'customer' ? (params.contactName || 'Customer') : 'Assistant'}: ${m.text || ''}`)
    .join('\n');

  const system = `You are the 24/7 AI WhatsApp Assistant for ${params.businessName || 'our business'}.
${params.businessContext ? `Business Knowledge & Guidelines:\n${params.businessContext}\n` : ''}
Rules:
- Be warm, concise (1-3 sentences), and helpful for WhatsApp.
- Answer questions using ONLY the business context above when possible.
- If the customer has a complex request, account-specific issue, billing dispute, or explicitly asks for a human, reply politely that you are handing them over to a human specialist and append [HANDOFF] at the very end of your response.`;

  const prompt = `Recent conversation:\n${historyText}\n\nLatest customer message: "${params.latestMessage}"\n\nWrite the next assistant reply:`;

  const aiText = await callGemini(prompt, system);
  if (aiText) {
    const shouldHandoff = aiText.includes('[HANDOFF]');
    const cleanReply = aiText.replace(/\[HANDOFF\]/g, '').trim();
    return { reply: cleanReply, shouldHandoff };
  }

  // Smart fallback if GEMINI_API_KEY is not configured yet
  const fallbackReply =
    params.welcomeFallback ||
    `Hello ${params.contactName || 'there'}! Thanks for messaging ${params.businessName || 'us'}. Our team has received your message and a specialist will be with you shortly. (Reply "agent" anytime to escalate immediately.)`;

  return { reply: fallbackReply, shouldHandoff: false, isFallback: true };
}
