import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { AdminUser, AdminSession, UserWithAdminData, UserStatus, UserFilters, AnalyticsSnapshot } from '@/types/admin';
import type { AssessmentQuestion, GrowthResource, MembershipTier, Report, ReportStatus, ReportStatistics, ReportFilters, SupportMessage, SupportMessageStatistics, SupportMessageFilters } from '@/types/index';
import { mockAdminUsers, mockAdminCredentials } from '@/data/admins';

interface AdminContextType {
  session: AdminSession;
  users: UserWithAdminData[];
  admins: AdminUser[];
  assessmentQuestions: AssessmentQuestion[];
  growthResources: GrowthResource[];
  membershipTiers: MembershipTier[];
  analytics: AnalyticsSnapshot;
  currentAdminView: string;
  selectedUser: UserWithAdminData | null;
  filters: UserFilters;
  isLoading: boolean;
  error: string | null;

  // Report-related
  reports: Report[];
  reportStats?: ReportStatistics;
  selectedReport: Report | null;
  reportFilters: ReportFilters;

  // Support message-related
  supportMessages: SupportMessage[];
  supportMessageStats?: SupportMessageStatistics;
  selectedSupportMessage: SupportMessage | null;
  supportMessageFilters: SupportMessageFilters;

  // Support message methods
  getSupportMessages: () => SupportMessage[];
  getUnreadSupportMessages: () => SupportMessage[];
  setSelectedSupportMessage: (message: SupportMessage | null) => void;
  setSupportMessageFilters: (filters: SupportMessageFilters) => void;
  updateSupportMessageStatus: (messageId: string, status: 'unread' | 'in-progress' | 'resolved', adminResponse?: string) => void;

  // Auth methods
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkPermission: (resource: string, action: string) => boolean;

