'use client';

import React, { useState, useEffect } from 'react';
import { Agent } from '@/types';
import { supabase } from '@/lib/supabase';
import { MessageSquare, Lock, Mail, ShieldCheck, ArrowRight, User, Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (agent: Agent) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/status?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.hasAgents === false) {
          setNeedsInitialSetup(true);
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingSetup(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (needsInitialSetup) {
        // 1. Bootstrap First Admin Account
        const setupRes = await fetch('/api/auth/setup-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const setupData = await setupRes.json();
        if (setupRes.status === 403) {
          // Admin already exists: switch to Sign In mode and continue signing in!
          setNeedsInitialSetup(false);
        } else if (!setupRes.ok) {
          setErrorMsg(setupData.error || 'Failed to create Admin account');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Sign in with Supabase Auth
      const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr || !authData.user) {
        setErrorMsg(signInErr?.message || 'Invalid email or password');
        setIsSubmitting(false);
        return;
      }

      // 3. Fetch agent profile
      const agentsRes = await fetch('/api/agents', { cache: 'no-store' });
      const agentsData = await agentsRes.json();
      const matchedAgent = (agentsData.agents || []).find((a: Agent) => a.id === authData.user.id);

      if (matchedAgent) {
        // Mark agent online
        fetch('/api/agents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: matchedAgent.id, isOnline: true }),
        }).catch(() => {});

        onLoginSuccess({ ...matchedAgent, is_online: true });
      } else {
        onLoginSuccess({
          id: authData.user.id,
          email: authData.user.email || email,
          name: authData.user.user_metadata?.name || email.split('@')[0],
          role: authData.user.user_metadata?.role === 'admin' ? 'admin' : 'agent',
          is_online: true,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSetup) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center space-x-3 text-sm text-slate-300">
          <Loader2 className="w-5 h-5 animate-spin text-[#25D366]" />
          <span>Checking workspace authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#128C7E]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-8 z-10">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-[#25D366]/30 mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {needsInitialSetup ? 'Create Primary Admin' : 'WhatChat Team Login'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {needsInitialSetup
              ? 'Set up your first Administrator password to secure your team inbox'
              : 'Sign in with your team email & password'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsInitialSetup && (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#25D366] hover:bg-[#1ebd5a] text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-[#25D366]/25 mt-6 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{needsInitialSetup ? 'Creating Admin...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{needsInitialSetup ? 'Create Admin & Enter' : 'Sign In to Inbox'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {needsInitialSetup && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setNeedsInitialSetup(false);
                setErrorMsg(null);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Already have an account? Sign In instead
            </button>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secured by Supabase Auth & Role-Based Access Control</span>
          </div>
        </div>
      </div>
    </div>
  );
};
