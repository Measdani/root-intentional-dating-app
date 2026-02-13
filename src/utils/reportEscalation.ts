import type { Report, UserReportHistory, ReportAction } from '@/types';

/**
 * Check escalation rules and suggest actions for a report
 * Returns whether the report should be escalated and what action is suggested
 */
export const checkEscalationRules = (
  report: Report,
  userHistory: UserReportHistory
): {
  shouldEscalate: boolean;
  suggestedAction?: ReportAction;
  reason?: string;
} => {
  // Critical severity → immediate action
  if (report.severity === 'critical') {
    return {
      shouldEscalate: true,
      suggestedAction: {
        type: 'temporary-suspension',
        reason: 'Critical severity report requires immediate action',
        duration: 7,
        notifyReporter: true,
        notifyReported: true,
      },
      reason: 'Critical severity report',
    };
  }

  // 3+ reports in 30 days → temp suspend
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentReports = userHistory.reportsReceived.filter(r => r.createdAt > thirtyDaysAgo);

  if (recentReports.length >= 3) {
    return {
      shouldEscalate: true,
      suggestedAction: {
        type: 'temporary-suspension',
        reason: 'Multiple reports received within 30 days',
        duration: 14,
        notifyReporter: false,
        notifyReported: true,
      },
      reason: 'Multiple reports threshold exceeded',
    };
  }

  // 2+ high/critical severity → permanent suspend
  const highSeverityCount = userHistory.reportsReceived.filter(
    r => r.severity === 'high' || r.severity === 'critical'
  ).length;

  if (highSeverityCount >= 2) {
    return {
      shouldEscalate: true,
      suggestedAction: {
        type: 'permanent-suspension',
        reason: 'Pattern of high-severity violations',
        notifyReporter: false,
        notifyReported: true,
      },
      reason: 'High severity pattern detected',
    };
  }

  // Pattern of underage reports
  const underageReports = userHistory.reportsReceived.filter(r => r.reason === 'underage');
  if (underageReports.length >= 1) {
    return {
      shouldEscalate: true,
      suggestedAction: {
        type: 'permanent-suspension',
        reason: 'Verified underage user',
        notifyReporter: false,
        notifyReported: true,
      },
      reason: 'Underage user verification required',
    };
  }

  return { shouldEscalate: false };
};

/**
 * Calculate days until suspension ends
 */
export const getDaysSuspended = (endDate?: number): number | null => {
  if (!endDate) return null;
  const now = Date.now();
  const remaining = endDate - now;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
};

/**
 * Check if a user should be auto-flagged
 */
export const shouldAutoFlag = (userHistory: UserReportHistory): boolean => {
  return userHistory.totalReportsReceived >= 3;
};

/**
 * Get escalation reason for display
 */
export const getEscalationReason = (
  report: Report,
  userHistory: UserReportHistory
): string | null => {
  const result = checkEscalationRules(report, userHistory);
  return result.reason || null;
};
