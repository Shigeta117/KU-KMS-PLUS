'use client';

import { Check } from 'lucide-react';
import type { Assignment, DeadlineUrgency } from '@/lib/types';
import { getDeadlineUrgency, formatDeadline, formatRelativeDeadline, isScheduled, formatStartTime } from '@/lib/types';

const URGENCY_STYLES: Record<
  DeadlineUrgency,
  { badge: string; border: string; text: string }
> = {
  overdue: {
    badge: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
    border: 'border-l-red-500',
    text:   'text-red-600 dark:text-red-400',
  },
  critical: {
    badge: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
    border: 'border-l-orange-500',
    text:   'text-orange-600 dark:text-orange-400',
  },
  soon: {
    badge: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    border: 'border-l-amber-400',
    text:   'text-amber-600 dark:text-amber-400',
  },
  week: {
    badge: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-600',
    border: 'border-l-yellow-400',
    text:   'text-yellow-600 dark:text-yellow-500',
  },
  future: {
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    border: 'border-l-slate-300 dark:border-l-slate-600',
    text:   'text-slate-500 dark:text-slate-400',
  },
  none: {
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
    border: 'border-l-slate-200 dark:border-l-slate-700',
    text:   'text-slate-400 dark:text-slate-500',
  },
};

const URGENCY_LABEL: Record<DeadlineUrgency, string> = {
  overdue:  '期限切れ',
  critical: '今日まで',
  soon:     'もうすぐ',
  week:     '今週中',
  future:   '期限あり',
  none:     '期限なし',
};

const SCHEDULED_STYLE = {
  badge:  'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400',
  border: 'border-l-sky-300 dark:border-l-sky-600',
  text:   'text-sky-600 dark:text-sky-400',
};

interface Props {
  assignment: Assignment;
  onToggleComplete: (id: string, current: boolean) => void;
  onToggleHidden:   (id: string, current: boolean) => void;
}

export default function TaskCard({
  assignment,
  onToggleComplete,
  onToggleHidden,
}: Props) {
  const {
    id,
    title,
    category,
    start_time,
    deadline,
    detail_url,
    course_id,
    course_name,
    is_submitted_lms,
    is_completed_manual,
    is_hidden,
  } = assignment;

  const scheduled = isScheduled(start_time);
  const urgency   = scheduled ? 'none' : getDeadlineUrgency(deadline);
  const styles    = scheduled ? SCHEDULED_STYLE : URGENCY_STYLES[urgency];

  return (
    <article
      className={[
        'bg-white dark:bg-slate-800 rounded-xl border-l-4 shadow-sm dark:shadow-none dark:ring-1 dark:ring-slate-700 overflow-hidden transition-opacity',
        styles.border,
        is_completed_manual || is_hidden ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="p-4">
        {/* ヘッダー行: カテゴリ + 期限バッジ */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {category && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          <span
            className={[
              'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full',
              styles.badge,
            ].join(' ')}
          >
            {scheduled ? '開始前' : URGENCY_LABEL[urgency]}
          </span>
        </div>

        {/* 課題タイトル */}
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug mb-1">
          {detail_url ? (
            <a
              href={detail_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-ku-blue dark:hover:text-blue-400"
            >
              {title}
            </a>
          ) : (
            title
          )}
          {is_completed_manual && (
            <Check
              size={13}
              strokeWidth={2.5}
              className="inline ml-1 text-emerald-600 translate-y-[-1px]"
              aria-hidden="true"
            />
          )}
        </h3>

        {/* 授業名（取得できた場合優先、なければ course_id）*/}
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          {course_name || course_id}
        </p>

        {/* 期限 / 開始時刻 */}
        <p className={['text-xs font-medium flex items-center gap-1.5', styles.text].join(' ')}>
          {scheduled ? (
            <span>開始: {formatStartTime(start_time)}</span>
          ) : (
            <>
              <span>{formatDeadline(deadline)}</span>
              {deadline && (
                <span className="opacity-70">({formatRelativeDeadline(deadline)})</span>
              )}
            </>
          )}
        </p>

        {/* LMS 提出済みバッジ */}
        {is_submitted_lms && (
          <p className="mt-1 text-xs text-emerald-600 font-medium">
            LMS 提出履歴あり
          </p>
        )}
      </div>

      {/* アクションボタン */}
      <div className="flex border-t border-slate-100 dark:border-slate-700">
        <ActionButton
          onClick={() => onToggleComplete(id, is_completed_manual)}
          active={is_completed_manual}
          activeLabel="完了済"
          inactiveLabel="完了にする"
          activeClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950"
        />
        {/* 完了済みの課題は非表示ボタンを非表示にして完了/非表示の複合状態を防ぐ */}
        {!is_completed_manual && (
          <>
            <div className="w-px bg-slate-100 dark:bg-slate-700" />
            <ActionButton
              onClick={() => onToggleHidden(id, is_hidden)}
              active={is_hidden}
              activeLabel="表示に戻す"
              inactiveLabel="非表示"
              activeClass="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700"
            />
          </>
        )}
      </div>
    </article>
  );
}

function ActionButton({
  onClick,
  active,
  activeLabel,
  inactiveLabel,
  activeClass,
}: {
  onClick: () => void;
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeClass: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex-1 py-2.5 text-xs font-semibold transition-colors',
        active ? activeClass : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700',
      ].join(' ')}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
