export type UserGenderIdentity =
  | 'male'
  | 'female'
  | 'non-binary'
  | 'trans-man'
  | 'trans-woman'
  | 'self-describe'
  | 'prefer-not-to-say';

export type UserIdentityExpression =
  | 'femme'
  | 'masc'
  | 'androgynous'
  | 'stud'
  | 'soft-masc'
  | 'gender-fluid'
  | 'self-describe'
  | 'prefer-not-to-say';

export type UserIdentityVisibility = 'after-mutual-interest' | 'always-visible';
export type RelationshipMode = 'active' | 'break' | 'exclusive';

export interface User {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: UserGenderIdentity;
  genderIdentity?: UserGenderIdentity;
  genderIdentityCustom?: string;
  openToDating?: UserGenderIdentity[];
  openToDatingCustom?: string;
  identityExpression?: UserIdentityExpression;
  identityExpressionCustom?: string;
  identityExpressionVisibility?: UserIdentityVisibility;
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
  primaryStyle?: AssessmentCoreStyle;
  secondaryStyle?: AssessmentCoreStyle;
  photoUrl?: string;
  bio?: string;
  communityBoundaries?: string;
  suspensionEndDate?: number; // Timestamp when suspension expires (6 months from issue date)
  assessmentPassed?: boolean; // Track if user passed the assessment
  membershipTier?: 'monthly' | 'quarterly' | 'annual'; // User's membership plan
  email?: string; // Email for support contact
  userStatus?: 'active' | 'needs-growth' | 'suspended' | 'removed'; // User account status
  isAdmin?: boolean; // Admin user flag
  backgroundCheckVerified?: boolean; // Whether user completed background check
  backgroundCheckStatus?: 'pending' | 'verified' | 'failed' | 'expired'; // Status of background check
  backgroundCheckDate?: number; // Timestamp when background check was completed
  billingPeriodEnd?: number; // Timestamp when current billing period expires
  consentTimestamp?: number; // Timestamp when policies were accepted
  consentVersion?: string; // Policy version accepted (e.g., "v1.0")
  membershipStatus?: 'active' | 'inactive' | 'cancelled'; // Subscription state
  cancelAtPeriodEnd?: boolean; // Whether subscription cancels at period end
  poolId?: 'core-inner' | 'core-advanced'; // Which lane this account belongs to
  mode?: RelationshipMode;
}

export type AssessmentOptionStyle =
  | 'oak'
  | 'fern'
  | 'wildflower'
  | 'willow'
  | 'gardener'
  | 'red_flag';

export type AssessmentCoreStyle = Exclude<AssessmentOptionStyle, 'red_flag'>;

export interface AssessmentAnswer {
  questionId: string;
  score: number;
  redFlag?: boolean;
  style?: AssessmentOptionStyle;
}

export interface AssessmentQuestion {
  id: string;
  category: 'emotional-regulation' | 'accountability' | 'autonomy' | 'boundaries' | 'conflict-repair' | 'integrity-check';
  question: string;
  options: {
    text: string;
    score: number;
    redFlag?: boolean;
    style?: AssessmentOptionStyle;
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
  styleScores: Record<AssessmentCoreStyle, number>;
  primaryStyle?: AssessmentCoreStyle;
  secondaryStyle?: AssessmentCoreStyle;
}

export interface GrowthResourceModule {
  id: string;
  title: string;
  description: string;
  exercise?: string;
  orderIndex: number;
  blogIds?: string[]; // Module-only blog articles linked to this module
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

export interface BlogArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  excerpt: string;
  author?: string;
  readTime?: string;
  published: boolean;
  moduleOnly: boolean; // If true: only visible in modules, not on community blog
  createdAt: number;
  updatedAt: number;
}

export type AppView =
  | 'landing'
  | 'assessment'
  | 'assessment-reflection'
  | 'assessment-result'
  | 'assessment-not-completed'
  | 'growth-mode'
  | 'paid-growth-mode'
  | 'growth-detail'
  | 'community-blog'
  | 'browse'
  | 'profile'
  | 'inbox'
  | 'conversation'
  | 'membership'
  | 'clarity-room'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-assessments'
  | 'admin-content'
  | 'admin-settings'
  | 'admin-reports'
  | 'admin-support'
  | 'user-login'
  | 'user-settings'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'community-guidelines'
  | 'sign-up';

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
  read?: boolean; // Whether the message has been read by the recipient
}

