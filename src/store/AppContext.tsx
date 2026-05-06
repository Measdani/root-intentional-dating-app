import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AppView, AssessmentAnswer, AssessmentOptionStyle, AssessmentResult, User, InteractionState, UserInteraction, ConversationMessage, Report, ReportReason, ReportSeverity, SupportMessage, SupportCategory, AdminNotification, ConciergeSnapshot, ConciergeNudge } from '@/types';
import { sampleUsers, currentUser as defaultUser } from '@/data/users';
import { normalizeUserProfile } from '@/lib/userProfile';
import {
  findLatestConversationById,
  findLatestConversationForUsers,
  getLatestUniqueInteractions,
} from '@/lib/interactions';
import {
  applyRelationshipModeToUser,
  canUsersExchangeMessages,
  getMessageBlockReason,
  getNewMatchBlockReason,
} from '@/modules';
import { toast } from 'sonner';
import { reportService } from '@/services/reportService';
import { triageReportIntake } from '@/services/reportIntakeService';
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
import { PATH_LABELS } from '@/lib/pathways';
import {
  clearLocalCurrentUser,
  isEmailConfirmationRedirect,
  primeEmailConfirmationNotice,
} from '@/services/authService';
import {
  buildAssessmentAbandonmentData,
  clearAssessmentInProgress,
  readAssessmentInProgress,
} from '@/services/assessmentSessionService';
import {
  normalizeGrowthStyleBadges,
  normalizePartnerJourneyBadges,
  persistGrowthStyleBadge,
  persistPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';

interface AppState {
  currentView: AppView;
  previousView: AppView;
  assessmentAnswers: AssessmentAnswer[];
  assessmentResult: AssessmentResult | null;
  selectedUser: User | null;
  selectedConversation: UserInteraction | null;
  currentUser: User;
  isUserAuthenticated: boolean;
  users: User[];
  hasJoinedList: boolean;
  showEmailModal: boolean;
  interactions: InteractionState;
  blockedUsers: string[];
}

interface AppContextType extends AppState {
  setCurrentView: (view: AppView) => void;
  addAssessmentAnswer: (
    questionId: string,
    score: number,
    style?: AssessmentOptionStyle
  ) => void;
  setAssessmentResult: (result: AssessmentResult) => void;
  setSelectedUser: (user: User | null) => void;
  setHasJoinedList: (value: boolean) => void;
  setShowEmailModal: (value: boolean) => void;
  resetAssessment: () => void;
  expressInterest: (
    toUserId: string,
    message: string
  ) => Promise<{ sent: boolean; feedback?: string }>;
  respondToInterest: (
    fromUserId: string,
    message: string
  ) => Promise<{ sent: boolean; feedback?: string }>;
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

const getInitialAppView = (): AppView => {
  if (typeof window === 'undefined') return 'landing';

  const url = new URL(window.location.href);
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const requestedView = url.searchParams.get('view');

  if (requestedView === 'launching-soon' || requestedView === 'launch-preview') {
    return 'launching-soon-preview';
  }

  if (requestedView === 'lgbtq-email-confirmation' || url.searchParams.get('waitlistToken')) {
    return 'lgbtq-email-confirmation';
  }

  if (
    requestedView === 'password-reset' ||
    url.searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery'
  ) {
    return 'password-reset';
  }

  if (isEmailConfirmationRedirect()) {
    return 'user-login';
  }

  try {
    if (localStorage.getItem('currentUser')) {
      const storedView = readStoredAppView();
      if (storedView) {
        return storedView;
      }
    }
  } catch (error) {
    console.warn('Failed to restore initial app view:', error);
  }

  return 'landing';
};

const isUserLike = (value: unknown): value is User =>
  Boolean(value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string');

const normalizeUser = (user: User): User => applyRelationshipModeToUser(normalizeUserProfile(user));
const SEEDED_USER_IDS = new Set(sampleUsers.map((user) => user.id));
const ADMIN_USERS_STORAGE_KEY = 'rooted-admin-users';
const GROWTH_MODE_TAB_STORAGE_KEY = 'rooted_growth_mode_active_tab';
const LAST_APP_VIEW_STORAGE_KEY = 'rooted_last_app_view';
const LAST_SELECTED_USER_ID_STORAGE_KEY = 'rooted_last_selected_user_id';
const LAST_SELECTED_CONVERSATION_ID_STORAGE_KEY = 'rooted_last_selected_conversation_id';
const RESTORABLE_APP_VIEWS = new Set<AppView>([
  'assessment',
  'assessment-reflection',
  'assessment-result',
  'assessment-not-completed',
  'growth-mode',
  'aware-partner',
  'intentional-partner',
  'healthy-partner',
  'paid-growth-mode',
  'growth-detail',
  'community-blog',
  'browse',
  'profile',
  'inbox',
  'conversation',
  'clarity-room',
  'user-settings',
  'home',
  'privacy-policy',
  'terms-of-service',
  'community-guidelines',
]);

const isRestorableAppView = (value: string | null): value is AppView =>
  Boolean(value && RESTORABLE_APP_VIEWS.has(value as AppView));

const readStoredAppView = (): AppView | null => {
  try {
    const storedView = localStorage.getItem(LAST_APP_VIEW_STORAGE_KEY);
    return isRestorableAppView(storedView) ? storedView : null;
  } catch (error) {
    console.warn('Failed to read stored app view:', error);
    return null;
  }
};

const readStoredSelectedUserId = (): string | null => {
  try {
    const storedUserId = localStorage.getItem(LAST_SELECTED_USER_ID_STORAGE_KEY)?.trim();
    return storedUserId ? storedUserId : null;
  } catch (error) {
    console.warn('Failed to read stored selected user id:', error);
    return null;
  }
};

const readStoredSelectedConversationId = (): string | null => {
  try {
    const storedConversationId = localStorage.getItem(LAST_SELECTED_CONVERSATION_ID_STORAGE_KEY)?.trim();
    return storedConversationId ? storedConversationId : null;
  } catch (error) {
    console.warn('Failed to read stored selected conversation id:', error);
    return null;
  }
};

const persistAppView = (view: AppView, isAuthenticated: boolean) => {
  try {
    if (!isAuthenticated || !isRestorableAppView(view)) {
      localStorage.removeItem(LAST_APP_VIEW_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LAST_APP_VIEW_STORAGE_KEY, view);
  } catch (error) {
    console.warn('Failed to persist app view:', error);
  }
};

const persistSelectedUserId = (user: User | null, isAuthenticated: boolean) => {
  try {
    if (!isAuthenticated || !user?.id) {
      localStorage.removeItem(LAST_SELECTED_USER_ID_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LAST_SELECTED_USER_ID_STORAGE_KEY, user.id);
  } catch (error) {
    console.warn('Failed to persist selected user id:', error);
  }
};

const persistSelectedConversationId = (conversation: UserInteraction | null, isAuthenticated: boolean) => {
  try {
    if (!isAuthenticated || !conversation?.conversationId) {
      localStorage.removeItem(LAST_SELECTED_CONVERSATION_ID_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LAST_SELECTED_CONVERSATION_ID_STORAGE_KEY, conversation.conversationId);
  } catch (error) {
    console.warn('Failed to persist selected conversation id:', error);
  }
};

const clearPersistedNavigationState = () => {
  try {
    localStorage.removeItem(LAST_APP_VIEW_STORAGE_KEY);
    localStorage.removeItem(LAST_SELECTED_USER_ID_STORAGE_KEY);
    localStorage.removeItem(LAST_SELECTED_CONVERSATION_ID_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear persisted navigation state:', error);
  }
};

const primeGardenLandingTab = () => {
  try {
    localStorage.setItem(GROWTH_MODE_TAB_STORAGE_KEY, 'resources');
  } catch (error) {
    console.warn('Failed to prime Garden landing tab:', error);
  }
};

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

const reconcileUsersWithRemote = (
  existingUsers: User[],
  remoteUsers: User[],
  pinnedUserId?: string
): User[] => {
  const remoteUserIds = new Set(remoteUsers.map((user) => user.id));
  const retainedUsers = existingUsers.filter(
    (user) =>
      SEEDED_USER_IDS.has(user.id) ||
      user.id === pinnedUserId ||
      remoteUserIds.has(user.id)
  );

  return mergeUsersById(retainedUsers, remoteUsers);
};

const removeUserFromPersistedAdminCache = (userId: string) => {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const nextUsers = parsed.filter((entry) => !isUserLike(entry) || entry.id !== userId);
    localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(nextUsers));
  } catch (error) {
    console.warn('Failed to prune deleted user from cached user list:', error);
  }
};

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

const EMPTY_INTERACTIONS: InteractionState = {
  sentInterests: {},
  receivedInterests: {},
};

const buildDefaultPhotoConsent = (fromUserId: string, toUserId: string): UserInteraction['photoConsent'] => ({
  fromUser: {
    userId: fromUserId,
    hasConsented: false,
  },
  toUser: {
    userId: toUserId,
    hasConsented: false,
  },
});

const normalizeStoredInteraction = (interaction: UserInteraction): UserInteraction => {
  const fallbackPhotoConsent = buildDefaultPhotoConsent(interaction.fromUserId, interaction.toUserId);

  return {
    ...interaction,
    messages: Array.isArray(interaction.messages) ? interaction.messages : [],
    photoConsent: interaction.photoConsent
      ? {
          fromUser: interaction.photoConsent.fromUser ?? fallbackPhotoConsent.fromUser,
          toUser: interaction.photoConsent.toUser ?? fallbackPhotoConsent.toUser,
        }
      : fallbackPhotoConsent,
    concierge: {
      nudges: interaction.concierge?.nudges ?? [],
      snapshots: interaction.concierge?.snapshots ?? [],
    },
    milestones: normalizeMilestones(interaction.milestones),
    createdAt: Number.isFinite(interaction.createdAt) ? interaction.createdAt : Date.now(),
    updatedAt: Number.isFinite(interaction.updatedAt) ? interaction.updatedAt : Date.now(),
  };
};

const normalizeStoredInteractionBucket = (bucket: unknown): Record<string, UserInteraction> => {
  if (!bucket || typeof bucket !== 'object') return {};

  return Object.entries(bucket as Record<string, unknown>).reduce((acc, [key, value]) => {
    if (!value || typeof value !== 'object') return acc;

    const interaction = value as Partial<UserInteraction>;
    if (
      typeof interaction.fromUserId !== 'string' ||
      typeof interaction.toUserId !== 'string' ||
      typeof interaction.conversationId !== 'string'
    ) {
      return acc;
    }

    acc[key] = normalizeStoredInteraction(interaction as UserInteraction);
    return acc;
  }, {} as Record<string, UserInteraction>);
};

const parseStoredInteractionState = (raw: string | null): InteractionState => {
  if (!raw) return EMPTY_INTERACTIONS;

  try {
    const parsed = JSON.parse(raw) as Partial<InteractionState>;
    return {
      sentInterests: normalizeStoredInteractionBucket(parsed.sentInterests),
      receivedInterests: normalizeStoredInteractionBucket(parsed.receivedInterests),
    };
  } catch (error) {
    console.error('Failed to parse interactions from localStorage:', error);
    return EMPTY_INTERACTIONS;
  }
};

const findConversationById = (
  state: InteractionState,
  conversationId: string
): UserInteraction | null => findLatestConversationById(state, conversationId);

const getInitialSelectedUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const storedUserId = readStoredSelectedUserId();
  if (!storedUserId) return null;

  try {
    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      const parsedCurrentUser = JSON.parse(currentUserRaw);
      if (isUserLike(parsedCurrentUser) && parsedCurrentUser.id === storedUserId) {
        return normalizeUser(parsedCurrentUser);
      }
    }

    const savedUsersRaw = localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
    if (savedUsersRaw) {
      const parsedUsers = JSON.parse(savedUsersRaw);
      if (Array.isArray(parsedUsers)) {
        const storedUser = parsedUsers.find((entry) => isUserLike(entry) && entry.id === storedUserId);
        if (storedUser && isUserLike(storedUser)) {
          return normalizeUser(storedUser);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to restore selected user:', error);
  }

  const seededUser = sampleUsers.find((user) => user.id === storedUserId);
  return seededUser ? normalizeUser(seededUser) : null;
};

const getInitialSelectedConversation = (): UserInteraction | null => {
  if (typeof window === 'undefined') return null;

  const storedConversationId = readStoredSelectedConversationId();
  if (!storedConversationId) return null;

  try {
    const savedInteractions = localStorage.getItem('rooted_shared_interactions');
    return findConversationById(parseStoredInteractionState(savedInteractions), storedConversationId);
  } catch (error) {
    console.warn('Failed to restore selected conversation:', error);
    return null;
  }
};

const PROFILE_NO_LONGER_AVAILABLE_MESSAGE = 'This user profile is no longer available.';

const appendProfileUnavailableMessageForMatches = (
  state: InteractionState,
  affectedUserId: string
): InteractionState => {
  const allInteractions = [
    ...Object.values(state.sentInterests),
    ...Object.values(state.receivedInterests),
  ];

  const impactedConversationIds = Array.from(
    new Set(
      allInteractions
        .filter(
          (interaction) =>
            interaction.fromUserId === affectedUserId || interaction.toUserId === affectedUserId
        )
        .map((interaction) => interaction.conversationId)
    )
  );

  if (impactedConversationIds.length === 0) return state;

  let nextState = state;
  const baseTimestamp = Date.now();

  impactedConversationIds.forEach((conversationId, index) => {
    const timestamp = baseTimestamp + index;

    nextState = updateInteractionStateByConversationId(nextState, conversationId, (interaction) => {
      const otherUserId = interaction.fromUserId === affectedUserId
        ? interaction.toUserId
        : interaction.toUserId === affectedUserId
          ? interaction.fromUserId
          : null;

      if (!otherUserId) return interaction;

      const alreadyNotified = interaction.messages.some(
        (message) =>
          message.fromUserId === affectedUserId &&
          message.toUserId === otherUserId &&
          message.message === PROFILE_NO_LONGER_AVAILABLE_MESSAGE
      );

      if (alreadyNotified) return interaction;

      const profileUnavailableMessage: ConversationMessage = {
        id: `profile_unavailable_${conversationId}_${timestamp}`,
        fromUserId: affectedUserId,
        toUserId: otherUserId,
        message: PROFILE_NO_LONGER_AVAILABLE_MESSAGE,
        timestamp,
        messageType: 'response',
        read: false,
      };

      return {
        ...interaction,
        messages: [...interaction.messages, profileUnavailableMessage],
        updatedAt: timestamp,
      };
    });
  });

  return nextState;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<AppView>(() => getInitialAppView());
  const [previousView, setPreviousView] = useState<AppView>(() => getInitialAppView());
  const [assessmentAnswers, setAssessmentAnswers] = useState<AssessmentAnswer[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(() => getInitialSelectedUser());
  const [selectedConversation, setSelectedConversation] = useState<UserInteraction | null>(() =>
    getInitialSelectedConversation(),
  );
  const [isUserAuthenticated, setIsUserAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('currentUser'));
    } catch (error) {
      console.error('Failed to inspect currentUser storage:', error);
      return false;
    }
  });

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
    if (primeEmailConfirmationNotice()) {
      setPreviousView('landing');
      setCurrentViewState('user-login');
    }
  }, []);

  useEffect(() => {
    persistAppView(currentView, isUserAuthenticated);
  }, [currentView, isUserAuthenticated]);

  useEffect(() => {
    persistSelectedUserId(selectedUser, isUserAuthenticated);
  }, [selectedUser, isUserAuthenticated]);

  useEffect(() => {
    persistSelectedConversationId(selectedConversation, isUserAuthenticated);
  }, [selectedConversation, isUserAuthenticated]);

  useEffect(() => {
    if (!isUserAuthenticated) {
      clearPersistedNavigationState();
    }
  }, [isUserAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const syncUsersFromSupabase = async () => {
      try {
        const remoteUsers = await userService.getAllUsers();
        if (cancelled) return;

        const normalizedRemoteUsers = remoteUsers.map((user) => normalizeUser(user));
        const remoteUserIds = new Set(normalizedRemoteUsers.map((user) => user.id));
        remoteUserIdsRef.current = remoteUserIds;

        let persistedCurrentUserId: string | undefined;
        try {
          const savedCurrentUser = localStorage.getItem('currentUser');
          if (savedCurrentUser) {
            persistedCurrentUserId = (JSON.parse(savedCurrentUser) as Partial<User>).id;
          }
        } catch (error) {
          console.warn('Failed to read current user during remote user sync:', error);
        }

        const currentUserMissingRemotely = Boolean(
          persistedCurrentUserId &&
          !SEEDED_USER_IDS.has(persistedCurrentUserId) &&
          !remoteUserIds.has(persistedCurrentUserId)
        );

        if (currentUserMissingRemotely && persistedCurrentUserId) {
          removeUserFromPersistedAdminCache(persistedCurrentUserId);
          setSelectedUser((prev) => (prev?.id === persistedCurrentUserId ? null : prev));
          setInteractions((prev) =>
            appendProfileUnavailableMessageForMatches(prev, persistedCurrentUserId)
          );
          clearLocalCurrentUser();
          toast.info('That account is no longer available. Please sign in again.');
        }

        setUsers((prev) =>
          reconcileUsersWithRemote(
            prev,
            normalizedRemoteUsers,
            currentUserMissingRemotely ? undefined : persistedCurrentUserId
          )
        );
      } catch (error) {
        console.warn('Failed to sync users from Supabase:', error);
      }
    };

    void syncUsersFromSupabase();

    const handleFocus = () => {
      void syncUsersFromSupabase();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUsersFromSupabase();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        const remoteUserIds = remoteUserIdsRef.current;
        const filteredPersistedUsers = remoteUserIds
          ? persistedUsers.filter(
              (user) => SEEDED_USER_IDS.has(user.id) || remoteUserIds.has(user.id)
            )
          : persistedUsers;

        setUsers((prev) => {
          if (!remoteUserIds) {
            return mergeUsersById(prev, filteredPersistedUsers);
          }

          const retainedUsers = prev.filter(
            (user) => SEEDED_USER_IDS.has(user.id) || remoteUserIds.has(user.id)
          );
          return mergeUsersById(retainedUsers, filteredPersistedUsers);
        });
      } catch (error) {
        console.warn('Failed to sync users from localStorage:', error);
      }
    };

    const handleStorageChange = () => {
      try {
        syncUsersFromStorage();
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          setIsUserAuthenticated(true);
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
              const scopedResult = parsedUser.id
                ? localStorage.getItem(`assessmentResult_${parsedUser.id}`)
                : null;
              const legacyResult = localStorage.getItem('assessmentResult');
              const savedResult = scopedResult ?? legacyResult;

              if (savedResult) {
                const result = JSON.parse(savedResult);
                const belongsToParsedUser = !(
                  parsedUser.id &&
                  savedResult === legacyResult &&
                  result?.userId !== parsedUser.id
                );

                if (belongsToParsedUser) {
                  const passed =
                    typeof result.passed === 'boolean'
                      ? result.passed
                      : Number(result.percentage ?? 0) >= 85;
                  parsedUser.assessmentPassed = passed;
                  parsedUser.alignmentScore = result.percentage;
                  if (typeof result.primaryStyle === 'string') {
                    parsedUser.primaryStyle = result.primaryStyle;
                  }
                  if (typeof result.secondaryStyle === 'string') {
                    parsedUser.secondaryStyle = result.secondaryStyle;
                  }
                  parsedUser.userStatus = passed ? 'active' : 'needs-growth';
                }
              }
            } catch (err) {
              console.error('Failed to restore assessment result:', err);
            }
          }

          const normalizedUser = normalizeUser(parsedUser);
          setCurrentUserState(normalizedUser);
          setUsers((prev) => upsertUserById(prev, normalizedUser));
        } else {
          setIsUserAuthenticated(false);
          const fallbackUser = normalizeUser(defaultUser);
          setCurrentUserState(fallbackUser);
          setUsers((prev) => upsertUserById(prev, fallbackUser));
          setAssessmentResult(null);
          setSelectedUser(null);
          setSelectedConversation(null);
        }
      } catch (error) {
        console.error('Failed to update user from localStorage:', error);
      }
    };

    const handleUserDeleted = (event: Event) => {
      const deletedUserId = (event as CustomEvent<{ userId?: string }>).detail?.userId;
      if (!deletedUserId) return;

      removeUserFromPersistedAdminCache(deletedUserId);
      remoteUserIdsRef.current?.delete(deletedUserId);
      setUsers((prev) => prev.filter((user) => user.id !== deletedUserId));
      setSelectedUser((prev) => (prev?.id === deletedUserId ? null : prev));
      setInteractions((prev) => appendProfileUnavailableMessageForMatches(prev, deletedUserId));
    };

    // Listen for both storage events (from other tabs) and custom user-login event (same tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-login', handleStorageChange);
    window.addEventListener('new-user', handleStorageChange as EventListener);
    window.addEventListener('relationship-mode-updated', handleStorageChange as EventListener);
    window.addEventListener('user-deleted', handleUserDeleted);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login', handleStorageChange);
      window.removeEventListener('new-user', handleStorageChange as EventListener);
      window.removeEventListener('relationship-mode-updated', handleStorageChange as EventListener);
      window.removeEventListener('user-deleted', handleUserDeleted);
    };
  }, []);

  useEffect(() => {
    const remoteUserIds = remoteUserIdsRef.current;
    const shouldKeepCurrentUserVisible =
      !isUserAuthenticated ||
      SEEDED_USER_IDS.has(currentUser.id) ||
      !remoteUserIds ||
      remoteUserIds.has(currentUser.id);

    if (!shouldKeepCurrentUserVisible) return;

    setUsers((prev) => upsertUserById(prev, currentUser));
  }, [currentUser, isUserAuthenticated]);

  useEffect(() => {
    if (!selectedUser) return;

    if (selectedUser.id === currentUser.id) {
      setSelectedUser((prev) => (prev?.id === currentUser.id ? normalizeUser(currentUser) : prev));
      return;
    }

    const syncedSelectedUser = users.find((user) => user.id === selectedUser.id);
    if (syncedSelectedUser) {
      setSelectedUser((prev) => (prev?.id === syncedSelectedUser.id ? syncedSelectedUser : prev));
      return;
    }

    if (currentView === 'profile' && remoteUserIdsRef.current) {
      setSelectedUser(null);
    }
  }, [currentUser, currentView, selectedUser?.id, users]);

  useEffect(() => {
    if (!isUserAuthenticated) return;
    if (badgeRecoveryInFlightRef.current.has(currentUser.id)) return;

    const currentJourneyBadges = normalizePartnerJourneyBadges(currentUser.partnerJourneyBadges);
    const currentGrowthStyleBadges = new Set(normalizeGrowthStyleBadges(currentUser.growthStyleBadges));
    const reflectionStorageKey = `rooted_growth_path_reflections_${currentUser.id}`;
    const intentionalStorageKey = `rooted_intentional_partner_conflict_sandbox_${currentUser.id}`;
    const healthyStorageKey = `rooted_healthy_partner_pace_meter_${currentUser.id}`;

    let shouldRecoverAwareBadge = false;
    let shouldRecoverIntentionalBadge = false;
    let shouldRecoverHealthyBadge = false;
    const recoveredStyleCandidates: string[] = [];

    try {
      const savedReflections = localStorage.getItem(reflectionStorageKey);
      if (savedReflections) {
        const parsedReflections = JSON.parse(savedReflections) as Record<string, unknown>;
        if (parsedReflections && typeof parsedReflections === 'object') {
          Object.values(parsedReflections).forEach((value) => {
            if (!value || typeof value !== 'object') return;

            const reflection = value as {
              approvedAt?: unknown;
              resourceStyle?: unknown;
            };
            const approvedAt = Number(reflection.approvedAt);
            if (!Number.isFinite(approvedAt)) return;

            shouldRecoverAwareBadge = true;
            if (typeof reflection.resourceStyle === 'string') {
              recoveredStyleCandidates.push(reflection.resourceStyle);
            }
          });
        }
      }

      const savedIntentionalProgress = localStorage.getItem(intentionalStorageKey);
      if (savedIntentionalProgress) {
        const parsedIntentional = JSON.parse(savedIntentionalProgress) as { completedAt?: unknown };
        shouldRecoverIntentionalBadge = Number.isFinite(Number(parsedIntentional?.completedAt));
      }

      const savedHealthyProgress = localStorage.getItem(healthyStorageKey);
      if (savedHealthyProgress) {
        const parsedHealthy = JSON.parse(savedHealthyProgress) as { completedAt?: unknown };
        shouldRecoverHealthyBadge = Number.isFinite(Number(parsedHealthy?.completedAt));
      }
    } catch (error) {
      console.warn('Failed to inspect stored badge recovery state:', error);
      return;
    }

    const recoveredGrowthStyleBadges = normalizeGrowthStyleBadges(recoveredStyleCandidates).filter(
      (style) => !currentGrowthStyleBadges.has(style)
    );
    const missingAwareBadge =
      shouldRecoverAwareBadge && !currentJourneyBadges.includes('aware-partner-badge');
    const missingIntentionalBadge =
      shouldRecoverIntentionalBadge && !currentJourneyBadges.includes('intentional-partner-badge');
    const missingHealthyBadge =
      shouldRecoverHealthyBadge && !currentJourneyBadges.includes('healthy-partner-badge');

    if (
      !missingAwareBadge &&
      !missingIntentionalBadge &&
      !missingHealthyBadge &&
      recoveredGrowthStyleBadges.length === 0
    ) {
      return;
    }

    badgeRecoveryInFlightRef.current.add(currentUser.id);

    const recoverMissingBadges = async () => {
      try {
        if (missingAwareBadge) {
          await persistPartnerJourneyBadge('aware-partner-badge', currentUser.id);
        }

        for (const style of recoveredGrowthStyleBadges) {
          await persistGrowthStyleBadge(style, currentUser.id);
        }

        if (missingIntentionalBadge) {
          await persistPartnerJourneyBadge('intentional-partner-badge', currentUser.id);
        }

        if (missingHealthyBadge) {
          await persistPartnerJourneyBadge('healthy-partner-badge', currentUser.id);
        }
      } finally {
        badgeRecoveryInFlightRef.current.delete(currentUser.id);
      }
    };

    void recoverMissingBadges();
  }, [
    currentUser.growthStyleBadges,
    currentUser.id,
    currentUser.partnerJourneyBadges,
    isUserAuthenticated,
  ]);

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
    if (!isUserAuthenticated) return;

    try {
      let abandonmentRaw = localStorage.getItem('assessmentAbandonment');
      const inProgressAssessment = readAssessmentInProgress(currentUser.id);

      if (inProgressAssessment) {
        let hasStoredAssessmentResult = false;
        const scopedResult = localStorage.getItem(`assessmentResult_${currentUser.id}`);
        if (scopedResult) {
          hasStoredAssessmentResult = true;
        } else {
          const legacyResult = localStorage.getItem('assessmentResult');
          if (legacyResult) {
            const parsedLegacyResult = JSON.parse(legacyResult);
            hasStoredAssessmentResult = parsedLegacyResult?.userId === currentUser.id;
          }
        }

        if (currentUser.assessmentPassed === true || hasStoredAssessmentResult) {
          clearAssessmentInProgress(currentUser.id);
        } else {
          const abandonmentData = buildAssessmentAbandonmentData(currentUser.id);
          abandonmentRaw = JSON.stringify(abandonmentData);
          localStorage.setItem('assessmentAbandonment', abandonmentRaw);
          clearAssessmentInProgress(currentUser.id);
        }
      }

      const abandonmentData = JSON.parse(abandonmentRaw || '{}');
      if (abandonmentData.userId && abandonmentData.userId !== currentUser.id) {
        return;
      }

      if (abandonmentData.coolingPeriodUntil) {
        const coolingPeriodEndTime = new Date(abandonmentData.coolingPeriodUntil).getTime();
        const currentTime = Date.now();

        if (currentTime < coolingPeriodEndTime) {
          // Still in cooling period - place user on The Intentional Path
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
  }, [currentUser.assessmentPassed, currentUser.id, isUserAuthenticated]);

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
  const remoteUserIdsRef = useRef<Set<string> | null>(null);
  const interactionsHydratedRef = useRef(false);
  const badgeRecoveryInFlightRef = useRef<Set<string>>(new Set());

  // Load interactions from localStorage on mount
  // Uses shared storage so all users can see each other's messages (for testing)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rooted_shared_interactions');
      setInteractions(parseStoredInteractionState(saved));
      interactionsHydratedRef.current = true;
    } catch (error) {
      console.error('Failed to load interactions:', error);
      interactionsHydratedRef.current = true;
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
    if (!interactionsHydratedRef.current) return;
    try {
      localStorage.setItem('rooted_shared_interactions', JSON.stringify(interactions));
    } catch (error) {
      console.error('Failed to save interactions:', error);
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
      const saved = localStorage.getItem('rooted_shared_interactions');
      setInteractions(parseStoredInteractionState(saved));
      interactionsHydratedRef.current = true;
    } catch (error) {
      console.error('Failed to reload interactions:', error);
    }
  }, []);

  // Reload interactions when currentUser changes (for user login/logout)
  // StorageEvent doesn't fire in same tab, so we need to manually reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rooted_shared_interactions');
      setInteractions(parseStoredInteractionState(saved));
      interactionsHydratedRef.current = true;
    } catch (error) {
      console.error('Failed to reload interactions on user change:', error);
    }
  }, [currentUser.id, isUserAuthenticated]);

  useEffect(() => {
    if (currentView !== 'profile' || selectedUser) return;

    const storedUserId = readStoredSelectedUserId();
    if (!storedUserId) {
      if (isUserAuthenticated) {
        setCurrentViewState('browse');
      }
      return;
    }

    const restoredUser = users.find((user) => user.id === storedUserId);
    if (restoredUser) {
      setSelectedUser(restoredUser);
      return;
    }

    if (remoteUserIdsRef.current) {
      setCurrentViewState('browse');
    }
  }, [currentView, selectedUser, users, isUserAuthenticated]);

  useEffect(() => {
    if (currentView !== 'conversation' || selectedConversation) return;

    const storedConversationId = readStoredSelectedConversationId();
    if (!storedConversationId) {
      if (isUserAuthenticated) {
        setCurrentViewState('inbox');
      }
      return;
    }

    const restoredConversation = findConversationById(interactions, storedConversationId);
    if (
      restoredConversation &&
      (restoredConversation.fromUserId === currentUser.id ||
        restoredConversation.toUserId === currentUser.id)
    ) {
      setSelectedConversation(restoredConversation);
      return;
    }

    if (interactionsHydratedRef.current) {
      setCurrentViewState('inbox');
    }
  }, [currentView, selectedConversation, interactions, currentUser.id, isUserAuthenticated]);

  // Keep selected conversation aligned to the canonical interaction state.
  useEffect(() => {
    setSelectedConversation((prev) => {
      if (!prev) return prev;

      if (prev.fromUserId !== currentUser.id && prev.toUserId !== currentUser.id) {
        return null;
      }

      const otherUserId = prev.fromUserId === currentUser.id
        ? prev.toUserId
        : prev.fromUserId;

      return (
        findLatestConversationForUsers(interactions, currentUser.id, otherUserId) ??
        findConversationById(interactions, prev.conversationId) ??
        null
      );
    });
  }, [currentUser.id, interactions]);

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
          message: `Your account suspension period has ended. You must now complete the ${PATH_LABELS.intentional} assessment to regain full access to browsing and matching.`,
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
          hasStoredAssessmentResult = parsed?.userId === currentUser.id;
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

    if (isUserAuthenticated &&
      shouldRedirect &&
      currentView !== 'growth-mode' &&
      currentView !== 'aware-partner' &&
      currentView !== 'intentional-partner' &&
      currentView !== 'healthy-partner' &&
      currentView !== 'growth-detail' &&
      currentView !== 'profile' &&
      currentView !== 'conversation' &&
      currentView !== 'assessment' &&
      currentView !== 'assessment-result' &&
      currentView !== 'assessment-not-completed' &&
      currentView !== 'community-blog' &&
      currentView !== 'clarity-room' &&
      currentView !== 'user-settings' &&
      currentView !== 'password-reset'
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
        primeGardenLandingTab();
        setPreviousView(currentView);
        setCurrentViewState('growth-mode');
      }
    }
  }, [currentUser.userStatus, currentUser.assessmentPassed, currentView, isUserAuthenticated]);

