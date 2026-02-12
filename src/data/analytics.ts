import type { AnalyticsSnapshot } from '@/types/admin';

export const mockAnalytics: AnalyticsSnapshot = {
  totalUsers: 143,
  activeUsers: 89,
  assessmentPassRate: 76,
  avgAlignmentScore: 87,
  userGrowth: [
    { month: 'Jan', users: 12 },
    { month: 'Feb', users: 18 },
    { month: 'Mar', users: 15 },
    { month: 'Apr', users: 22 },
    { month: 'May', users: 19 },
    { month: 'Jun', users: 28 },
    { month: 'Jul', users: 25 },
    { month: 'Aug', users: 31 },
    { month: 'Sep', users: 27 },
    { month: 'Oct', users: 33 },
    { month: 'Nov', users: 29 },
    { month: 'Dec', users: 35 },
  ],
  categoryScores: [
    { category: 'Emotional Regulation', avgScore: 82 },
    { category: 'Accountability', avgScore: 85 },
    { category: 'Autonomy', avgScore: 79 },
    { category: 'Boundaries', avgScore: 81 },
    { category: 'Conflict Repair', avgScore: 84 },
  ],
  userStatusDistribution: [
    { status: 'Active', count: 89 },
    { status: 'Pending', count: 31 },
    { status: 'Suspended', count: 8 },
    { status: 'Inactive', count: 15 },
  ],
  familyIntentDistribution: [
    { intent: 'Wants Children', count: 54 },
    { intent: 'Open', count: 47 },
    { intent: 'Does Not Want', count: 23 },
    { intent: 'Unsure', count: 19 },
  ],
};
