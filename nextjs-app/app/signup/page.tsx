'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword]   = useState('');
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState('');
  const [success,  setSuccess]    = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formattedId = studentId.trim().toLowerCase();
    if (!/^k\d{6}$/.test(formattedId)) {
      setError('関大ユーザーIDは k から始まる7桁（例: k123456）で入力してください');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setLoading(false);
      return;
    }

    try {
      const email = `${formattedId}@kansai-u.ac.jp`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      if (data.session) {
        router.replace('/app');
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'アカウントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex items-center justify-center min-h-dvh px-4 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">確認メールを送信しました</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed">
            入力されたメールアドレス（{studentId.trim().toLowerCase()}@kansai-u.ac.jp）に確認リンクをお送りしました。メール内のリンクをクリックして登録を完了してください。
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-ku-blue hover:bg-ku-blue-dark transition-colors"
          >
            ログイン画面へ戻る
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-dvh px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <Image
            src="/icons/icon-192.png"
            alt="KU-LMS+"
            width={64}
            height={64}
            className="inline-block rounded-2xl mb-4 shadow-sm"
            priority
          />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">新規アカウント作成</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">関大ユーザーIDで登録</p>
        </div>

        {/* フォーム */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 border border-slate-200 dark:border-transparent p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              関大ユーザーID
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
              autoComplete="username"
              placeholder="k000000"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-ku-accent dark:focus:border-blue-400 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              ※@kansai-u.ac.jp 宛に確認メールが送信されます。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="6文字以上"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-ku-accent dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={[
              'w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50',
              loading ? 'bg-slate-400' : 'bg-ku-blue hover:bg-ku-blue-dark',
            ].join(' ')}
          >
            {loading ? '処理中…' : 'アカウントを作成'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-slate-500 hover:text-ku-accent dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
          >
            すでにアカウントをお持ちの方（ログイン）
          </button>
        </div>
      </div>
    </main>
  );
}
