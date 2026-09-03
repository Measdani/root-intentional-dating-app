export type LearningAreaId =
  | 'know-yourself'
  | 'learn-to-date'
  | 'build-relationship'
  | 'sustain-love';

export type LearningPerspective = 'female' | 'male';

export interface PerspectiveContent {
  female: string;
  male: string;
}

export interface LearningLesson {
  id: string;
  areaId: LearningAreaId;
  title: string;
  summary: string;
  estimatedMinutes: number;
  sharedFoundation: string;
  perspective: PerspectiveContent;
  reflectionPrompt: string;
  actionStep: string;
  order: number;
}

export interface ApprovedQuestion {
  id: string;
  question: string;
  answer: string;
  areaId: LearningAreaId;
  perspective: LearningPerspective | 'shared';
}

export interface LearningProgressRecord {
  lessonId: string;
  completed: boolean;
  lastViewedAt: string;
}
