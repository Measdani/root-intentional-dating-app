import { supabase } from '@/lib/supabase';

export type GrowthCoachAction =
  | 'deliver_growth_explanation'
  | 'recommend_module_path'
  | 'send_reflection_prompt'
  | 'send_reengagement_nudge'
  | 'send_reassessment_notice'
  | 'escalate_user_question_to_support';

export interface GrowthModeCoachInput {
  appUserId: string;
  appUserEmail?: string;
  triggerSource?:
    | 'enters_growth_mode'
    | 'module_completed'
    | 'inactive'
    | 'user_requested_guidance'
    | 'upcoming_reassessment';
  assessmentSummary?: string;
  reasonCodes?: string[];
  moduleProgress?: Record<string, unknown>;
  priorRecommendationThemes?: string[];
  cooldownReassessmentDate?: string | null;
  userQuestion?: string;
  dryRun?: boolean;
}

export interface GrowthModeCoachResult {
  recommendationId?: string;
  eventId?: string;
  recommendedAction: GrowthCoachAction;
  theme: string;
  explanationCopy: string;
  recommendedModules: string[];
  journalingPrompt: string;
  reflectionPrompt: string;
  accountabilityNudge: string;
  reassessmentNotice?: string | null;
  escalateToSupport: boolean;
  supportEmail?: string;
  confidence: number;
}

type GrowthModeCoachResponse = {
  recommendation_id?: string;
  event_id?: string;
  recommended_action?: GrowthCoachAction;
  theme?: string;
  explanation_copy?: string;
  recommended_modules?: string[];
  journaling_prompt?: string;
  reflection_prompt?: string;
  accountability_nudge?: string;
  reassessment_notice?: string | null;
  escalate_to_support?: boolean;
  support_email?: string;
  confidence?: number;
};

const isCoachAction = (value: unknown): value is GrowthCoachAction =>
  value === 'deliver_growth_explanation' ||
  value === 'recommend_module_path' ||
  value === 'send_reflection_prompt' ||
  value === 'send_reengagement_nudge' ||
  value === 'send_reassessment_notice' ||
  value === 'escalate_user_question_to_support';

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

export const getGrowthModeCoachGuidance = async (
  input: GrowthModeCoachInput
): Promise<GrowthModeCoachResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('growth-mode-coach', {
      body: {
        app_user_id: input.appUserId,
        app_user_email: input.appUserEmail ?? null,
        trigger_source: input.triggerSource ?? 'enters_growth_mode',
        assessment_summary: input.assessmentSummary ?? null,
        reason_codes: input.reasonCodes ?? [],
        module_progress: input.moduleProgress ?? {},
        prior_recommendation_themes: input.priorRecommendationThemes ?? [],
        cooldown_reassessment_date: input.cooldownReassessmentDate ?? null,
        user_question: input.userQuestion ?? null,
        dry_run: Boolean(input.dryRun),
      },
    });

    if (error || !data || typeof data !== 'object') {
      return null;
    }

    const parsed = data as GrowthModeCoachResponse;
    if (
      !isCoachAction(parsed.recommended_action) ||
      typeof parsed.theme !== 'string' ||
      typeof parsed.explanation_copy !== 'string' ||
      typeof parsed.journaling_prompt !== 'string' ||
      typeof parsed.reflection_prompt !== 'string' ||
      typeof parsed.accountability_nudge !== 'string'
    ) {
      return null;
    }

    return {
      recommendationId:
        typeof parsed.recommendation_id === 'string'
          ? parsed.recommendation_id
          : undefined,
      eventId: typeof parsed.event_id === 'string' ? parsed.event_id : undefined,
      recommendedAction: parsed.recommended_action,
      theme: parsed.theme,
      explanationCopy: parsed.explanation_copy,
      recommendedModules: toStringArray(parsed.recommended_modules),
      journalingPrompt: parsed.journaling_prompt,
      reflectionPrompt: parsed.reflection_prompt,
      accountabilityNudge: parsed.accountability_nudge,
      reassessmentNotice:
        typeof parsed.reassessment_notice === 'string' || parsed.reassessment_notice === null
          ? parsed.reassessment_notice
          : null,
      escalateToSupport: Boolean(parsed.escalate_to_support),
      supportEmail: typeof parsed.support_email === 'string' ? parsed.support_email : undefined,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
  } catch (error) {
    console.warn('Growth-mode coach unavailable:', error);
    return null;
  }
};
