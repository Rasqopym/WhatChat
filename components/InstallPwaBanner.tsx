'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosPrompt, setIsIosPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('whatchat_pwa_dismissed') === '1') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    if (isIos) {
      setIsIosPrompt(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (dismissed || (!deferredPrompt && !isIosPrompt)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatchat_pwa_dismissed', '1');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 right-4 left-4 md:left-auto md:w-80 z-40 bg-[#075E54] text-white rounded-2xl shadow-2xl border border-emerald-700 p-3.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-emerald-200" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold">Install WhatChat App</div>
          {isIosPrompt && !deferredPrompt ? (
            <div className="text-[11px] text-emerald-100 leading-snug">
              Tap <Share className="w-3 h-3 inline mx-0.5" /> Share, then <strong>Add to Home Screen</strong>.
            </div>
          ) : (
            <div className="text-[11px] text-emerald-100 truncate">
              Add to your phone for instant access
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 bg-white text-[#075E54] hover:bg-emerald-50 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 text-emerald-200 hover:text-white cursor-pointer"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
