export interface User {
  id: string;
  name: string;
  age: number;
  city: string;
  partnershipIntent: 'marriage' | 'long-term' | 'life-partnership';
  familyAlignment: {
    hasChildren: boolean;
    wantsChildren: 'wants' | 'open' | 'does-not-want' | 'unsure';
    openToPartnerWithParent: 'actively-wants' | 'comfortable' | 'open-inexperienced' | 'prefers-child-free';
  };
  values: string[];
  growthFocus: string;
  alignmentScore?: number;
  photoUrl?: string;
  bio?: string;
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

export interface GrowthResource {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedTime: string;
}

export type AppView =
  | 'landing'
  | 'assessment'
  | 'assessment-result'
  | 'growth-mode'
  | 'browse'
  | 'profile'
  | 'membership'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-assessments'
  | 'admin-content'
  | 'admin-settings'
  | 'user-login';

export interface MembershipTier {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  features: string[];
}

export interface UserInteraction {
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: number;
  photosUnlocked: boolean;
}

export interface InteractionState {
  sentInterests: Record<string, UserInteraction>;
  receivedInterests: Record<string, UserInteraction>;
}
