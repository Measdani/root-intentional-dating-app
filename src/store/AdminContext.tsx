import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AdminUser, AdminSession, UserWithAdminData, UserStatus, UserFilters, AnalyticsSnapshot } from '@/types/admin';
import type { AssessmentQuestion, GrowthResource, MembershipTier } from '@/types/index';
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

  // Auth methods
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkPermission: (resource: string, action: string) => boolean;

  // User methods
  updateUserStatus: (userId: string, status: UserStatus) => void;
  deleteUser: (userId: string) => void;
  updateUser: (userId: string, data: Partial<UserWithAdminData>) => void;
  setSelectedUser: (user: UserWithAdminData | null) => void;

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
  }, []);

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
