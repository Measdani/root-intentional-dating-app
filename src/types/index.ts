export interface User {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: 'male' | 'female';
  partnershipIntent: 'marriage' | 'long-term' | 'life-partnership';
  familyAlignment: {
    hasChildren: boolean;
    wantsChildren: 'wants' | 'open' | 'does-not-want' | 'unsure';
    openToPartnerWithParent: 'actively-wants' | 'comfortable' | 'open-inexperienced' | 'prefers-child-free';
  };
  values: string[];
  growthFocus: string;
  relationshipVision?: string;
  communicationStyle?: string;
  alignmentScore?: number;
  photoUrl?: string;
  bio?: string;
  suspensionEndDate?: number; // Timestamp when suspension expires (6 months from issue date)
  assessmentPassed?: boolean; // Track if user passed the assessment
  membershipTier?: 'monthly' | 'quarterly' | 'annual'; // User's membership plan
  email?: string; // Email for support contact
  userStatus?: 'active' | 'needs-growth' | 'suspended' | 'removed'; // User account status
  isAdmin?: boolean; // Admin user flag
}

export interface AssessmentQuestion {
  id: string;
  category: 'emotional-regulation' | 'accountability' | 'autonomy' | 'boundaries' | 'conflict-repair' | 'integrity-check';
  question: string;
  options: {
    text: string;
    score: number;
    redFlag?: boolean;
  }[];
  adaptiveTrigger?: {
    condition: 'low-score' | 'inconsistent' | 'suspicious-pattern';
    followUpId?: string;
  };
}

export interface AssessmentResult {
  totalScore: number;
  percentage: number;
  passed: boolean;
  categoryScores: Record<string, number>;
  integrityFlags: string[];
  growthAreas: string[];
}

export interface GrowthResourceModule {
  id: string;
  title: string;
  description: string;
  exercise?: string;
  orderIndex: number;
}

export interface GrowthResource {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedTime: string;
  learningOutcomes?: string[];
  modules?: GrowthResourceModule[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt?: number;
  updatedAt?: number;
}

export type AppView =
  | 'landing'
  | 'assessment'
  | 'assessment-result'
  | 'growth-mode'
  | 'paid-growth-mode'
  | 'browse'
  | 'profile'
  | 'inbox'
  | 'conversation'
  | 'membership'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-assessments'
  | 'admin-content'
  | 'admin-settings'
  | 'admin-reports'
  | 'admin-support'
  | 'user-login'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'community-guidelines';

export interface MembershipTier {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
}

export interface ConversationMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: number;
  messageType: 'initial' | 'response';
}

export interface PhotoConsent {
  userId: string;
  hasConsented: boolean;
  consentTimestamp?: number;
}

export interface UserInteraction {
  fromUserId: string;
  toUserId: string;
  conversationId: string;
  messages: ConversationMessage[];
  photoConsent: {
    fromUser: PhotoConsent;
    toUser: PhotoConsent;
  };
  photosUnlocked: boolean;
  status: 'pending_response' | 'both_messaged' | 'awaiting_consent' | 'photos_unlocked';
  createdAt: number;
  updatedAt: number;
}

export interface InteractionState {
  sentInterests: Record<string, UserInteraction>;
  receivedInterests: Record<string, UserInteraction>;
}

export interface AdminNotification {
  id: string;
  userId: string;
  type: 'warning' | 'suspension' | 'removal';
  title: string;
  message: string;
  reportId?: string;
  createdAt: number;
  read: boolean;
}

// Export all report-related types
export type {
  ReportReason,
  ReportStatus,
  ReportSeverity,
  ReportActionType,
  ReportAction,
  Report,
  SuspensionRecord,
  BlockedUser,
  UserReportHistory,
  ReportStatistics,
  ReportFilters,
} from './report';

// Export all support-related types
export type {
  SupportMessageStatus,
  SupportMessagePriority,
  SupportCategory,
  SupportMessage,
  SupportMessageStatistics,
  SupportMessageFilters,
} from './support';
