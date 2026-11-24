'use client';

import React, { useState } from 'react';
import { Agent } from '@/types';
import { MessageSquare, Lock, Mail, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface LoginPageProps {
  agents: Agent[];
  onLogin: (agent: Agent) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ agents, onLogin }) => {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0].id);
  const [email, setEmail] = useState(agents[0].email);
  const [password, setPassword] = useState('password123');

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    const ag = agents.find((a) => a.id === agentId);
    if (ag) {
      setEmail(ag.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const agent = agents.find((a) => a.id === selectedAgentId) || agents[0];
    onLogin(agent);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#128C7E]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-8 z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-[#25D366]/30 mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">WhatsApp Team Inbox</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-Agent Business Portal • 10 Devices</p>
        </div>

        {/* Quick Agent Selector for Instant Testing */}
        <div className="mb-6 bg-slate-900/70 p-3.5 rounded-xl border border-slate-700">
          <label className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select 1 of 10 Team Members to Log in</span>
          </label>
          <select
            value={selectedAgentId}
            onChange={(e) => handleSelectAgent(e.target.value)}
            className="w-full bg-slate-800 text-white text-sm font-medium rounded-lg p-2.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {agent.role === 'admin' ? '🛡️ Admin' : '👤 Support Agent'}
              </option>
            ))}
          </select>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-[#25D366]/25 mt-6 cursor-pointer"
          >
            <span>Enter Team Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Security Footer */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>End-to-End Encrypted Session & Multi-Device Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
