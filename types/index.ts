export type AgentRole = 'admin' | 'agent';

export interface Business {
  id: string;
  name: string;
  display_phone_number: string;
  whatsapp_phone_number_id: string;
  whatsapp_access_token?: string;
  brand_color: string;
  ai_context?: string;
  created_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: AgentRole;
  is_online: boolean;
  active_conversation_id?: string | null;
  assigned_business_ids?: string[]; // empty or undefined = all businesses for admins
  chats_handled?: number;
  avg_response_time?: string;
}

export interface Contact {
  id: string;
  business_id?: string | null;
  phone_number: string;
  name?: string;
  email?: string;
  tags: string[];
  avatar_url?: string;
  created_at: string;
}

export type ConversationStatus = 'open' | 'pending' | 'closed';
export type PriorityLevel = 'low' | 'normal' | 'urgent';

export interface Conversation {
  id: string;
  business_id?: string | null;
  business?: Business | null;
  contact_id: string;
  contact?: Contact;
  assigned_agent_id?: string | null;
  assigned_agent?: Agent | null;
  status: ConversationStatus;
  priority: PriorityLevel;
  last_message_text?: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
}

export type SenderType = 'customer' | 'agent' | 'bot';
export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';
export type MessageMediaType = 'text' | 'image' | 'audio' | 'document' | 'video';

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id?: string | null;
  sender_name?: string;
  text?: string;
  media_type?: MessageMediaType;
  media_url?: string;
  media_name?: string;
  audio_duration?: number; // seconds
  status: MessageDeliveryStatus;
  whatsapp_message_id?: string;
  created_at: string;
}

export interface InternalNote {
  id: string;
  conversation_id: string;
  agent_id: string;
  agent_name?: string;
  content: string;
  created_at: string;
}

export interface CannedResponse {
  id: string;
  business_id?: string | null;
  shortcut: string;
  title: string;
  content: string;
}

export interface AppSettings {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  geminiApiKey: string;
  businessName: string;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  operatingHours: string;
}
