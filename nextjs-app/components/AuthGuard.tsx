'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 8秒以内に認証状態が確認できない場合はログインへ
    const timer = setTimeout(() => router.replace('/login'), 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        clearTimeout(timer);
        if (!session) {
          router.replace('/login');
        } else {
          setChecked(true);
        }
      }
    );
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-ku-blue rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
