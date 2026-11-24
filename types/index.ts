export type AgentRole = 'admin' | 'agent';

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: AgentRole;
  is_online: boolean;
  active_conversation_id?: string | null;
  chats_handled?: number;
  avg_response_time?: string;
}

export interface Contact {
  id: string;
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
export type MessageMediaType = 'text' | 'image' | 'audio' | 'document';

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
