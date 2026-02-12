export type AdminRole = 'super-admin' | 'admin' | 'moderator';

export interface AdminPermission {
  resource: 'users' | 'assessments' | 'content' | 'analytics' | 'settings';
  actions: ('view' | 'create' | 'edit' | 'delete')[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  createdAt: string;
  lastLogin: string;
}

export interface AdminSession {
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  loginTime: string | null;
}

export type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive';
export type AssessmentStatus = 'passed' | 'failed' | 'not-taken' | 'in-progress';

export interface UserWithAdminData {
  id: string;
  name: string;
  age: number;
  city: string;
  email: string;
  photoUrl?: string;
  bio?: string;
  partnershipIntent: 'marriage' | 'long-term' | 'life-partnership';
  familyAlignment: {
    hasChildren: boolean;
    wantsChildren: 'wants' | 'open' | 'does-not-want' | 'unsure';
    openToPartnerWithParent: 'actively-wants' | 'comfortable' | 'open-inexperienced' | 'prefers-child-free';
  };
  values: string[];
  growthFocus: string;
  alignmentScore?: number;
  status: UserStatus;
  joinedDate: string;
  lastActive: string;
  assessmentStatus: AssessmentStatus;
  assessmentScore?: number;
  suspensionReason?: string;
  notes?: string;
}

export interface AnalyticsSnapshot {
  totalUsers: number;
  activeUsers: number;
  assessmentPassRate: number;
  avgAlignmentScore: number;
  userGrowth: { month: string; users: number }[];
  categoryScores: { category: string; avgScore: number }[];
  userStatusDistribution: { status: string; count: number }[];
  familyIntentDistribution: { intent: string; count: number }[];
}

export interface UserFilters {
  searchTerm: string;
  status?: UserStatus;
  assessmentStatus?: AssessmentStatus;
  familyIntent?: string;
  partnershipIntent?: string;
}
