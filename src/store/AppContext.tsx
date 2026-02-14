import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { AppView, AssessmentResult, User, InteractionState, UserInteraction, ConversationMessage, Report, ReportReason, ReportSeverity } from '@/types';
import { sampleUsers, currentUser as defaultUser } from '@/data/users';

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

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [users] = useState<User[]>(sampleUsers);
  const [hasJoinedList, setHasJoinedList] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [interactions, setInteractions] = useState<InteractionState>({
    sentInterests: {},
    receivedInterests: {},
  });
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // Reload interactions when currentUser changes (for user login/logout)
  // StorageEvent doesn't fire in same tab, so we need to manually reload
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rooted_shared_interactions');
      if (saved) {
        setInteractions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to reload interactions on user change:', error);
    }
  }, [currentUser.id]);

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

    const conversationId = `conv_${currentUser.id}_${toUserId}_${Date.now()}`;
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

    // NOTE: Auto-consent simulation removed. Other user must manually click "Yes" to unlock photos.
  }, [currentUser.id]);

  const getConversation = useCallback((userId: string): UserInteraction | null => {
    return interactions.sentInterests[userId] || interactions.receivedInterests[userId] || null;
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
  }, []);

  // Unblock a user
  const unblockUser = useCallback((userId: string) => {
    setBlockedUsers(prev => prev.filter(id => id !== userId));
  }, []);

  // Check if a user is blocked
  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.includes(userId);
  }, [blockedUsers]);

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
