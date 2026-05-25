import { createClient } from '@supabase/supabase-js';
import type { Assignment } from './types';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================
// assignments テーブル操作
// =============================================
export async function fetchAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, course_id, course_name, title, category, start_time, deadline, detail_url, is_submitted_lms, is_completed_manual, is_hidden, note, updated_at, created_at')
    .order('deadline', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data as Assignment[];
}

export async function updateAssignment(
  id: string,
  patch: Partial<Pick<Assignment, 'is_completed_manual' | 'is_hidden' | 'note'>>
): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .update(patch)
    .eq('id', id);

  if (error) throw error;
}

