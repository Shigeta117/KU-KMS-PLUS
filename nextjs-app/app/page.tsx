'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, Download, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh flex flex-col w-full sm:max-w-3xl sm:mx-auto bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon-192.png"
            alt="KU-LMS+ Logo"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <span className="font-bold text-lg tracking-tight">KU-LMS+</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-semibold text-[#0066cc] dark:text-blue-400 hover:opacity-80 transition-opacity"
        >
          ログイン
        </button>
      </header>

      <main className="flex-1">
        
        {/* Hero Section */}
        <section className="px-6 py-16 md:py-24 text-center space-y-6">
          <div className="inline-block px-3 py-1 mb-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold tracking-wide border border-blue-100 dark:border-blue-800/50">
            Unofficial Chrome Extension
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            WebClassの課題を、<br className="sm:hidden" />もっとスマートに。
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            関西大学のWebClassから課題情報を自動収集し、見やすいダッシュボードで一元管理。複数ログインの強制ログアウトも防ぐ、安全で便利な非公式拡張機能です。
          </p>
          
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              style={{ background: '#004a8f' }}
            >
              <Download size={18} />
              導入方法を見る
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <LayoutDashboard size={18} />
              ダッシュボードへ
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-16 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-center mb-10">主な機能</h2>
          <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <FeatureCard 
              icon={<Zap className="text-yellow-500" />}
              title="自動収集 & 同期"
              description="授業ページを開くだけで、課題の期限やタイトルを自動的に取得しデータベースに同期します。"
            />
            <FeatureCard 
              icon={<LayoutDashboard className="text-blue-500" />}
              title="整理されたダッシュボード"
              description="期限切れ、期限内、提出済みなどを自動ソート。今やるべき課題が一目でわかります。"
            />
            <FeatureCard 
              icon={<ShieldCheck className="text-green-500" />}
              title="ログアウト防止"
              description="バックグラウンド取得時の複数ログイン検知を回避するハイブリッド通信を採用し、安全に動作します。"
            />
            <FeatureCard 
              icon={<CheckCircle2 className="text-purple-500" />}
              title="LMS画面に直接反映"
              description="WebClassの画面上に同期ステータスや「完了済み」ラベルを直接表示し、シームレスに連携します。"
            />
          </div>
        </section>

        {/* Setup Guide */}
        <section id="setup" className="px-6 py-16 max-w-2xl mx-auto space-y-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">セットアップガイド</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              利用を開始するまでの3つのステップ
            </p>
          </div>

          <div className="space-y-6">
            <StepCard number="1" title="拡張機能のインストール">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                現在、デベロッパーモードでのインストールが必要です。（Chromeストア版は準備中）
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside space-y-1 ml-1">
                <li>拡張機能のZIPファイルをダウンロードして解凍</li>
                <li>Chromeの <code>chrome://extensions/</code> を開く</li>
                <li>右上の「デベロッパーモード」をオンにする</li>
                <li>「パッケージ化されていない拡張機能を読み込む」から解凍したフォルダを選択</li>
              </ul>
            </StepCard>

            <StepCard number="2" title="アカウントの設定">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                ダッシュボードを利用するためには、関大ユーザーID（〜@kansai-u.ac.jp）を用いたアカウント登録が必要です。
              </p>
              <button
                onClick={() => router.push('/signup')}
                className="text-sm font-bold text-[#0066cc] dark:text-blue-400 flex items-center gap-1 hover:underline"
              >
                新規アカウントを作成する <ArrowRight size={14} />
              </button>
            </StepCard>

            <StepCard number="3" title="WebClassにアクセス">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                拡張機能が有効な状態でWebClassにログインし、各授業ページを開いてください。
                画面右下にステータスバーが表示され、自動的に課題の同期が開始されます。
              </p>
            </StepCard>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200 dark:border-slate-800 text-center space-y-4">
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">
          ※本拡張機能は学生が独自に開発した非公式ツールであり、関西大学およびWebClass公式とは一切関係ありません。
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/legal" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            利用規約・プライバシーポリシー
          </Link>
        </div>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} KU-LMS+ Unofficial Extension
        </p>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
        {icon}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, children }: { number: string, title: string, children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#004a8f] text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="pt-1">
        <h3 className="font-bold mb-2 text-slate-800 dark:text-slate-100">{title}</h3>
        {children}
      </div>
    </div>
  );
}
