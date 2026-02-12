import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { AppView, AssessmentResult, User, InteractionState } from '@/types';
import { sampleUsers, currentUser as defaultUser } from '@/data/users';

interface AppState {
  currentView: AppView;
  assessmentAnswers: { questionId: string; score: number; redFlag?: boolean }[];
  assessmentResult: AssessmentResult | null;
  selectedUser: User | null;
  currentUser: User;
  users: User[];
  hasJoinedList: boolean;
  showEmailModal: boolean;
  interactions: InteractionState;
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
  hasExpressedInterest: (userId: string) => boolean;
  arePhotosUnlocked: (userId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [assessmentAnswers, setAssessmentAnswers] = useState<{ questionId: string; score: number; redFlag?: boolean }[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser] = useState<User>(defaultUser);
  const [users] = useState<User[]>(sampleUsers);
  const [hasJoinedList, setHasJoinedList] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [interactions, setInteractions] = useState<InteractionState>({
    sentInterests: {},
    receivedInterests: {},
  });

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
  }, []);

  // Save interactions to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('rooted_user_interactions', JSON.stringify(interactions));
    } catch (error) {
      console.error('Failed to save interactions:', error);
    }
  }, [interactions]);

  const addAssessmentAnswer = useCallback((questionId: string, score: number, redFlag?: boolean) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, redFlag }]);
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers([]);
    setAssessmentResult(null);
  }, []);

  const expressInterest = useCallback((toUserId: string, message: string) => {
    setInteractions(prev => ({
      ...prev,
      sentInterests: {
        ...prev.sentInterests,
        [toUserId]: {
          fromUserId: currentUser.id,
          toUserId,
          message,
          timestamp: Date.now(),
          photosUnlocked: true,
        },
      },
    }));
  }, [currentUser.id]);

  const hasExpressedInterest = useCallback((userId: string): boolean => {
    return userId in interactions.sentInterests;
  }, [interactions.sentInterests]);

  const arePhotosUnlocked = useCallback((userId: string): boolean => {
    // Current user's photos always visible
    if (userId === currentUser.id) return true;
    // Photos unlocked if we expressed interest
    return hasExpressedInterest(userId);
  }, [currentUser.id, hasExpressedInterest]);

  const value: AppContextType = {
    currentView,
    assessmentAnswers,
    assessmentResult,
    selectedUser,
    currentUser,
    users,
    hasJoinedList,
    showEmailModal,
    interactions,
    setCurrentView,
    addAssessmentAnswer,
    setAssessmentResult,
    setSelectedUser,
    setHasJoinedList,
    setShowEmailModal,
    resetAssessment,
    expressInterest,
    hasExpressedInterest,
    arePhotosUnlocked,
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