export type ConciergeNudgeType = 'talk-balance' | 'off-platform-early';

export interface ConciergeNudge {
  id: string;
  type: ConciergeNudgeType;
  message: string;
  createdAt: number;
  triggeredByUserId: string;
  triggeredByMessageId: string;
  messageCountAtTrigger: number;
  forUserIds: string[];
}

export interface ConciergeSnapshot {
  id: string;
  userId: string;
  conversationId: string;
  createdAt: number;
  messageCount: number;
  headline: string;
  highlights: string[];
  caution?: string;
  source?: 'heuristic' | 'ai';
  aiModel?: string;
}

export interface ConciergeState {
  nudges: ConciergeNudge[];
  snapshots: ConciergeSnapshot[];
}

export type MilestoneStage =
  | 'shared-vibe'
  | 'truth-or-dare'
  | 'temp-check'
  | 'bridge'
  | 'final-check'
  | 'date-offer'
  | 'resource-path';

export type TruthDareType = 'truth' | 'dare';

export interface SharedVibeState {
  prompt: string;
  catalog: string[];
  picksByUser: Record<string, string[]>;
  sharedItems: string[];
  summary?: string;
  unlockedAt?: number;
}

export interface TruthDarePrompt {
  id: string;
  type: TruthDareType;
  level: 1 | 2 | 3;
  text: string;
}

export interface TruthDareResponse {
  id: string;
  promptId: string;
  type: TruthDareType;
  level: 1 | 2 | 3;
  userId: string;
  response: string;
  completedAt: number;
}

export interface TruthDareState {
  prompts: TruthDarePrompt[];
  responses: TruthDareResponse[];
  unlockedAt?: number;
}

export interface TempCheckAnswer {
  userId: string;
  feelsHeard: number;
  goalsAligned: number;
  readiness: number;
  submittedAt: number;
}

export type TempCheckOutcome = 'pending' | 'aligned' | 'mismatch';

export interface TempCheckState {
  answers: TempCheckAnswer[];
  outcome: TempCheckOutcome;
  suggestedFocus?: 'communication' | 'timing' | 'goals';
  completedAt?: number;
}

export interface MirrorState {
  responsesByUser: Record<string, string>;
  revealed: boolean;
}

export interface ValueDeepDiveState {
  options: string[];
  picksByUser: Record<string, string[]>;
  overlap: string[];
}

export interface RhythmRiskState {
  cautiousUserId?: string;
  eagerUserId?: string;
  cautiousProfile?: {
    idealPace: number;
    worries: string;
    safestEnvironment: string;
    submittedAt: number;
  };
  eagerProfile?: {
    connectionPull: string;
    fearOfWaiting: string;
    lowRiskMeeting: string;
    submittedAt: number;
  };
  bridgeByUser: Record<string, { sweetSpot: number; compromise: string; submittedAt: number }>;
  safetyPlan?: string;
}

export interface FinalCheckState {
  answers: TempCheckAnswer[];
  outcome: TempCheckOutcome;
  completedAt?: number;
}

export type MilestoneHandoffChoice = 'converse' | 'continue';

export interface MilestoneHandoffState {
  fromStage: MilestoneStage;
  toStage: MilestoneStage;
  unlockedAt: number;
  choicesByUser: Record<string, MilestoneHandoffChoice>;
}

export type DateOfferResponse = 'pending' | 'accepted' | 'declined';
export type DateOfferStatus = 'not-started' | 'proposed' | 'confirmed' | 'declined';

export interface DateOfferProposal {
  title: string;
  location: string;
  dateTime: string;
  durationMinutes: number;
  safetyNotes: string;
  proposedAt: number;
}

export interface DateOfferState {
  status: DateOfferStatus;
  proposal?: DateOfferProposal;
  proposedByUserId?: string;
  responsesByUser: Record<string, DateOfferResponse>;
  confirmedAt?: number;
  declinedByUserId?: string;
}

export interface RelationshipMilestones {
  stage: MilestoneStage;
  sharedVibe: SharedVibeState;
  truthOrDare: TruthDareState;
  tempCheck: TempCheckState;
  mirror: MirrorState;
  valueDeepDive: ValueDeepDiveState;
  rhythmRisk: RhythmRiskState;
  finalCheck: FinalCheckState;
  dateOffer: DateOfferState;
  handoff: MilestoneHandoffState | null;
  updatedAt: number;
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
  concierge?: ConciergeState;
  milestones?: RelationshipMilestones;
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
