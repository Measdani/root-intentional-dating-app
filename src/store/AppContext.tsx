import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AppView, AssessmentResult, User, InteractionState, UserInteraction, ConversationMessage, Report, ReportReason, ReportSeverity, SupportMessage, SupportCategory, AdminNotification, ConciergeSnapshot, ConciergeNudge } from '@/types';
import { sampleUsers, currentUser as defaultUser } from '@/data/users';
import {
  applyRelationshipModeToUser,
  canUsersExchangeMessages,
  getMessageBlockReason,
  getNewMatchBlockReason,
} from '@/modules';
import { toast } from 'sonner';
import { reportService } from '@/services/reportService';
import { supportService } from '@/services/supportService';
import { userService } from '@/services/userService';
import { moderateFirstMessage } from '@/services/firstMessageSafetyService';
import { evaluateConciergeForInteraction } from '@/services/conciergeService';
import { enrichConciergeSnapshotWithAI } from '@/services/conciergeAiService';
import {
  applyMilestoneAction as reduceMilestoneAction,
  createInitialMilestones,
  normalizeMilestones,
  type MilestoneAction,
} from '@/services/relationshipMilestoneService';

interface AppState {
  currentView: AppView;
  previousView: AppView;
  assessmentAnswers: { questionId: string; score: number; redFlag?: boolean }[];
  assessmentResult: AssessmentResult | null;
  selectedUser: User | null;
  selectedConversation: UserInteraction | null;
  currentUser: User;
  users: User[];
  hasJoinedList: boolean;
  showEmailModal: boolean;
  interactions: InteractionState;
  blockedUsers: string[];
}

interface AppContextType extends AppState {
  setCurrentView: (view: AppView) => void;
  addAssessmentAnswer: (questionId: string, score: number, redFlag?: boolean) => void;
  setAssessmentResult: (result: AssessmentResult) => void;
  setSelectedUser: (user: User | null) => void;
  setHasJoinedList: (value: boolean) => void;
  setShowEmailModal: (value: boolean) => void;
  resetAssessment: () => void;
  expressInterest: (toUserId: string, message: string) => Promise<boolean>;
  respondToInterest: (fromUserId: string, message: string) => boolean;
  startRelationshipRoom: (partnerUserId: string) => UserInteraction | null;
  markMessagesAsRead: (conversationId: string) => void;
  grantPhotoConsent: (conversationId: string) => void;
  withdrawPhotoConsent: (conversationId: string) => void;
  hasExpressedInterest: (userId: string) => boolean;
  arePhotosUnlocked: (userId: string) => boolean;
  canRevealPhotos: (userId: string) => boolean;
  needsResponse: (userId: string) => boolean;
  getConversation: (userId: string) => UserInteraction | null;
  getReceivedInterests: () => UserInteraction[];
  getSentInterests: () => UserInteraction[];
  getUnreadCount: () => number;
  selectedConversation: UserInteraction | null;
  setSelectedConversation: (conversation: UserInteraction | null) => void;
  saveAssessmentDate: () => void;
  getNextRetakeDate: () => Date | null;
  canRetakeAssessment: () => boolean;
  reportUser: (reportedUserId: string, reason: ReportReason, details: string, conversationId?: string) => Promise<string>;
  blockUser: (userId: string, reason?: string) => void;
  unblockUser: (userId: string) => void;
  isUserBlocked: (userId: string) => boolean;
  isBlockedByUser: (userId: string) => boolean;
  suspendUser: (userId: string, suspensionEndDate: number) => void;
  reinstateUser: (userId: string) => void;
  removeUser: (userId: string) => void;
  showSupportModal: boolean;
  setShowSupportModal: (value: boolean) => void;
  submitSupportRequest: (category: SupportCategory, subject: string, message: string) => Promise<string>;
  notifications: AdminNotification[];
  getNotifications: () => AdminNotification[];
  getUnreadNotifications: () => AdminNotification[];
  markNotificationAsRead: (notificationId: string) => void;
  addNotification: (type: 'warning' | 'suspension' | 'removal', title: string, message: string, userId: string) => void;
  reloadNotifications: () => void;
  reloadInteractions: () => void;
  applyMilestoneAction: (conversationId: string, action: MilestoneAction) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const isUserLike = (value: unknown): value is User =>
  Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string');

const normalizeUser = (user: User): User => applyRelationshipModeToUser(user);

const upsertUserById = (existingUsers: User[], user: User): User[] => {
  const normalizedUser = normalizeUser(user);
  const existingIndex = existingUsers.findIndex((candidate) => candidate.id === normalizedUser.id);

  if (existingIndex === -1) {
    return [...existingUsers, normalizedUser];
  }

  const mergedUser = { ...existingUsers[existingIndex], ...normalizedUser };
  const nextUsers = [...existingUsers];
  nextUsers[existingIndex] = mergedUser;
  return nextUsers;
};

const mergeUsersById = (existingUsers: User[], usersToMerge: User[]): User[] =>
  usersToMerge.reduce((nextUsers, user) => upsertUserById(nextUsers, user), existingUsers);

const CONCIERGE_AUTO_REPORTS_KEY = 'rooted_concierge_auto_reports';
const SYSTEM_CONCIERGE_REPORTER_ID = 'system-concierge';

const buildSystemReportId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
};

const readConciergeAutoReportRegistry = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CONCIERGE_AUTO_REPORTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch (error) {
    console.warn('Failed to read concierge auto-report registry:', error);
    return {};
  }
};

const writeConciergeAutoReportRegistry = (registry: Record<string, string>) => {
  try {
    localStorage.setItem(CONCIERGE_AUTO_REPORTS_KEY, JSON.stringify(registry));
  } catch (error) {
    console.warn('Failed to persist concierge auto-report registry:', error);
  }
};

const mergeSnapshotsIntoInteraction = (
  interaction: UserInteraction,
  snapshotUpdates: ConciergeSnapshot[]
): UserInteraction => {
  if (snapshotUpdates.length === 0) return interaction;

  const updatesById = new Map(snapshotUpdates.map((snapshot) => [snapshot.id, snapshot]));
  const existingSnapshots = interaction.concierge?.snapshots ?? [];
  const mergedSnapshots = existingSnapshots.map((snapshot) => updatesById.get(snapshot.id) ?? snapshot);

  return {
    ...interaction,
    concierge: {
      nudges: interaction.concierge?.nudges ?? [],
      snapshots: mergedSnapshots,
    },
    updatedAt: Date.now(),
  };
};

