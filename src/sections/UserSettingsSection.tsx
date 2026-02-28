import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Trash2,
  UserX,
  ShieldCheck,
  Bell,
  Eye,
  Lock,
  RotateCcw,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { userService } from '@/services/userService';
import type { SupportCategory, SupportMessage } from '@/types';
import {
  applyCoreLock,
  getCoreSettingUnlockDate,
  getUserSettingsForUser,
  isCoreSettingLocked,
  removeUserSettingsForUser,
  saveUserSettingsForUser,
  type CoreSettingKey,
  type UserSettings,
} from '@/services/userSettingsService';

const LOCK_COPY_TITLE = 'Intentional Stability Policy';
const SUPPORT_MESSAGES_STORAGE_KEY = 'rooted-admin-support-messages';

type SettingsSupportIssueType =
  | 'password-issue'
  | 'account-issue'
  | 'billing-issue'
  | 'technical-issue'
  | 'feature-request'
  | 'other';

const SETTINGS_SUPPORT_ISSUE_OPTIONS: {
  value: SettingsSupportIssueType;
  label: string;
  description: string;
  category: SupportCategory;
}[] = [
  {
    value: 'password-issue',
    label: 'Password issue',
    description: 'Reset, change, or sign-in password problems.',
    category: 'account',
  },
  {
    value: 'account-issue',
    label: 'Account issue',
    description: 'Profile access, verification, or account state.',
    category: 'account',
  },
  {
    value: 'technical-issue',
    label: 'Technical issue',
    description: 'Bugs, crashes, or unexpected behavior.',
    category: 'technical',
  },
  {
    value: 'billing-issue',
    label: 'Billing issue',
    description: 'Membership, charges, and renewal questions.',
    category: 'billing',
  },
  {
    value: 'feature-request',
    label: 'Feature request',
    description: 'Share a product improvement idea.',
    category: 'feature-request',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything else you need help with.',
    category: 'other',
  },
];

const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  technical: 'Technical issue',
  account: 'Account question',
  billing: 'Billing',
  'feature-request': 'Feature request',
  other: 'Other',
};

