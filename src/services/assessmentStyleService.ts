import type { AssessmentCoreStyle, AssessmentOptionStyle, AssessmentQuestion } from '@/types';

export const ASSESSMENT_CORE_STYLES: AssessmentCoreStyle[] = [
  'oak',
  'willow',
  'fern',
  'gardener',
  'wildflower',
];

export const ASSESSMENT_STYLE_META: Record<
  AssessmentCoreStyle,
  { emoji: string; label: string; subtitle: string }
> = {
  oak: {
    emoji: '🌳',
    label: 'Oak',
    subtitle: 'The Courage Dater',
  },
  willow: {
    emoji: '🌿',
    label: 'Willow',
    subtitle: 'The Harmonizer',
  },
  fern: {
    emoji: '🌱',
    label: 'Fern',
    subtitle: 'The Reflective Dater',
  },
  gardener: {
    emoji: '🌻',
    label: 'Gardener',
    subtitle: 'The Growth Partner',
  },
  wildflower: {
    emoji: '🌸',
    label: 'Wildflower',
    subtitle: 'The Adventure Dater',
  },
};

export const isAssessmentCoreStyle = (
  style: AssessmentOptionStyle | AssessmentCoreStyle | string | undefined
): style is AssessmentCoreStyle =>
  typeof style === 'string' &&
  ASSESSMENT_CORE_STYLES.includes(style as AssessmentCoreStyle);

export const buildEmptyStyleScores = (): Record<AssessmentCoreStyle, number> => ({
  oak: 0,
  willow: 0,
  fern: 0,
  gardener: 0,
  wildflower: 0,
});

export const normalizeStyleScores = (
  raw: unknown
): Record<AssessmentCoreStyle, number> => {
  const scores = buildEmptyStyleScores();
  if (!raw || typeof raw !== 'object') return scores;

  for (const style of ASSESSMENT_CORE_STYLES) {
    const value = Number((raw as Record<string, unknown>)[style]);
    if (Number.isFinite(value) && value >= 0) {
      scores[style] = value;
    }
  }

  return scores;
};

export const resolveAssessmentOptionStyle = (
  score: number
): AssessmentOptionStyle => {
  if (score >= 10) return 'oak';
  if (score === 9) return 'willow';
  if (score === 8) return 'fern';
  if (score === 7) return 'wildflower';
  if (score <= 2) return 'willow';
  return 'gardener';
};

export const normalizeAssessmentQuestionsWithStyles = (
  questions: AssessmentQuestion[]
): AssessmentQuestion[] =>
  questions.map((question) => ({
    ...question,
    options: question.options.map((option) => ({
      ...option,
      style: option.style || resolveAssessmentOptionStyle(option.score),
    })),
  }));
