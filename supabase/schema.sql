-- ==============================================================================
-- WhatsApp Multi-Agent Business Inbox: Database Schema (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Agents / Team Members Table (Up to 10+ agents)
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    is_online BOOLEAN NOT NULL DEFAULT false,
    active_conversation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Contacts / Customers Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    tags TEXT[] DEFAULT '{}',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent')),
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unread_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast multi-agent queue queries
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'bot')),
    sender_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    text TEXT,
    media_url TEXT,
    media_type TEXT,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    whatsapp_message_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- 6. Internal Team Notes (Private notes between agents)
CREATE TABLE IF NOT EXISTS public.internal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_conversation ON public.internal_notes(conversation_id);

-- 7. Canned Quick Responses
CREATE TABLE IF NOT EXISTS public.canned_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shortcut TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- Triggers for Automatic Timestamps and Unread Counts
-- ==============================================================================

-- Function to update conversation summary when a new message is inserted
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_text = COALESCE(NEW.text, '[Attachment]'),
        last_message_at = NEW.created_at,
        unread_count = CASE 
            WHEN NEW.sender_type = 'customer' THEN unread_count + 1 
            ELSE unread_count 
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_message();

-- ==============================================================================
-- Real-time Publication setup (Enable WebSockets for live agent updates)
-- ==============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated agents to read/write shared business data
CREATE POLICY "Agents can view team members" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Agents can update own status" ON public.agents FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Agents have full access to contacts" ON public.contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Agents have full access to conversations" ON public.conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Agents have full access to messages" ON public.messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Agents have full access to internal notes" ON public.internal_notes FOR ALL TO authenticated USING (true);
CREATE POLICY "Agents can view canned responses" ON public.canned_responses FOR SELECT TO authenticated USING (true);
