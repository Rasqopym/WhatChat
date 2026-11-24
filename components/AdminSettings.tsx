'use client';

import React, { useState, useEffect } from 'react';
import { Agent, AppSettings } from '@/types';
import { 
  Settings, 
  Key, 
  Smartphone, 
  Sparkles, 
  Copy, 
  Check, 
  Users, 
  Plus, 
  Save, 
  ShieldAlert, 
  Eye, 
  EyeOff,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface AdminSettingsProps {
  settings: AppSettings;
  agents: Agent[];
  currentAgent: Agent;
  onSaveSettings: (newSettings: AppSettings) => void;
  onUpdateAgents: (newAgents: Agent[]) => void;
  onSwitchAgent?: (agent: Agent) => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  agents,
  currentAgent,
  onSaveSettings,
  onUpdateAgents,
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
  const [newAgentRole, setNewAgentRole] = useState<'admin' | 'agent'>('agent');
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newAgentName.trim() || !newAgentEmail.trim()) return;

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: newAgentName.trim(),
      email: newAgentEmail.trim(),
      role: newAgentRole,
      is_online: true,
      chats_handled: 0,
      avg_response_time: '0m',
      avatar_url: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=100`,
    };

    onUpdateAgents([...agents, newAgent]);
    setNewAgentName('');
    setNewAgentEmail('');
    setShowAddModal(false);
  };

  const handleToggleAgentRole = (agentId: string) => {
    if (!isAdmin) return;
    onUpdateAgents(
      agents.map((a) => (a.id === agentId ? { ...a, role: a.role === 'admin' ? 'agent' : 'admin' } : a))
    );
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

          {onSwitchAgent && (
            <button
              onClick={() => onSwitchAgent(adminAgent)}
              className="w-full py-3 bg-[#075E54] hover:bg-[#128C7E] text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-[#075E54]/20 transition-all cursor-pointer"
            >
              <span>Switch to Admin Account ({adminAgent.name})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
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
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              🛡️ Admin Privileges Active
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

      <form onSubmit={handleSave} className="space-y-8 pb-16">
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
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      agent.role === 'admin'
                        ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Role: {agent.role === 'admin' ? '🛡️ Administrator' : 'Support Agent'}
                  </button>
                </div>
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
                <span>✓ Saved & Activated!</span>
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
    </div>
  );
};
