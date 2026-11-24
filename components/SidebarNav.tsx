'use client';

import React from 'react';
import { Agent } from '@/types';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Lock,
  User
} from 'lucide-react';

export type ActiveView = 'inbox' | 'dashboard' | 'settings';

interface SidebarNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  currentAgent: Agent;
  unreadCount: number;
  onLogout: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onSelectView,
  currentAgent,
  unreadCount,
  onLogout,
}) => {
  const isAdmin = currentAgent.role === 'admin';

  return (
    <nav className="w-16 bg-[#111b21] flex flex-col items-center justify-between py-4 select-none z-30 border-r border-slate-800 flex-shrink-0">
      {/* Top brand & nav buttons */}
      <div className="flex flex-col items-center space-y-6">
        {/* Brand Logo */}
        <div 
          onClick={() => onSelectView('inbox')}
          className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-slate-900 shadow-md cursor-pointer hover:scale-105 transition-transform"
          title="WhatsApp Multi-Agent Inbox"
        >
          <MessageSquare className="w-5 h-5" />
        </div>

        {/* Navigation Icons */}
        <div className="flex flex-col items-center space-y-3">
          {/* Inbox / Chats (Accessible by All) */}
          <button
            onClick={() => onSelectView('inbox')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all ${
              activeView === 'inbox'
                ? 'bg-slate-700/80 text-white shadow-inner'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Team Inbox"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#25D366] text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Analytics Dashboard (Admin View vs Personal Agent View) */}
          <button
            onClick={() => onSelectView('dashboard')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              activeView === 'dashboard'
                ? 'bg-slate-700/80 text-white shadow-inner'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isAdmin ? 'Company Dashboard (Admin)' : 'My Performance Stats (Agent)'}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>

          {/* Admin Settings (Locked for Support Agents) */}
          <button
            onClick={() => onSelectView('settings')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all ${
              activeView === 'settings'
                ? 'bg-slate-700/80 text-white shadow-inner'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isAdmin ? 'Admin & System Settings' : 'Settings (Admin Only - Locked)'}
          >
            <Settings className="w-5 h-5" />
            {!isAdmin && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500/90 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                <Lock className="w-2.5 h-2.5" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom user profile & logout */}
      <div className="flex flex-col items-center space-y-3">
        {/* Role Indicator Pill */}
        <div 
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
            isAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40' : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
          }`}
          title={`Logged in as ${isAdmin ? 'System Administrator' : 'Support Agent'}`}
        >
          {isAdmin ? 'Admin' : 'Agent'}
        </div>

        {/* Agent Profile avatar */}
        <div className="relative group cursor-pointer" title={`${currentAgent.name} (${currentAgent.role})`}>
          <img
            src={currentAgent.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
            alt={currentAgent.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-slate-700"
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
              currentAgent.is_online ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Sign out / Switch user"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};
