import { Agent, Conversation, Message, InternalNote, CannedResponse, AppSettings } from '@/types';

// The 10 Team Members with Performance Metrics
export const MOCK_AGENTS: Agent[] = [
  { id: 'agent-1', name: 'Sarah Jenkins', email: 'sarah@business.com', role: 'admin', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', chats_handled: 84, avg_response_time: '1m 20s' },
  { id: 'agent-2', name: 'Marcus Vance', email: 'marcus@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80', chats_handled: 76, avg_response_time: '1m 45s' },
  { id: 'agent-3', name: 'Elena Rostova', email: 'elena@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', chats_handled: 62, avg_response_time: '2m 10s' },
  { id: 'agent-4', name: 'David Kim', email: 'david@business.com', role: 'agent', is_online: false, avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', chats_handled: 45, avg_response_time: '2m 30s' },
  { id: 'agent-5', name: 'Amara Okafor', email: 'amara@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80', chats_handled: 59, avg_response_time: '1m 15s' },
  { id: 'agent-6', name: 'Lucas Silva', email: 'lucas@business.com', role: 'agent', is_online: false, avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80', chats_handled: 38, avg_response_time: '3m 05s' },
  { id: 'agent-7', name: 'Chloe Dubois', email: 'chloe@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', chats_handled: 51, avg_response_time: '1m 50s' },
  { id: 'agent-8', name: 'Tariq Al-Mansoor', email: 'tariq@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80', chats_handled: 68, avg_response_time: '1m 35s' },
  { id: 'agent-9', name: 'Emily Watson', email: 'emily@business.com', role: 'agent', is_online: false, avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', chats_handled: 33, avg_response_time: '2m 40s' },
  { id: 'agent-10', name: 'Kenji Sato', email: 'kenji@business.com', role: 'agent', is_online: true, avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80', chats_handled: 72, avg_response_time: '1m 25s' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    contact_id: 'contact-1',
    contact: {
      id: 'contact-1',
      name: 'Robert Miller (Logistics Pro)',
      phone_number: '+14155552671',
      tags: ['VIP Client', 'Enterprise'],
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      created_at: '2026-11-20T10:00:00Z',
    },
    assigned_agent_id: 'agent-1',
    status: 'open',
    priority: 'urgent',
    last_message_text: '🎤 Voice message (0:14)',
    last_message_at: '2026-11-24T15:45:00Z',
    unread_count: 1,
    created_at: '2026-11-20T10:00:00Z',
  },
  {
    id: 'conv-2',
    contact_id: 'contact-2',
    contact: {
      id: 'contact-2',
      name: 'Jessica Reynolds',
      phone_number: '+447911123456',
      tags: ['Support', 'Billing'],
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      created_at: '2026-11-22T14:30:00Z',
    },
    assigned_agent_id: 'agent-2',
    status: 'open',
    priority: 'normal',
    last_message_text: '📄 Invoice_INV-9824.pdf',
    last_message_at: '2026-11-24T14:15:00Z',
    unread_count: 0,
    created_at: '2026-11-22T14:30:00Z',
  },
  {
    id: 'conv-3',
    contact_id: 'contact-3',
    contact: {
      id: 'contact-3',
      name: 'Liam Chen',
      phone_number: '+6591234567',
      tags: ['Sales Lead', 'New'],
      created_at: '2026-11-24T12:00:00Z',
    },
    assigned_agent_id: null, // UNASSIGNED!
    status: 'open',
    priority: 'urgent',
    last_message_text: 'Hi, I saw your product demo and want to discuss custom pricing for our Singapore office.',
    last_message_at: '2026-11-24T15:30:00Z',
    unread_count: 1,
    created_at: '2026-11-24T12:00:00Z',
  },
  {
    id: 'conv-4',
    contact_id: 'contact-4',
    contact: {
      id: 'contact-4',
      name: 'Maria Gonzalez',
      phone_number: '+34600112233',
      tags: ['General Inquiry'],
      created_at: '2026-11-23T09:15:00Z',
    },
    assigned_agent_id: 'agent-3',
    status: 'pending',
    priority: 'normal',
    last_message_text: 'Sure, I will test the integration link you sent over.',
    last_message_at: '2026-11-23T18:10:00Z',
    unread_count: 0,
    created_at: '2026-11-23T09:15:00Z',
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    { id: 'm-1', conversation_id: 'conv-1', sender_type: 'customer', text: 'Hi Sarah, hope you are having a productive week.', status: 'read', created_at: '2026-11-24T15:30:00Z' },
    { id: 'm-2', conversation_id: 'conv-1', sender_type: 'agent', sender_id: 'agent-1', sender_name: 'Sarah Jenkins', text: 'Hi Robert! Doing great, thanks. How can our team help you today?', status: 'read', created_at: '2026-11-24T15:32:00Z' },
    { 
      id: 'm-3', 
      conversation_id: 'conv-1', 
      sender_type: 'customer', 
      media_type: 'audio',
      audio_duration: 14,
      text: 'Voice note: Urgently requesting 50 licenses',
      status: 'delivered', 
      created_at: '2026-11-24T15:45:00Z' 
    },
  ],
  'conv-2': [
    { id: 'm-4', conversation_id: 'conv-2', sender_type: 'customer', text: 'Hello, I need a copy of my VAT invoice for October.', status: 'read', created_at: '2026-11-24T14:00:00Z' },
    { 
      id: 'm-5', 
      conversation_id: 'conv-2', 
      sender_type: 'agent', 
      sender_id: 'agent-2', 
      sender_name: 'Marcus Vance', 
      media_type: 'document',
      media_name: 'Invoice_OCT-2026.pdf',
      text: 'Here is your requested VAT invoice.',
      status: 'read', 
      created_at: '2026-11-24T14:10:00Z' 
    },
    { id: 'm-6', conversation_id: 'conv-2', sender_type: 'customer', text: 'Thank you Marcus, I just received the invoice receipt.', status: 'read', created_at: '2026-11-24T14:15:00Z' },
  ],
  'conv-3': [
    { id: 'm-7', conversation_id: 'conv-3', sender_type: 'customer', text: 'Hi, I saw your product demo and want to discuss custom pricing for our Singapore office.', status: 'delivered', created_at: '2026-11-24T15:30:00Z' },
  ],
  'conv-4': [
    { id: 'm-8', conversation_id: 'conv-4', sender_type: 'customer', text: 'Does your platform support webhook dispatch for custom CRM sync?', status: 'read', created_at: '2026-11-23T17:50:00Z' },
    { id: 'm-9', conversation_id: 'conv-4', sender_type: 'agent', sender_id: 'agent-3', sender_name: 'Elena Rostova', text: 'Yes Maria, we have standard Webhook payloads matching WhatsApp Cloud API standards.', status: 'read', created_at: '2026-11-23T18:05:00Z' },
    { id: 'm-10', conversation_id: 'conv-4', sender_type: 'customer', text: 'Sure, I will test the integration link you sent over.', status: 'read', created_at: '2026-11-23T18:10:00Z' },
  ],
};

export const MOCK_NOTES: Record<string, InternalNote[]> = {
  'conv-1': [
    { id: 'n-1', conversation_id: 'conv-1', agent_id: 'agent-1', agent_name: 'Sarah Jenkins', content: 'VIP customer. Account manager approved a 10% volume discount for batches over 40 seats.', created_at: '2026-11-24T15:35:00Z' },
  ],
  'conv-3': [
    { id: 'n-2', conversation_id: 'conv-3', agent_id: 'agent-1', agent_name: 'Sarah Jenkins', content: 'Inbound sales lead from APAC region. Needs follow up by Sales specialist ASAP.', created_at: '2026-11-24T15:32:00Z' },
  ],
};

export const CANNED_RESPONSES: CannedResponse[] = [
  { id: 'c-1', shortcut: '/greet', title: 'Standard Greeting', content: 'Hello! Thank you for reaching out to our team. How may we assist you today?' },
  { id: 'c-2', shortcut: '/hours', title: 'Business Hours', content: 'Our team is available Monday through Friday from 8:00 AM to 6:00 PM EST.' },
  { id: 'c-3', shortcut: '/pricing', title: 'Pricing Inquiry', content: 'Our standard plan starts at $49/mo with full multi-agent support and unlimited customer contacts.' },
  { id: 'c-4', shortcut: '/escalate', title: 'Escalation Notice', content: 'I am looping in our senior technical specialist to review your case right away.' },
];

export const INITIAL_SETTINGS: AppSettings = {
  phoneNumberId: '109842398412093',
  accessToken: 'EAAG...sample_token',
  verifyToken: 'team_whatsapp_secret_2026',
  geminiApiKey: '',
  businessName: 'Apex Enterprises Inc.',
  autoReplyEnabled: true,
  autoReplyMessage: 'Thank you for reaching out to Apex Enterprises! Our team of specialists has received your message and will respond shortly.',
  operatingHours: 'Monday - Friday (08:00 - 18:00 GMT)',
};
