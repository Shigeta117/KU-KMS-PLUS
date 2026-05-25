import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { CHANGELOG, LATEST_VERSION, type ChangeType, type ChangeComponent } from '@/lib/changelog';
import { ChangelogCard } from '@/app/page';

export const metadata = {
  title: '変更履歴 — KU-LMS+',
  description: 'KU-LMS+ のアップデート履歴',
};

const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  feat: '新機能',
  fix: 'バグ修正',
  chore: 'メンテナンス',
};

const COMPONENT_LABEL: Record<ChangeComponent, string> = {
  extension: '拡張機能',
  app: 'ウェブアプリ',
  other: 'その他',
};

export default function ChangelogPage() {
  return (
    <div className="min-h-dvh flex flex-col w-full sm:max-w-3xl sm:mx-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">

      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="トップページに戻る"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-500" />
          <h1 className="font-bold text-lg">変更履歴</h1>
        </div>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">最新: v{LATEST_VERSION}</span>
      </header>

      {/* Filter legend */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-400 dark:text-slate-500">タイプ:</span>
        {(Object.entries(CHANGE_TYPE_LABEL) as [ChangeType, string][]).map(([, label]) => (
          <span key={label}>{label}</span>
        ))}
        <span className="font-semibold text-slate-400 dark:text-slate-500 ml-2">対象:</span>
        {(Object.entries(COMPONENT_LABEL) as [ChangeComponent, string][]).map(([, label]) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <main className="flex-1 px-6 py-8">
        <div className="space-y-3">
          {CHANGELOG.map((entry) => (
            <ChangelogCard key={entry.version} entry={entry} />
          ))}
        </div>
      </main>

      <footer className="px-6 py-6 border-t border-slate-100 dark:border-slate-800 text-center">
        <Link href="/" className="text-sm text-ku-accent dark:text-blue-400 hover:opacity-80 transition-opacity">
          ← トップページに戻る
        </Link>
      </footer>

    </div>
  );
}
