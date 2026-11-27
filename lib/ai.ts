import { Message } from '@/types';
import { activeSettings } from '@/lib/settings-store';

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Calls Google Gemini Flash to generate text based on a prompt
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  apiKeyOverride?: string
): Promise<string | null> {
  const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY || activeSettings?.geminiApiKey;
  if (!apiKey || apiKey.includes('your_gemini_api_key')) {
    return null;
  }

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        }),
      });

      if (!response.ok) {
        console.warn(`Gemini API (${model}) returned ${response.status}`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
    } catch (err) {
      console.error(`Gemini API error (${model}):`, err);
    }
  }

  return null;
}

/**
 * Generate a professional, contextual reply draft for an agent to review
 */
export async function draftReply(
  history: Message[],
  contactName?: string,
  businessInfo?: string,
  apiKeyOverride?: string
): Promise<string> {
  const historyText = history
    .slice(-15)
    .map((m) => {
      const speaker =
        m.sender_type === 'customer'
          ? contactName || 'Customer'
          : m.sender_type === 'bot'
          ? 'AI Assistant'
          : m.sender_name || 'Agent';
      return `${speaker}: ${m.text || (m.media_type ? `[${m.media_type}]` : '')}`;
    })
    .join('\n');

  const system = `You are an AI customer support assistant helping a human agent respond to a business WhatsApp conversation.
Tone: Natural, polite, concise (1-3 sentences), and context-aware for WhatsApp.
Guidelines:
- Carefully study the full conversation history below—what has already been answered, paid, delivered, or thanked—so you never repeat greetings or ignore context.
- If the customer just thanked you or said "you are welcome" / "ok", respond with a warm, brief closing (do not say "I am reviewing your request").
- Use the Business Info below when answering product, pricing, hours, or policy questions.
${businessInfo ? `Business Info:\n${businessInfo}` : ''}`;

  const prompt = `Full recent WhatsApp conversation:\n\n${historyText}\n\nSuggest the best next reply for the agent to send. Output ONLY the ready-to-send message without quotes.`;

  const aiResult = await callGemini(prompt, system, apiKeyOverride);
  if (aiResult) return aiResult;

  // Smart fallback if GEMINI_API_KEY is not configured or unreachable
  const lastCustomerMsg = [...history].reverse().find(m => m.sender_type === 'customer');
  const msgText = lastCustomerMsg?.text?.toLowerCase() || '';

  if (msgText.includes('welcome') || msgText.includes('thank')) {
    return `It's our pleasure, ${contactName || 'friend'}! Please feel free to reach out anytime if you need anything else.`;
  }
  if (msgText === 'ok' || msgText === 'okay' || msgText === 'alright') {
    return `Great! Let us know if you have any other questions—we're happy to help.`;
  }
  if (msgText.includes('receipt') || msgText.includes('invoice') || msgText.includes('payment') || lastCustomerMsg?.media_type === 'document') {
    return `Thank you, ${contactName || 'there'}! We have received your document/receipt and are confirming it now.`;
  }
  if (msgText.includes('pricing') || msgText.includes('quote') || msgText.includes('how much')) {
    return `Hello ${contactName || 'there'}! Thank you for your interest. Could you share which product or quantity you need so we can give you the exact price?`;
  }

  return `Hello ${contactName || 'there'}! Thanks for your message—how can we assist you further today?`;
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
