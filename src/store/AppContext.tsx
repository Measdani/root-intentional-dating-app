import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AppView, AssessmentResult, User, InteractionState, UserInteraction, ConversationMessage, Report, ReportReason, ReportSeverity, SupportMessage, SupportCategory, AdminNotification } from '@/types';
import { sampleUsers, currentUser as defaultUser } from '@/data/users';
import { toast } from 'sonner';

interface AppState {
  currentView: AppView;
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
  expressInterest: (toUserId: string, message: string) => void;
  respondToInterest: (fromUserId: string, message: string) => void;
  grantPhotoConsent: (conversationId: string) => void;
  withdrawPhotoConsent: (conversationId: string) => void;
  hasExpressedInterest: (userId: string) => boolean;
  arePhotosUnlocked: (userId: string) => boolean;
  canRevealPhotos: (userId: string) => boolean;
  needsResponse: (userId: string) => boolean;
  getConversation: (userId: string) => UserInteraction | null;
  getReceivedInterests: () => UserInteraction[];
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
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
        return JSON.parse(savedUser) as User;
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
    return defaultUser;
  });

  // Update currentUser when localStorage changes (on login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          setCurrentUserState(JSON.parse(savedUser) as User);
        } else {
          setCurrentUserState(defaultUser);
        }
      } catch (error) {
        console.error('Failed to update user from localStorage:', error);
      }
    };

    // Listen for both storage events (from other tabs) and custom user-login event (same tab)
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('user-login', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-login', handleStorageChange);
    };
  }, []);

  const [users] = useState<User[]>(sampleUsers);
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
      setBlockedByUsers(usersWhoBlockedMe);
    } catch (error) {
      console.error('Failed to load blocked by users:', error);
    }
  }, [currentUser.id]);

  // Load notifications for current user
  useEffect(() => {
    try {
      const allNotifications = JSON.parse(localStorage.getItem('rooted_notifications') || '{}');
      const userNotifications = allNotifications[currentUser.id] || [];
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
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
        const updatedUser = {
          ...currentUser,
          userStatus: 'needs-growth' as const,
          suspensionEndDate: undefined,
        };
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
          message: 'Your account suspension period has ended. You must now complete the Growth Mode assessment to regain full access to browsing and matching.',
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

  const addAssessmentAnswer = useCallback((questionId: string, score: number, redFlag?: boolean) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, redFlag }]);
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers([]);
    setAssessmentResult(null);
  }, []);

  // NOTE: Auto-response and auto-consent features removed
  // All messaging and consent decisions are now controlled by users only

  const expressInterest = useCallback((toUserId: string, message: string) => {
    console.log('expressInterest called:', { toUserId, message, currentUserId: currentUser.id });

    // Create deterministic conversationId using sorted user pair so both users share same thread
    const conversationId = `conv_${[currentUser.id, toUserId].sort().join('_')}`;
    const messageId = `msg_${Date.now()}`;

    const initialMessage: ConversationMessage = {
      id: messageId,
      fromUserId: currentUser.id,
      toUserId,
      message,
      timestamp: Date.now(),
      messageType: 'initial',
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
  }, [currentUser.id]);

  const respondToInterest = useCallback((fromUserId: string, message: string) => {
    setInteractions(prev => {
      // Find the conversation with this user (could be keyed by either user ID)
      let baseInteraction =
        prev.receivedInterests[fromUserId] ||
        prev.sentInterests[fromUserId] ||
        // Search all interactions if not found by simple key
        Object.values(prev.receivedInterests).find(i => i.fromUserId === fromUserId || i.toUserId === fromUserId) ||
        Object.values(prev.sentInterests).find(i => i.fromUserId === fromUserId || i.toUserId === fromUserId);

      if (!baseInteraction) return prev;

      const responseMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        fromUserId: currentUser.id,  // Current user is responding
        toUserId: fromUserId,  // Response goes to the other user
        message,
        timestamp: Date.now(),
        messageType: 'response',
      };

      const allMessages = [...baseInteraction.messages, responseMessage];

      // Check if BOTH users have sent messages with 120+ characters
      const userAMessages = allMessages.filter(m => m.fromUserId === baseInteraction.fromUserId);
      const userBMessages = allMessages.filter(m => m.fromUserId === baseInteraction.toUserId);

      const userAHasSufficient = userAMessages.some(m => m.message.length >= 120);
      const userBHasSufficient = userBMessages.some(m => m.message.length >= 120);
      const bothValid = userAHasSufficient && userBHasSufficient;

      const updatedInteraction: UserInteraction = {
        ...baseInteraction,
        messages: allMessages,
        status: bothValid ? 'both_messaged' : 'pending_response',
        updatedAt: Date.now(),
      };

      // Update both receivedInterests and sentInterests for this user
      const updatedReceivedInterests = {
        ...prev.receivedInterests,
        [fromUserId]: updatedInteraction,
      };

      const updatedSentInterests = {
        ...prev.sentInterests,
        [fromUserId]: updatedInteraction,
      };

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

      return {
        ...prev,
        receivedInterests: updatedReceivedInterests,
        sentInterests: updatedSentInterests,
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

  const getConversation = useCallback((userId: string): UserInteraction | null => {
    console.log(`🔍 getConversation called for userId: ${userId}`);
    console.log('📦 sentInterests keys:', Object.keys(interactions.sentInterests));
    console.log('📦 receivedInterests keys:', Object.keys(interactions.receivedInterests));

    // First check direct keys
    if (interactions.sentInterests[userId]) {
      console.log(`✅ Found in sentInterests[${userId}]`);
      return interactions.sentInterests[userId];
    }
    if (interactions.receivedInterests[userId]) {
      console.log(`✅ Found in receivedInterests[${userId}]`);
      return interactions.receivedInterests[userId];
    }

    // If not found by direct key, search through all interactions to find one with this userId
    console.log('🔎 Searching through all interactions...');
    const sentConversation = Object.values(interactions.sentInterests).find(i => i.fromUserId === userId || i.toUserId === userId);
    if (sentConversation) {
      console.log(`✅ Found in sentInterests by search:`, sentConversation);
      return sentConversation;
    }

    const receivedConversation = Object.values(interactions.receivedInterests).find(i => i.fromUserId === userId || i.toUserId === userId);
    if (receivedConversation) {
      console.log(`✅ Found in receivedInterests by search:`, receivedConversation);
      return receivedConversation;
    }

    console.log(`❌ No conversation found for userId: ${userId}`);
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
    return uniqueConversations.filter(i => i.toUserId === currentUser.id);
  }, [currentUser.id, interactions]);

  const getUnreadCount = useCallback((): number => {
    const receivedInterests = getReceivedInterests();
    return receivedInterests.filter(
      conv => conv.status === 'pending_response'
    ).length;
  }, [getReceivedInterests]);

  const saveAssessmentDate = useCallback(() => {
    try {
      localStorage.setItem('rooted_last_assessment_date', Date.now().toString());
    } catch (error) {
      console.error('Failed to save assessment date:', error);
    }
  }, []);

  const getNextRetakeDate = useCallback((): Date | null => {
    try {
      const lastDate = localStorage.getItem('rooted_last_assessment_date');
      if (!lastDate) return null;
      const timestamp = parseInt(lastDate, 10);
      const nextDate = new Date(timestamp);
      nextDate.setMonth(nextDate.getMonth() + 6);
      return nextDate;
    } catch (error) {
      console.error('Failed to get next retake date:', error);
      return null;
    }
  }, []);

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
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    // Update currentUser if they're the suspended user
    if (currentUser.id === userId) {
      const updatedUser = {
        ...currentUser,
        suspensionEndDate,
        userStatus: 'suspended' as const,
      };
      setCurrentUserState(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }

    // TODO: Update user in users array (would require mutable users state)
    // For now, the suspension is persisted through localStorage when the suspended user is logged in
  }, [currentUser]);

  // Reinstate a suspended user (clears suspension end date)
  const reinstateUser = useCallback((userId: string) => {
    // Update currentUser if they're the reinstated user
    if (currentUser.id === userId) {
      const updatedUser = {
        ...currentUser,
        suspensionEndDate: undefined,
        userStatus: 'active' as const,
      };
      setCurrentUserState(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }

    // TODO: Update user in users array (would require mutable users state)
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

    // If this notification is for the current user, add to local state
    if (userId === currentUser.id) {
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
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }, [currentUser.id]);

  const value: AppContextType = {
    currentView,
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
    grantPhotoConsent,
    withdrawPhotoConsent,
    hasExpressedInterest,
    arePhotosUnlocked,
    canRevealPhotos,
    needsResponse,
    getConversation,
    getReceivedInterests,
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
