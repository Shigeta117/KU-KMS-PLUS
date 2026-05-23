export interface Assignment {
  id: string;
  course_id: string;
  course_name: string | null;
  title: string;
  category: string;
  start_time: string | null;
  deadline: string | null;
  detail_url: string;
  is_submitted_lms: boolean;
  is_completed_manual: boolean;
  is_hidden: boolean;
  updated_at: string;
  created_at: string;
}

export type FilterTab = 'pending' | 'scheduled' | 'material' | 'completed' | 'hidden';

export type DeadlineUrgency = 'overdue' | 'today' | 'week' | 'future' | 'none';

export function getDeadlineUrgency(deadline: string | null): DeadlineUrgency {
  if (!deadline) return 'none';
  const now = Date.now();
  const due = new Date(deadline).getTime();
  const diff = due - now;

  if (diff < 0)                          return 'overdue';
  if (diff < 24 * 60 * 60 * 1000)        return 'today';
  if (diff < 7  * 24 * 60 * 60 * 1000)   return 'week';
  return 'future';
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return '期限なし';
  return new Date(deadline).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

export function isScheduled(startTime: string | null): boolean {
  return !!startTime && new Date(startTime) > new Date();
}

export function formatStartTime(startTime: string | null): string {
  if (!startTime) return '';
  return new Date(startTime).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

export function formatRelativeDeadline(deadline: string | null): string {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) {
    const h = Math.floor(-diff / (60 * 60 * 1000));
    if (h === 0) return '期限超過';
    if (h < 24) return `${h}時間超過`;
    return `${Math.floor(h / 24)}日超過`;
  }
  const totalMin = Math.floor(diff / (60 * 1000));
  if (totalMin === 0) return 'まもなく';
  if (totalMin < 60) return `あと${totalMin}分`;
  const totalH = Math.floor(diff / (60 * 60 * 1000));
  if (totalH < 24) return `あと${totalH}時間`;
  return `あと${Math.floor(totalH / 24)}日`;
}
