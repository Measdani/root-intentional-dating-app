import { supabase } from '@/lib/supabase';

export type ReportIntakeAction =
  | 'triage_and_queue'
  | 'urgent_review'
  | 'link_to_existing_case'
  | 'auto-request-more-info'
  | 'escalate_immediately';

export interface ReportIntakeInput {
  reporterAppUserId: string;
  reportedAppUserId: string;
  reasonSelected: string;
  freeText: string;
  targetType?: 'message' | 'profile' | 'photo' | 'behavior' | 'other';
  targetId?: string | null;
  reporterEmail?: string;
  reportedEmail?: string;
}

export interface ReportIntakeResult {
  reportId: string;
  eventId?: string;
  caseId?: string | null;
  normalizedCategory?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction?: ReportIntakeAction;
  reportStatus?: 'triaged' | 'urgent_review';
  summary?: string;
  confidence?: number;
}

type ReportIntakeResponse = {
  report_id?: string;
  event_id?: string;
  case_id?: string | null;
  normalized_category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  recommended_action?: ReportIntakeAction;
  report_status?: 'triaged' | 'urgent_review';
  summary?: string;
  confidence?: number;
};

export const triageReportIntake = async (
  input: ReportIntakeInput
): Promise<ReportIntakeResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('report-intake', {
      body: {
        reporter_app_user_id: input.reporterAppUserId,
        reported_app_user_id: input.reportedAppUserId,
        reason_selected: input.reasonSelected,
        free_text: input.freeText,
        target_type: input.targetType ?? 'behavior',
        target_id: input.targetId ?? null,
        reporter_email: input.reporterEmail ?? null,
        reported_email: input.reportedEmail ?? null,
      },
    });

    if (error || !data || typeof data !== 'object') {
      return null;
    }

    const parsed = data as ReportIntakeResponse;
    if (typeof parsed.report_id !== 'string') {
      return null;
    }

    return {
      reportId: parsed.report_id,
      eventId: typeof parsed.event_id === 'string' ? parsed.event_id : undefined,
      caseId:
        typeof parsed.case_id === 'string' || parsed.case_id === null
          ? parsed.case_id
          : undefined,
      normalizedCategory:
        typeof parsed.normalized_category === 'string'
          ? parsed.normalized_category
          : undefined,
      severity: parsed.severity,
      recommendedAction: parsed.recommended_action,
      reportStatus: parsed.report_status,
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      confidence:
        typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    };
  } catch (error) {
    console.warn('Report-intake triage unavailable:', error);
    return null;
  }
};
