'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SidebarNav, ActiveView } from '@/components/SidebarNav';
import { ConversationList } from '@/components/ConversationList';
import { ChatArea } from '@/components/ChatArea';
import { RightPanel } from '@/components/RightPanel';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AdminSettings } from '@/components/AdminSettings';
import { LoginPage } from '@/components/LoginPage';
import { TemplateModal } from '@/components/TemplateModal';
import { BroadcastCampaigns } from '@/components/BroadcastCampaigns';
import { InstallPwaBanner } from '@/components/InstallPwaBanner';
import {
  MOCK_AGENTS,
  MOCK_BUSINESSES,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  MOCK_NOTES,
  CANNED_RESPONSES,
  INITIAL_SETTINGS,
} from '@/lib/mock-data';
import { Agent, Business, Conversation, Message, InternalNote, AppSettings, MessageMediaType, CannedResponse } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  registerServiceWorker,
  getNotificationPermission,
  requestNotificationPermission,
  playNotificationChime,
  showIncomingNotification,
} from '@/lib/notifications';

export default function WhatsAppMultiAgentApp() {
  // Authentication State
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [currentAgent, setCurrentAgent] = useState<Agent>(MOCK_AGENTS[0]);

  // Multi-Business State
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp_businesses');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return MOCK_BUSINESSES;
  });
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');

  // Navigation & Mobile Responsive State
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatchat_active_view') as ActiveView | null;
      if (saved && ['inbox', 'dashboard', 'broadcasts', 'settings'].includes(saved)) return saved;
    }
    return 'inbox';
  });
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(false);
  const [mobileShowDetails, setMobileShowDetails] = useState<boolean>(false);
  const [templateModalMode, setTemplateModalMode] = useState<'new_chat' | 'reply_template' | null>(null);

  // Push Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isFirstSyncRef = useRef<boolean>(true);
  const slaAlertedIdsRef = useRef<Set<string>>(new Set());

  // Inbox & Real-time State
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('whatchat_selected_conv_id') || MOCK_CONVERSATIONS[0].id;
    }
    return MOCK_CONVERSATIONS[0].id;
  });
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [notesMap, setNotesMap] = useState<Record<string, InternalNote[]>>(MOCK_NOTES);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>(CANNED_RESPONSES);
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

  // Check Supabase Auth session + Register Service Worker on mount
  useEffect(() => {
    registerServiceWorker();
    setNotificationPermission(getNotificationPermission());

    const initAuth = async () => {
      try {
        const [{ data: sessionData }, agentsRes, cannedRes] = await Promise.all([
          supabase.auth.getSession(),
          fetch('/api/agents', { cache: 'no-store' }),
          fetch('/api/canned-responses', { cache: 'no-store' }),
        ]);

        const cannedJson = await cannedRes.json().catch(() => ({ cannedResponses: [] }));
        if (cannedJson.cannedResponses && cannedJson.cannedResponses.length > 0) {
          setCannedResponses(cannedJson.cannedResponses);
        }

        const agentsJson = await agentsRes.json().catch(() => ({ agents: [] }));
        const realAgents: Agent[] = agentsJson.agents || [];
        if (realAgents.length > 0) {
          setAgents(realAgents);
        }

        const user = sessionData?.session?.user;
        if (user) {
          const matched = realAgents.find((a) => a.id === user.id);
          if (matched) {
            setCurrentAgent({ ...matched, is_online: true });
          } else {
            setCurrentAgent({
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Agent',
              role: user.user_metadata?.role === 'admin' ? 'admin' : 'agent',
              is_online: true,
            });
          }
          setIsLoggedIn(true);
        }
      } catch (err) {
        console.warn('Auth session check error:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initAuth();

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

    // Listen for notification clicks from Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.conversationId) {
          setSelectedId(event.data.conversationId);
          setActiveView('inbox');
          setMobileShowChat(true);
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;
  const selectedConvBusiness = selectedConv?.business_id
    ? businesses.find((b) => b.id === selectedConv.business_id) || null
    : null;
  const currentMessages = selectedId ? messagesMap[selectedId] || [] : [];
  const currentNotes = selectedId ? notesMap[selectedId] || [] : [];
  const totalUnreadCount = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  // Persist activeView & selectedId across page reloads
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatchat_active_view', activeView);
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedId && !selectedId.startsWith('conv-')) {
      localStorage.setItem('whatchat_selected_conv_id', selectedId);
    }
  }, [selectedId]);

  // Update Browser Tab Title with Unread Count
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title =
        totalUnreadCount > 0
          ? `(${totalUnreadCount}) WhatChat — Team Inbox`
          : 'WhatChat — Multi-Business WhatsApp Inbox';
    }
  }, [totalUnreadCount]);

  // SLA Escalation Watcher: alert Admins if an open customer chat waits >15 mins without reply
  useEffect(() => {
    if (currentAgent.role !== 'admin') return;

    const checkSla = () => {
      const now = Date.now();
      conversations.forEach((conv) => {
        if (conv.status !== 'open' || conv.id.startsWith('conv-')) return;
        const msgs = messagesMap[conv.id] || [];
        const lastMsg = msgs[msgs.length - 1];
        const awaitingReply = lastMsg ? lastMsg.sender_type === 'customer' : conv.unread_count > 0;
        if (!awaitingReply) return;

        const waitMins = Math.floor((now - new Date(conv.last_message_at).getTime()) / 60000);
        if (waitMins >= 15 && !slaAlertedIdsRef.current.has(conv.id)) {
          slaAlertedIdsRef.current.add(conv.id);
          const label = conv.contact?.name || conv.contact?.phone_number || 'Customer';
          showIncomingNotification({
            title: `SLA Alert: ${label}`,
            body: `Customer has been waiting ${waitMins}m for a reply!`,
            conversationId: conv.id,
          });
        }
      });
    };

    const interval = setInterval(checkSla, 60000);
    return () => clearInterval(interval);
  }, [conversations, messagesMap, currentAgent.role]);

  // Fetch live conversations, businesses & messages from Supabase via /api/inbox
  const syncLiveInbox = async () => {
    try {
      const res = await fetch(`/api/inbox?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      // Update live businesses if any exist in Supabase
      if (data.businesses && data.businesses.length > 0) {
        setBusinesses(data.businesses);
      }

      if (data.conversations && data.conversations.length > 0) {
        const liveMsgMap: Record<string, Message[]> = { ...MOCK_MESSAGES };
        const incomingNewCustomerMsgs: Message[] = [];

        (data.messages || []).forEach((m: Message) => {
          if (!liveMsgMap[m.conversation_id]) {
            liveMsgMap[m.conversation_id] = [];
          }
          if (!liveMsgMap[m.conversation_id].some((existing) => existing.id === m.id)) {
            liveMsgMap[m.conversation_id].push(m);
          }

          // Detect brand-new incoming customer messages for Push Notification + Sound
          if (!knownMessageIdsRef.current.has(m.id)) {
            knownMessageIdsRef.current.add(m.id);
            if (!isFirstSyncRef.current && m.sender_type === 'customer') {
              incomingNewCustomerMsgs.push(m);
            }
          }
        });

        isFirstSyncRef.current = false;

        // Fire push notification & chime for new customer messages
        if (incomingNewCustomerMsgs.length > 0) {
          playNotificationChime();
          const latest = incomingNewCustomerMsgs[incomingNewCustomerMsgs.length - 1];
          const conv = data.conversations.find((c: Conversation) => c.id === latest.conversation_id);
          const biz = businesses.find((b) => b.id === conv?.business_id);
          const prefix = biz ? `[${biz.name}] ` : '';
          const senderLabel = conv?.contact?.name || conv?.contact?.phone_number || 'Customer';

          showIncomingNotification({
            title: `${prefix}${senderLabel}`,
            body: latest.text || 'Sent a new WhatsApp message',
            conversationId: latest.conversation_id,
          });
        }

        // Group notes by conversation_id
        const liveNotesMap: Record<string, InternalNote[]> = { ...MOCK_NOTES };
        (data.notes || []).forEach((n: InternalNote) => {
          if (!liveNotesMap[n.conversation_id]) {
            liveNotesMap[n.conversation_id] = [];
          }
          if (!liveNotesMap[n.conversation_id].some((existing) => existing.id === n.id)) {
            liveNotesMap[n.conversation_id].push(n);
          }
        });

        // Merge live conversations at the top, followed by mock conversations
        setConversations(() => {
          const liveIds = new Set(data.conversations.map((c: Conversation) => c.id));
          const remainingMocks = MOCK_CONVERSATIONS.filter((m) => !liveIds.has(m.id));
          return [...data.conversations, ...remainingMocks];
        });
        setSelectedId((prev) => {
          const savedId =
            typeof window !== 'undefined' ? localStorage.getItem('whatchat_selected_conv_id') : null;
          if (savedId && data.conversations.some((c: Conversation) => c.id === savedId)) {
            return savedId;
          }
          if ((!prev || prev.startsWith('conv-')) && data.conversations.length > 0) {
            return data.conversations[0].id;
          }
          return prev;
        });
        setMessagesMap(liveMsgMap);
        setNotesMap(liveNotesMap);
      } else {
        isFirstSyncRef.current = false;
      }
    } catch (err) {
      console.warn('Live inbox sync error:', err);
    }
  };

  // Poll /api/inbox every 3 seconds + Supabase Realtime subscription
  useEffect(() => {
    syncLiveInbox();
    const pollInterval = setInterval(syncLiveInbox, 3000);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
      return () => clearInterval(pollInterval);
    }

    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        syncLiveInbox();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        syncLiveInbox();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
        syncLiveInbox();
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      playNotificationChime();
      showIncomingNotification({
        title: 'WhatChat Alerts Enabled',
        body: 'You will now receive instant notifications for new WhatsApp messages.',
        conversationId: selectedId || 'conv-1',
      });
    } else if (perm === 'denied') {
      alert('Notifications were blocked in your browser settings. Please allow notifications for this site in your browser bar.');
    }
  };

  // 1. Send Message (with Text, Image, Voice, Document, or Quoted Reply)
  const handleSendMessage = async (
    text: string,
    media?: { type: MessageMediaType; url: string; name?: string; duration?: number; base64?: string; mimeType?: string },
    replyTo?: { id: string; wamid?: string; text?: string }
  ) => {
    if (!selectedConv) return;

    const cleanQuote = replyTo?.text ? replyTo.text.replace(/\s+/g, ' ').slice(0, 90) : '';
    const optimisticText = cleanQuote ? `> Replying to: "${cleanQuote}"\n${text}` : text;

    const newMsg: Message = {
      id: `m-${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_type: 'agent',
      sender_id: currentAgent.id,
      sender_name: currentAgent.name,
      text: optimisticText,
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

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConv.id
          ? {
              ...c,
              last_message_text: media?.type === 'audio' ? 'Voice message' : media?.type === 'image' ? 'Photo' : media?.type === 'video' ? 'Video' : media?.type === 'document' ? `Document: ${media.name}` : text,
              last_message_at: new Date().toISOString(),
              unread_count: 0,
            }
          : c
      )
    );

    // Dispatch to API
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          text,
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          media,
          replyTo,
        }),
      });
      const rawText = await res.text();
      let result: any = {};
      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch {
        result = { error: rawText.slice(0, 140) || `HTTP ${res.status}` };
      }
      if (!res.ok) {
        alert(`Failed to send WhatsApp message: ${result.error || 'Unknown error'}`);
      } else {
        await syncLiveInbox();
      }
    } catch (e: any) {
      console.warn('API send failed:', e);
      alert(`Network error sending message: ${e.message}`);
    }
  };

  // 1b. Forward a Message (Text or Media) to another Conversation
  const handleForwardMessage = async (targetConvId: string, msg: Message) => {
    const rawBody = msg.text?.replace(/^> Replying to: "[^"]*"\n/, '') || '';
    const forwardedText = rawBody ? `Forwarded: ${rawBody}` : '';

    let mediaPayload:
      | { type: MessageMediaType; url: string; name?: string; base64?: string; mimeType?: string }
      | undefined;

    if (msg.media_type && msg.media_type !== 'text' && msg.media_url) {
      try {
        const mediaRes = await fetch(msg.media_url);
        if (mediaRes.ok) {
          const blob = await mediaRes.blob();
          const mimeType = blob.type || (msg.media_type === 'image' ? 'image/jpeg' : msg.media_type === 'video' ? 'video/mp4' : msg.media_type === 'audio' ? 'audio/ogg' : 'application/pdf');
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          if (base64) {
            mediaPayload = {
              type: msg.media_type,
              url: msg.media_url,
              name: msg.media_name || `forwarded.${mimeType.split('/')[1]?.split(';')[0] || 'bin'}`,
              base64,
              mimeType,
            };
          }
        }
      } catch {
        // Fallback to forwarding text description if media fetch fails
      }
    }

    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: targetConvId,
        text: forwardedText || (mediaPayload ? '' : `Forwarded: ${msg.media_name || 'Attachment'}`),
        agentId: currentAgent.id,
        agentName: currentAgent.name,
        media: mediaPayload,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(`Failed to forward message: ${result.error || 'Unknown error'}`);
      return;
    }
    await syncLiveInbox();
    setSelectedId(targetConvId);
  };

  // 2. Draft Reply with AI (using per-business AI context!)
  const handleDraftWithAI = async (): Promise<string> => {
    if (!selectedConv) return '';

    const bizContext = selectedConvBusiness?.ai_context || settings.businessName;

    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: currentMessages,
          contactName: selectedConv.contact?.name,
          businessContext: bizContext,
          geminiApiKey: settings.geminiApiKey || undefined,
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
    return `Hello ${selectedConv.contact?.name || 'there'}! Thanks for contacting ${selectedConvBusiness?.name || settings.businessName || 'our team'}. I am looking into this for you right away.`;
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

  // 4. Assign Conversation (Synced to Supabase)
  const handleAssignAgent = async (agentId: string | null) => {
    if (!selectedConv) return;
    const convId = selectedConv.id;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, assigned_agent_id: agentId } : c))
    );

    try {
      await fetch('/api/conversations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, assignedAgentId: agentId }),
      });
    } catch (e) {
      console.warn('Failed to persist assignment:', e);
    }
  };

  // 5. Add Internal Team Note (Synced to Supabase)
  const handleAddNote = async (content: string) => {
    if (!selectedConv) return;
    const convId = selectedConv.id;

    const newNote: InternalNote = {
      id: `n-${Date.now()}`,
      conversation_id: convId,
      agent_id: currentAgent.id,
      agent_name: currentAgent.name,
      content,
      created_at: new Date().toISOString(),
    };

    setNotesMap((prev) => ({
      ...prev,
      [convId]: [newNote, ...(prev[convId] || [])],
    }));

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          agentId: currentAgent.id,
          agentName: currentAgent.name,
          content,
        }),
      });
      if (res.ok) {
        await syncLiveInbox();
      }
    } catch (e) {
      console.warn('Failed to persist internal note:', e);
    }
  };

  // 6. Change Status (Synced to Supabase)
  const handleStatusChange = async (status: 'open' | 'pending' | 'closed') => {
    if (!selectedConv) return;
    const convId = selectedConv.id;
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status } : c))
    );

    try {
      await fetch('/api/conversations/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, status }),
      });
    } catch (e) {
      console.warn('Failed to persist status:', e);
    }
  };

  // 7. Update Customer Labels / Tags
  const handleUpdateTags = async (contactId: string, tags: string[]) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.contact_id === contactId && c.contact
          ? { ...c, contact: { ...c.contact, tags } }
          : c
      )
    );

    try {
      await fetch('/api/contacts/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, tags }),
      });
    } catch (e) {
      console.warn('Failed to persist tags to Supabase:', e);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm">
        Loading WhatChat...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLoginSuccess={async (agent) => {
          setCurrentAgent(agent);
          setIsLoggedIn(true);
          try {
            const res = await fetch('/api/agents', { cache: 'no-store' });
            const data = await res.json();
            if (data.agents && data.agents.length > 0) {
              setAgents(data.agents);
            }
          } catch {}
        }}
      />
    );
  }

  return (
    <div className="h-[100dvh] w-screen flex flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* 1. Navigation Rail (Desktop Left / Mobile Bottom) */}
      <SidebarNav
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          if (view !== 'inbox') setMobileShowChat(false);
        }}
        currentAgent={currentAgent}
        unreadCount={totalUnreadCount}
        notificationPermission={notificationPermission}
        onEnableNotifications={handleEnableNotifications}
        onLogout={async () => {
          await supabase.auth.signOut();
          fetch('/api/agents', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: currentAgent.id, isOnline: false }),
          }).catch(() => {});
          setIsLoggedIn(false);
        }}
        hideMobileBar={activeView === 'inbox' && mobileShowChat}
      />

      {/* 2. Inbox View (Mobile Single-Pane Switcher / Desktop 3-Column) */}
      {activeView === 'inbox' && (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Conversation Queue: Hidden on mobile when a chat is open */}
          <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
            <ConversationList
              conversations={conversations}
              messagesMap={messagesMap}
              selectedId={selectedId}
              currentAgent={currentAgent}
              agents={agents}
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              onSelectBusiness={setSelectedBusinessId}
              onNewChatClick={() => setTemplateModalMode('new_chat')}
              onSelect={(conv) => {
                setSelectedId(conv.id);
                setMobileShowChat(true);
                if (conv.unread_count > 0) {
                  setConversations((prev) =>
                    prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
                  );
                  fetch('/api/conversations/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId: conv.id, unreadCount: 0 }),
                  }).catch(() => {});
                }
              }}
            />
          </div>

          {/* Active Chat Area: Hidden on mobile when viewing list */}
          <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-1 h-full min-w-0`}>
            <ChatArea
              conversation={selectedConv}
              business={selectedConvBusiness}
              messages={currentMessages}
              currentAgent={currentAgent}
              cannedResponses={cannedResponses}
              allConversations={conversations}
              onSendMessage={handleSendMessage}
              onForwardMessage={handleForwardMessage}
              onDraftWithAI={handleDraftWithAI}
              onStatusChange={handleStatusChange}
              onBackMobile={() => setMobileShowChat(false)}
              onOpenDetailsMobile={() => setMobileShowDetails(true)}
              onOpenTemplateClick={() => setTemplateModalMode('reply_template')}
            />
          </div>

          {/* Right Panel: Desktop fixed column */}
          <div className="hidden lg:flex h-full">
            <RightPanel
              conversation={selectedConv}
              agents={agents}
              currentAgent={currentAgent}
              notes={currentNotes}
              onAssignAgent={handleAssignAgent}
              onAddNote={handleAddNote}
              onSummarizeWithAI={handleSummarizeWithAI}
              onUpdateTags={handleUpdateTags}
            />
          </div>

          {/* Right Panel: Mobile/Tablet Slide-Over Drawer */}
          {mobileShowDetails && (
            <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
              <div className="h-full w-full sm:w-80 bg-white shadow-2xl">
                <RightPanel
                  conversation={selectedConv}
                  agents={agents}
                  currentAgent={currentAgent}
                  notes={currentNotes}
                  onAssignAgent={handleAssignAgent}
                  onAddNote={handleAddNote}
                  onSummarizeWithAI={handleSummarizeWithAI}
                  onUpdateTags={handleUpdateTags}
                  onCloseMobile={() => setMobileShowDetails(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Dashboard View */}
      {activeView === 'dashboard' && (
        <AnalyticsDashboard
          agents={agents}
          conversations={conversations}
          messagesMap={messagesMap}
          currentAgent={currentAgent}
          onOpenConversation={(convId) => {
            setSelectedId(convId);
            setActiveView('inbox');
            setMobileShowChat(true);
          }}
        />
      )}

      {/* Label-Based Broadcast Campaigns View (Admin Only) */}
      {activeView === 'broadcasts' && (
        <BroadcastCampaigns
          agents={agents}
          businesses={businesses}
          conversations={conversations}
          currentAgent={currentAgent}
          onContactsImported={syncLiveInbox}
        />
      )}

      {/* Admin Settings View */}
      {activeView === 'settings' && (
        <AdminSettings
          settings={settings}
          agents={agents}
          businesses={businesses}
          cannedResponses={cannedResponses}
          currentAgent={currentAgent}
          onSaveSettings={setSettings}
          onUpdateAgents={setAgents}
          onUpdateBusinesses={setBusinesses}
          onUpdateCannedResponses={setCannedResponses}
          onSwitchAgent={(agent) => setCurrentAgent(agent)}
        />
      )}

      {/* WhatsApp Approved Template & New Chat Modal */}
      {templateModalMode && (
        <TemplateModal
          mode={templateModalMode}
          conversationId={selectedConv?.id}
          customerLabel={selectedConv?.contact?.name || selectedConv?.contact?.phone_number}
          businesses={businesses}
          defaultBusinessId={selectedBusinessId}
          currentAgent={currentAgent}
          onClose={() => setTemplateModalMode(null)}
          onSent={async (newConvId) => {
            await syncLiveInbox();
            if (newConvId) {
              setSelectedId(newConvId);
              setActiveView('inbox');
              setMobileShowChat(true);
            }
          }}
        />
      )}

      {/* Mobile / Desktop PWA Install Prompt */}
      <InstallPwaBanner />
    </div>
  );
}
