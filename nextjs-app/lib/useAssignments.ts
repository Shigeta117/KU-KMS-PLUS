'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase, fetchAssignments, updateAssignment } from '@/lib/supabase';
import type { Assignment } from '@/lib/types';

export function useAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 常に最新の assignments を参照するためのref
  // optimisticUpdate の依存配列から assignments を排除し、不要な再生成を防ぐ
  const assignmentsRef = useRef(assignments);
  assignmentsRef.current = assignments;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchAssignments();
      setAssignments(data);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Supabase Realtime: 拡張機能・ブックマークレットのUPSERT後に自動再取得
  // user_id フィルタで自分のレコードのみ購読（全ユーザーへの過剰発火を防ぐ）
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      channel = supabase
        .channel(`assignments-user-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'assignments',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          loadData();
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadData]);

  // 楽観的更新 + sonner トースト with Undo
  const optimisticUpdate = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Assignment, 'is_completed_manual' | 'is_hidden'>>,
      label: string
    ) => {
      const target = assignmentsRef.current.find((a) => a.id === id);
      if (!target) return;

      // ロールバック用スナップショット
      const rollback: Partial<Pick<Assignment, 'is_completed_manual' | 'is_hidden'>> = {};
      if ('is_completed_manual' in patch) rollback.is_completed_manual = target.is_completed_manual;
      if ('is_hidden'           in patch) rollback.is_hidden           = target.is_hidden;

      // 楽観的更新
      setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));

      toast(label, {
        duration: 4000,
        action: {
          label: '元に戻す',
          onClick: async () => {
            setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...rollback } : a)));
            try {
              await updateAssignment(id, rollback);
            } catch {
              loadData();
            }
          },
        },
      });

      try {
        await updateAssignment(id, patch);
      } catch {
        loadData();
      }
    },
    [loadData] // assignmentsRef 経由で最新値を参照するため assignments 不要
  );

  const handleToggleComplete = useCallback(
    (id: string, current: boolean) =>
      optimisticUpdate(id, { is_completed_manual: !current },
        current ? '完了を取り消しました' : '完了済みにしました'),
    [optimisticUpdate]
  );

  const handleToggleHidden = useCallback(
    (id: string, current: boolean) =>
      optimisticUpdate(id, { is_hidden: !current },
        current ? '表示に戻しました' : '非表示にしました'),
    [optimisticUpdate]
  );

  return {
    assignments,
    loading,
    error,
    lastUpdated,
    loadData,
    handleToggleComplete,
    handleToggleHidden,
  };
}
