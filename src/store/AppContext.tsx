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
  const [currentUser] = useState<User>(defaultUser);
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
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rooted_user_interactions');
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

  // Save interactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('rooted_user_interactions', JSON.stringify(interactions));
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

  const addAssessmentAnswer = useCallback((questionId: string, score: number, redFlag?: boolean) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, redFlag }]);
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers([]);
    setAssessmentResult(null);
  }, []);

  const responseTemplates = [
    "Thanks for reaching out! I really appreciate your thoughtful message. I'd love to learn more about you too. What drew you to my profile in particular?",
    "Your message stood out to me. I'm curious to hear more about what resonated with you. Our values seem to align really well from what I can see.",
    "I'm glad you took the time to write something meaningful. Your growth focus really speaks to me. What's been most impactful for you on that journey?",
  ];

  // Simulate response from other user
  const simulateUserResponse = useCallback((fromUserId: string) => {
    const randomMessage = responseTemplates[Math.floor(Math.random() * responseTemplates.length)];

    setInteractions(prev => {
      const sentInterest = prev.sentInterests[fromUserId];
      if (!sentInterest) return prev;

      const responseMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        fromUserId: fromUserId,
        toUserId: currentUser.id,
        message: randomMessage,
        timestamp: Date.now(),
        messageType: 'response',
      };

      const updatedInteraction: UserInteraction = {
        ...sentInterest,
        messages: [...sentInterest.messages, responseMessage],
        status: 'both_messaged',
        updatedAt: Date.now(),
      };

      return {
        ...prev,
        sentInterests: {
          ...prev.sentInterests,
          [fromUserId]: updatedInteraction,
        },
        receivedInterests: {
          ...prev.receivedInterests,
          [fromUserId]: updatedInteraction,
        },
      };
    });
  }, [currentUser.id]);

  // Simulate other user granting consent
  const simulateOtherUserConsent = useCallback((conversationId: string) => {
    setInteractions(prev => {
      const updateInteraction = (interaction: UserInteraction): UserInteraction => {
        if (interaction.conversationId !== conversationId) return interaction;

        const updatedConsent = {
          fromUser: {
            ...interaction.photoConsent.fromUser,
            hasConsented: true,
            consentTimestamp: interaction.photoConsent.fromUser.consentTimestamp || Date.now(),
          },
          toUser: {
            ...interaction.photoConsent.toUser,
            hasConsented: true,
            consentTimestamp: interaction.photoConsent.toUser.consentTimestamp || Date.now(),
          },
        };

        return {
          ...interaction,
          photoConsent: updatedConsent,
          photosUnlocked: true,
          status: 'photos_unlocked',
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
  }, []);

  const expressInterest = useCallback((toUserId: string, message: string) => {
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

    setInteractions(prev => ({
      ...prev,
      sentInterests: {
        ...prev.sentInterests,
        [toUserId]: newInteraction,
      },
    }));

    // NOTE: Auto-response feature disabled to allow natural conversation flow
    // Users should reply manually without system auto-generating responses
  }, [currentUser.id, simulateUserResponse]);

  const respondToInterest = useCallback((fromUserId: string, message: string) => {
    setInteractions(prev => {
      const receivedInterest = prev.receivedInterests[fromUserId];
      if (!receivedInterest) return prev;

      const responseMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        fromUserId: currentUser.id,
        toUserId: fromUserId,
        message,
        timestamp: Date.now(),
        messageType: 'response',
      };

      const updatedInteraction: UserInteraction = {
        ...receivedInterest,
        messages: [...receivedInterest.messages, responseMessage],
        status: 'both_messaged',
        updatedAt: Date.now(),
      };

      return {
        ...prev,
        receivedInterests: {
          ...prev.receivedInterests,
          [fromUserId]: updatedInteraction,
        },
        sentInterests: {
          ...prev.sentInterests,
          [fromUserId]: updatedInteraction,
        },
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

    // Simulate other user consent after delay
    const timeout = setTimeout(() => {
      simulateOtherUserConsent(conversationId);
    }, 2000);
    timeoutRefs.current.push(timeout);
  }, [currentUser.id, simulateOtherUserConsent]);

  const hasExpressedInterest = useCallback((userId: string): boolean => {
    return userId in interactions.sentInterests;
  }, [interactions.sentInterests]);

  const getConversation = useCallback((userId: string): UserInteraction | null => {
    return interactions.sentInterests[userId] || interactions.receivedInterests[userId] || null;
  }, [interactions]);

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
    const conversation = interactions.receivedInterests[userId];
    return conversation?.status === 'pending_response';
  }, [interactions.receivedInterests]);

  const getReceivedInterests = useCallback((): UserInteraction[] => {
    return Object.values(interactions.receivedInterests);
  }, [interactions.receivedInterests]);

  const getUnreadCount = useCallback((): number => {
    return Object.values(interactions.receivedInterests).filter(
      conv => conv.status === 'pending_response'
    ).length;
  }, [interactions.receivedInterests]);

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
