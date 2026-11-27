'use client';

import React, { useState } from 'react';
import { Agent, AppSettings, Business, CannedResponse } from '@/types';
import { 
  Settings, 
  Smartphone, 
  Sparkles, 
  Copy, 
  Check, 
  Users, 
  Plus, 
  Save, 
  Eye, 
  EyeOff,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Building2,
  Trash2,
  Pencil,
  Shield,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface AdminSettingsProps {
  settings: AppSettings;
  agents: Agent[];
  businesses: Business[];
  cannedResponses?: CannedResponse[];
  currentAgent: Agent;
  onSaveSettings: (newSettings: AppSettings) => void;
  onUpdateAgents: (newAgents: Agent[]) => void;
  onUpdateBusinesses: (newBusinesses: Business[]) => void;
  onUpdateCannedResponses?: (newCanned: CannedResponse[]) => void;
  onSwitchAgent?: (agent: Agent) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  agents,
  businesses,
  cannedResponses = [],
  currentAgent,
  onSaveSettings,
  onUpdateAgents,
  onUpdateBusinesses,
  onUpdateCannedResponses,
  onSwitchAgent,
}) => {
  const isAdmin = currentAgent.role === 'admin';

  const [form, setForm] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp_app_settings');
      if (saved) {
        try {
          return { ...settings, ...JSON.parse(saved) };
        } catch (e) {}
      }
    }
    return settings;
  });

  const [showToken, setShowToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Agent Modal Form
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'admin' | 'agent'>('agent');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add / Edit Business Modal Form
  const [showBizModal, setShowBizModal] = useState(false);

  // Add / Edit Canned Quick Reply Modal Form
  const [showCannedModal, setShowCannedModal] = useState(false);
  const [editingCannedId, setEditingCannedId] = useState<string | null>(null);
  const [cannedShortcut, setCannedShortcut] = useState('');
  const [cannedTitle, setCannedTitle] = useState('');
  const [cannedContent, setCannedContent] = useState('');
  const [isSavingCanned, setIsSavingCanned] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [newBizName, setNewBizName] = useState('');
  const [newBizPhone, setNewBizPhone] = useState('');
  const [newBizPhoneId, setNewBizPhoneId] = useState('');
  const [newBizToken, setNewBizToken] = useState('');
  const [newBizColor, setNewBizColor] = useState('#128C7E');
  const [newBizContext, setNewBizContext] = useState('');

  const openAddBizModal = () => {
    setEditingBizId(null);
    setNewBizName('');
    setNewBizPhone('');
    setNewBizPhoneId('');
    setNewBizToken('');
    setNewBizColor('#128C7E');
    setNewBizContext('');
    setShowBizModal(true);
  };

  const openEditBizModal = (biz: Business) => {
    setEditingBizId(biz.id);
    setNewBizName(biz.name);
    setNewBizPhone(biz.display_phone_number || '');
    setNewBizPhoneId(biz.whatsapp_phone_number_id);
    setNewBizToken('');
    setNewBizColor(biz.brand_color || '#128C7E');
    setNewBizContext(biz.ai_context || '');
    setShowBizModal(true);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newBizName.trim() || !newBizPhoneId.trim()) return;

    const payload = {
      id: editingBizId || undefined,
      name: newBizName.trim(),
      display_phone_number: newBizPhone.trim(),
      whatsapp_phone_number_id: newBizPhoneId.trim(),
      whatsapp_access_token: newBizToken.trim() || undefined,
      brand_color: newBizColor,
      ai_context: newBizContext.trim(),
    };

    const saveBizList = (updatedList: Business[]) => {
      onUpdateBusinesses(updatedList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('whatsapp_businesses', JSON.stringify(updatedList));
      }
    };

    const isMockId = editingBizId?.startsWith('biz-');

    if (editingBizId && !isMockId) {
      // Update existing DB business
      try {
        const res = await fetch('/api/businesses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        const updatedBiz = res.ok && data.business ? data.business : { ...payload, id: editingBizId };
        saveBizList(businesses.map((b) => (b.id === editingBizId ? { ...b, ...updatedBiz, id: editingBizId } : b)));
      } catch {
        saveBizList(businesses.map((b) => (b.id === editingBizId ? { ...b, ...payload, id: editingBizId } : b)));
      }
    } else {
      // Create new business (or promote edited mock business to Supabase)
      try {
        const res = await fetch('/api/businesses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.business) {
          if (editingBizId) {
            saveBizList(businesses.map((b) => (b.id === editingBizId ? data.business : b)));
          } else {
            saveBizList([...businesses, data.business]);
          }
        } else {
          if (editingBizId) {
            saveBizList(businesses.map((b) => (b.id === editingBizId ? { ...b, ...payload, id: editingBizId } : b)));
          } else {
            saveBizList([...businesses, { ...payload, id: `biz-${Date.now()}` }]);
          }
        }
      } catch {
        if (editingBizId) {
          saveBizList(businesses.map((b) => (b.id === editingBizId ? { ...b, ...payload, id: editingBizId } : b)));
        } else {
          saveBizList([...businesses, { ...payload, id: `biz-${Date.now()}` }]);
        }
      }
    }

    setEditingBizId(null);
    setNewBizName('');
    setNewBizPhone('');
    setNewBizPhoneId('');
    setNewBizToken('');
    setNewBizContext('');
    setShowBizModal(false);
  };

  const handleDeleteBusiness = async (bizId: string) => {
    if (!isAdmin) return;
    const updated = businesses.filter((b) => b.id !== bizId);
    onUpdateBusinesses(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsapp_businesses', JSON.stringify(updated));
    }
    try {
      await fetch(`/api/businesses?id=${bizId}`, { method: 'DELETE' });
    } catch {}
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : 'https://your-domain.com/api/webhook';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    try {
      // 1. Save to state
      onSaveSettings(form);

      // 2. Persist to browser localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('whatsapp_app_settings', JSON.stringify(form));
      }

      // 3. Post to backend API to activate keys in runtime
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newAgentName.trim() || !newAgentEmail.trim() || newAgentPassword.length < 6) return;

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName.trim(),
          email: newAgentEmail.trim(),
          password: newAgentPassword,
          role: newAgentRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to create agent: ${data.error || 'Unknown error'}`);
        return;
      }

      if (data.agent) {
        onUpdateAgents([...agents, data.agent]);
      }
      setNewAgentName('');
      setNewAgentEmail('');
      setNewAgentPassword('');
      setShowAddModal(false);
    } catch (err: any) {
      alert(`Error creating agent: ${err.message}`);
    }
  };

  const handleToggleAgentRole = async (agentId: string) => {
    if (!isAdmin) return;
    const target = agents.find((a) => a.id === agentId);
    if (!target) return;
    const nextRole = target.role === 'admin' ? 'agent' : 'admin';

    onUpdateAgents(
      agents.map((a) => (a.id === agentId ? { ...a, role: nextRole } : a))
    );

    try {
      await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, role: nextRole }),
      });
    } catch {}
  };

  const openAddCannedModal = () => {
    setEditingCannedId(null);
    setCannedShortcut('');
    setCannedTitle('');
    setCannedContent('');
    setShowCannedModal(true);
  };

  const openEditCannedModal = (item: CannedResponse) => {
    setEditingCannedId(item.id);
    setCannedShortcut(item.shortcut);
    setCannedTitle(item.title);
    setCannedContent(item.content);
    setShowCannedModal(true);
  };

  const handleSaveCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cannedShortcut.trim() || !cannedTitle.trim() || !cannedContent.trim() || isSavingCanned) return;

    setIsSavingCanned(true);
    try {
      const isUuid = editingCannedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingCannedId);
      const method = isUuid ? 'PATCH' : 'POST';
      const res = await fetch('/api/canned-responses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: isUuid ? editingCannedId : undefined,
          shortcut: cannedShortcut,
          title: cannedTitle,
          content: cannedContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to save quick reply: ${data.error || 'Unknown error'}`);
        return;
      }

      if (data.cannedResponse && onUpdateCannedResponses) {
        if (isUuid) {
          onUpdateCannedResponses(
            cannedResponses.map((c) => (c.id === editingCannedId ? data.cannedResponse : c))
          );
        } else {
          const base = cannedResponses.filter((c) => !c.id.startsWith('c-') || c.id !== editingCannedId);
          onUpdateCannedResponses([...base, data.cannedResponse]);
        }
      }
      setShowCannedModal(false);
    } catch (err: any) {
      alert(`Error saving quick reply: ${err.message}`);
    } finally {
      setIsSavingCanned(false);
    }
  };

  const handleDeleteCanned = async (id: string) => {
    if (!confirm('Delete this canned quick reply?')) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (onUpdateCannedResponses) {
      onUpdateCannedResponses(cannedResponses.filter((c) => c.id !== id));
    }
    if (isUuid) {
      await fetch(`/api/canned-responses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  // ACCESS DENIED VIEW FOR REGULAR SUPPORT AGENTS
  if (!isAdmin) {
    const adminAgent = agents.find((a) => a.role === 'admin') || agents[0];

    return (
      <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-12 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Role: Support Agent (Restricted)
            </span>
            <h2 className="text-2xl font-bold text-slate-900">Administrator Access Required</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              You are currently signed in as <strong className="text-slate-800">{currentAgent.name}</strong> (Support Agent). 
              System configurations, Meta API credentials, and Team Permissions are strictly restricted to Administrators.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-3">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Access Control Policy
            </div>
            
            <div className="flex items-start space-x-2 text-slate-600">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Support Agents:</strong> Handle WhatsApp chats, draft AI replies, create internal team notes, and view personal metrics.</span>
            </div>

            <div className="flex items-start space-x-2 text-slate-600">
              <span className="text-purple-600 font-bold">🛡️</span>
              <span><strong>Administrators:</strong> Manage Meta Cloud API keys, Webhooks, AI model settings, and invite/promote team members.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FULL ADMIN VIEW
  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-8 space-y-8 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-[#128C7E]" />
              <span>Admin & Multi-Device Control Center</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Privileges Active</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure Meta Cloud API, Google Gemini AI, and manage your 10 device seats
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1.5 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Configurations Saved & Live!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8 pb-24 md:pb-16">
        {/* Section 0: Multi-Business Management */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Businesses & WhatsApp Lines ({businesses.length})</h2>
                <p className="text-xs text-slate-500">Connect multiple businesses to this single inbox using their Phone Number IDs</p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddBizModal}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Business</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {businesses.map((biz) => (
              <div key={biz.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      style={{ backgroundColor: `${biz.brand_color}18`, color: biz.brand_color }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: biz.brand_color }}
                      />
                      <span>{biz.name}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditBizModal(biz)}
                        className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                        title="Edit Business"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBusiness(biz.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Remove Business"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-slate-700 mt-2">{biz.display_phone_number || 'No display number'}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {biz.whatsapp_phone_number_id}</div>
                </div>
                {biz.ai_context && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 border-t border-slate-200/70 pt-2">
                    AI: {biz.ai_context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 1: Meta WhatsApp Cloud API */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Meta WhatsApp Cloud API Connection</h2>
              <p className="text-xs text-slate-500">Connect your registered WhatsApp Business phone number</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone Number ID */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Phone Number ID
              </label>
              <input
                type="text"
                value={form.phoneNumberId}
                onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                placeholder="e.g. 183817118259972"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>

            {/* Verify Token */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={form.verifyToken}
                onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                placeholder="Secret verification string"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>

            {/* Permanent Access Token */}
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                WhatsApp Access Token (Temporary or Permanent System User Token)
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.accessToken}
                  onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                  placeholder="EAAsz..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Webhook Callback URL Copy */}
            <div className="md:col-span-2 bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800">Your Meta Webhook Callback URL:</div>
                <div className="text-xs text-slate-500 font-mono mt-0.5 select-all">{webhookUrl}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied!' : 'Copy Webhook URL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: AI Co-Pilot & Automation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Gemini AI Co-Pilot & Auto-Replies</h2>
              <p className="text-xs text-slate-500">Configure AI auto-drafting and intelligent out-of-hours bots</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={form.geminiApiKey}
                onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Obtain a free API key with generous limits from{' '}
                <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-purple-600 underline">
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Auto-Reply Greeting Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Automated First Response</div>
                <div className="text-xs text-slate-500">Automatically acknowledge inbound customer messages</div>
              </div>
              <input
                type="checkbox"
                checked={form.autoReplyEnabled}
                onChange={(e) => setForm({ ...form, autoReplyEnabled: e.target.checked })}
                className="w-5 h-5 accent-[#128C7E] cursor-pointer"
              />
            </div>

            {form.autoReplyEnabled && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Welcome / Acknowledgment Message
                </label>
                <textarea
                  rows={2}
                  value={form.autoReplyMessage}
                  onChange={(e) => setForm({ ...form, autoReplyMessage: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
                />
              </div>
            )}

            {/* Round-Robin Auto-Assignment Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Automatic Round-Robin Assignment</div>
                <div className="text-xs text-slate-500">
                  Assign new incoming chats to the online agent with the fewest active tickets
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!form.autoAssignEnabled}
                onChange={(e) => setForm({ ...form, autoAssignEnabled: e.target.checked })}
                className="w-5 h-5 accent-[#128C7E] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: 10 Team Members & Device Access */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">10 Team Member Accounts & Roles</h2>
                <p className="text-xs text-slate-500">Manage agent logins and permissions across simultaneous devices</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Invite New Agent</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {agents.map((agent) => (
              <div key={agent.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={agent.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                    alt={agent.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{agent.name}</div>
                    <div className="text-[11px] text-slate-400">{agent.email}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAgentRole(agent.id)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      agent.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Role:</span>
                    {agent.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrator</span>
                      </span>
                    ) : (
                      <span>Support Agent</span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Canned Quick Replies (/shortcuts) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Canned Quick Replies ({cannedResponses.length})</h2>
                <p className="text-xs text-slate-500">Create reusable /shortcut replies that agents can insert in one click</p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddCannedModal}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quick Reply</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cannedResponses.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#128C7E]">{item.shortcut}</span>
                    <span className="text-xs font-bold text-slate-800 ml-1.5">— {item.title}</span>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditCannedModal(item)}
                      className="text-slate-400 hover:text-indigo-600 p-1 cursor-pointer"
                      title="Edit Quick Reply"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCanned(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                      title="Delete Quick Reply"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{item.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Sticky Save Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {saveSuccess ? (
              <div className="flex items-center space-x-2 text-emerald-700 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Configurations successfully saved and activated!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400">
                Clicking save stores credentials locally and updates the active runtime.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`px-7 py-3 text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-lg transition-all cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-[#075E54] hover:bg-[#128C7E] shadow-[#075E54]/25'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Configurations...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Activated!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Configurations</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Team Member Device Account</h3>
            
            <form onSubmit={handleAddAgent} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newAgentEmail}
                  onChange={(e) => setNewAgentEmail(e.target.value)}
                  placeholder="alex@business.com"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Password (min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAgentPassword}
                  onChange={(e) => setNewAgentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Role</label>
                <select
                  value={newAgentRole}
                  onChange={(e) => setNewAgentRole(e.target.value as any)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                >
                  <option value="agent">Support Agent</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#128C7E] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#075E54]"
                >
                  Add Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Business Modal */}
      {showBizModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>{editingBizId ? 'Edit Business WhatsApp Line' : 'Add New Business WhatsApp Line'}</span>
            </h3>

            <form onSubmit={handleSaveBusiness} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Business / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={newBizName}
                  onChange={(e) => setNewBizName(e.target.value)}
                  placeholder="e.g. Apex Logistics"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Display Phone Number</label>
                  <input
                    type="text"
                    value={newBizPhone}
                    onChange={(e) => setNewBizPhone(e.target.value)}
                    placeholder="+234 805..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Badge Color</label>
                  <input
                    type="color"
                    value={newBizColor}
                    onChange={(e) => setNewBizColor(e.target.value)}
                    className="w-full h-9 p-1 border border-slate-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Meta Phone Number ID *</label>
                <input
                  type="text"
                  required
                  value={newBizPhoneId}
                  onChange={(e) => setNewBizPhoneId(e.target.value)}
                  placeholder="15-digit ID from Meta API Setup"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Access Token (Optional if shared)</label>
                <input
                  type="password"
                  value={newBizToken}
                  onChange={(e) => setNewBizToken(e.target.value)}
                  placeholder="Leave blank to use default Meta token"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">AI Context / Business Info</label>
                <textarea
                  rows={2}
                  value={newBizContext}
                  onChange={(e) => setNewBizContext(e.target.value)}
                  placeholder="Products, pricing, return policy for this business..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBizModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700"
                >
                  Save Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Canned Quick Reply Modal */}
      {showCannedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>{editingCannedId ? 'Edit Canned Quick Reply' : 'Add Canned Quick Reply'}</span>
            </h3>

            <form onSubmit={handleSaveCanned} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Shortcut *</label>
                  <input
                    type="text"
                    required
                    value={cannedShortcut}
                    onChange={(e) => setCannedShortcut(e.target.value)}
                    placeholder="/shipping"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={cannedTitle}
                    onChange={(e) => setCannedTitle(e.target.value)}
                    placeholder="Delivery Info"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Reply Message *</label>
                <textarea
                  rows={3}
                  required
                  value={cannedContent}
                  onChange={(e) => setCannedContent(e.target.value)}
                  placeholder="Orders within Lagos arrive in 24-48 hours..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCannedModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCanned}
                  className="px-4 py-1.5 bg-[#128C7E] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#075E54] disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCanned ? 'Saving...' : 'Save Quick Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
