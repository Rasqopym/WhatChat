'use client';

import React from 'react';
import { Agent } from '@/types';
import { 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Lock,
  Bell,
  BellOff,
  Megaphone
} from 'lucide-react';

export type ActiveView = 'inbox' | 'dashboard' | 'broadcasts' | 'settings';

interface SidebarNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  currentAgent: Agent;
  unreadCount: number;
  notificationPermission: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
  onLogout: () => void;
  hideMobileBar?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onSelectView,
  currentAgent,
  unreadCount,
  notificationPermission,
  onEnableNotifications,
  onLogout,
  hideMobileBar = false,
}) => {
  const isAdmin = currentAgent.role === 'admin';
  const alertsActive = notificationPermission === 'granted';

  return (
    <>
      {/* DESKTOP: Slim Left Vertical Rail */}
      <nav className="hidden md:flex w-16 bg-[#111b21] flex-col items-center justify-between py-4 select-none z-30 border-r border-slate-800 flex-shrink-0">
        <div className="flex flex-col items-center space-y-6">
          {/* Brand Logo */}
          <div 
            onClick={() => onSelectView('inbox')}
            className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-slate-900 shadow-md cursor-pointer hover:scale-105 transition-transform"
            title="WhatChat Multi-Business Inbox"
          >
            <MessageSquare className="w-5 h-5" />
          </div>

          {/* Nav Icons */}
          <div className="flex flex-col items-center space-y-3">
            <button
              onClick={() => onSelectView('inbox')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
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

            <button
              onClick={() => onSelectView('dashboard')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-slate-700/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isAdmin ? 'Company Dashboard (Admin)' : 'My Performance Stats (Agent)'}
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>

            <button
              onClick={() => onSelectView('broadcasts')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                activeView === 'broadcasts'
                  ? 'bg-slate-700/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isAdmin ? 'Broadcast Campaigns (Admin)' : 'Broadcasts (Admin Only)'}
            >
              <Megaphone className="w-5 h-5" />
              {!isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500/90 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('settings')}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                activeView === 'settings'
                  ? 'bg-slate-700/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isAdmin ? 'Admin & Businesses Settings' : 'Settings (Admin Only - Locked)'}
            >
              <Settings className="w-5 h-5" />
              {!isAdmin && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500/90 text-slate-950 text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}
            </button>

            {/* Push Notification Toggle */}
            <button
              onClick={onEnableNotifications}
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                alertsActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10 animate-pulse'
              }`}
              title={alertsActive ? 'Push Notifications Active' : 'Click to Enable Push Notifications'}
            >
              {alertsActive ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bottom Profile & Logout */}
        <div className="flex flex-col items-center space-y-3">
          <div 
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
              isAdmin ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40' : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isAdmin ? 'Admin' : 'Agent'}
          </div>

          <div className="relative" title={`${currentAgent.name} (${currentAgent.role})`}>
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

          <button
            onClick={onLogout}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Sign out / Switch user"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* MOBILE: Sleek Fixed Bottom Tab Bar */}
      {!hideMobileBar && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#111b21]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2 z-40 select-none">
          <button
            onClick={() => onSelectView('inbox')}
            className={`flex flex-col items-center justify-center space-y-0.5 px-3 py-1 rounded-xl relative ${
              activeView === 'inbox' ? 'text-[#25D366]' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-[#25D366] text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">Chats</span>
          </button>

          <button
            onClick={() => onSelectView('dashboard')}
            className={`flex flex-col items-center justify-center space-y-0.5 px-2.5 py-1 rounded-xl ${
              activeView === 'dashboard' ? 'text-[#25D366]' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Stats</span>
          </button>

          <button
            onClick={() => onSelectView('broadcasts')}
            className={`flex flex-col items-center justify-center space-y-0.5 px-2.5 py-1 rounded-xl ${
              activeView === 'broadcasts' ? 'text-[#25D366]' : 'text-slate-400'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Campaign</span>
          </button>

          <button
            onClick={onEnableNotifications}
            className={`flex flex-col items-center justify-center space-y-0.5 px-3 py-1 rounded-xl ${
              alertsActive ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {alertsActive ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            <span className="text-[10px] font-semibold">{alertsActive ? 'Alerts On' : 'Enable Push'}</span>
          </button>

          <button
            onClick={() => onSelectView('settings')}
            className={`flex flex-col items-center justify-center space-y-0.5 px-3 py-1 rounded-xl relative ${
              activeView === 'settings' ? 'text-[#25D366]' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Settings className="w-5 h-5" />
              {!isAdmin && <Lock className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1" />}
            </div>
            <span className="text-[10px] font-semibold">Settings</span>
          </button>

          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center space-y-0.5 px-3 py-1 rounded-xl text-slate-400 hover:text-rose-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Switch</span>
          </button>
        </nav>
      )}
    </>
  );
};
