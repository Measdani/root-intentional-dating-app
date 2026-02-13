// Report reason categories
export type ReportReason =
  | 'harassment'
  | 'inappropriate-content'
  | 'fake-profile'
  | 'spam'
  | 'safety-concern'
  | 'hateful-conduct'
  | 'underage'
  | 'other';

// Report status lifecycle
export type ReportStatus = 'pending' | 'under-review' | 'resolved' | 'dismissed';

// Severity levels (auto-calculated based on reason)
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

// Type of action taken to resolve report
export type ReportActionType =
  | 'warning'
  | 'temporary-suspension'
  | 'permanent-suspension'
  | 'account-deletion'
  | 'dismissed'
  | 'no-action';

// Individual conversation message
export interface ConversationMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  timestamp: number;
}

// Action taken by admin to resolve report
export interface ReportAction {
  type: ReportActionType;
  reason: string;
  duration?: number; // For temporary suspensions (in days)
  notifyReporter: boolean;
  notifyReported: boolean;
}

// Main report object
export interface Report {
  id: string;

  // Who reported and who was reported
  reporterId: string;
  reportedUserId: string;

  // Report content
  reason: ReportReason;
  details: string; // Min 50 characters
  conversationId?: string; // Optional - if report originated from conversation

  // Status tracking
  status: ReportStatus;
  severity: ReportSeverity; // Auto-calculated or admin-set

  // Admin workflow
  assignedAdminId?: string;
  adminNotes?: string;
  actionTaken?: ReportAction;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;

  // Evidence
  screenshots?: string[]; // Optional screenshot URLs
  relatedReportIds?: string[]; // Link to similar reports on same user
}

// User suspension record
export interface SuspensionRecord {
  id: string;
  userId: string;
  reason: string;
  startDate: number;
  endDate?: number; // undefined = permanent
  isPermanent: boolean;
  relatedReportId?: string;
  issuedBy: string; // Admin ID
}

// User block record (for self-protection)
export interface BlockedUser {
  userId: string;
  blockedUserId: string;
  reason?: string;
  timestamp: number;
}

// Aggregated report data for a user
export interface UserReportHistory {
  userId: string;
  reportsReceived: Report[];
  reportsFiled: Report[];
  totalReportsReceived: number;
  totalReportsFiled: number;
  isFlagged: boolean; // Auto-flagged if 3+ reports
  suspensionHistory: SuspensionRecord[];
}

// Dashboard statistics
export interface ReportStatistics {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  dismissedReports: number;
  averageResolutionTime: number; // In hours
  reportsByReason: Record<ReportReason, number>;
  topReportedUsers: { userId: string; reportCount: number }[];
}

// Filter options for admin reports view
export interface ReportFilters {
  status?: ReportStatus;
  reason?: ReportReason;
  severity?: ReportSeverity;
  searchTerm?: string;
  dateFrom?: number;
  dateTo?: number;
}
