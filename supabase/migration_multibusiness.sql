-- ==============================================================================
-- Multi-Business (Multi-Tenant) Migration Script
-- Run this in Supabase SQL Editor to upgrade your existing database
-- ==============================================================================

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    display_phone_number TEXT NOT NULL,
    whatsapp_phone_number_id TEXT NOT NULL UNIQUE,
    whatsapp_access_token TEXT,
    brand_color TEXT NOT NULL DEFAULT '#128C7E',
    ai_context TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add business_id columns to existing tables
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

ALTER TABLE public.canned_responses
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;

-- 3. Drop global unique constraint on contacts.phone_number and make it unique per business
-- (So the same customer can message Business A and Business B separately!)
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_phone_number_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_business_phone
ON public.contacts (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), phone_number);

-- 4. Index for fast per-business inbox filtering
CREATE INDEX IF NOT EXISTS idx_conversations_business ON public.conversations(business_id);

-- 5. Enable RLS for businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view businesses" ON public.businesses FOR SELECT TO authenticated USING (true);