// Auto-redirect users who passed assessment to their Garden home
useEffect(() => {
  if (
    isUserAuthenticated &&
    currentUser.assessmentPassed === true &&
    currentUser.userStatus === 'active' &&
    currentView === 'landing'
  ) {
    primeGardenLandingTab();
    setPreviousView(currentView);
    setCurrentViewState('paid-growth-mode');
  }
}, [currentUser.assessmentPassed, currentUser.userStatus, currentView, isUserAuthenticated]);

  // Wrapper function to track previous view when changing views
  const setCurrentView = useCallback((view: AppView) => {
    setPreviousView(currentView);
    setCurrentViewState(view);
  }, [currentView]);

  const addAssessmentAnswer = useCallback((
    questionId: string,
    score: number,
    style?: AssessmentOptionStyle
  ) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, style }]);
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

  const expressInterest = useCallback(async (
    toUserId: string,
    message: string
  ): Promise<{ sent: boolean; feedback?: string }> => {
    console.log('expressInterest called:', { toUserId, message, currentUserId: currentUser.id });

    const blockReason = getNewMatchBlockReason(currentUser.id, toUserId);
    if (blockReason) {
      return { sent: false, feedback: blockReason };
    }

    const existingConversation = findLatestConversationForUsers(interactions, currentUser.id, toUserId);
    if (existingConversation) {
      return existingConversation.fromUserId === currentUser.id
        ? { sent: false, feedback: 'You already expressed interest in this person.' }
        : { sent: false, feedback: 'This conversation already exists. Open the thread to reply.' };
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
      return {
        sent: false,
        feedback:
          moderationResult.userFeedback ||
          moderationResult.blockedReason ||
          "This message can't be sent as written. Please remove sexual, harmful, or pressuring language and try again.",
      };
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
    return {
      sent: true,
      feedback: moderationResult.resetMessage ?? moderationResult.rewritePrompt ?? undefined,
    };
  }, [currentUser.id, currentUser.email, interactions, users]);

  const respondToInterest = useCallback(async (
    fromUserId: string,
    message: string
  ): Promise<{ sent: boolean; feedback?: string }> => {
    const blockReason = getMessageBlockReason(currentUser.id, fromUserId);
    if (blockReason) {
      return { sent: false, feedback: blockReason };
    }

    const recipient = users.find((user) => user.id === fromUserId);
    const conversationId = `conv_${[currentUser.id, fromUserId].sort().join('_')}`;
    const moderationResult = await moderateFirstMessage({
      senderAppUserId: currentUser.id,
      recipientAppUserId: fromUserId,
      senderEmail: currentUser.email,
      recipientEmail: recipient?.email,
      content: message,
      conversationId,
      isFirstMessage: false,
    });

    if (!moderationResult.approved) {
      return {
        sent: false,
        feedback:
          moderationResult.userFeedback ||
          moderationResult.blockedReason ||
          "This message can't be sent as written. Please remove sexual, harmful, or pressuring language and try again.",
      };
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
          ([, interaction]) => interaction.fromUserId === fromUserId || interaction.toUserId === fromUserId
        );
        if (foundInReceived) {
          baseInteraction = foundInReceived[1];
          foundInReceivedAt = foundInReceived[0];
        } else {
          const foundInSent = Object.entries(prev.sentInterests).find(
            ([, interaction]) => interaction.fromUserId === fromUserId || interaction.toUserId === fromUserId
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
        id: moderationResult.messageId ?? `msg_${Date.now()}`,
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
      return { sent: false, feedback: 'Unable to send message in this conversation right now.' };
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
    return {
      sent: true,
      feedback: moderationResult.resetMessage ?? moderationResult.rewritePrompt ?? undefined,
    };
  }, [currentUser.id, currentUser.email, users, maybeEnrichSnapshotsWithAI, maybeCreateConciergeAutoReports]);

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

    const room: UserInteraction = existing
      ? normalizeStoredInteraction(existing)
      : {
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
    return findLatestConversationForUsers(interactions, currentUser.id, userId);
  }, [currentUser.id, interactions]);

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
    return getLatestUniqueInteractions(interactions)
      .filter(i => i.toUserId === currentUser.id)
      .filter(i => canUsersExchangeMessages(currentUser.id, i.fromUserId));
  }, [currentUser.id, interactions]);

  const getSentInterests = useCallback((): UserInteraction[] => {
    return getLatestUniqueInteractions(interactions)
      .filter(i => i.fromUserId === currentUser.id)
      .filter(i => canUsersExchangeMessages(currentUser.id, i.toUserId));
  }, [currentUser.id, interactions]);

  const getUnreadCount = useCallback((): number => {
    const knownUserIds = new Set(users.map((user) => user.id));

    return getLatestUniqueInteractions(interactions).filter((conversation) => {
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

    const targetType: 'message' | 'profile' | 'behavior' =
      reason === 'fake-profile'
        ? 'profile'
        : conversationId
          ? 'message'
          : 'behavior';
    const reportedUserEmail = users.find((candidate) => candidate.id === reportedUserId)?.email;

    triageReportIntake({
      reporterAppUserId: currentUser.id,
      reportedAppUserId: reportedUserId,
      reporterEmail: currentUser.email,
      reportedEmail: reportedUserEmail,
      reasonSelected: reason,
      freeText: details,
      targetType,
      targetId: conversationId ?? null,
    }).catch((error) => {
      console.warn('Report-intake triage failed (report still stored locally):', error);
    });

    return reportId;
  }, [currentUser.id, currentUser.email, users, calculateSeverity]);

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

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? applyRelationshipModeToUser({
              ...user,
              userStatus: 'suspended',
              suspensionEndDate,
            })
          : user
      )
    );

    setInteractions((prev) => appendProfileUnavailableMessageForMatches(prev, userId));

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
    const suspensions = JSON.parse(localStorage.getItem('rooted_suspensions') || '{}');
    if (suspensions[userId]) {
      delete suspensions[userId];
      localStorage.setItem('rooted_suspensions', JSON.stringify(suspensions));
    }

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? applyRelationshipModeToUser({
              ...user,
              userStatus: 'removed',
              suspensionEndDate: undefined,
            })
          : user
      )
    );

    setInteractions((prev) => appendProfileUnavailableMessageForMatches(prev, userId));

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
    isUserAuthenticated,
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
