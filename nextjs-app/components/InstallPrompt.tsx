'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa-install-dismissed-at';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // スタンドアロン（PWA）モードでは非表示
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // 直近7日以内に dismiss 済みなら非表示
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_TTL_MS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div
        className={[
          'pointer-events-auto mx-3 mb-4 sm:max-w-sm w-full',
          'bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-none dark:ring-1 dark:ring-slate-700',
          'border border-slate-200 dark:border-transparent',
          'p-4 flex items-center gap-3',
          'animate-[slide-up_0.3s_ease-out]',
        ].join(' ')}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden">
          <Image
            src="/icons/icon-192.png"
            alt="KU-LMS+"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            ホーム画面に追加
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            アプリとして快適に使えます
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#004a8f] hover:bg-[#003a72] dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
        >
          <Download size={13} />
          追加
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label="閉じる"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
