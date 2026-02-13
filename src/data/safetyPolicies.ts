import type { ReportReason } from '@/types';

export const SAFETY_POLICIES: Record<ReportReason, {
  title: string;
  description: string;
  minimumAction: string;
  escalationThreshold: number;
  autoFlag?: boolean;
  requiresVerification?: boolean;
}> = {
  harassment: {
    title: 'Harassment & Bullying',
    description: 'Threatening, intimidating, or abusive behavior',
    minimumAction: 'warning',
    escalationThreshold: 2,
  },

  'inappropriate-content': {
    title: 'Inappropriate Content',
    description: 'Sexual, violent, or offensive content',
    minimumAction: 'warning',
    escalationThreshold: 1,
  },

  'fake-profile': {
    title: 'Fake or Misleading Profile',
    description: 'Profile appears to be fake or misrepresenting someone',
    minimumAction: 'warning',
    escalationThreshold: 2,
  },

  spam: {
    title: 'Spam or Scam',
    description: 'Promotional content, links, or suspicious activity',
    minimumAction: 'warning',
    escalationThreshold: 2,
  },

  'safety-concern': {
    title: 'Safety Concern',
    description: 'Immediate threat to user safety',
    minimumAction: 'temporary-suspension',
    escalationThreshold: 1,
    autoFlag: true,
  },

  'hateful-conduct': {
    title: 'Hateful Conduct',
    description: 'Discriminatory or hateful language/behavior',
    minimumAction: 'warning',
    escalationThreshold: 1,
  },

  underage: {
    title: 'Underage User',
    description: 'User appears to be under 18 years old',
    minimumAction: 'permanent-suspension',
    escalationThreshold: 1,
    autoFlag: true,
    requiresVerification: true,
  },

  other: {
    title: 'Other Violation',
    description: 'Something else that violates community guidelines',
    minimumAction: 'warning',
    escalationThreshold: 3,
  },
};

export const ESCALATION_RULES = {
  // Auto-flag user if they receive 3+ reports within 30 days
  multipleReportsThreshold: {
    count: 3,
    timeWindow: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    action: 'flag-user' as const,
  },

  // Auto-suspend if 2+ critical/high severity reports
  highSeverityThreshold: {
    count: 2,
    severities: ['critical', 'high'] as const,
    action: 'temporary-suspension' as const,
    duration: 7, // days
  },

  // Immediate admin review for critical reports
  criticalReportProtocol: {
    severities: ['critical'] as const,
    action: 'immediate-review' as const,
    notifyAdmins: true,
  },
};
