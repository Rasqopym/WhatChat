'use client';

import React, { useState, useEffect } from 'react';
import { SidebarNav, ActiveView } from '@/components/SidebarNav';
import { ConversationList } from '@/components/ConversationList';
import { ChatArea } from '@/components/ChatArea';
import { RightPanel } from '@/components/RightPanel';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AdminSettings } from '@/components/AdminSettings';
import { LoginPage } from '@/components/LoginPage';
import {
  MOCK_AGENTS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_NOTES,
  CANNED_RESPONSES,
  INITIAL_SETTINGS,
} from '@/lib/mock-data';
import { Agent, Conversation, Message, InternalNote, AppSettings, MessageMediaType } from '@/types';
import { supabase } from '@/lib/supabase';

export default function WhatsAppMultiAgentApp() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [currentAgent, setCurrentAgent] = useState<Agent>(MOCK_AGENTS[0]);

  // Navigation State
  const [activeView, setActiveView] = useState<ActiveView>('inbox');

  // Inbox & Real-time State
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_CONVERSATIONS[0].id);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [notesMap, setNotesMap] = useState<Record<string, InternalNote[]>>(MOCK_NOTES);
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp_app_settings');
      if (saved) {
        try {
          return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return INITIAL_SETTINGS;
  });

  // On mount, sync saved credentials to the server-side runtime
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp_app_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed),
          }).catch(console.error);
        } catch (e) {}
      }
    }
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;
  const currentMessages = selectedId ? messagesMap[selectedId] || [] : [];
  const currentNotes = selectedId ? notesMap[selectedId] || [] : [];
  const totalUnreadCount = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  // Real-time Supabase subscription if configured
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) return;

    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message;
        setMessagesMap((prev) => ({
          ...prev,
          [newMsg.conversation_id]: [...(prev[newMsg.conversation_id] || []), newMsg],
        }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
        const updatedConv = payload.new as Conversation;
        setConversations((prev) =>
          prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 1. Send Message (with Text, Image, Voice, or Document)
  const handleSendMessage = async (
    text: string,
    media?: { type: MessageMediaType; url: string; name?: string; duration?: number }
  ) => {
    if (!selectedConv) return;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_type: 'agent',
      sender_id: currentAgent.id,
      sender_name: currentAgent.name,
      text,
      media_type: media?.type,
      media_url: media?.url,
      media_name: media?.name,
      audio_duration: media?.duration,
      status: 'delivered',
      created_at: new Date().toISOString(),
    };

    // Optimistic UI update
    setMessagesMap((prev) => ({
      ...prev,
      [selectedConv.id]: [...(prev[selectedConv.id] || []), newMsg],
    }));

    // Update conversation snippet
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? {
              ...c,
              last_message_text: media?.type === 'audio' ? '🎤 Voice message' : media?.type === 'image' ? '📷 Photo' : media?.type === 'document' ? `📄 ${media.name}` : text,
              last_message_at: new Date().toISOString(),
              unread_count: 0,
            }
          : c
      )
    );

    // Dispatch to API
    try {
      await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          text,
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          media,
        }),
      });
    } catch (e) {
      console.warn('API send failed, retained in local state:', e);
    }
  };

  // 2. Draft Reply with AI
  const handleDraftWithAI = async (): Promise<string> => {
    if (!selectedConv) return '';

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: currentMessages,
          contactName: selectedConv.contact?.name,
          businessContext: settings.businessName ? `Business: ${settings.businessName}` : undefined,
        }),
      });
      const data = await res.json();
      if (data.draft) return data.draft;
    } catch (e) {
      console.warn('AI API draft failed, using smart fallback:', e);
    }

    const lastCustomerMsg = [...currentMessages].reverse().find((m) => m.sender_type === 'customer');
    if (lastCustomerMsg?.text?.toLowerCase().includes('licenses')) {
      return `Hi ${selectedConv.contact?.name || 'there'}, I would be happy to help add those 50 licenses to your account before Friday. I have alerted our provisioning team now.`;
    }
    return `Hello ${selectedConv.contact?.name || 'there'}! Thanks for contacting ${settings.businessName || 'our team'}. I am looking into this for you right away.`;
  };

  // 3. Summarize with AI
  const handleSummarizeWithAI = async (): Promise<string> => {
    if (!selectedConv) return '';

    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: currentMessages,
        }),
      });
      const data = await res.json();
      if (data.summary) return data.summary;
    } catch (e) {
      console.warn('AI summarize API failed, using fallback:', e);
    }

    return `• Customer Intent: ${selectedConv.last_message_text}\n• Status: In discussion with ${currentAgent.name}\n• Action Required: Follow up within 1 business day.`;
  };

  // 4. Assign Conversation
  const handleAssignAgent = (agentId: string | null) => {
    if (!selectedConv) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, assigned_agent_id: agentId } : c))
    );
  };

  // 5. Add Internal Team Note
  const handleAddNote = async (content: string) => {
    if (!selectedConv) return;

    const newNote: InternalNote = {
      id: `n-${Date.now()}`,
      conversation_id: selectedConv.id,
      agent_id: currentAgent.id,
      agent_name: currentAgent.name,
      content,
      created_at: new Date().toISOString(),
    };

    setNotesMap((prev) => ({
      ...prev,
      [selectedConv.id]: [newNote, ...(prev[selectedConv.id] || [])],
    }));
  };

  // 6. Change Status
  const handleStatusChange = (status: 'open' | 'pending' | 'closed') => {
    if (!selectedConv) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, status } : c))
    );
  };

  // Show Login Page if signed out
  if (!isLoggedIn) {
    return (
      <LoginPage
        agents={agents}
        onLogin={(agent) => {
          setCurrentAgent(agent);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-100">
      {/* 1. Slim Left Navigation Bar with Role Awareness */}
      <SidebarNav
        activeView={activeView}
        onSelectView={setActiveView}
        currentAgent={currentAgent}
        unreadCount={totalUnreadCount}
        onLogout={() => setIsLoggedIn(false)}
      />

      {/* 2. Main Content Area according to Active View */}
      {activeView === 'inbox' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation Queue */}
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            currentAgent={currentAgent}
            agents={agents}
            onSelect={(conv) => {
              setSelectedId(conv.id);
              setConversations((prev) =>
                prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
              );
            }}
          />

          {/* Active Chat Area with Voice Notes & Attachments */}
          <ChatArea
            conversation={selectedConv}
            messages={currentMessages}
            currentAgent={currentAgent}
            cannedResponses={CANNED_RESPONSES}
            onSendMessage={handleSendMessage}
            onDraftWithAI={handleDraftWithAI}
            onStatusChange={handleStatusChange}
          />

          {/* Right Panel: CRM, Assignment & Notes */}
          <RightPanel
            conversation={selectedConv}
            agents={agents}
            currentAgent={currentAgent}
            notes={currentNotes}
            onAssignAgent={handleAssignAgent}
            onAddNote={handleAddNote}
            onSummarizeWithAI={handleSummarizeWithAI}
          />
        </div>
      )}

      {/* Analytics Dashboard View (Admin Company Stats vs Agent Personal Stats) */}
      {activeView === 'dashboard' && (
        <AnalyticsDashboard
          agents={agents}
          conversations={conversations}
          currentAgent={currentAgent}
          onOpenConversation={(convId) => {
            setSelectedId(convId);
            setActiveView('inbox');
          }}
        />
      )}

      {/* Admin Settings View (Guarded for Administrators Only) */}
      {activeView === 'settings' && (
        <AdminSettings
          settings={settings}
          agents={agents}
          currentAgent={currentAgent}
          onSaveSettings={setSettings}
          onUpdateAgents={setAgents}
          onSwitchAgent={(agent) => setCurrentAgent(agent)}
        />
      )}
    </div>
  );
}
