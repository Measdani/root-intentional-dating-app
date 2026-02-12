import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AppView, AssessmentResult, User } from '@/types';
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
}

interface AppContextType extends AppState {
  setCurrentView: (view: AppView) => void;
  addAssessmentAnswer: (questionId: string, score: number, redFlag?: boolean) => void;
  setAssessmentResult: (result: AssessmentResult) => void;
  setSelectedUser: (user: User | null) => void;
  setHasJoinedList: (value: boolean) => void;
  setShowEmailModal: (value: boolean) => void;
  resetAssessment: () => void;
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

  const addAssessmentAnswer = useCallback((questionId: string, score: number, redFlag?: boolean) => {
    setAssessmentAnswers(prev => [...prev, { questionId, score, redFlag }]);
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers([]);
    setAssessmentResult(null);
  }, []);

  const value: AppContextType = {
    currentView,
    assessmentAnswers,
    assessmentResult,
    selectedUser,
    currentUser,
    users,
    hasJoinedList,
    showEmailModal,
    setCurrentView,
    addAssessmentAnswer,
    setAssessmentResult,
    setSelectedUser,
    setHasJoinedList,
    setShowEmailModal,
    resetAssessment,
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