const updateInteractionStateByConversationId = (
  state: InteractionState,
  conversationId: string,
  updater: (interaction: UserInteraction) => UserInteraction
): InteractionState => {
  const updateBucket = (bucket: Record<string, UserInteraction>) =>
    Object.entries(bucket).reduce((acc, [key, interaction]) => {
      acc[key] = interaction.conversationId === conversationId ? updater(interaction) : interaction;
      return acc;
    }, {} as Record<string, UserInteraction>);

  return {
    sentInterests: updateBucket(state.sentInterests),
    receivedInterests: updateBucket(state.receivedInterests),
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<AppView>('landing');
  const [previousView, setPreviousView] = useState<AppView>('landing');
  const [assessmentAnswers, setAssessmentAnswers] = useState<{ questionId: string; score: number; redFlag?: boolean }[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<UserInteraction | null>(null);

  // Check localStorage for logged-in user (from demo login), otherwise use default
  // Use state + effect to make it reactive when user logs in/out
  const [currentUser, setCurrentUserState] = useState<User>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        return applyRelationshipModeToUser(JSON.parse(savedUser) as User);
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
    return applyRelationshipModeToUser(defaultUser);
  });

  const [users, setUsers] = useState<User[]>(() => {
    const seededUsers = sampleUsers.map((user) => normalizeUser(user));
    const usersWithCurrent = upsertUserById(seededUsers, currentUser);

    try {
      const savedUsersRaw = localStorage.getItem('rooted-admin-users');
      if (!savedUsersRaw) return usersWithCurrent;

      const parsedUsers = JSON.parse(savedUsersRaw);
      if (!Array.isArray(parsedUsers)) return usersWithCurrent;

      const persistedUsers = parsedUsers
        .filter(isUserLike)
        .map((user) => normalizeUser(user));
      return mergeUsersById(usersWithCurrent, persistedUsers);
    } catch (error) {
      console.warn('Failed to load users from localStorage:', error);
      return usersWithCurrent;
    }
  });

  useEffect(() => {
    let cancelled = false;

    const syncUsersFromSupabase = async () => {
      try {
        const remoteUsers = await userService.getAllUsers();
        if (cancelled || remoteUsers.length === 0) return;

        const normalizedRemoteUsers = remoteUsers.map((user) => normalizeUser(user));
        setUsers((prev) => mergeUsersById(prev, normalizedRemoteUsers));
      } catch (error) {
        console.warn('Failed to sync users from Supabase:', error);
      }
    };

    void syncUsersFromSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  // Update currentUser when localStorage changes (on login/logout)
  useEffect(() => {
    const syncUsersFromStorage = () => {
      try {
        const savedUsersRaw = localStorage.getItem('rooted-admin-users');
        if (!savedUsersRaw) return;

        const parsedUsers = JSON.parse(savedUsersRaw);
        if (!Array.isArray(parsedUsers)) return;

        const persistedUsers = parsedUsers
          .filter(isUserLike)
          .map((user) => normalizeUser(user));
        setUsers((prev) => mergeUsersById(prev, persistedUsers));
      } catch (error) {
        console.warn('Failed to sync users from localStorage:', error);
      }
    };

    const handleStorageChange = () => {
      try {
        syncUsersFromStorage();
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as User;

          // Check if this user has a stored suspension
          const suspensions = JSON.parse(localStorage.getItem('rooted_suspensions') || '{}');
          if (suspensions[parsedUser.id]) {
            const suspension = suspensions[parsedUser.id];
            parsedUser.suspensionEndDate = suspension.suspensionEndDate;
            parsedUser.userStatus = suspension.userStatus;
          }

          // Restore assessment result from persistent storage if user doesn't have it
          if (parsedUser.assessmentPassed === undefined) {
            try {
              const savedResult = localStorage.getItem('assessmentResult');
              if (savedResult) {
                const result = JSON.parse(savedResult);
                parsedUser.assessmentPassed = result.passed;
                parsedUser.alignmentScore = result.percentage;
                parsedUser.userStatus = result.passed ? 'active' : 'needs-growth';
              }
            } catch (err) {
              console.error('Failed to restore assessment result:', err);
            }
          }

          const normalizedUser = normalizeUser(parsedUser);
          setCurrentUserState(normalizedUser);
          setUsers((prev) => upsertUserById(prev, normalizedUser));
        } else {
          const fallbackUser = normalizeUser(defaultUser);
          setCurrentUserState(fallbackUser);
          setUsers((prev) => upsertUserById(prev, fallbackUser));
        }
      } catch (error) {
        console.error('Failed to update user from localStorage:', error);
      }
    };

    // Listen for both storage events (from other tabs) and custom user-login event (same tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-login', handleStorageChange);
    window.addEventListener('new-user', handleStorageChange as EventListener);
    window.addEventListener('relationship-mode-updated', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login', handleStorageChange);
      window.removeEventListener('new-user', handleStorageChange as EventListener);
      window.removeEventListener('relationship-mode-updated', handleStorageChange as EventListener);
    };
  }, []);

  useEffect(() => {
    setUsers((prev) => upsertUserById(prev, currentUser));
  }, [currentUser]);

  // Apply stored suspensions when currentUser changes (e.g., on login)
  useEffect(() => {
    try {
      const suspensions = JSON.parse(localStorage.getItem('rooted_suspensions') || '{}');
      if (suspensions[currentUser.id]) {
        const suspension = suspensions[currentUser.id];
        setCurrentUserState(prev => ({
          ...prev,
          suspensionEndDate: suspension.suspensionEndDate,
          userStatus: suspension.userStatus,
        }));
      }
    } catch (error) {
      console.error('Failed to apply suspension:', error);
    }
  }, [currentUser.id]);

  // Check for assessment abandonment and apply cooling period
  useEffect(() => {
    if (currentUser.id === defaultUser.id) return; // Skip for default user

    try {
      const abandonmentData = JSON.parse(localStorage.getItem('assessmentAbandonment') || '{}');
      if (abandonmentData.coolingPeriodUntil) {
        const coolingPeriodEndTime = new Date(abandonmentData.coolingPeriodUntil).getTime();
        const currentTime = Date.now();

        if (currentTime < coolingPeriodEndTime) {
          // Still in cooling period - place user in Inner Work Space
          setCurrentUserState(prev => ({
            ...prev,
            userStatus: 'needs-growth',
            assessmentPassed: false,
          }));
          // Mark to show the assessment-not-completed page
          sessionStorage.setItem('showAssessmentNotCompleted', 'true');
          // Clear the abandonment data since we've applied the consequence
          localStorage.removeItem('assessmentAbandonment');
          console.log('User is in 6-month cooling period after assessment abandonment');
        } else {
          // Cooling period has passed - allow user to retake assessment
          localStorage.removeItem('assessmentAbandonment');
          console.log('Cooling period has ended - user can retake assessment');
        }
      }
    } catch (error) {
      console.error('Failed to check assessment abandonment:', error);
    }
  }, [currentUser.id]);

  const [hasJoinedList, setHasJoinedList] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [interactions, setInteractions] = useState<InteractionState>({
    sentInterests: {},
    receivedInterests: {},
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const suspensionProcessedRef = useRef<string | null>(null);

  // Load interactions from localStorage on mount
  // Uses shared storage so all users can see each other's messages (for testing)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rooted_shared_interactions');
      if (saved) {
        setInteractions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load interactions:', error);
    }

    // Load blocked users
    try {
      const savedBlocked = localStorage.getItem('rooted_blocked_users');
      if (savedBlocked) {
        setBlockedUsers(JSON.parse(savedBlocked));
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    }

    return () => {
      // Clean up timeouts on unmount
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Save interactions to shared localStorage so all users can see messages
  useEffect(() => {
    console.log('Save interactions useEffect triggered with:', interactions);
    try {
      console.log('Stringifying interactions...');
      const json = JSON.stringify(interactions);
      console.log('Successfully stringified. JSON length:', json.length);
      console.log('Calling localStorage.setItem...');
      localStorage.setItem('rooted_shared_interactions', json);
      console.log('✅ Interactions saved successfully to localStorage');
      console.log('Saved JSON:', json);
    } catch (error) {
      console.error('❌ Failed to save interactions:', error);
      console.error('Error type:', error instanceof Error ? error.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Interactions object:', interactions);
    }
  }, [interactions]);

  // Save blocked users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rooted_blocked_users', JSON.stringify(blockedUsers));
    } catch (error) {
      console.error('Failed to save blocked users:', error);
    }
  }, [blockedUsers]);

  // Load users who have blocked current user
  useEffect(() => {
    try {
      const allBlocks = JSON.parse(localStorage.getItem('rooted_all_blocks') || '{}');
      const usersWhoBlockedMe = allBlocks[currentUser.id] || [];
      console.log(`👤 Loading blockedByUsers for ${currentUser.id}:`, usersWhoBlockedMe);
      setBlockedByUsers(usersWhoBlockedMe);
    } catch (error) {
      console.error('Failed to load blocked by users:', error);
    }

    // Listen for blocks-updated events (when another user blocks current user)
    const handleBlocksUpdated = (event: any) => {
      const allBlocks = event.detail;
      const usersWhoBlockedMe = allBlocks[currentUser.id] || [];
      console.log(`🔄 Blocks updated for ${currentUser.id}:`, usersWhoBlockedMe);
      setBlockedByUsers(usersWhoBlockedMe);
    };

    window.addEventListener('blocks-updated', handleBlocksUpdated);
    return () => window.removeEventListener('blocks-updated', handleBlocksUpdated);
  }, [currentUser.id]);

  // Load notifications for current user
  useEffect(() => {
    try {
      const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
      const userNotifications = allNotifications[currentUser.id] || [];
      console.log(`📬 Loaded notifications for ${currentUser.id}:`, userNotifications);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }

    // Listen for notification-added events (when another admin sends notification to current user)
    const handleNotificationAdded = (event: any) => {
      const { userId, notification } = event.detail;
      if (userId === currentUser.id) {
        console.log(`🔔 New notification received for ${currentUser.id}:`, notification);
        setNotifications(prev => [...prev, notification]);
      }
    };

    window.addEventListener('notification-added', handleNotificationAdded);
    return () => window.removeEventListener('notification-added', handleNotificationAdded);
  }, [currentUser.id]);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
      allNotifications[currentUser.id] = notifications;
      localStorage.setItem('rooted_notifications', JSON.stringify(allNotifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [notifications, currentUser.id]);

  // Manually reload interactions from localStorage
  const reloadInteractions = useCallback(() => {
    try {
      console.log('🔄 Reloading interactions from localStorage...');
      const saved = localStorage.getItem('rooted_shared_interactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ Interactions reloaded:', parsed);
        setInteractions(parsed);
      }
    } catch (error) {
      console.error('Failed to reload interactions:', error);
    }
  }, []);

  // Reload interactions when currentUser changes (for user login/logout)
  // StorageEvent doesn't fire in same tab, so we need to manually reload
  useEffect(() => {
    try {
      console.log('useEffect triggered: reloading interactions for user', currentUser.id);
      const saved = localStorage.getItem('rooted_shared_interactions');
      console.log('Retrieved from localStorage:', saved);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('Parsed interactions:', parsed);
        setInteractions(parsed);
        console.log('✅ Interactions reloaded for user', currentUser.id);
      } else {
        console.log('No interactions found in localStorage for user', currentUser.id);
      }
    } catch (error) {
      console.error('Failed to reload interactions on user change:', error);
    }
  }, [currentUser.id]);

  // Check for expired suspensions and transition to needs-growth status
  useEffect(() => {
    // Only process if suspension details changed and we haven't already processed this suspension
    if (currentUser.suspensionEndDate && currentUser.userStatus === 'suspended') {
      const now = Date.now();
      const suspensionKey = `${currentUser.id}-${currentUser.suspensionEndDate}`;

      // Only process if this is a new suspension or we haven't checked it yet
      if (suspensionProcessedRef.current !== suspensionKey && now >= currentUser.suspensionEndDate) {
        suspensionProcessedRef.current = suspensionKey;

        // Suspension has expired - transition to needs-growth status
        const updatedUser = applyRelationshipModeToUser({
          ...currentUser,
          userStatus: 'needs-growth' as const,
          suspensionEndDate: undefined,
        });
        setCurrentUserState(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Send notification about suspension ending and growth mode requirement
        const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
        const userNotifications = allNotifications[currentUser.id] || [];
        const newNotification: AdminNotification = {
          id: `notif_${Date.now()}`,
          userId: currentUser.id,
          type: 'warning',
          title: 'Suspension Period Ended',
          message: 'Your account suspension period has ended. You must now complete the Inner Work Space assessment to regain full access to browsing and matching.',
          createdAt: Date.now(),
          read: false,
        };
        userNotifications.push(newNotification);
        allNotifications[currentUser.id] = userNotifications;
        localStorage.setItem('rooted_notifications', JSON.stringify(allNotifications));
        setNotifications(userNotifications);
      }
    }
  }, [currentUser.suspensionEndDate, currentUser.userStatus, currentUser.id]);

  // Auto-redirect suspended and needs-growth users to appropriate view
  // Also redirect users with failed assessments (assessmentPassed === false)
  useEffect(() => {
    let hasStoredAssessmentResult = false;
    try {
      const userScopedResult = localStorage.getItem(`assessmentResult_${currentUser.id}`);
      if (userScopedResult) {
        hasStoredAssessmentResult = true;
      } else {
        const legacyResult = localStorage.getItem('assessmentResult');
        if (legacyResult) {
          const parsed = JSON.parse(legacyResult);
          hasStoredAssessmentResult = !parsed?.userId || parsed.userId === currentUser.id;
        }
      }
    } catch (error) {
      console.warn('Failed to inspect stored assessment result:', error);
    }

    const hasFailedAssessmentSignal =
      currentUser.assessmentPassed === false &&
      (typeof currentUser.alignmentScore === 'number' || hasStoredAssessmentResult);

    const shouldRedirect =
      (currentUser.userStatus === 'suspended' || currentUser.userStatus === 'needs-growth') ||
      hasFailedAssessmentSignal;

    if (shouldRedirect &&
      currentView !== 'growth-mode' &&
      currentView !== 'profile' &&
      currentView !== 'conversation' &&
      currentView !== 'assessment' &&
      currentView !== 'assessment-result' &&
      currentView !== 'assessment-not-completed' &&
      currentView !== 'community-blog' &&
      currentView !== 'clarity-room' &&
      currentView !== 'user-settings'
    ) {
      // Check if we should show the assessment-not-completed page
      const shouldShowNotCompleted = sessionStorage.getItem('showAssessmentNotCompleted') === 'true';

      if (shouldShowNotCompleted) {
        // Show the assessment-not-completed page
        setPreviousView(currentView);
        setCurrentViewState('assessment-not-completed');
        // Clear the flag so it only shows once
        sessionStorage.removeItem('showAssessmentNotCompleted');
      } else {
        // Route to growth-mode
        setPreviousView(currentView);
        setCurrentViewState('growth-mode');
      }
    }
  }, [currentUser.userStatus, currentUser.assessmentPassed, currentView]);

  // Auto-redirect users who passed assessment to browse view
  // This prevents users from being re-presented with the assessment they've already passed
  useEffect(() => {
    if (
      currentUser.assessmentPassed === true &&
      currentUser.userStatus === 'active' &&
      currentView === 'landing'
    ) {
      setPreviousView(currentView);
      setCurrentViewState('browse');
    }
  }, [currentUser.assessmentPassed, currentUser.userStatus, currentView]);

  // Wrapper function to track previous view when changing views
  const setCurrentView = useCallback((view: AppView) => {
    setPreviousView(currentView);
    setCurrentViewState(view);
  }, [currentView]);

  const addAssessmentAnswer = useCallback((questionId: string, score: number, redFlag?: boolean) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, redFlag }]);
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers([]);
    setAssessmentResult(null);
  }, []);

  const applyAiConciergeSnapshots = useCallback((conversationId: string, snapshots: ConciergeSnapshot[]) => {
    if (snapshots.length === 0) return;

    setInteractions((prev) =>
      updateInteractionStateByConversationId(prev, conversationId, (interaction) =>
        mergeSnapshotsIntoInteraction(interaction, snapshots)
      )
    );

    setSelectedConversation((prev) => {
      if (!prev || prev.conversationId !== conversationId) return prev;
      return mergeSnapshotsIntoInteraction(prev, snapshots);
    });
  }, []);

  const maybeEnrichSnapshotsWithAI = useCallback(async (
    interaction: UserInteraction,
    snapshots: ConciergeSnapshot[]
  ) => {
    if (snapshots.length === 0) return;

    const enrichedSnapshots = await Promise.all(
      snapshots.map((snapshot) => enrichConciergeSnapshotWithAI(interaction, snapshot))
    );

    const successfulUpdates = enrichedSnapshots.filter(
      (snapshot): snapshot is ConciergeSnapshot => Boolean(snapshot)
    );

    if (successfulUpdates.length === 0) return;
    applyAiConciergeSnapshots(interaction.conversationId, successfulUpdates);
  }, [applyAiConciergeSnapshots]);

  const publishConciergeAutoReport = useCallback(async (
    report: Report,
    signature: string
  ) => {
    const registry = readConciergeAutoReportRegistry();
    if (registry[signature]) return;

    try {
      const existingReports = JSON.parse(localStorage.getItem('rooted-admin-reports') || '[]');
      const nextReports = Array.isArray(existingReports) ? [...existingReports, report] : [report];
      localStorage.setItem('rooted-admin-reports', JSON.stringify(nextReports));
      registry[signature] = report.id;
      writeConciergeAutoReportRegistry(registry);
      window.dispatchEvent(new CustomEvent('new-report', { detail: report }));
    } catch (error) {
      console.warn('Failed to persist concierge auto report locally:', error);
    }

    reportService.createReport(report).catch((error) => {
      console.warn('Failed to persist concierge auto report to Supabase:', error);
    });
  }, []);

  const maybeCreateConciergeAutoReports = useCallback(async (
    interaction: UserInteraction,
    newNudges: ConciergeNudge[]
  ) => {
    if (newNudges.length === 0) return;

    const now = Date.now();
    const reportsToPublish: Array<{ report: Report; signature: string }> = [];

    newNudges
      .filter((nudge) => nudge.type === 'off-platform-early')
      .forEach((nudge) => {
        const signature = `off-platform-early:${interaction.conversationId}:${nudge.triggeredByUserId}`;
        reportsToPublish.push({
          signature,
          report: {
            id: buildSystemReportId(),
            reporterId: SYSTEM_CONCIERGE_REPORTER_ID,
            reportedUserId: nudge.triggeredByUserId,
            reason: 'spam',
            details:
              `Automated concierge safety monitor detected an early off-platform request in conversation ${interaction.conversationId}. ` +
              `The signal was triggered at message #${nudge.messageCountAtTrigger}. Please review context for potential grooming, scam, or coercive contact behavior.`,
            conversationId: interaction.conversationId,
            status: 'pending',
            severity: 'high',
            createdAt: now,
            updatedAt: now,
            adminNotes: 'System-generated by Concierge Monitor: off-platform-early risk.',
          },
        });
      });

    const talkBalanceNudges = (interaction.concierge?.nudges ?? []).filter(
      (nudge) => nudge.type === 'talk-balance'
    );
    if (talkBalanceNudges.length >= 3) {
      const latestTalkBalance = talkBalanceNudges[talkBalanceNudges.length - 1];
      const signature = `talk-balance-repeated:${interaction.conversationId}:3`;
      reportsToPublish.push({
        signature,
        report: {
          id: buildSystemReportId(),
          reporterId: SYSTEM_CONCIERGE_REPORTER_ID,
          reportedUserId: latestTalkBalance.triggeredByUserId,
          reason: 'other',
          details:
            `Automated concierge monitor detected repeated conversation imbalance in conversation ${interaction.conversationId}. ` +
            `A talk-balance signal has triggered ${talkBalanceNudges.length} times, indicating one participant may be dominating the room and reducing reciprocity.`,
          conversationId: interaction.conversationId,
          status: 'pending',
          severity: 'medium',
          createdAt: now,
          updatedAt: now,
          adminNotes: 'System-generated by Concierge Monitor: repeated talk-balance risk.',
        },
      });
    }

    for (const candidate of reportsToPublish) {
      await publishConciergeAutoReport(candidate.report, candidate.signature);
    }
  }, [publishConciergeAutoReport]);

  // NOTE: Auto-response and auto-consent features removed
  // All messaging and consent decisions are now controlled by users only

  const expressInterest = useCallback(async (toUserId: string, message: string): Promise<boolean> => {
    console.log('expressInterest called:', { toUserId, message, currentUserId: currentUser.id });

    const blockReason = getNewMatchBlockReason(currentUser.id, toUserId);
    if (blockReason) {
      return false;
    }

    // Check if already expressed interest to this user
    if (interactions.sentInterests[toUserId]) {
      return false;
    }

    // Create deterministic conversationId using sorted user pair so both users share same thread
    const conversationId = `conv_${[currentUser.id, toUserId].sort().join('_')}`;
    const recipient = users.find((user) => user.id === toUserId);
    const moderationResult = await moderateFirstMessage({
      senderAppUserId: currentUser.id,
      recipientAppUserId: toUserId,
      senderEmail: currentUser.email,
      recipientEmail: recipient?.email,
      content: message,
      conversationId,
    });

    if (!moderationResult.approved) {
      return false;
    }

    const messageId = moderationResult.messageId ?? `msg_${Date.now()}`;

    const initialMessage: ConversationMessage = {
      id: messageId,
      fromUserId: currentUser.id,
      toUserId,
      message,
      timestamp: Date.now(),
      messageType: 'initial',
      read: false,
    };

    const newInteraction: UserInteraction = {
      fromUserId: currentUser.id,
      toUserId,
      conversationId,
      messages: [initialMessage],
      photoConsent: {
        fromUser: { userId: currentUser.id, hasConsented: false },
        toUser: { userId: toUserId, hasConsented: false },
      },
      photosUnlocked: false,
      status: 'pending_response',
      concierge: {
        nudges: [],
        snapshots: [],
      },
      milestones: createInitialMilestones(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('newInteraction created:', newInteraction);
    console.log('About to call setInteractions...');

    setInteractions(prev => {
      console.log('setInteractions callback called with prev:', prev);
      const updated = {
        ...prev,
        sentInterests: {
          ...prev.sentInterests,
          [toUserId]: newInteraction,
        },
      };
      console.log('setInteractions new state:', updated);
      return updated;
    });

    // NOTE: Auto-response feature disabled to allow natural conversation flow
    // Users should reply manually without system auto-generating responses
    return true;
  }, [currentUser.id, currentUser.email, interactions.sentInterests, users]);

  const respondToInterest = useCallback((fromUserId: string, message: string): boolean => {
    const blockReason = getMessageBlockReason(currentUser.id, fromUserId);
    if (blockReason) {
      return false;
    }

    let didSend = false;
    let updatedConversation: UserInteraction | null = null;
    let generatedSnapshots: ConciergeSnapshot[] = [];
    let generatedNudges: ConciergeNudge[] = [];
    setInteractions(prev => {
      // Find the conversation with this user (could be keyed by either user ID)
      let baseInteraction = null;
      let foundInReceivedAt: string | null = null;
      let foundInSentAt: string | null = null;

      // Check simple keys first
      if (prev.receivedInterests[fromUserId]) {
        baseInteraction = prev.receivedInterests[fromUserId];
        foundInReceivedAt = fromUserId;
      } else if (prev.sentInterests[fromUserId]) {
        baseInteraction = prev.sentInterests[fromUserId];
        foundInSentAt = fromUserId;
      } else {
        // Search all interactions if not found by simple key
        const foundInReceived = Object.entries(prev.receivedInterests).find(
          ([_, i]) => i.fromUserId === fromUserId || i.toUserId === fromUserId
        );
        if (foundInReceived) {
          baseInteraction = foundInReceived[1];
          foundInReceivedAt = foundInReceived[0];
        } else {
          const foundInSent = Object.entries(prev.sentInterests).find(
            ([_, i]) => i.fromUserId === fromUserId || i.toUserId === fromUserId
          );
          if (foundInSent) {
            baseInteraction = foundInSent[1];
            foundInSentAt = foundInSent[0];
          }
        }
      }

      if (!baseInteraction) {
        console.warn('No conversation found with user:', fromUserId);
        return prev;
      }

      const responseMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        fromUserId: currentUser.id,  // Current user is responding
        toUserId: fromUserId,  // Response goes to the other user
        message,
        timestamp: Date.now(),
        messageType: 'response',
        read: false,
      };

      const allMessages = [...baseInteraction.messages, responseMessage];

      // Check if BOTH users have sent messages with 120+ characters
      const userAMessages = allMessages.filter(m => m.fromUserId === baseInteraction.fromUserId);
      const userBMessages = allMessages.filter(m => m.fromUserId === baseInteraction.toUserId);

      const userAHasSufficient = userAMessages.some(m => m.message.length >= 120);
      const userBHasSufficient = userBMessages.some(m => m.message.length >= 120);
      const bothValid = userAHasSufficient && userBHasSufficient;

      const interactionWithMessage: UserInteraction = {
        ...baseInteraction,
        messages: allMessages,
        status: bothValid ? 'both_messaged' : 'pending_response',
        milestones: normalizeMilestones(baseInteraction.milestones),
        updatedAt: Date.now(),
      };

      const conciergeResult = evaluateConciergeForInteraction(interactionWithMessage);
      const existingNudges = baseInteraction.concierge?.nudges ?? [];
      const existingSnapshots = baseInteraction.concierge?.snapshots ?? [];
      generatedSnapshots = conciergeResult.snapshots;
      generatedNudges = conciergeResult.nudges;

      const updatedInteraction: UserInteraction = {
        ...interactionWithMessage,
        concierge: {
          nudges: [...existingNudges, ...conciergeResult.nudges],
          snapshots: [...existingSnapshots, ...conciergeResult.snapshots],
        },
      };

      // Start with existing interactions
      const updatedReceivedInterests = { ...prev.receivedInterests };
      const updatedSentInterests = { ...prev.sentInterests };

      // Update the original location where we found it
      if (foundInReceivedAt) {
        updatedReceivedInterests[foundInReceivedAt] = updatedInteraction;
      }
      if (foundInSentAt) {
        updatedSentInterests[foundInSentAt] = updatedInteraction;
      }

      // Also ensure it's in sentInterests and receivedInterests by the other user's ID
      // so both parties can see it regardless of how it was originally keyed
      updatedReceivedInterests[fromUserId] = updatedInteraction;
      updatedSentInterests[fromUserId] = updatedInteraction;

      // Also update the conversation if it exists elsewhere by conversationId
      // (in case the current user initiated the conversation)
      Object.entries(prev.sentInterests).forEach(([key, interaction]) => {
        if (interaction.conversationId === baseInteraction.conversationId) {
          updatedSentInterests[key] = updatedInteraction;
        }
      });
      Object.entries(prev.receivedInterests).forEach(([key, interaction]) => {
        if (interaction.conversationId === baseInteraction.conversationId) {
          updatedReceivedInterests[key] = updatedInteraction;
        }
      });

      didSend = true;
      updatedConversation = updatedInteraction;

      return {
        ...prev,
        receivedInterests: updatedReceivedInterests,
        sentInterests: updatedSentInterests,
      };
    });

    if (!didSend) {
      return false;
    }

    if (updatedConversation) {
      setSelectedConversation(prev => {
        if (!prev || prev.conversationId !== updatedConversation?.conversationId) return prev;
        return updatedConversation;
      });

      if (generatedSnapshots.length > 0) {
        void maybeEnrichSnapshotsWithAI(updatedConversation, generatedSnapshots);
      }
      if (generatedNudges.length > 0) {
        void maybeCreateConciergeAutoReports(updatedConversation, generatedNudges);
      }
    }
    return true;
  }, [currentUser.id, maybeEnrichSnapshotsWithAI, maybeCreateConciergeAutoReports]);

  const startRelationshipRoom = useCallback((partnerUserId: string): UserInteraction | null => {
    const blockReason = getMessageBlockReason(currentUser.id, partnerUserId);
    if (blockReason) {
      return null;
    }

    const now = Date.now();
    const conversationId = `conv_${[currentUser.id, partnerUserId].sort().join('_')}`;
    const existing = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ].find((interaction) => interaction.conversationId === conversationId);

    const room: UserInteraction = existing ?? {
      fromUserId: currentUser.id,
      toUserId: partnerUserId,
      conversationId,
      messages: [],
      photoConsent: {
        fromUser: { userId: currentUser.id, hasConsented: true, consentTimestamp: now },
        toUser: { userId: partnerUserId, hasConsented: true, consentTimestamp: now },
      },
      photosUnlocked: true,
      status: 'photos_unlocked',
      concierge: {
        nudges: [],
        snapshots: [],
      },
      milestones: createInitialMilestones(),
      createdAt: now,
      updatedAt: now,
    };

    setInteractions(prev => {
      const alreadyMappedSent = prev.sentInterests[partnerUserId]?.conversationId === conversationId;
      const alreadyMappedReceived = prev.receivedInterests[partnerUserId]?.conversationId === conversationId;

      if (existing && alreadyMappedSent && alreadyMappedReceived) {
        return prev;
      }

      return {
        ...prev,
        sentInterests: {
          ...prev.sentInterests,
          [partnerUserId]: room,
        },
        receivedInterests: {
          ...prev.receivedInterests,
          [partnerUserId]: room,
        },
      };
    });

    setSelectedConversation(room);
    return room;
  }, [currentUser.id, interactions]);

  const markMessagesAsRead = useCallback((conversationId: string) => {
    setInteractions(prev => {
      const updateInteraction = (interaction: UserInteraction): UserInteraction => {
        if (interaction.conversationId !== conversationId) return interaction;

        // Mark all messages from other users as read
        const updatedMessages = interaction.messages.map(message => ({
          ...message,
          read: message.fromUserId !== currentUser.id ? true : message.read,
        }));

        return {
          ...interaction,
          messages: updatedMessages,
        };
      };

      return {
        ...prev,
        sentInterests: Object.entries(prev.sentInterests).reduce((acc, [key, interaction]) => {
          acc[key] = updateInteraction(interaction);
          return acc;
        }, {} as Record<string, UserInteraction>),
        receivedInterests: Object.entries(prev.receivedInterests).reduce((acc, [key, interaction]) => {
          acc[key] = updateInteraction(interaction);
          return acc;
        }, {} as Record<string, UserInteraction>),
      };
    });
  }, [currentUser.id]);

  const grantPhotoConsent = useCallback((conversationId: string) => {
    setInteractions(prev => {
      const updateInteraction = (interaction: UserInteraction): UserInteraction => {
        if (interaction.conversationId !== conversationId) return interaction;

        const updatedConsent = {
          fromUser: {
            ...interaction.photoConsent.fromUser,
            hasConsented: interaction.photoConsent.fromUser.userId === currentUser.id
              ? true
              : interaction.photoConsent.fromUser.hasConsented,
            consentTimestamp: interaction.photoConsent.fromUser.userId === currentUser.id
              ? Date.now()
              : interaction.photoConsent.fromUser.consentTimestamp,
          },
          toUser: {
            ...interaction.photoConsent.toUser,
            hasConsented: interaction.photoConsent.toUser.userId === currentUser.id
              ? true
              : interaction.photoConsent.toUser.hasConsented,
            consentTimestamp: interaction.photoConsent.toUser.userId === currentUser.id
              ? Date.now()
              : interaction.photoConsent.toUser.consentTimestamp,
          },
        };

        const bothConsented = updatedConsent.fromUser.hasConsented && updatedConsent.toUser.hasConsented;

        return {
          ...interaction,
          photoConsent: updatedConsent,
          photosUnlocked: bothConsented,
          status: bothConsented ? 'photos_unlocked' : 'awaiting_consent',
          updatedAt: Date.now(),
        };
      };

      const updatedSent = Object.fromEntries(
        Object.entries(prev.sentInterests).map(([k, v]) => [k, updateInteraction(v)])
      );
      const updatedReceived = Object.fromEntries(
        Object.entries(prev.receivedInterests).map(([k, v]) => [k, updateInteraction(v)])
      );

      return {
        sentInterests: updatedSent,
        receivedInterests: updatedReceived,
      };
    });

    // Update selectedConversation if it matches the conversation being updated
    setSelectedConversation(prev => {
      if (!prev || prev.conversationId !== conversationId) return prev;

      const updatedConsent = {
        fromUser: {
          ...prev.photoConsent.fromUser,
          hasConsented: prev.photoConsent.fromUser.userId === currentUser.id
            ? true
            : prev.photoConsent.fromUser.hasConsented,
          consentTimestamp: prev.photoConsent.fromUser.userId === currentUser.id
            ? Date.now()
            : prev.photoConsent.fromUser.consentTimestamp,
        },
        toUser: {
          ...prev.photoConsent.toUser,
          hasConsented: prev.photoConsent.toUser.userId === currentUser.id
            ? true
            : prev.photoConsent.toUser.hasConsented,
          consentTimestamp: prev.photoConsent.toUser.userId === currentUser.id
            ? Date.now()
            : prev.photoConsent.toUser.consentTimestamp,
        },
      };

      const bothConsented = updatedConsent.fromUser.hasConsented && updatedConsent.toUser.hasConsented;

      return {
        ...prev,
        photoConsent: updatedConsent,
        photosUnlocked: bothConsented,
        status: bothConsented ? 'photos_unlocked' : 'awaiting_consent',
        updatedAt: Date.now(),
      };
    });

    // NOTE: Auto-consent simulation removed. Other user must manually click "Yes" to unlock photos.
  }, [currentUser.id]);

  const withdrawPhotoConsent = useCallback((conversationId: string) => {
    setInteractions(prev => {
      const updateInteraction = (interaction: UserInteraction): UserInteraction => {
        if (interaction.conversationId !== conversationId) return interaction;

        const updatedConsent = {
          fromUser: {
            ...interaction.photoConsent.fromUser,
            hasConsented: interaction.photoConsent.fromUser.userId === currentUser.id
              ? false
              : interaction.photoConsent.fromUser.hasConsented,
          },
          toUser: {
            ...interaction.photoConsent.toUser,
            hasConsented: interaction.photoConsent.toUser.userId === currentUser.id
              ? false
              : interaction.photoConsent.toUser.hasConsented,
          },
        };

        const bothConsented = updatedConsent.fromUser.hasConsented && updatedConsent.toUser.hasConsented;

        return {
          ...interaction,
          photoConsent: updatedConsent,
          photosUnlocked: bothConsented,
          status: bothConsented ? 'photos_unlocked' : 'awaiting_consent',
          updatedAt: Date.now(),
        };
      };

      const updatedSent = Object.fromEntries(
        Object.entries(prev.sentInterests).map(([k, v]) => [k, updateInteraction(v)])
      );
      const updatedReceived = Object.fromEntries(
        Object.entries(prev.receivedInterests).map(([k, v]) => [k, updateInteraction(v)])
      );

      return {
        sentInterests: updatedSent,
        receivedInterests: updatedReceived,
      };
    });

    // Update selectedConversation if it matches the conversation being updated
    setSelectedConversation(prev => {
      if (!prev || prev.conversationId !== conversationId) return prev;

      const updatedConsent = {
        fromUser: {
          ...prev.photoConsent.fromUser,
          hasConsented: prev.photoConsent.fromUser.userId === currentUser.id
            ? false
            : prev.photoConsent.fromUser.hasConsented,
        },
        toUser: {
          ...prev.photoConsent.toUser,
          hasConsented: prev.photoConsent.toUser.userId === currentUser.id
            ? false
            : prev.photoConsent.toUser.hasConsented,
        },
      };

      const bothConsented = updatedConsent.fromUser.hasConsented && updatedConsent.toUser.hasConsented;

      return {
        ...prev,
        photoConsent: updatedConsent,
        photosUnlocked: bothConsented,
        status: bothConsented ? 'photos_unlocked' : 'awaiting_consent',
        updatedAt: Date.now(),
      };
    });
  }, [currentUser.id]);

  const applyMilestoneAction = useCallback((conversationId: string, action: MilestoneAction) => {
    setInteractions(prev => {
      const updateInteraction = (interaction: UserInteraction): UserInteraction => {
        if (interaction.conversationId !== conversationId) return interaction;

        return {
          ...interaction,
          milestones: reduceMilestoneAction(interaction, action),
          updatedAt: Date.now(),
        };
      };

      const updatedSent = Object.fromEntries(
        Object.entries(prev.sentInterests).map(([k, v]) => [k, updateInteraction(v)])
      );
      const updatedReceived = Object.fromEntries(
        Object.entries(prev.receivedInterests).map(([k, v]) => [k, updateInteraction(v)])
      );

      return {
        sentInterests: updatedSent,
        receivedInterests: updatedReceived,
      };
    });

    setSelectedConversation(prev => {
      if (!prev || prev.conversationId !== conversationId) return prev;
      return {
        ...prev,
        milestones: reduceMilestoneAction(prev, action),
        updatedAt: Date.now(),
      };
    });
  }, []);

  const getConversation = useCallback((userId: string): UserInteraction | null => {
    // First check direct keys
    if (interactions.sentInterests[userId]) {
      return interactions.sentInterests[userId];
    }
    if (interactions.receivedInterests[userId]) {
      return interactions.receivedInterests[userId];
    }

    // If not found by direct key, search through all interactions to find one with this userId
    const sentConversation = Object.values(interactions.sentInterests).find(i => i.fromUserId === userId || i.toUserId === userId);
    if (sentConversation) {
      return sentConversation;
    }

    const receivedConversation = Object.values(interactions.receivedInterests).find(i => i.fromUserId === userId || i.toUserId === userId);
    if (receivedConversation) {
      return receivedConversation;
    }

    return null;
  }, [interactions]);

  const hasExpressedInterest = useCallback((userId: string): boolean => {
    // Check if current user initiated the conversation with this user
    const conversation = getConversation(userId);
    return conversation?.fromUserId === currentUser.id;
  }, [currentUser.id, getConversation]);

  const arePhotosUnlocked = useCallback((userId: string): boolean => {
    if (userId === currentUser.id) return true;
    const conversation = getConversation(userId);
    return conversation?.photosUnlocked || false;
  }, [currentUser.id, getConversation]);

  const canRevealPhotos = useCallback((userId: string): boolean => {
    const conversation = getConversation(userId);
    return conversation?.status === 'both_messaged' || conversation?.status === 'awaiting_consent';
  }, [getConversation]);

  const needsResponse = useCallback((userId: string): boolean => {
    // Check if there's a conversation where currentUser is the recipient and needs to respond
    const conversation = getConversation(userId);
    return conversation?.toUserId === currentUser.id && conversation?.status === 'pending_response';
  }, [currentUser.id, getConversation]);

  const getReceivedInterests = useCallback((): UserInteraction[] => {
    // Get all conversations and filter for ones where currentUser is the recipient
    const allInteractions = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];
    const uniqueConversations = Array.from(new Map(
      allInteractions.map(i => [i.conversationId, i])
    ).values());
    return uniqueConversations
      .filter(i => i.toUserId === currentUser.id)
      .filter(i => canUsersExchangeMessages(currentUser.id, i.fromUserId));
  }, [currentUser.id, interactions]);

  const getSentInterests = useCallback((): UserInteraction[] => {
    // Get all conversations and filter for ones where currentUser is the initiator
    const allInteractions = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];
    const uniqueConversations = Array.from(new Map(
      allInteractions.map(i => [i.conversationId, i])
    ).values());
    return uniqueConversations
      .filter(i => i.fromUserId === currentUser.id)
      .filter(i => canUsersExchangeMessages(currentUser.id, i.toUserId));
  }, [currentUser.id, interactions]);

  const getUnreadCount = useCallback((): number => {
    const allInteractions = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];
    const knownUserIds = new Set(users.map((user) => user.id));
    const uniqueConversations = Array.from(
      new Map(allInteractions.map((interaction) => [interaction.conversationId, interaction])).values()
    );

    return uniqueConversations.filter((conversation) => {
      const otherUserId = conversation.fromUserId === currentUser.id
        ? conversation.toUserId
        : conversation.fromUserId;

      if (!knownUserIds.has(otherUserId)) return false;
      if (!canUsersExchangeMessages(currentUser.id, otherUserId)) return false;

      return conversation.messages.some(
        (message) => message.fromUserId !== currentUser.id && !message.read
      );
    }).length;
  }, [currentUser.id, interactions, users]);

  const saveAssessmentDate = useCallback(() => {
    try {
      const timestamp = Date.now().toString();
      localStorage.setItem(`rooted_last_assessment_date_${currentUser.id}`, timestamp);
      // Backward compatibility for older flows that still read legacy key.
      localStorage.setItem('rooted_last_assessment_date', timestamp);
    } catch (error) {
      console.error('Failed to save assessment date:', error);
    }
  }, [currentUser.id]);

  const getNextRetakeDate = useCallback((): Date | null => {
    try {
      const userScoped = localStorage.getItem(`rooted_last_assessment_date_${currentUser.id}`);
      const legacy = localStorage.getItem('rooted_last_assessment_date');
      let timestamp = userScoped ? parseInt(userScoped, 10) : NaN;

      if (!Number.isFinite(timestamp)) {
        // Fallback: infer from persisted assessment result for this user.
        const saved = localStorage.getItem(`assessmentResult_${currentUser.id}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const inferred = Number(parsed?.timestamp);
            if (Number.isFinite(inferred)) {
              timestamp = inferred;
              localStorage.setItem(`rooted_last_assessment_date_${currentUser.id}`, String(inferred));
            }
          } catch (error) {
            console.warn('Failed to parse user assessment result timestamp:', error);
          }
        }
      }

      if (!Number.isFinite(timestamp) && legacy) {
        const legacyTimestamp = parseInt(legacy, 10);
        if (Number.isFinite(legacyTimestamp)) {
          timestamp = legacyTimestamp;
        }
      }

      if (!Number.isFinite(timestamp)) return null;
      const nextDate = new Date(timestamp);
      nextDate.setMonth(nextDate.getMonth() + 6);
      return nextDate;
    } catch (error) {
      console.error('Failed to get next retake date:', error);
      return null;
    }
  }, [currentUser.id]);

  const canRetakeAssessment = useCallback((): boolean => {
    const nextRetakeDate = getNextRetakeDate();
    if (!nextRetakeDate) return true; // If no previous assessment, can retake
    return new Date() >= nextRetakeDate;
  }, [getNextRetakeDate]);

  // Helper function to calculate severity based on reason
  const calculateSeverity = (reason: ReportReason): ReportSeverity => {
    switch (reason) {
      case 'underage':
      case 'safety-concern':
        return 'critical';
      case 'harassment':
      case 'hateful-conduct':
        return 'high';
      case 'inappropriate-content':
      case 'fake-profile':
        return 'medium';
      default:
        return 'low';
    }
  };

  // Report a user
  const reportUser = useCallback(async (
    reportedUserId: string,
    reason: ReportReason,
    details: string,
    conversationId?: string
  ): Promise<string> => {
    // Generate a proper UUID v4 for Supabase compatibility
    const reportId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const report: Report = {
      id: reportId,
      reporterId: currentUser.id,
      reportedUserId,
      reason,
      details,
      conversationId,
      status: 'pending',
      severity: calculateSeverity(reason),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store in admin reports via localStorage
    const adminReportsKey = 'rooted-admin-reports';
    try {
      const existingReports = JSON.parse(localStorage.getItem(adminReportsKey) || '[]');
      existingReports.push(report);
      localStorage.setItem(adminReportsKey, JSON.stringify(existingReports));

      // Dispatch custom event for AdminContext to listen
      window.dispatchEvent(new CustomEvent('new-report', { detail: report }));
    } catch (error) {
      console.error('Failed to save report:', error);
    }

    // Dual-write to Supabase for persistent storage
    reportService.createReport(report).catch(err => {
      console.warn('Supabase report write failed (localStorage fallback active):', err)
    })

    return reportId;
  }, [currentUser.id, calculateSeverity]);

  // Block a user
  const blockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => {
      if (prev.includes(userId)) return prev;
      return [...prev, userId];
    });

    // Also record this block globally so the blocked user knows they're blocked by current user
    try {
      const allBlocks = JSON.parse(localStorage.getItem('rooted_all_blocks') || '{}');
      if (!allBlocks[userId]) {
        allBlocks[userId] = [];
      }
      if (!allBlocks[userId].includes(currentUser.id)) {
        allBlocks[userId].push(currentUser.id);
        localStorage.setItem('rooted_all_blocks', JSON.stringify(allBlocks));
        console.log(`✅ Block recorded: ${currentUser.id} blocked by ${userId}. AllBlocks:`, allBlocks);
        // Dispatch event so other tabs/users can reload
        window.dispatchEvent(new CustomEvent('blocks-updated', { detail: allBlocks }));
      }
    } catch (e) {
      console.error('Error saving block record:', e);
    }
  }, [currentUser.id]);

  // Unblock a user
  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => prev.filter(id => id !== userId));
  }, []);

  // Check if a user is blocked
  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.includes(userId);
  }, [blockedUsers]);

  // Check if current user is blocked by another user
  const isBlockedByUser = useCallback((userId: string): boolean => {
    return blockedByUsers.includes(userId);
  }, [blockedByUsers]);

  // Suspend a user for a specified duration (stores suspension end date)
  const suspendUser = useCallback((userId: string, suspensionEndDate: number) => {
    // Store suspension data in localStorage indexed by userId
    const suspensions = JSON.parse(localStorage.getItem('rooted_suspensions') || '{}');
    suspensions[userId] = { suspensionEndDate, userStatus: 'suspended' };
    localStorage.setItem('rooted_suspensions', JSON.stringify(suspensions));

    // Update currentUser if they're the suspended user
    if (currentUser.id === userId) {
      const updatedUser = applyRelationshipModeToUser({
        ...currentUser,
        suspensionEndDate,
        userStatus: 'suspended' as const,
      });
      setCurrentUserState(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  }, [currentUser]);

  // Reinstate a suspended user (clears suspension end date)
  const reinstateUser = useCallback((userId: string) => {
    // Remove suspension from localStorage
    const suspensions = JSON.parse(localStorage.getItem('rooted_suspensions') || '{}');
    delete suspensions[userId];
    localStorage.setItem('rooted_suspensions', JSON.stringify(suspensions));

    // Update currentUser if they're the reinstated user
    if (currentUser.id === userId) {
      const updatedUser = applyRelationshipModeToUser({
        ...currentUser,
        suspensionEndDate: undefined,
        userStatus: 'active' as const,
      });
      setCurrentUserState(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
    // For now, the reinstatement is persisted through localStorage when the reinstated user is logged in
  }, [currentUser]);

  // Remove a user permanently from the platform (irreversible)
  const removeUser = useCallback((userId: string) => {
    // Log out the user if they're the one being removed
    if (currentUser.id === userId) {
      localStorage.removeItem('currentUser');
      // Dispatch custom event to trigger logout
      window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    }

    // Block the user to prevent access
    // TODO: Actually delete user from database (would require backend implementation)
    // For now, we store them in the blocked list as a removed user
  }, [currentUser.id]);

  // Submit a support request message
  const submitSupportRequest = useCallback(async (
    category: SupportCategory,
    subject: string,
    message: string
  ): Promise<string> => {
    const messageId = crypto.randomUUID();
    const isPriority = currentUser.membershipTier === 'quarterly' ||
                       currentUser.membershipTier === 'annual';

    const supportMessage: SupportMessage = {
      id: messageId,
      userId: currentUser.id,
      userEmail: currentUser.email || 'no-email@example.com',
      userName: currentUser.name,
      membershipTier: currentUser.membershipTier || 'monthly',
      category,
      subject,
      message,
      status: 'unread',
      priority: isPriority ? 'priority' : 'normal',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Dispatch event for AdminContext to listen
    window.dispatchEvent(new CustomEvent('new-support-message', {
      detail: supportMessage
    }));

    // Dual-write to Supabase for persistent storage
    supportService.createSupportMessage(supportMessage).catch(err => {
      console.warn('Supabase support message write failed (localStorage fallback active):', err)
    })

    toast.success(isPriority
      ? 'Message sent! Priority support will respond within 24 hours.'
      : 'Message sent! We\'ll respond within 3-5 business days.');

    return messageId;
  }, [currentUser]);

  // Get all notifications for current user
  const getNotifications = useCallback((): AdminNotification[] => {
    return notifications.filter(n => n.userId === currentUser.id);
  }, [notifications, currentUser.id]);

  // Get unread notifications
  const getUnreadNotifications = useCallback((): AdminNotification[] => {
    return notifications.filter(n => n.userId === currentUser.id && !n.read);
  }, [notifications, currentUser.id]);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }, []);

  // Add a new notification (called by admin when taking action)
  const reloadNotifications = useCallback(() => {
    try {
      const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
      const userNotifications = allNotifications[currentUser.id] || [];
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to reload notifications:', error);
    }
  }, [currentUser.id]);

  const addNotification = useCallback((type: 'warning' | 'suspension' | 'removal', title: string, message: string, userId: string) => {
    const newNotification: AdminNotification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      message,
      createdAt: Date.now(),
      read: false,
    };

    console.log(`📨 Adding ${type} notification to ${userId}:`, newNotification);

    // If this notification is for the current user, add to local state
    if (userId === currentUser.id) {
      console.log(`✅ Notification is for current user ${currentUser.id}, updating state`);
      setNotifications(prev => [...prev, newNotification]);
    }

    // Always save to localStorage for the target user
    try {
      const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
      if (!allNotifications[userId]) {
        allNotifications[userId] = [];
      }
      allNotifications[userId].push(newNotification);
      localStorage.setItem('rooted_notifications', JSON.stringify(allNotifications));
      console.log(`✅ Notification saved to localStorage. Current notifications for ${userId}:`, allNotifications[userId]);
      // Dispatch event so logged-in user can reload notifications
      window.dispatchEvent(new CustomEvent('notification-added', { detail: { userId, notification: newNotification } }));
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }, [currentUser.id]);

  const value: AppContextType = {
    currentView,
    previousView,
    assessmentAnswers,
    assessmentResult,
    selectedUser,
    selectedConversation,
    currentUser,
    users,
    hasJoinedList,
    showEmailModal,
    interactions,
    blockedUsers,
    setCurrentView,
    addAssessmentAnswer,
    setAssessmentResult,
    setSelectedUser,
    setSelectedConversation,
    setHasJoinedList,
    setShowEmailModal,
    resetAssessment,
    expressInterest,
    respondToInterest,
    startRelationshipRoom,
    markMessagesAsRead,
    grantPhotoConsent,
    withdrawPhotoConsent,
    hasExpressedInterest,
    arePhotosUnlocked,
    canRevealPhotos,
    needsResponse,
    getConversation,
    getReceivedInterests,
    getSentInterests,
    getUnreadCount,
    saveAssessmentDate,
    getNextRetakeDate,
    canRetakeAssessment,
    reportUser,
    blockUser,
    unblockUser,
    isUserBlocked,
    isBlockedByUser,
    suspendUser,
    reinstateUser,
    removeUser,
    showSupportModal,
    setShowSupportModal,
    submitSupportRequest,
    notifications,
    getNotifications,
    getUnreadNotifications,
    markNotificationAsRead,
    addNotification,
    reloadNotifications,
    reloadInteractions,
    applyMilestoneAction,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
