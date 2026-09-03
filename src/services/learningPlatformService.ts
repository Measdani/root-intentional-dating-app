import { supabase } from '@/lib/supabase';
import type { LearningPerspective, LearningProgressRecord } from '@/types/learning';

const progressKey = (userId: string) => `rooted-learning-progress:${userId}`;
const savedKey = (userId: string) => `rooted-learning-saved:${userId}`;
const questionKey = (userId: string) => `rooted-learning-questions:${userId}`;

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Remote persistence can still succeed when local storage is unavailable.
  }
};

export const learningPlatformService = {
  async getProgress(userId: string): Promise<LearningProgressRecord[]> {
    const local = readJson<LearningProgressRecord[]>(progressKey(userId), []);
    try {
      const { data, error } = await supabase
        .from('rh_learning_progress')
        .select('lesson_id, completed, last_viewed_at')
        .eq('user_id', userId);
      if (error || !data) return local;
      const remote = data.map((row) => ({ lessonId: row.lesson_id, completed: row.completed, lastViewedAt: row.last_viewed_at }));
      writeJson(progressKey(userId), remote);
      return remote;
    } catch {
      return local;
    }
  },

  async viewLesson(userId: string, lessonId: string, completed = false): Promise<void> {
    const current = readJson<LearningProgressRecord[]>(progressKey(userId), []);
    const existing = current.find((item) => item.lessonId === lessonId);
    const nextRecord = {
      lessonId,
      completed: completed || existing?.completed || false,
      lastViewedAt: new Date().toISOString(),
    };
    writeJson(progressKey(userId), [nextRecord, ...current.filter((item) => item.lessonId !== lessonId)]);
    try {
      await supabase.from('rh_learning_progress').upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed: nextRecord.completed,
        last_viewed_at: nextRecord.lastViewedAt,
        completed_at: nextRecord.completed ? nextRecord.lastViewedAt : null,
      }, { onConflict: 'user_id,lesson_id' });
    } catch {
      // Local progress remains available.
    }
  },

  async getSavedLessonIds(userId: string): Promise<string[]> {
    const local = readJson<string[]>(savedKey(userId), []);
    try {
      const { data, error } = await supabase.from('rh_saved_lessons').select('lesson_id').eq('user_id', userId);
      if (error || !data) return local;
      const remote = data.map((row) => row.lesson_id);
      writeJson(savedKey(userId), remote);
      return remote;
    } catch {
      return local;
    }
  },

  async setLessonSaved(userId: string, lessonId: string, saved: boolean): Promise<void> {
    const current = readJson<string[]>(savedKey(userId), []);
    const next = saved ? Array.from(new Set([...current, lessonId])) : current.filter((id) => id !== lessonId);
    writeJson(savedKey(userId), next);
    try {
      if (saved) {
        await supabase.from('rh_saved_lessons').upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
      } else {
        await supabase.from('rh_saved_lessons').delete().eq('user_id', userId).eq('lesson_id', lessonId);
      }
    } catch {
      // Local saved state remains available.
    }
  },

  async submitQuestion(userId: string, question: string, perspective: LearningPerspective): Promise<void> {
    const submittedAt = new Date().toISOString();
    const local = readJson<Array<{ question: string; perspective: LearningPerspective; submittedAt: string }>>(questionKey(userId), []);
    writeJson(questionKey(userId), [{ question, perspective, submittedAt }, ...local]);
    const { error } = await supabase.from('rh_member_questions').insert({
      user_id: userId,
      question,
      viewing_perspective: perspective,
      status: 'submitted',
    });
    if (error) console.warn('Question stored locally; remote submission is not available yet:', error.message);
  },
};