const UserSettingsSection: React.FC = () => {
  const {
    currentUser,
    setCurrentView,
    resetAssessment,
    canRetakeAssessment,
    getNextRetakeDate,
    interactions,
    addNotification,
    blockedUsers,
    unblockUser,
    users,
    submitSupportRequest,
  } = useApp();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [lockModalDate, setLockModalDate] = useState<Date | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [supportIssueType, setSupportIssueType] = useState<SettingsSupportIssueType>('password-issue');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [supportReferenceId, setSupportReferenceId] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [recentSupportTickets, setRecentSupportTickets] = useState<SupportMessage[]>([]);
  const isLgbtqUser = false;

  useEffect(() => {
    if (!currentUser?.id) return;
    setSettings(getUserSettingsForUser(currentUser.id, currentUser));
  }, [currentUser.id]);

  const hasSessionUser = useMemo(() => {
    return Boolean(localStorage.getItem('currentUser'));
  }, []);

  const matchedUserIds = useMemo(() => {
    const ids = new Set<string>();
    const allConversations = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];

    allConversations.forEach((conversation) => {
      if (conversation.fromUserId === currentUser.id) ids.add(conversation.toUserId);
      if (conversation.toUserId === currentUser.id) ids.add(conversation.fromUserId);
    });

    return Array.from(ids);
  }, [interactions, currentUser.id]);

  const persistSettings = (next: UserSettings) => {
    if (!currentUser?.id) return;
    setSettings(next);
    saveUserSettingsForUser(currentUser.id, next);
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return 'later';
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const nextRetakeDate = useMemo(() => getNextRetakeDate(), [getNextRetakeDate]);
  const retakeDateLabel = nextRetakeDate ? formatDate(nextRetakeDate) : 'Not scheduled yet';
  const failedAssessment = currentUser.assessmentPassed === false;
  const canRetakeNow = failedAssessment && canRetakeAssessment();
  const retakeAvailabilityLabel = failedAssessment
    ? (canRetakeNow ? 'Available now' : retakeDateLabel)
    : 'Not required';
  const retakeStatusCopy = currentUser.assessmentPassed === true
    ? 'Assessment completed in Alignment Space.'
    : (canRetakeAssessment() ? 'Eligible for reassessment now.' : 'Retake is currently locked.');
  const hasPrioritySupport =
    currentUser.membershipTier === 'quarterly' || currentUser.membershipTier === 'annual';
  const supportSubjectMaxLength = 100;
  const supportDetailsMinLength = 30;
  const supportDetailsMaxLength = 1200;

  const loadRecentSupportTickets = useCallback(() => {
    try {
      const stored = localStorage.getItem(SUPPORT_MESSAGES_STORAGE_KEY);
      if (!stored) {
        setRecentSupportTickets([]);
        return;
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        setRecentSupportTickets([]);
        return;
      }

      const tickets = parsed
        .filter(
          (entry: any) =>
            entry &&
            entry.userId === currentUser.id &&
            typeof entry.id === 'string' &&
            typeof entry.subject === 'string' &&
            typeof entry.message === 'string' &&
            typeof entry.status === 'string'
        )
        .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
        .slice(0, 5) as SupportMessage[];

      setRecentSupportTickets(tickets);
    } catch (error) {
      console.warn('Failed to load recent support tickets:', error);
      setRecentSupportTickets([]);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadRecentSupportTickets();
  }, [loadRecentSupportTickets]);

  useEffect(() => {
    const handleNewSupportMessage = (event: Event) => {
      const customEvent = event as CustomEvent<SupportMessage>;
      const newTicket = customEvent.detail;
      if (!newTicket || newTicket.userId !== currentUser.id) return;

      setRecentSupportTickets((previous) =>
        [newTicket, ...previous.filter((ticket) => ticket.id !== newTicket.id)].slice(0, 5)
      );
    };

    window.addEventListener('new-support-message', handleNewSupportMessage as EventListener);
    return () => {
      window.removeEventListener('new-support-message', handleNewSupportMessage as EventListener);
    };
  }, [currentUser.id]);

  const handleRetakeAssessment = () => {
    if (!failedAssessment) {
      toast.info('Retake is only available for members in Inner Work Space.');
      return;
    }
    if (!canRetakeNow) {
      toast.info(`Retake is available on ${retakeDateLabel}.`);
      return;
    }

    resetAssessment();
    setCurrentView('assessment');
    toast.success('Assessment unlocked. You can retake it now.');
  };

  const notifyMatchesOfCoreChange = (settingLabel: string) => {
    matchedUserIds.forEach((userId) => {
      addNotification(
        'warning',
        'Profile Preference Updated',
        `This member recently updated their ${settingLabel}.`,
        userId
      );
    });
  };

  const handleCoreUpdate = (
    key: CoreSettingKey,
    settingLabel: string,
    updater: (draft: UserSettings) => UserSettings
  ) => {
    if (!settings) return;
    if (isCoreSettingLocked(settings, key)) {
      setLockModalDate(getCoreSettingUnlockDate(settings, key));
      return;
    }

    const updated = updater(settings);
    const locked = applyCoreLock(updated, key);
    persistSettings(locked);
    notifyMatchesOfCoreChange(settingLabel);
    toast.success('Saved. This core setting is now locked for 30 days.');
  };

  const handleFlexibleUpdate = (updater: (draft: UserSettings) => UserSettings) => {
    if (!settings) return;
    persistSettings(updater(settings));
  };

  const handleDownloadData = () => {
    if (!settings) return;

    const userConversations = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ].filter((c) => c.fromUserId === currentUser.id || c.toUserId === currentUser.id);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: currentUser,
      settings,
      blockedUsers,
      conversations: userConversations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rooted-data-${currentUser.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Your data export has been downloaded.');
  };

  const handleDeactivateAccount = async () => {
    if (!settings) return;
    if (!window.confirm('Deactivate your account? This will hide your profile until you sign in again.')) return;

    const nextSettings: UserSettings = {
      ...settings,
      visibility: { ...settings.visibility, profileVisibility: 'paused' },
    };
    persistSettings(nextSettings);

    await userService.updateUser(currentUser.id, { membershipStatus: 'inactive' });
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
    toast.success('Account deactivated.');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete account permanently? This action cannot be undone.')) return;

    const deleted = await userService.deleteUser(currentUser.id);
    if (!deleted) {
      toast.error('Account deletion could not be completed. Please contact support.');
      return;
    }

    removeUserSettingsForUser(currentUser.id);
    localStorage.removeItem(`assessmentResult_${currentUser.id}`);
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
    toast.success('Your account has been deleted.');
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated for this MVP session.');
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupport) return;

    const selectedIssue =
      SETTINGS_SUPPORT_ISSUE_OPTIONS.find((option) => option.value === supportIssueType) ||
      SETTINGS_SUPPORT_ISSUE_OPTIONS[0];
    const trimmedSubject = supportSubject.trim();
    const trimmedDetails = supportDetails.trim();

    if (trimmedSubject.length < 4) {
      toast.error('Please add a clear subject for your ticket.');
      return;
    }
    if (trimmedDetails.length < supportDetailsMinLength) {
      toast.error(`Please share at least ${supportDetailsMinLength} characters so support can help quickly.`);
      return;
    }

    setIsSubmittingSupport(true);
    try {
      const supportId = await submitSupportRequest(
        selectedIssue.category,
        `[${selectedIssue.label}] ${trimmedSubject}`,
        trimmedDetails
      );
      setSupportReferenceId(supportId);
      setSupportSubject('');
      setSupportDetails('');
      loadRecentSupportTickets();
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      toast.error('Unable to submit your ticket right now. Please try again.');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const getSupportStatusClass = (status: SupportMessage['status']) => {
    switch (status) {
      case 'resolved':
        return 'border-green-500/30 bg-green-500/10 text-green-300';
      case 'in-progress':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
      case 'unread':
      default:
        return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
    }
  };

  const lockHint = (key: CoreSettingKey) => {
    if (!settings) return null;
    const unlockDate = getCoreSettingUnlockDate(settings, key);
    if (!isCoreSettingLocked(settings, key)) return null;
    return (
      <p className="text-xs text-amber-300 mt-2">
        Locked until {formatDate(unlockDate)}
      </p>
    );
  };

  const signOut = () => {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
  };

  if (!hasSessionUser || !settings) {
    return (
      <div className="min-h-screen bg-[#0B0F0C] text-[#F6FFF2] flex items-center justify-center p-6">
        <div className="max-w-lg text-center space-y-4">
          <h2 className="font-display text-3xl">Sign In Required</h2>
          <p className="text-[#A9B5AA]">Please sign in to access your settings.</p>
          <button onClick={() => setCurrentView('user-login')} className="btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#F6FFF2]">
      <header className="sticky top-0 z-40 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView(currentUser.assessmentPassed ? 'browse' : 'growth-mode')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-display text-2xl">Settings</h1>
          <button
            onClick={signOut}
            className="text-sm text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D9FF3D]" />
            Account & Security
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[#A9B5AA] mb-1">Email</p>
              <p>{currentUser.email || 'No email on file'}</p>
            </div>
            <div>
              <p className="text-xs text-[#A9B5AA] mb-1">Two-Factor Auth</p>
              <p className="text-[#A9B5AA]">Coming soon</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-[#0B0F0C] border border-[#1A211A] rounded-xl">
            <div>
              <p className="text-sm text-[#F6FFF2]">Retake Assessment</p>
              <p className="text-xs text-[#A9B5AA]">
                Retake available: <span className="text-[#F6FFF2]">{retakeAvailabilityLabel}</span>
              </p>
            </div>
            <button
              onClick={handleRetakeAssessment}
              disabled={!canRetakeNow}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                canRetakeNow
                  ? 'border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10'
                  : 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Retake Assessment
            </button>
          </div>
          <p className="text-xs text-[#A9B5AA]">{retakeStatusCopy}</p>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={handlePasswordChange} className="btn-primary">Change Password</button>
            <button onClick={handleDownloadData} className="btn-outline flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download My Data
            </button>
            <button onClick={handleDeactivateAccount} className="btn-outline flex items-center gap-2">
              <UserX className="w-4 h-4" />
              Deactivate Account
            </button>
            <button onClick={handleDeleteAccount} className="btn-outline text-red-300 border-red-500/40 hover:bg-red-500/10 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#D9FF3D]" />
            Visibility & Profile Control
          </h2>
          <div className="space-y-3">
            <p className="text-sm text-[#A9B5AA]">Profile visibility</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Show me in Alignment Pool', value: 'alignment-pool' },
                { label: 'Pause profile visibility', value: 'paused' },
                { label: 'Private Mode', value: 'private' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFlexibleUpdate((prev) => ({
                    ...prev,
                    visibility: { ...prev.visibility, profileVisibility: option.value as UserSettings['visibility']['profileVisibility'] },
                  }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    settings.visibility.profileVisibility === option.value
                      ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                      : 'border-[#1A211A] text-[#A9B5AA]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#A9B5AA]">Private Mode: only people you like can see your profile.</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-[#A9B5AA]">Photo visibility</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Blur photos until mutual interest', value: 'blur-until-mutual' },
                { label: 'Show first photo only', value: 'first-photo-only' },
                { label: 'Hide photos completely', value: 'hidden' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFlexibleUpdate((prev) => ({
                    ...prev,
                    visibility: { ...prev.visibility, photoVisibility: option.value as UserSettings['visibility']['photoVisibility'] },
                  }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    settings.visibility.photoVisibility === option.value
                      ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                      : 'border-[#1A211A] text-[#A9B5AA]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLgbtqUser && (
            <>
              <div className="space-y-3">
                <p className="text-sm text-[#A9B5AA]">Gender identity visibility</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Always visible', value: 'always-visible' },
                    { label: 'After mutual interest', value: 'after-mutual-interest' },
                    { label: 'Private', value: 'private' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFlexibleUpdate((prev) => ({
                        ...prev,
                        visibility: {
                          ...prev.visibility,
                          genderIdentityVisibility: option.value as UserSettings['visibility']['genderIdentityVisibility'],
                        },
                      }))}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        settings.visibility.genderIdentityVisibility === option.value
                          ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                          : 'border-[#1A211A] text-[#A9B5AA]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-[#A9B5AA]">Identity expression visibility</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Always visible', value: 'always-visible' },
                    { label: 'After mutual interest', value: 'after-mutual-interest' },
                    { label: 'Private', value: 'private' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFlexibleUpdate((prev) => ({
                        ...prev,
                        visibility: {
                          ...prev.visibility,
                          identityExpressionVisibility: option.value as UserSettings['visibility']['identityExpressionVisibility'],
                        },
                      }))}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        settings.visibility.identityExpressionVisibility === option.value
                          ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                          : 'border-[#1A211A] text-[#A9B5AA]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#A9B5AA]">
                  After mutual interest keeps identity details hidden until both users engage.
                </p>
              </div>
            </>
          )}
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl">Alignment Preferences</h2>

          <div>
            <p className="text-sm text-[#A9B5AA] mb-2">Relationship Intent</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Marriage-focused', value: 'marriage-focused' },
                { label: 'Long-term partnership', value: 'long-term-partnership' },
                { label: 'Open but serious', value: 'open-but-serious' },
                { label: 'Not sure yet', value: 'not-sure-yet' },
              ].map((option) => (
                <button
                  key={option.value}
                  disabled={isCoreSettingLocked(settings, 'relationshipIntent')}
                  onClick={() => handleCoreUpdate('relationshipIntent', 'relationship intent', (prev) => ({
                    ...prev,
                    alignmentPreferences: {
                      ...prev.alignmentPreferences,
                      relationshipIntent: option.value as UserSettings['alignmentPreferences']['relationshipIntent'],
                    },
                  }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    settings.alignmentPreferences.relationshipIntent === option.value
                      ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                      : 'border-[#1A211A] text-[#A9B5AA]'
                  } ${isCoreSettingLocked(settings, 'relationshipIntent') ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {lockHint('relationshipIntent')}
          </div>

          <div>
            <p className="text-sm text-[#A9B5AA] mb-2">Children Preference</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Wants children', value: 'wants-children' },
                { label: 'Has children', value: 'has-children' },
                { label: 'Open to partner with children', value: 'open-to-partner-with-children' },
                { label: 'Not open to children', value: 'not-open-to-children' },
              ].map((option) => (
                <button
                  key={option.value}
                  disabled={isCoreSettingLocked(settings, 'childrenPreference')}
                  onClick={() => handleCoreUpdate('childrenPreference', 'children preference', (prev) => ({
                    ...prev,
                    alignmentPreferences: {
                      ...prev.alignmentPreferences,
                      childrenPreference: option.value as UserSettings['alignmentPreferences']['childrenPreference'],
                    },
                  }))}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    settings.alignmentPreferences.childrenPreference === option.value
                      ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                      : 'border-[#1A211A] text-[#A9B5AA]'
                  } ${isCoreSettingLocked(settings, 'childrenPreference') ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {lockHint('childrenPreference')}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#A9B5AA] mb-2">Monogamy Structure</p>
              <div className="space-y-2">
                {[
                  { label: 'Monogamous only', value: 'monogamous-only' },
                  { label: 'Ethically non-monogamous', value: 'ethically-non-monogamous' },
                  { label: 'Undecided', value: 'undecided' },
                ].map((option) => (
                  <button
                    key={option.value}
                    disabled={isCoreSettingLocked(settings, 'monogamyStructure')}
                    onClick={() => handleCoreUpdate('monogamyStructure', 'monogamy structure', (prev) => ({
                      ...prev,
                      alignmentPreferences: {
                        ...prev.alignmentPreferences,
                        monogamyStructure: option.value as UserSettings['alignmentPreferences']['monogamyStructure'],
                      },
                    }))}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                      settings.alignmentPreferences.monogamyStructure === option.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA]'
                    } ${isCoreSettingLocked(settings, 'monogamyStructure') ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {lockHint('monogamyStructure')}
            </div>

            <div>
              <p className="text-sm text-[#A9B5AA] mb-2">Relocation Openness</p>
              <div className="space-y-2">
                {[
                  { label: 'Willing to relocate', value: 'willing-to-relocate' },
                  { label: 'Not willing', value: 'not-willing' },
                  { label: 'Only local', value: 'local-only' },
                ].map((option) => (
                  <button
                    key={option.value}
                    disabled={isCoreSettingLocked(settings, 'relocationOpenness')}
                    onClick={() => handleCoreUpdate('relocationOpenness', 'relocation openness', (prev) => ({
                      ...prev,
                      alignmentPreferences: {
                        ...prev.alignmentPreferences,
                        relocationOpenness: option.value as UserSettings['alignmentPreferences']['relocationOpenness'],
                      },
                    }))}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${
                      settings.alignmentPreferences.relocationOpenness === option.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA]'
                    } ${isCoreSettingLocked(settings, 'relocationOpenness') ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {lockHint('relocationOpenness')}
            </div>
          </div>

          <div>
            <p className="text-sm text-[#A9B5AA] mb-2">Lifestyle Dealbreakers</p>
            <div className="grid md:grid-cols-3 gap-2">
              <button
                disabled={isCoreSettingLocked(settings, 'lifestyleSmoking')}
                onClick={() => handleCoreUpdate('lifestyleSmoking', 'smoking preference', (prev) => ({
                  ...prev,
                  alignmentPreferences: {
                    ...prev.alignmentPreferences,
                    lifestyleDealbreakers: {
                      ...prev.alignmentPreferences.lifestyleDealbreakers,
                      smoking: !prev.alignmentPreferences.lifestyleDealbreakers.smoking,
                    },
                  },
                }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  settings.alignmentPreferences.lifestyleDealbreakers.smoking
                    ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                    : 'border-[#1A211A] text-[#A9B5AA]'
                } ${isCoreSettingLocked(settings, 'lifestyleSmoking') ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Smoking
              </button>
              <button
                disabled={isCoreSettingLocked(settings, 'lifestyleSubstanceUse')}
                onClick={() => handleCoreUpdate('lifestyleSubstanceUse', 'substance use preference', (prev) => ({
                  ...prev,
                  alignmentPreferences: {
                    ...prev.alignmentPreferences,
                    lifestyleDealbreakers: {
                      ...prev.alignmentPreferences.lifestyleDealbreakers,
                      substanceUse: !prev.alignmentPreferences.lifestyleDealbreakers.substanceUse,
                    },
                  },
                }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  settings.alignmentPreferences.lifestyleDealbreakers.substanceUse
                    ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                    : 'border-[#1A211A] text-[#A9B5AA]'
                } ${isCoreSettingLocked(settings, 'lifestyleSubstanceUse') ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Substance use
              </button>
              <button
                disabled={isCoreSettingLocked(settings, 'lifestyleReligionNonNegotiables')}
                onClick={() => handleCoreUpdate('lifestyleReligionNonNegotiables', 'religion non-negotiables', (prev) => ({
                  ...prev,
                  alignmentPreferences: {
                    ...prev.alignmentPreferences,
                    lifestyleDealbreakers: {
                      ...prev.alignmentPreferences.lifestyleDealbreakers,
                      religionNonNegotiables: !prev.alignmentPreferences.lifestyleDealbreakers.religionNonNegotiables,
                    },
                  },
                }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  settings.alignmentPreferences.lifestyleDealbreakers.religionNonNegotiables
                    ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                    : 'border-[#1A211A] text-[#A9B5AA]'
                } ${isCoreSettingLocked(settings, 'lifestyleReligionNonNegotiables') ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Religion non-negotiables
              </button>
            </div>
            {lockHint('lifestyleSmoking') || lockHint('lifestyleSubstanceUse') || lockHint('lifestyleReligionNonNegotiables')}
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl">Growth & Inner Work Preferences</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                growth: { ...prev.growth, showGrowthFocusToMatches: !prev.growth.showGrowthFocusToMatches },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.growth.showGrowthFocusToMatches
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Show my growth focus areas to matches
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                growth: { ...prev.growth, retakeNotifications: !prev.growth.retakeNotifications },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.growth.retakeNotifications
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Notify me when eligible for reassessment
            </button>
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl">Communication Boundaries</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                communicationBoundaries: { ...prev.communicationBoundaries, communicationPace: 'slow' },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.communicationBoundaries.communicationPace === 'slow'
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              I prefer slow communication
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                communicationBoundaries: { ...prev.communicationBoundaries, communicationPace: 'daily' },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.communicationBoundaries.communicationPace === 'daily'
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              I prefer daily communication
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                communicationBoundaries: {
                  ...prev.communicationBoundaries,
                  need24HoursBeforeConflict: !prev.communicationBoundaries.need24HoursBeforeConflict,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.communicationBoundaries.need24HoursBeforeConflict
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              I need 24 hours before discussing conflict
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                communicationBoundaries: {
                  ...prev.communicationBoundaries,
                  noYelling: !prev.communicationBoundaries.noYelling,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.communicationBoundaries.noYelling
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              I do not tolerate yelling
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                communicationBoundaries: {
                  ...prev.communicationBoundaries,
                  noLateNightArguments: !prev.communicationBoundaries.noLateNightArguments,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.communicationBoundaries.noLateNightArguments
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              I do not engage in late-night emotional arguments
            </button>
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl">Safety Settings</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                safety: {
                  ...prev.safety,
                  requireBackgroundBadgeForMeetups: !prev.safety.requireBackgroundBadgeForMeetups,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.safety.requireBackgroundBadgeForMeetups
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Require background check badge for meetups
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                safety: {
                  ...prev.safety,
                  onlyMatchWithVerifiedAccounts: !prev.safety.onlyMatchWithVerifiedAccounts,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.safety.onlyMatchWithVerifiedAccounts
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Only match with verified accounts
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                safety: {
                  ...prev.safety,
                  hiddenWordsFilter: !prev.safety.hiddenWordsFilter,
                },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.safety.hiddenWordsFilter
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Hidden words filter
            </button>
          </div>

          <div>
            <p className="text-sm text-[#A9B5AA] mb-2">Report & Block List</p>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-[#A9B5AA]">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((blockedId) => {
                  const blockedUser = users.find((u) => u.id === blockedId);
                  return (
                    <div key={blockedId} className="flex items-center justify-between bg-[#0B0F0C] border border-[#1A211A] rounded-lg p-3">
                      <span className="text-sm">{blockedUser?.name || blockedId}</span>
                      <button
                        onClick={() => unblockUser(blockedId)}
                        className="text-xs text-[#D9FF3D] hover:underline"
                      >
                        Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D9FF3D]" />
            Support Tickets
          </h2>
          <p className="text-sm text-[#A9B5AA]">
            Open a ticket for password issues, account issues, billing, technical problems, or anything else.
          </p>
          <p className="text-xs text-[#A9B5AA]">
            {hasPrioritySupport
              ? 'Priority support is active on your plan.'
              : 'Priority support is available on quarterly and annual plans.'}
          </p>

          <form onSubmit={handleSupportSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-[#A9B5AA] mb-2">Issue type</p>
              <div className="grid md:grid-cols-2 gap-2">
                {SETTINGS_SUPPORT_ISSUE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSupportIssueType(option.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      supportIssueType === option.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/40'
                    }`}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs opacity-80 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-[#A9B5AA] block mb-2">Subject</label>
              <input
                type="text"
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value.slice(0, supportSubjectMaxLength))}
                placeholder="Brief summary of your issue"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
              <p className="text-xs text-[#A9B5AA] mt-1">
                {supportSubject.length}/{supportSubjectMaxLength}
              </p>
            </div>

            <div>
              <label className="text-sm text-[#A9B5AA] block mb-2">Details</label>
              <textarea
                value={supportDetails}
                onChange={(e) => setSupportDetails(e.target.value.slice(0, supportDetailsMaxLength))}
                placeholder="Share details so our team can resolve this quickly."
                rows={4}
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors resize-none"
              />
              <p className="text-xs text-[#A9B5AA] mt-1">
                {supportDetails.length}/{supportDetailsMaxLength} (minimum {supportDetailsMinLength})
              </p>
            </div>

            <button
              type="submit"
              disabled={
                isSubmittingSupport ||
                supportSubject.trim().length < 4 ||
                supportDetails.trim().length < supportDetailsMinLength
              }
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmittingSupport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting ticket...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </form>

          {supportReferenceId && (
            <div className="text-xs text-[#A9B5AA] bg-[#0B0F0C] border border-[#1A211A] rounded-lg px-3 py-2">
              Latest ticket reference: <span className="text-[#F6FFF2] font-mono">{supportReferenceId}</span>
            </div>
          )}

          <div className="pt-2 border-t border-[#1A211A]">
            <p className="text-sm text-[#A9B5AA] mb-3">Recent Tickets</p>
            {recentSupportTickets.length === 0 ? (
              <p className="text-sm text-[#A9B5AA]">No tickets submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {recentSupportTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-[#0B0F0C] border border-[#1A211A] rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#F6FFF2] font-medium truncate">
                        {ticket.subject}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border text-[#A9B5AA] border-[#1A211A]">
                        {SUPPORT_CATEGORY_LABELS[ticket.category] || 'Other'}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${getSupportStatusClass(ticket.status)}`}>
                        {ticket.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A9B5AA]">
                      <span className="font-mono">{ticket.id}</span>
                      <span>{new Date(ticket.createdAt).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#D9FF3D]" />
            Notification Preferences
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                notifications: { ...prev.notifications, newAlignmentMatches: !prev.notifications.newAlignmentMatches },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.notifications.newAlignmentMatches
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              New alignment matches
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                notifications: { ...prev.notifications, messageRequests: !prev.notifications.messageRequests },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.notifications.messageRequests
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Message requests
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                notifications: { ...prev.notifications, innerWorkReminders: !prev.notifications.innerWorkReminders },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.notifications.innerWorkReminders
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Inner Work reminders
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                notifications: { ...prev.notifications, blogUpdates: !prev.notifications.blogUpdates },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.notifications.blogUpdates
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Blog updates
            </button>
            <button
              onClick={() => handleFlexibleUpdate((prev) => ({
                ...prev,
                notifications: { ...prev.notifications, growthMilestones: !prev.notifications.growthMilestones },
              }))}
              className={`px-4 py-3 rounded-lg border text-left ${
                settings.notifications.growthMilestones
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Growth milestones
            </button>
          </div>
        </section>
      </main>

      {lockModalDate && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-4">
            <h3 className="font-display text-xl">{LOCK_COPY_TITLE}</h3>
            <p className="text-sm text-[#A9B5AA]">
              To protect alignment integrity, core relationship settings are locked for 30 days after changes.
            </p>
            <p className="text-sm text-[#F6FFF2]">
              You may update this again on: {formatDate(lockModalDate)}
            </p>
            <p className="text-sm text-[#A9B5AA]">
              This helps ensure members are intentional, not reactive.
            </p>
            <button
              onClick={() => setLockModalDate(null)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettingsSection;
