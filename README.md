# WhatsApp Business AI Multi-Agent Inbox 🚀

A production-ready **WhatsApp Business Multi-Agent Inbox** engineered to allow **10+ team members** to access, manage, and reply to WhatsApp customer conversations simultaneously from different devices with built-in **AI Co-pilot (Google Gemini)** and **Supabase (PostgreSQL)** real-time sync.

---

## 🌟 Key Capabilities

1. **Multi-Agent & Multi-Device Access (10+ Team Members):**
   - Individual agent logins and profiles.
   - Access simultaneously from desktop, tablet, or mobile browsers without kicking anyone out.
2. **Team Queue & Collision Prevention:**
   - **Queue Filtering:** Filter by `All`, `Mine` (assigned to current agent), `Queue` (unassigned inbound chats), and `Urgent`.
   - **Collision Banners:** Active warnings when another teammate is handling or viewing a conversation.
   - **Assignment System:** Assign chats to any of your 10 agents with 1 click or use "Assign to Me".
3. **Private Internal Team Notes:**
   - Leave private internal notes and handover instructions in customer threads visible *only* to your team—never sent to the customer on WhatsApp.
4. **AI Superpowers (Google Gemini):**
   - **One-Click Drafts:** Generates contextual, professional replies for the agent to review and send.
   - **Handoff Summarizer:** Summarizes customer issues into a 3-bullet briefing when reassigning a chat.
   - **Auto-Triage & Intent Detection:** Automatically categorizes inbound messages (`Urgent`, `Sales`, `Support`).
5. **Canned Quick Replies:**
   - Pre-configured templates (`/greet`, `/hours`, `/pricing`, `/escalate`) for ultra-fast customer responses.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── webhook/route.ts        # Meta WhatsApp Webhook (Verification & Ingestion)
│   │   ├── messages/send/route.ts  # Outgoing WhatsApp message dispatcher
│   │   └── ai/
│   │       ├── draft/route.ts      # Gemini AI reply drafting
│   │       └── summarize/route.ts  # Gemini AI conversation summarization
│   ├── globals.css                 # Custom Tailwind CSS & chat styling
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Main 3-panel Multi-Agent workspace
├── components/
│   ├── Header.tsx                  # Top bar with active agent switcher & online counter
│   ├── ConversationList.tsx        # Conversation queues, unread badges & search
│   ├── ChatArea.tsx                # Chat feed, message ticks & composer
│   └── RightPanel.tsx              # Customer CRM, agent assignment & private team notes
├── lib/
│   ├── ai.ts                       # Google Gemini API integration
│   ├── mock-data.ts                # 10 pre-loaded agents & sample conversations
│   ├── supabase.ts                 # Supabase client & real-time hooks
│   └── whatsapp.ts                 # Meta WhatsApp Cloud API helper
├── supabase/
│   └── schema.sql                  # Complete PostgreSQL schema, triggers & RLS policies
└── types/
    └── index.ts                    # Complete TypeScript definitions
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` (from Meta for Developers)
- `WHATSAPP_VERIFY_TOKEN` (any secret string you choose)
- `GEMINI_API_KEY` (free from [Google AI Studio](https://aistudio.google.com))

> **Note:** The app is pre-configured with realistic mock data and 10 active agents, so you can test the full multi-agent interface immediately even before setting up live API keys!

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Setting Up the Database (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, copy its entire contents, and click **Run**.
4. This will create:
   - `agents`, `contacts`, `conversations`, `messages`, `internal_notes`, `canned_responses`
   - Real-time WebSockets replication
   - Automatic unread count and timestamp triggers

---

## 📲 Connecting Meta WhatsApp Cloud API

1. Go to [developers.facebook.com](https://developers.facebook.com) and create a **Business App**.
2. Add the **WhatsApp** product.
3. Under **WhatsApp > Configuration**:
   - **Callback URL:** `https://your-domain.com/api/webhook` (or your ngrok URL for local dev).
   - **Verify Token:** The secret string you set in `WHATSAPP_VERIFY_TOKEN`.
   - **Webhook Fields:** Check `messages`.
4. Send a WhatsApp message to your test number—it will automatically show up in the multi-agent queue!

---

## 👥 Managing Your 10 Team Members

- In the top right corner of the header, use the **"Viewing Inbox As"** dropdown to switch between any of your 10 team members.
- When an agent is assigned a conversation, it moves into their personal **"Mine"** tab.
- Other agents viewing the same conversation will see an active collaboration notice to prevent collision.
