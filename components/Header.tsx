'use client';

import React from 'react';
import { Agent } from '@/types';
import { MessageSquare, Users, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  agents: Agent[];
  currentAgent: Agent;
  onSelectAgent: (agent: Agent) => void;
  onlineCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  agents,
  currentAgent,
  onSelectAgent,
  onlineCount,
}) => {
  return (
    <header className="h-16 bg-[#075E54] text-white flex items-center justify-between px-6 shadow-md border-b border-[#128C7E]/40 z-20">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-inner">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight">WhatsApp Business Team Inbox</h1>
            <span className="text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-300" /> AI Co-pilot
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-emerald-100/80">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{onlineCount} of {agents.length} Team Members Online</span>
          </div>
        </div>
      </div>

      {/* Multi-Agent Role Switcher */}
      <div className="flex items-center space-x-4">
        <div className="bg-white/10 rounded-lg p-1.5 px-3 flex items-center space-x-3 border border-white/15">
          <div className="text-right">
            <div className="text-xs text-emerald-200 font-medium">Viewing Inbox As:</div>
            <div className="text-sm font-semibold">{currentAgent.name}</div>
          </div>
          
          <select
            value={currentAgent.id}
            onChange={(e) => {
              const selected = agents.find((a) => a.id === e.target.value);
              if (selected) onSelectAgent(selected);
            }}
            className="bg-[#128C7E] text-white text-xs font-medium rounded-md px-2.5 py-1.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.role === 'admin' ? '(Admin)' : '(Agent)'} {agent.is_online ? '●' : '○'}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
