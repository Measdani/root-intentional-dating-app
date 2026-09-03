import { supabase } from '@/lib/supabase';
import type { ApprovedQuestion, LearningAreaId, LearningLesson, LearningPerspective } from '@/types/learning';

export interface MemberQuestionReview {
  id: string;
  userId: string;
  question: string;
  viewingPerspective: LearningPerspective;
  status: 'submitted' | 'reviewing' | 'answered' | 'declined';
  anonymizedQuestion?: string;
  answer?: string;
  publishToLibrary: boolean;
  areaId?: LearningAreaId;
  createdAt: string;
}

const adminLessonKey = 'rooted-admin-learning-lessons';
const adminQuestionKey = 'rooted-admin-member-questions';
const adminAnswerKey = 'rooted-admin-approved-answers';

const readLocal = <T>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};

const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* remote remains authoritative */ }
};

const lessonToRow = (lesson: LearningLesson, published: boolean) => ({
  id: lesson.id, area_id: lesson.areaId, title: lesson.title, summary: lesson.summary,
  estimated_minutes: lesson.estimatedMinutes, shared_foundation: lesson.sharedFoundation,
  female_perspective: lesson.perspective.female, male_perspective: lesson.perspective.male,
  reflection_prompt: lesson.reflectionPrompt, action_step: lesson.actionStep,
  order_index: lesson.order, published, updated_at: new Date().toISOString(),
});

const rowToLesson = (row: any): LearningLesson => ({
  id: row.id, areaId: row.area_id, title: row.title, summary: row.summary,
  estimatedMinutes: row.estimated_minutes, sharedFoundation: row.shared_foundation,
  perspective: { female: row.female_perspective, male: row.male_perspective },
  reflectionPrompt: row.reflection_prompt, actionStep: row.action_step, order: row.order_index,
});

const rowToQuestion = (row: any): MemberQuestionReview => ({
  id: row.id, userId: row.user_id, question: row.question,
  viewingPerspective: row.viewing_perspective, status: row.status,
  anonymizedQuestion: row.anonymized_question || undefined, answer: row.answer || undefined,
  publishToLibrary: Boolean(row.publish_to_library), areaId: row.area_id || undefined,
  createdAt: row.created_at,
});

export const adminLearningService = {
  async getLessons(fallback: LearningLesson[]): Promise<Array<LearningLesson & { published: boolean }>> {
    const local = readLocal<Array<LearningLesson & { published: boolean }>>(adminLessonKey, fallback.map((lesson) => ({ ...lesson, published: true })));
    try {
      const { data, error } = await supabase.from('rh_learning_lessons').select('*').order('area_id').order('order_index');
      if (error) return local;
      if (!data?.length) {
        const { error: seedError } = await supabase
          .from('rh_learning_lessons')
          .upsert(local.map((lesson) => lessonToRow(lesson, lesson.published)));
        if (seedError) console.warn('Starter lessons remain local until remote seeding is available:', seedError.message);
        return local;
      }
      const lessons = data.map((row) => ({ ...rowToLesson(row), published: Boolean(row.published) }));
      writeLocal(adminLessonKey, lessons);
      return lessons;
    } catch { return local; }
  },

  async saveLesson(lesson: LearningLesson, published: boolean): Promise<void> {
    const local = readLocal<Array<LearningLesson & { published: boolean }>>(adminLessonKey, []);
    const next = [{ ...lesson, published }, ...local.filter((item) => item.id !== lesson.id)];
    writeLocal(adminLessonKey, next);
    const { error } = await supabase.from('rh_learning_lessons').upsert(lessonToRow(lesson, published));
    if (error) console.warn('Lesson saved locally; remote save unavailable:', error.message);
  },

  async deleteLesson(id: string): Promise<void> {
    const local = readLocal<Array<LearningLesson & { published: boolean }>>(adminLessonKey, []);
    writeLocal(adminLessonKey, local.filter((item) => item.id !== id));
    const { error } = await supabase.from('rh_learning_lessons').delete().eq('id', id);
    if (error) console.warn('Lesson removed locally; remote delete unavailable:', error.message);
  },

  async getQuestions(): Promise<MemberQuestionReview[]> {
    const local = readLocal<MemberQuestionReview[]>(adminQuestionKey, []);
    try {
      const { data, error } = await supabase.from('rh_member_questions').select('*').order('created_at', { ascending: false });
      if (error || !data) return local;
      const questions = data.map(rowToQuestion);
      writeLocal(adminQuestionKey, questions);
      return questions;
    } catch { return local; }
  },

  async reviewQuestion(review: MemberQuestionReview): Promise<void> {
    const local = readLocal<MemberQuestionReview[]>(adminQuestionKey, []);
    writeLocal(adminQuestionKey, [review, ...local.filter((item) => item.id !== review.id)]);
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase.from('rh_member_questions').update({
      status: review.status, anonymized_question: review.anonymizedQuestion || null,
      answer: review.answer || null, publish_to_library: review.publishToLibrary,
      area_id: review.areaId || null, answered_at: review.status === 'answered' ? reviewedAt : null,
    }).eq('id', review.id);
    if (error) console.warn('Review saved locally; remote review unavailable:', error.message);

    if (review.publishToLibrary && review.status === 'answered' && review.anonymizedQuestion && review.answer && review.areaId) {
      const approved: ApprovedQuestion = {
        id: review.id, question: review.anonymizedQuestion, answer: review.answer,
        areaId: review.areaId, perspective: 'shared',
      };
      const answers = readLocal<ApprovedQuestion[]>(adminAnswerKey, []);
      writeLocal(adminAnswerKey, [approved, ...answers.filter((item) => item.id !== approved.id)]);
      const { error: publishError } = await supabase.from('rh_approved_answers').upsert({
        source_question_id: review.id, question: approved.question, answer: approved.answer,
        area_id: approved.areaId, perspective: approved.perspective, published: true,
        updated_at: reviewedAt,
      }, { onConflict: 'source_question_id' });
      if (publishError) console.warn('Answer published locally; remote publication unavailable:', publishError.message);
    } else {
      const answers = readLocal<ApprovedQuestion[]>(adminAnswerKey, []);
      writeLocal(adminAnswerKey, answers.filter((item) => item.id !== review.id));
      const { error: unpublishError } = await supabase
        .from('rh_approved_answers')
        .update({ published: false, updated_at: reviewedAt })
        .eq('source_question_id', review.id);
      if (unpublishError) console.warn('Remote answer unpublish unavailable:', unpublishError.message);
    }
  },

  async getPublishedAnswers(fallback: ApprovedQuestion[]): Promise<ApprovedQuestion[]> {
    const local = readLocal<ApprovedQuestion[]>(adminAnswerKey, fallback);
    try {
      const { data, error } = await supabase.from('rh_approved_answers').select('*').eq('published', true).order('updated_at', { ascending: false });
      if (error || !data?.length) return local;
      const answers = data.map((row) => ({ id: row.id, question: row.question, answer: row.answer, areaId: row.area_id, perspective: row.perspective })) as ApprovedQuestion[];
      writeLocal(adminAnswerKey, answers);
      return answers;
    } catch { return local; }
  },
};
