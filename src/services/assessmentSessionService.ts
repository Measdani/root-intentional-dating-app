export type AssessmentAbandonmentData = {
  userId: string
  abandonedAt: string
  coolingPeriodUntil: string
  canRetakeAssessment: false
}

type AssessmentInProgressData = {
  userId: string
  startedAt: string
  questionIndex: number
  answerCount: number
}

const ASSESSMENT_IN_PROGRESS_KEY_PREFIX = 'rooted_assessment_in_progress_'
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000

export const buildAssessmentAbandonmentData = (userId: string): AssessmentAbandonmentData => ({
  userId,
  abandonedAt: new Date().toISOString(),
  coolingPeriodUntil: new Date(Date.now() + SIX_MONTHS_MS).toISOString(),
  canRetakeAssessment: false,
})

export const getAssessmentInProgressKey = (userId: string): string =>
  `${ASSESSMENT_IN_PROGRESS_KEY_PREFIX}${userId}`

export const writeAssessmentInProgress = (
  userId: string,
  progress: Omit<AssessmentInProgressData, 'userId'>
): void => {
  localStorage.setItem(
    getAssessmentInProgressKey(userId),
    JSON.stringify({
      userId,
      ...progress,
    } satisfies AssessmentInProgressData)
  )
}

export const readAssessmentInProgress = (userId: string): AssessmentInProgressData | null => {
  const raw = localStorage.getItem(getAssessmentInProgressKey(userId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<AssessmentInProgressData>
    if (
      parsed.userId !== userId ||
      typeof parsed.startedAt !== 'string' ||
      typeof parsed.questionIndex !== 'number' ||
      typeof parsed.answerCount !== 'number'
    ) {
      return null
    }

    return parsed as AssessmentInProgressData
  } catch {
    return null
  }
}

export const clearAssessmentInProgress = (userId: string): void => {
  localStorage.removeItem(getAssessmentInProgressKey(userId))
}
