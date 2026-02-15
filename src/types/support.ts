// Support message status lifecycle
export type SupportMessageStatus = 'unread' | 'in-progress' | 'resolved';

// Priority level for support messages
export type SupportMessagePriority = 'normal' | 'priority';

// Support message categories
export type SupportCategory =
  | 'technical'
  | 'account'
  | 'billing'
  | 'feature-request'
  | 'other';

// Support message submitted by user
export interface SupportMessage {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  membershipTier: 'monthly' | 'quarterly' | 'annual';
  category: SupportCategory;
  subject: string;
  message: string;
  status: SupportMessageStatus;
  priority: SupportMessagePriority;
  assignedAdminId?: string;
  adminResponse?: string;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

// Dashboard statistics for support messages
export interface SupportMessageStatistics {
  totalMessages: number;
  unreadMessages: number;
  inProgressMessages: number;
  resolvedMessages: number;
  averageResponseTime: number;
  priorityMessages: number;
  normalMessages: number;
}

// Filter options for admin support view
export interface SupportMessageFilters {
  status?: SupportMessageStatus;
  priority?: SupportMessagePriority;
  category?: SupportCategory;
  searchTerm?: string;
}
