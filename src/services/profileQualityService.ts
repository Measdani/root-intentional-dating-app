import { supabase } from '@/lib/supabase';
import { SUPPORT_EMAIL } from '@/constants/support';

type ProfileQualityAction =
  | 'approve'
  | 'approve_with_improvement_suggestions'
  | 'needs_edits'
  | 'reject'
  | 'escalate_to_review';

interface ProfileQualityResponse {
  profile_id?: string;
  event_id?: string;
  case_id?: string | null;
  labels?: string[];
  quality_score?: number;
  safety_score?: number;
  confidence?: number;
  recommended_action?: ProfileQualityAction;
  profile_status?: 'approved' | 'needs_edits' | 'rejected' | 'flagged';
  blocked_reason?: string | null;
  user_feedback?: string | null;
  improvement_notes?: string[];
  escalate?: boolean;
}

export interface ModerateProfileQualityInput {
  appUserId: string;
  appUserEmail?: string;
  bio?: string;
  promptsJson?: Record<string, unknown>;
  userMode?: string;
}

export interface ModerateProfileQualityResult {
  approved: boolean;
  profileId?: string;
  eventId?: string;
  caseId?: string | null;
  labels: string[];
  qualityScore: number;
  safetyScore: number;
  confidence: number;
  recommendedAction: ProfileQualityAction;
  profileStatus: 'approved' | 'needs_edits' | 'rejected' | 'flagged';
  blockedReason: string | null;
  userFeedback: string | null;
  improvementNotes: string[];
  escalate: boolean;
}

const FALLBACK_FAILURE_RESULT: ModerateProfileQualityResult = {
  approved: false,
  labels: ['ambiguous_needs_review'],
  qualityScore: 0,
  safetyScore: 0,
  confidence: 0,
  recommendedAction: 'escalate_to_review',
  profileStatus: 'flagged',
  blockedReason: 'Profile review temporarily unavailable.',
  userFeedback: `We could not finish reviewing your profile right now. This looks like a temporary review issue, not necessarily a problem with your answers. Please try again shortly or contact ${SUPPORT_EMAIL}.`,
  improvementNotes: [],
  escalate: true,
};

const toAction = (value: unknown): ProfileQualityAction => {
  if (
    value === 'approve' ||
    value === 'approve_with_improvement_suggestions' ||
    value === 'needs_edits' ||
    value === 'reject' ||
    value === 'escalate_to_review'
  ) {
    return value;
  }
  return 'escalate_to_review';
};

const toProfileStatus = (value: unknown): 'approved' | 'needs_edits' | 'rejected' | 'flagged' => {
  if (value === 'approved' || value === 'needs_edits' || value === 'rejected' || value === 'flagged') {
    return value;
  }
  return 'flagged';
};

export const moderateProfileQuality = async (
  input: ModerateProfileQualityInput
): Promise<ModerateProfileQualityResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('profile-quality', {
      body: {
        app_user_id: input.appUserId,
        app_user_email: input.appUserEmail ?? null,
        bio: input.bio ?? '',
        prompts_json: input.promptsJson ?? {},
        user_mode: input.userMode ?? null,
      },
    });

    if (error || !data || typeof data !== 'object') {
      return FALLBACK_FAILURE_RESULT;
    }

    const parsed = data as ProfileQualityResponse;
    const recommendedAction = toAction(parsed.recommended_action);
    const profileStatus = toProfileStatus(parsed.profile_status);
    const labels = Array.isArray(parsed.labels)
      ? parsed.labels.filter((label): label is string => typeof label === 'string')
      : [];
    const improvementNotes = Array.isArray(parsed.improvement_notes)
      ? parsed.improvement_notes.filter((note): note is string => typeof note === 'string')
      : [];
    const qualityScore = typeof parsed.quality_score === 'number' ? parsed.quality_score : 0;
    const safetyScore = typeof parsed.safety_score === 'number' ? parsed.safety_score : 0;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    const approved = profileStatus === 'approved';

    return {
      approved,
      profileId: typeof parsed.profile_id === 'string' ? parsed.profile_id : undefined,
      eventId: typeof parsed.event_id === 'string' ? parsed.event_id : undefined,
      caseId: typeof parsed.case_id === 'string' || parsed.case_id === null ? parsed.case_id : null,
      labels,
      qualityScore,
      safetyScore,
      confidence,
      recommendedAction,
      profileStatus,
      blockedReason: typeof parsed.blocked_reason === 'string' ? parsed.blocked_reason : null,
      userFeedback: typeof parsed.user_feedback === 'string' ? parsed.user_feedback : null,
      improvementNotes,
      escalate: Boolean(parsed.escalate),
    };
  } catch (error) {
    console.warn('Profile-quality moderation unavailable:', error);
    return FALLBACK_FAILURE_RESULT;
  }
};
