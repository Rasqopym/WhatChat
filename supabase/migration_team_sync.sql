-- ==============================================================================
-- Real-Time Team Sync Migration (Assignments, Status & Internal Notes)
-- Run this in Supabase SQL Editor
-- ==============================================================================

-- 1. Allow storing agent identifier keys (e.g. 'agent-1') alongside UUIDs
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS assigned_agent_key TEXT;

-- 2. Allow internal notes to store agent_name directly without requiring auth.users UUID
ALTER TABLE public.internal_notes
ALTER COLUMN agent_id DROP NOT NULL;

ALTER TABLE public.internal_notes
ADD COLUMN IF NOT EXISTS agent_name TEXT;
