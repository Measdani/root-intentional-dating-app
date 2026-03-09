import { supabase } from '@/lib/supabase';

export type AdminCopilotAction =
  | 'generate_daily_summary'
  | 'generate_weekly_summary'
  | 'prioritize_queue';

export interface AdminCopilotInput {
  action?: AdminCopilotAction;
  periodType?: 'daily' | 'weekly';
  maxItems?: number;
  dryRun?: boolean;
}

export interface AdminCopilotSummaryResult {
  summaryId?: string | null;
  eventId?: string;
  action: AdminCopilotAction;
  periodType: 'daily' | 'weekly';
  summaryText: string;
  metrics: {
    blocked_first_messages: number;
    profiles_needing_edits: number;
    new_reports: number;
    urgent_reports: number;
    rising_risk_users: number;
    top_block_reasons: Array<{ reason: string; count: number }>;
  };
  prioritizedReviewList: Array<{
    case_id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    source_id: string;
    summary: string;
    status: string;
    created_at: string;
  }>;
  repeatOffenderDigest: Array<{
    user_id: string;
    risk_score: number;
    strike_count: number;
    reports_30d: number;
    blocked_messages_30d: number;
  }>;
  lowConfidenceClusters: Array<{
    cluster_key: string;
    agent_name: string;
    action: string;
    count: number;
    avg_confidence: number;
  }>;
  patternAlerts: string[];
}

type AdminCopilotResponse = {
  summary_id?: string | null;
  event_id?: string;
  action?: AdminCopilotAction;
  period_type?: 'daily' | 'weekly';
  summary_text?: string;
  metrics_json?: AdminCopilotSummaryResult['metrics'];
  prioritized_review_list?: AdminCopilotSummaryResult['prioritizedReviewList'];
  repeat_offender_digest?: AdminCopilotSummaryResult['repeatOffenderDigest'];
  low_confidence_clusters?: AdminCopilotSummaryResult['lowConfidenceClusters'];
  pattern_alerts?: string[];
};

const isCopilotAction = (value: unknown): value is AdminCopilotAction =>
  value === 'generate_daily_summary' ||
  value === 'generate_weekly_summary' ||
  value === 'prioritize_queue';

const isPeriodType = (value: unknown): value is 'daily' | 'weekly' =>
  value === 'daily' || value === 'weekly';

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

export const runAdminCopilot = async (
  input: AdminCopilotInput = {}
): Promise<AdminCopilotSummaryResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-copilot', {
      body: {
        action: input.action ?? 'generate_daily_summary',
        period_type: input.periodType ?? 'daily',
        max_items: input.maxItems ?? 10,
        dry_run: Boolean(input.dryRun),
      },
    });

    if (error || !data || typeof data !== 'object') {
      return null;
    }

    const parsed = data as AdminCopilotResponse;
    if (!isCopilotAction(parsed.action) || !isPeriodType(parsed.period_type)) {
      return null;
    }

    if (typeof parsed.summary_text !== 'string') {
      return null;
    }

    const metrics = parsed.metrics_json;
    if (!metrics || typeof metrics !== 'object') {
      return null;
    }

    return {
      summaryId:
        typeof parsed.summary_id === 'string' || parsed.summary_id === null
          ? parsed.summary_id
          : undefined,
      eventId: typeof parsed.event_id === 'string' ? parsed.event_id : undefined,
      action: parsed.action,
      periodType: parsed.period_type,
      summaryText: parsed.summary_text,
      metrics: metrics as AdminCopilotSummaryResult['metrics'],
      prioritizedReviewList: Array.isArray(parsed.prioritized_review_list)
        ? (parsed.prioritized_review_list as AdminCopilotSummaryResult['prioritizedReviewList'])
        : [],
      repeatOffenderDigest: Array.isArray(parsed.repeat_offender_digest)
        ? (parsed.repeat_offender_digest as AdminCopilotSummaryResult['repeatOffenderDigest'])
        : [],
      lowConfidenceClusters: Array.isArray(parsed.low_confidence_clusters)
        ? (parsed.low_confidence_clusters as AdminCopilotSummaryResult['lowConfidenceClusters'])
        : [],
      patternAlerts: normalizeStringArray(parsed.pattern_alerts),
    };
  } catch (error) {
    console.warn('Admin copilot unavailable:', error);
    return null;
  }
};
