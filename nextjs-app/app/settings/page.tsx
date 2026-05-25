'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Copy,
  Check,
  Smartphone,
  Bookmark,
  LogOut,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';

type ThemePreference = 'system' | 'light' | 'dark';

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

function SettingsContent() {
  const router = useRouter();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { theme: rawTheme, setTheme } = useTheme();

  // next-themes は初回マウント前に undefined を返すため 'system' をデフォルトとする
  const theme = (rawTheme ?? 'system') as ThemePreference;

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  const loaderCode = origin
    ? `javascript:(function(){var s=document.createElement('script');s.src='${origin}/api/bookmarklet?_='+Date.now();document.body.appendChild(s)})();`
    : '';

  async function handleCopy() {
    if (!loaderCode) return;
    try {
      await navigator.clipboard.writeText(loaderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API 非対応環境では何もしない（テキストボックスの select-all で手動コピー可）
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex flex-col min-h-dvh w-full sm:max-w-2xl md:max-w-4xl sm:mx-auto sm:border-x sm:border-slate-200 dark:sm:border-slate-700 bg-slate-50 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="px-4 pt-safe-top pb-3 flex items-center gap-3 flex-shrink-0 bg-brand-gradient">
        <button
          onClick={() => router.back()}
          className="text-white/80 hover:text-white transition-colors p-0.5"
          aria-label="戻る"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">設定</h1>
      </header>

      <main className="flex-1 px-4 py-5 pb-safe-bottom space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start md:content-start">

        {/* テーマ設定 */}
        <Section icon={<Monitor size={15} className="text-ku-blue dark:text-blue-400" />} title="テーマ">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={[
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-colors',
                  theme === value
                    ? 'bg-ku-blue dark:bg-blue-600 text-white border-ku-blue dark:border-blue-600'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
                ].join(' ')}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* ブックマークレット セクション（PC では 2 カラム全幅）*/}
        <Section icon={<Smartphone size={15} className="text-ku-blue dark:text-blue-400" />} title="スマホ用更新ツール（ブックマークレット）" className="md:col-span-2">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            iOS Safari など Chrome 拡張機能が使えない環境でも、
            <strong className="text-slate-700 dark:text-slate-200">ブックマークレット</strong>
            を登録しておくと WebClass を開くだけで課題データを取り込めます。
          </p>

          {/* ステップガイド */}
          <div className="space-y-2.5 pt-1">
            {SETUP_STEPS.map(({ n, label, sub }) => (
              <div key={n} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ku-blue dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {n}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                  {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* コードボックス */}
          <div className="pt-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              ブックマークの URL
            </p>
            <div className="relative bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-3 py-3 pr-11 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all leading-relaxed select-all">
                {loaderCode || '読み込み中...'}
              </div>
              <button
                onClick={handleCopy}
                disabled={!loaderCode}
                className={[
                  'absolute top-2 right-2 p-2 rounded-lg transition-all',
                  copied
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                    : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                  'disabled:opacity-40',
                ].join(' ')}
                aria-label="コピー"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="mt-2 px-1 space-y-1">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                ⚠️ このコードはブラウザの URL バーには入力できません
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                必ずブックマーク / お気に入りの「URL 欄」に貼り付けてください
              </p>
            </div>
          </div>
        </Section>

        {/* iOS Safari 手順 */}
        <Section icon={<Bookmark size={15} className="text-ku-blue dark:text-blue-400" />} title="iOS Safari での登録手順">
          <div className="space-y-2.5">
            {IOS_STEPS.map(({ n, text }) => (
              <div key={n} className="flex gap-3">
                <span className="flex-shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 w-4 text-right">
                  {n}.
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* アカウント */}
        <Section icon={<LogOut size={15} className="text-slate-500 dark:text-slate-400" />} title="アカウント">
          {userEmail && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              ログイン中: <span className="font-medium text-slate-700 dark:text-slate-200">{userEmail}</span>
            </p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            <LogOut size={15} />
            ログアウト
          </button>
        </Section>

        {/* ブックマークレットのセッションリセット説明 */}
        <div className="px-1 md:col-span-2">
          <div className="flex gap-2 items-start bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <Trash2 size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              ブックマークレットのログインをリセットしたい場合は、
              WebClass のページで「設定 → プライバシー → サイトデータを削除」から
              <strong> kulms_bm_v1_session </strong>
              を削除してください。
            </p>
          </div>
        </div>

        {/* フッターリンク */}
        <div className="flex justify-center pb-2 md:col-span-2">
          <button
            onClick={() => router.push('/legal')}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            利用規約・プライバシーポリシー
          </button>
        </div>

      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={['bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 overflow-hidden', className].filter(Boolean).join(' ')}>
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-3">{children}</div>
    </section>
  );
}

const SETUP_STEPS = [
  {
    n: 1,
    label: 'コードをコピーする',
    sub: '上の「ブックマークの URL」欄の右のコピーボタンをタップ',
  },
  {
    n: 2,
    label: 'ブラウザのお気に入りに新規追加し、URL 欄にコードを貼り付けて保存',
    sub: 'タイトルは「KU-LMS+ 同期」などわかりやすい名前にするとよいです',
  },
  {
    n: 3,
    label: 'WebClass（kulms.tl.kansai-u.ac.jp）にログインして時間割のページを開く',
    sub: undefined,
  },
  {
    n: 4,
    label: '保存したブックマークを選択して実行する',
    sub: '画面上部にトースト通知が表示され、完了まで自動で進みます',
  },
  {
    n: 5,
    label: '初回のみメールアドレスとパスワードの入力が求められます',
    sub: '2回目以降はセッションが自動で維持されます（最大1時間）',
  },
];

const IOS_STEPS = [
  {
    n: 1,
    text: 'まず任意のページを Safari でブックマーク追加（共有 → ブックマークに追加）',
  },
  {
    n: 2,
    text: 'Safari の「ブックマーク」タブを開き、追加したブックマークを長押し →「編集」',
  },
  {
    n: 3,
    text: 'URL 欄の内容を全て選択して削除し、コピーしたコードを貼り付けて「完了」',
  },
  {
    n: 4,
    text: 'WebClass のトップページ（時間割）を開き、アドレスバー横の「ブックマーク」ボタンから実行',
  },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType }[] = [
  { value: 'system', label: 'システム', icon: Monitor },
  { value: 'light',  label: 'ライト',   icon: Sun },
  { value: 'dark',   label: 'ダーク',   icon: Moon },
];
