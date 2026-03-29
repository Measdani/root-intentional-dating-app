import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { SUPPORT_EMAIL } from '@/constants/support';

type FirstMessageSafetyAction =
  | 'approve'
  | 'approve_with_nudge'
  | 'block_and_rewrite'
  | 'block_and_warn'
  | 'escalate_to_review'
  | 'temporary_send_lock';

interface FirstMessageSafetyResponse {
  message_id?: string;
  event_id?: string;
  case_id?: string | null;
  labels?: string[];
  confidence?: number;
  recommended_action?: FirstMessageSafetyAction;
  message_status?: 'approved' | 'blocked' | 'flagged';
  blocked_reason?: string | null;
  rewrite_prompt?: string | null;
  user_feedback?: string | null;
  escalate?: boolean;
  accountability_level?: number;
  lock_scope?: 'first_message' | 'all_messages' | null;
  lock_until?: string | null;
  behavior_score?: number;
  behavior_points_added?: number;
  reset_message?: string | null;
}

export interface ModerateFirstMessageInput {
  senderAppUserId: string;
  recipientAppUserId: string;
  senderEmail?: string;
  recipientEmail?: string;
  content: string;
  conversationId: string;
  isFirstMessage?: boolean;
}

export interface ModerateFirstMessageResult {
  approved: boolean;
  messageId?: string;
  eventId?: string;
  caseId?: string | null;
  labels: string[];
  confidence: number;
  recommendedAction: FirstMessageSafetyAction;
  messageStatus: 'approved' | 'blocked' | 'flagged';
  blockedReason: string | null;
  rewritePrompt: string | null;
  userFeedback: string | null;
  escalate: boolean;
  accountabilityLevel: number;
  lockScope: 'first_message' | 'all_messages' | null;
  lockUntil: string | null;
  behaviorScore: number;
  behaviorPointsAdded: number;
  resetMessage: string | null;
}

const FALLBACK_FAILURE_RESULT: ModerateFirstMessageResult = {
  approved: false,
  labels: ['ambiguous_needs_review'],
  confidence: 0,
  recommendedAction: 'escalate_to_review',
  messageStatus: 'flagged',
  blockedReason: 'Safety review unavailable.',
  rewritePrompt: null,
  userFeedback:
    `We could not review this introduction right now. Your draft was not sent. ` +
    `If your message uses real words and thoughtful intent, please try again shortly or contact ${SUPPORT_EMAIL}.`,
  escalate: true,
  accountabilityLevel: 0,
  lockScope: null,
  lockUntil: null,
  behaviorScore: 0,
  behaviorPointsAdded: 0,
  resetMessage: null,
};

const publicFunctionsClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const toAction = (value: unknown): FirstMessageSafetyAction => {
  if (
    value === 'approve' ||
    value === 'approve_with_nudge' ||
    value === 'block_and_rewrite' ||
    value === 'block_and_warn' ||
    value === 'escalate_to_review' ||
    value === 'temporary_send_lock'
  ) {
    return value;
  }
  return 'escalate_to_review';
};

const toMessageStatus = (value: unknown): 'approved' | 'blocked' | 'flagged' => {
  if (value === 'approved' || value === 'blocked' || value === 'flagged') {
    return value;
  }
  return 'flagged';
};

export const moderateFirstMessage = async (
  input: ModerateFirstMessageInput
): Promise<ModerateFirstMessageResult> => {
  try {
    const { data, error } = await publicFunctionsClient.functions.invoke('first-message-safety', {
      body: {
        sender_app_user_id: input.senderAppUserId,
        recipient_app_user_id: input.recipientAppUserId,
        sender_email: input.senderEmail ?? null,
        recipient_email: input.recipientEmail ?? null,
        content: input.content,
        is_first_message: input.isFirstMessage ?? true,
        conversation_id: input.conversationId,
      },
    });

    if (error || !data || typeof data !== 'object') {
      console.warn('First-message safety moderation invoke failed:', error);
      return FALLBACK_FAILURE_RESULT;
    }

    const parsed = data as FirstMessageSafetyResponse;
    const recommendedAction = toAction(parsed.recommended_action);
    const messageStatus = toMessageStatus(parsed.message_status);
    const labels = Array.isArray(parsed.labels)
      ? parsed.labels.filter((label): label is string => typeof label === 'string')
      : [];
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
    const approved = messageStatus === 'approved';

    return {
      approved,
      messageId: typeof parsed.message_id === 'string' ? parsed.message_id : undefined,
      eventId: typeof parsed.event_id === 'string' ? parsed.event_id : undefined,
      caseId: typeof parsed.case_id === 'string' || parsed.case_id === null ? parsed.case_id : null,
      labels,
      confidence,
      recommendedAction,
      messageStatus,
      blockedReason: typeof parsed.blocked_reason === 'string' ? parsed.blocked_reason : null,
      rewritePrompt: typeof parsed.rewrite_prompt === 'string' ? parsed.rewrite_prompt : null,
      userFeedback: typeof parsed.user_feedback === 'string' ? parsed.user_feedback : null,
      escalate: Boolean(parsed.escalate),
      accountabilityLevel:
        typeof parsed.accountability_level === 'number'
          ? parsed.accountability_level
          : 0,
      lockScope:
        parsed.lock_scope === 'first_message' || parsed.lock_scope === 'all_messages'
          ? parsed.lock_scope
          : null,
      lockUntil: typeof parsed.lock_until === 'string' ? parsed.lock_until : null,
      behaviorScore:
        typeof parsed.behavior_score === 'number' ? parsed.behavior_score : 0,
      behaviorPointsAdded:
        typeof parsed.behavior_points_added === 'number'
          ? parsed.behavior_points_added
          : 0,
      resetMessage: typeof parsed.reset_message === 'string' ? parsed.reset_message : null,
    };
  } catch (error) {
    console.warn('First-message safety moderation unavailable:', error);
    return FALLBACK_FAILURE_RESULT;
  }
};
