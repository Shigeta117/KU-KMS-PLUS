'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function LegalPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-dvh w-full sm:max-w-2xl sm:mx-auto sm:border-x sm:border-slate-200 dark:sm:border-slate-700 bg-slate-50 dark:bg-slate-900">
      <header
        className="px-4 pt-safe-top pb-3 flex items-center gap-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004a8f, #0066cc)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-white/80 hover:text-white transition-colors p-0.5"
          aria-label="戻る"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">利用規約・プライバシーポリシー</h1>
      </header>

      <main className="flex-1 px-4 py-6 pb-safe-bottom space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">利用規約</h2>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">1. 本サービスについて</h3>
            <p className="text-red-600 dark:text-red-400 font-medium mb-2">
              ※本拡張機能は学生が独自に開発した非公式ツールであり、関西大学およびWebClass公式とは一切関係ありません。
            </p>
            <p>
              KU-LMS+（以下「本サービス」）は、関西大学の学習管理システム WebClass の課題情報を個人的に管理・閲覧するためのツールです。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">2. 利用条件</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>本サービスは個人利用のみを対象としています</li>
              <li>WebClass のアカウントは正規の方法で取得したものを使用してください</li>
              <li>第三者のアカウントを無断で使用することを禁止します</li>
              <li>本サービスを通じて収集した情報を第三者と共有しないでください</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">3. 免責事項</h3>
            <p>
              本サービスは現状のまま提供されます。データの正確性・完全性を保証するものではなく、
              本サービスの利用によって生じた損害について開発者は一切責任を負いません。
              WebClass 側の仕様変更により予告なく動作しなくなる場合があります。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">4. サービスの変更・終了</h3>
            <p>
              開発者は予告なく本サービスの内容を変更・停止・終了する場合があります。
            </p>
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-700" />

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">プライバシーポリシー</h2>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">収集する情報</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>メールアドレス（アカウント認証のみに使用）</li>
              <li>WebClass から取得した課題情報（タイトル・期限・科目名など）</li>
              <li>課題の完了状態・非表示状態（ユーザーが手動で設定した値）</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">情報の利用目的</h3>
            <p>
              収集した情報はサービスの機能提供（課題一覧の表示・管理）のみに使用します。
              第三者への提供・販売は行いません。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">データの保存</h3>
            <p>
              課題データはSupabase（米国）のサーバーに保存されます。
              行レベルセキュリティ（RLS）により、各ユーザーは自身のデータのみにアクセスできます。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">データの削除</h3>
            <p>
              アカウント削除を希望する場合は開発者にお問い合わせください。
              拡張機能のセッション情報は拡張機能の削除により破棄されます。
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">WebClass へのアクセス</h3>
            <p>
              本Chrome拡張機能は WebClass のページ上で動作し、課題情報を読み取ります。
              WebClass へのログイン情報（パスワード等）は本サービスには送信されず、ユーザーのブラウザ上のセッションをそのまま利用します。
            </p>
          </div>
        </section>

        <p className="text-xs text-slate-400 dark:text-slate-500 pb-4">
          最終更新: 2026年5月
        </p>
      </main>
    </div>
  );
}
