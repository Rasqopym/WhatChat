'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosPrompt, setIsIosPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('whatchat_pwa_dismissed') === '1') {
      setDismissed(true);
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setIsIosPrompt(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleOpenInstall = () => {
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('whatchat-open-install', handleOpenInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('whatchat-open-install', handleOpenInstall);
    };
  }, []);

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
      setShowModal(false);
    }
  };

  const showFloatingBanner = !dismissed && (!!deferredPrompt || isIosPrompt);

  return (
    <>
      {showFloatingBanner && (
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
      )}

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#128C7E]" />
                <span>Install WhatChat App</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deferredPrompt ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Install WhatChat on your device for full-screen access, faster loading, and push alerts.
                </p>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="w-full py-2.5 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Now</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">Android (Chrome / Edge)</div>
                  <p className="text-slate-600 leading-relaxed">
                    Tap the <MoreVertical className="w-3.5 h-3.5 inline text-slate-700" /> menu in the top-right corner of Chrome, then tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">iPhone / iPad (Safari)</div>
                  <p className="text-slate-600 leading-relaxed">
                    Tap the <Share className="w-3.5 h-3.5 inline text-slate-700" /> <strong>Share</strong> button at the bottom of Safari, scroll down, and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