  // User methods
  updateUserStatus: (userId: string, status: UserStatus) => void;
  deleteUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<UserWithAdminData>) => void;
  setSelectedUser: (user: UserWithAdminData | null) => void;

  // Report methods
  getReports: () => Report[];
  getPendingReports: () => Report[];
  getReportById: (reportId: string) => Report | null;
  setSelectedReport: (report: Report | null) => void;
  setReportFilters: (filters: ReportFilters) => void;
  updateReportStatus: (reportId: string, status: ReportStatus) => void;

  // UI methods
  setCurrentAdminView: (view: string) => void;
  setFilters: (filters: UserFilters) => void;
  setError: (error: string | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'rooted-admin-session';
const DATA_STORAGE_KEY = 'rooted-admin-data';

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AdminSession>({
    adminUser: null,
    isAuthenticated: false,
    loginTime: null,
  });

  const [users, setUsers] = useState<UserWithAdminData[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>(mockAdminUsers);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([]);
  const [growthResources, setGrowthResources] = useState<GrowthResource[]>([]);
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [analytics] = useState<AnalyticsSnapshot>({
    totalUsers: 0,
    activeUsers: 0,
    assessmentPassRate: 0,
    avgAlignmentScore: 0,
    userGrowth: [],
    categoryScores: [],
    userStatusDistribution: [],
    familyIntentDistribution: [],
  });

  const [currentAdminView, setCurrentAdminView] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState<UserWithAdminData | null>(null);

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportFilters, setReportFilters] = useState<ReportFilters>({});

  // Support messages state
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedSupportMessage, setSelectedSupportMessage] = useState<SupportMessage | null>(null);
  const [supportMessageFilters, setSupportMessageFilters] = useState<SupportMessageFilters>({});

  const [filters, setFilters] = useState<UserFilters>({ searchTerm: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
      } catch {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    }

    // Load data from localStorage
    const savedData = localStorage.getItem(DATA_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setUsers(parsed.users || []);
        setAssessmentQuestions(parsed.assessmentQuestions || []);
        setGrowthResources(parsed.growthResources || []);
        setMembershipTiers(parsed.membershipTiers || []);
      } catch {
        // Fall back to empty state
      }
    }

    // Load reports from localStorage
    try {
      const savedReports = localStorage.getItem('rooted-admin-reports');
      if (savedReports) {
        setReports(JSON.parse(savedReports));
      }
    } catch {
      // Fall back to empty state
    }

    // Load support messages from localStorage
    try {
      const savedMessages = localStorage.getItem('rooted-admin-support-messages');
      if (savedMessages) {
        setSupportMessages(JSON.parse(savedMessages));
      }
    } catch {
      // Fall back to empty state
    }

    // Listen for new reports from user context
    const handleNewReport = (event: CustomEvent) => {
      setReports(prev => [...prev, event.detail]);
    };

    // Listen for new support messages from user context
    const handleNewSupportMessage = (event: CustomEvent) => {
      setSupportMessages(prev => [...prev, event.detail]);
    };

    window.addEventListener('new-report' as any, handleNewReport as EventListener);
    window.addEventListener('new-support-message' as any, handleNewSupportMessage as EventListener);
    return () => {
      window.removeEventListener('new-report' as any, handleNewReport as EventListener);
      window.removeEventListener('new-support-message' as any, handleNewSupportMessage as EventListener);
    };
  }, []);

  // Save reports to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('rooted-admin-reports', JSON.stringify(reports));
    } catch {
      // Fall back silently
    }
  }, [reports]);

  // Save support messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('rooted-admin-support-messages', JSON.stringify(supportMessages));
    } catch {
      // Fall back silently
    }
  }, [supportMessages]);

  // Save session to localStorage
  const saveSession = useCallback((newSession: AdminSession) => {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  // Save data to localStorage
  const saveData = useCallback(() => {
    const data = {
      users,
      assessmentQuestions,
      growthResources,
      membershipTiers,
    };
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  }, [users, assessmentQuestions, growthResources, membershipTiers]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Validate credentials
      if (mockAdminCredentials[email] !== password) {
        setError('Invalid email or password');
        return false;
      }

      // Find admin user
      const adminUser = mockAdminUsers.find((a) => a.email === email);
      if (!adminUser) {
        setError('Admin user not found');
        return false;
      }

      // Update last login
      const updatedAdmin = { ...adminUser, lastLogin: new Date().toISOString() };
      setAdmins((prev: AdminUser[]) =>
        prev.map((a: AdminUser) => (a.id === adminUser.id ? updatedAdmin : a))
      );

      // Create session
      const newSession: AdminSession = {
        adminUser: updatedAdmin,
        isAuthenticated: true,
        loginTime: new Date().toISOString(),
      };

      saveSession(newSession);
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [saveSession]);

  const logout = useCallback(() => {
    saveSession({
      adminUser: null,
      isAuthenticated: false,
      loginTime: null,
    });
    setCurrentAdminView('dashboard');
    setSelectedUser(null);
  }, [saveSession]);

  const checkPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (!session.adminUser) return false;
      const permission = session.adminUser.permissions.find(
        (p) => p.resource === (resource as any)
      );
      return permission ? permission.actions.includes(action as any) : false;
    },
    [session.adminUser]
  );

  const updateUserStatus = useCallback(
    (userId: string, status: UserStatus) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status } : u))
      );
      saveData();
    },
    [saveData]
  );

  const deleteUser = useCallback(
    (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      saveData();
    },
    [saveData]
  );

  const updateUser = useCallback(
    (userId: string, data: Partial<UserWithAdminData>) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...data } : u))
      );
      saveData();
    },
    [saveData]
  );

  // Report management methods
  const getReports = useCallback((): Report[] => {
    return reports;
  }, [reports]);

  const getPendingReports = useCallback((): Report[] => {
    return reports.filter((r) => r.status === 'pending');
  }, [reports]);

  const getReportById = useCallback(
    (reportId: string): Report | null => {
      return reports.find((r) => r.id === reportId) || null;
    },
    [reports]
  );

  // Update report status
  const updateReportStatus = useCallback((reportId: string, status: ReportStatus) => {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? { ...r, status, updatedAt: Date.now(), resolvedAt: status === 'resolved' ? Date.now() : r.resolvedAt }
          : r
      )
    );
  }, []);

  // Compute report statistics
  const reportStats = useMemo((): ReportStatistics => {
    const totalReports = reports.length;
    const pendingReports = reports.filter((r) => r.status === 'pending').length;
    const resolvedReports = reports.filter((r) => r.status === 'resolved').length;
    const dismissedReports = reports.filter((r) => r.status === 'dismissed').length;

    // Calculate average resolution time (in hours)
    const resolvedWithTime = reports.filter((r) => r.status === 'resolved' && r.resolvedAt);
    const avgResolutionTime = resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce((sum, r) => {
            if (r.resolvedAt) {
              return sum + (r.resolvedAt - r.createdAt);
            }
            return sum;
          }, 0) / resolvedWithTime.length / (60 * 60 * 1000)
        )
      : 0;

    // Calculate top reported users
    const userReportCounts: Record<string, number> = {};
    reports.forEach((r) => {
      userReportCounts[r.reportedUserId] = (userReportCounts[r.reportedUserId] || 0) + 1;
    });
    const topReportedUsers = Object.entries(userReportCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, reportCount]) => ({ userId, reportCount }));

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      dismissedReports,
      averageResolutionTime: avgResolutionTime,
      reportsByReason: reports.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      topReportedUsers,
    };
  }, [reports]);

  // Support message management methods
  const getSupportMessages = useCallback((): SupportMessage[] => {
    return supportMessages;
  }, [supportMessages]);

  const getUnreadSupportMessages = useCallback((): SupportMessage[] => {
    return supportMessages.filter((m) => m.status === 'unread');
  }, [supportMessages]);

  const updateSupportMessageStatus = useCallback((
    messageId: string,
    status: 'unread' | 'in-progress' | 'resolved',
    adminResponse?: string
  ) => {
    setSupportMessages(prev =>
      prev.map(m => m.id === messageId
        ? {
            ...m,
            status,
            adminResponse,
            updatedAt: Date.now(),
            resolvedAt: status === 'resolved' ? Date.now() : m.resolvedAt,
          }
        : m
      )
    );
  }, []);

  // Compute support message statistics
  const supportMessageStats = useMemo((): SupportMessageStatistics => {
    const total = supportMessages.length;
    const unread = supportMessages.filter((m) => m.status === 'unread').length;
    const inProgress = supportMessages.filter((m) => m.status === 'in-progress').length;
    const resolved = supportMessages.filter((m) => m.status === 'resolved').length;
    const priority = supportMessages.filter((m) => m.priority === 'priority').length;

    const resolvedMessages = supportMessages.filter((m) => m.resolvedAt);
    const avgResponseTime = resolvedMessages.length > 0
      ? Math.round(
          resolvedMessages.reduce((sum, m) => sum + (m.resolvedAt! - m.createdAt), 0) / resolvedMessages.length / (60 * 60 * 1000)
        )
      : 0;

    return {
      totalMessages: total,
      unreadMessages: unread,
      inProgressMessages: inProgress,
      resolvedMessages: resolved,
      averageResponseTime: avgResponseTime,
      priorityMessages: priority,
      normalMessages: total - priority,
    };
  }, [supportMessages]);

  const value: AdminContextType = {
    session,
    users,
    admins,
    assessmentQuestions,
    growthResources,
    membershipTiers,
    analytics,
    currentAdminView,
    selectedUser,
    filters,
    isLoading,
    error,
    reports,
    reportStats,
    selectedReport,
    reportFilters,
    supportMessages,
    supportMessageStats,
    selectedSupportMessage,
    supportMessageFilters,
    login,
    logout,
    checkPermission,
    updateUserStatus,
    deleteUser,
    updateUser,
    setSelectedUser,
    setCurrentAdminView,
    setFilters,
    setError,
    getReports,
    getPendingReports,
    getReportById,
    setSelectedReport,
    setReportFilters,
    updateReportStatus,
    getSupportMessages,
    getUnreadSupportMessages,
    setSelectedSupportMessage,
    setSupportMessageFilters,
    updateSupportMessageStatus,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};
