'use client';

import { ChevronDown } from 'lucide-react';
import type { FilterTab } from '@/lib/types';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'pending',   label: '未完了' },
  { key: 'scheduled', label: '開始前' },
  { key: 'material',  label: '資料' },
  { key: 'completed', label: '完了済' },
  { key: 'hidden',    label: 'スキップ' },
];

interface Props {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  counts: Record<FilterTab, number>;
  courseNames: string[];
  activeCourse: string;
  onCourseChange: (course: string) => void;
}

export default function FilterBar({
  activeTab,
  onTabChange,
  categories,
  activeCategory,
  onCategoryChange,
  counts,
  courseNames,
  activeCourse,
  onCourseChange,
}: Props) {
  return (
    <div className={[
      'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10',
      'md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r md:self-start md:max-h-dvh md:overflow-y-auto',
    ].join(' ')}>
      {/* タブ */}
      <div className="flex md:flex-col" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => onTabChange(key)}
            className={[
              'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors',
              'md:flex-none md:border-b-0 md:border-l-4 md:text-left md:px-4 md:py-3',
              activeTab === key
                ? 'border-ku-blue text-ku-blue dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {label}
            {counts[key] > 0 && (
              <span
                className={[
                  'ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold',
                  activeTab === key
                    ? 'bg-ku-blue dark:bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 授業フィルタ（2科目以上あるときのみ表示）*/}
      {courseNames.length > 1 && (
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <select
              aria-label="授業で絞り込む"
              value={activeCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              className={[
                'w-full appearance-none text-xs font-medium rounded-lg pl-3 pr-7 py-1.5',
                'border transition-colors focus:outline-none',
                activeCourse
                  ? 'bg-ku-blue dark:bg-blue-700 text-white border-ku-blue dark:border-blue-700'
                  : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 focus:border-ku-blue dark:focus:border-blue-400',
              ].join(' ')}
            >
              <option value="">すべての授業</option>
              {courseNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className={[
                'absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none',
                activeCourse ? 'text-white/70' : 'text-slate-400 dark:text-slate-500',
              ].join(' ')}
            />
          </div>
        </div>
      )}

      {/* カテゴリフィルタ（右端フェードで横スクロールを示唆）*/}
      {categories.length > 0 && (
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none md:flex-wrap md:overflow-x-visible">
            <CategoryChip
              label="すべて"
              active={activeCategory === ''}
              onClick={() => onCategoryChange('')}
            />
            {categories.map((cat) => (
              <CategoryChip
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => onCategoryChange(cat)}
              />
            ))}
            <span className="flex-shrink-0 w-6 md:hidden" aria-hidden />
          </div>
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent md:hidden" />
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-ku-blue dark:bg-blue-600 text-white border-ku-blue dark:border-blue-600'
          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
