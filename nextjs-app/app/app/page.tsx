'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FilterTab } from '@/lib/types';
import { getDeadlineUrgency } from '@/lib/types';
import { useAssignments } from '@/lib/useAssignments';
import { CheckCircle2, EyeOff, RefreshCw, InboxIcon, Settings, Clock, FileText } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import FilterBar from '@/components/FilterBar';
import TaskCard from '@/components/TaskCard';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { isScheduled } from '@/lib/types';

export default function HomePage() {
  return (
    <AuthGuard>
      <AssignmentList />
    </AuthGuard>
  );
}

function AssignmentList() {
  const router = useRouter();
  const {
    assignments, loading, error, lastUpdated,
    loadData, handleToggleComplete, handleToggleHidden,
  } = useAssignments();

  const [activeTab,            setActiveTab]            = useState<FilterTab>('pending');
  const [activeCategoryByTab,  setActiveCategoryByTab]  = useState<Record<FilterTab, string>>({
    pending: '', scheduled: '', material: '', completed: '', hidden: '',
  });
  const [activeCourse, setActiveCourse] = useState('');

  const activeCategory = activeCategoryByTab[activeTab];
  const pullIndicatorRef = usePullToRefresh(loadData, !loading);

  // =============================================
  // フィルタリング
  // =============================================
  const filtered = assignments.filter((a) => {
    const scheduled = isScheduled(a.start_time);
    const material  = !a.deadline && !scheduled;

    const matchTab =
      activeTab === 'pending'
        ? !a.is_completed_manual && !a.is_hidden && !scheduled && !!a.deadline
        : activeTab === 'scheduled'
        ? !a.is_completed_manual && !a.is_hidden && scheduled
        : activeTab === 'material'
        ? !a.is_completed_manual && !a.is_hidden && material
        : activeTab === 'completed'
        ? a.is_completed_manual && !a.is_hidden
        : a.is_hidden;

    const matchCat    = !activeCategory || a.category === activeCategory;
    const matchCourse = !activeCourse   || a.course_name === activeCourse;
    return matchTab && matchCat && matchCourse;
  });

  // pending タブのみ期限切れ / 期限内でセクション分け
  const overdueItems = activeTab === 'pending'
    ? filtered.filter((a) => getDeadlineUrgency(a.deadline) === 'overdue')
    : [];
  const activeItems = activeTab === 'pending'
    ? filtered.filter((a) => getDeadlineUrgency(a.deadline) !== 'overdue')
    : filtered;

  const categories = [
    ...new Set(assignments.map((a) => a.category).filter(Boolean)),
  ].sort();

  const courseNames = [
    ...new Set(assignments.map((a) => a.course_name).filter((n): n is string => !!n)),
  ].sort();

  const counts: Record<FilterTab, number> = {
    pending:   assignments.filter((a) => !a.is_completed_manual && !a.is_hidden && !isScheduled(a.start_time) && !!a.deadline).length,
    scheduled: assignments.filter((a) => !a.is_completed_manual && !a.is_hidden &&  isScheduled(a.start_time)).length,
    material:  assignments.filter((a) => !a.is_completed_manual && !a.is_hidden && !a.deadline && !isScheduled(a.start_time)).length,
    completed: assignments.filter((a) =>  a.is_completed_manual && !a.is_hidden).length,
    hidden:    assignments.filter((a) =>  a.is_hidden).length,
  };

  // =============================================
  // 描画
  // =============================================
  return (
    <div className="flex flex-col min-h-dvh w-full sm:max-w-2xl sm:mx-auto sm:border-x sm:border-slate-200 dark:sm:border-slate-700">
      {/* プルツーリフレッシュ インジケーター */}
      <div className="flex justify-center h-0 overflow-visible pointer-events-none">
        <div
          ref={pullIndicatorRef}
          className="w-8 h-8 border-4 border-white/40 border-t-white rounded-full opacity-0 transition-none"
          style={{ transform: 'translateY(0) scale(0.6)' }}
        />
      </div>

      {/* ヘッダー */}
      <header
        className="px-4 pt-safe-top pb-3 flex items-center justify-between flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004a8f, #0066cc)' }}
      >
        <div>
          <h1 className="text-white text-lg font-bold">KU-LMS+</h1>
          <p className="text-blue-100 text-xs">
            {lastUpdated
              ? `更新: ${lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
              : '課題一覧'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            更新
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="設定"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* フィルタバー */}
      <FilterBar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(cat) =>
          setActiveCategoryByTab((prev) => ({ ...prev, [activeTab]: cat }))
        }
        counts={counts}
        courseNames={courseNames}
        activeCourse={activeCourse}
        onCourseChange={setActiveCourse}
      />

      {/* メインコンテンツ */}
      <main className="flex-1 px-3 py-3 pb-safe-bottom space-y-3 sm:px-4 sm:py-4">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-[#004a8f] rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
            {error}
            <button
              onClick={loadData}
              className="block mt-2 text-red-700 dark:text-red-300 font-semibold underline"
            >
              再試行
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState tab={activeTab} />
        )}

        {!loading && (
          <>
            {overdueItems.length > 0 && (
              <>
                <p className="text-xs font-semibold text-red-500 dark:text-red-400 px-1 pt-1">
                  期限切れ
                </p>
                {overdueItems.map((a) => (
                  <TaskCard
                    key={a.id}
                    assignment={a}
                    onToggleComplete={handleToggleComplete}
                    onToggleHidden={handleToggleHidden}
                  />
                ))}
                {activeItems.length > 0 && (
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 px-1 pt-1">
                    期限内
                  </p>
                )}
              </>
            )}
            {activeItems.map((a) => (
              <TaskCard
                key={a.id}
                assignment={a}
                onToggleComplete={handleToggleComplete}
                onToggleHidden={handleToggleHidden}
              />
            ))}
          </>
        )}
      </main>

    </div>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const config: Record<FilterTab, { icon: React.ReactNode; text: string }> = {
    pending: {
      icon: <InboxIcon size={40} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />,
      text: '未完了の課題はありません',
    },
    scheduled: {
      icon: <Clock size={40} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />,
      text: '開始前の課題はありません',
    },
    material: {
      icon: <FileText size={40} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />,
      text: '資料・その他はありません',
    },
    completed: {
      icon: <CheckCircle2 size={40} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />,
      text: '完了済みの課題はありません',
    },
    hidden: {
      icon: <EyeOff size={40} strokeWidth={1.5} className="text-slate-300 dark:text-slate-600" />,
      text: '非表示にした課題はありません',
    },
  };
  const { icon, text } = config[tab];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-medium">{text}</p>
      <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">
        WebClass で拡張機能またはブックマークレットを実行してください
      </p>
    </div>
  );
}
