import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
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
import { supportService } from '@/services/supportService';
import { SUPPORT_EMAIL } from '@/constants/support';
import type { SupportCategory, SupportMessage } from '@/types';
import { signOutAndClearLocalUser, authService } from '@/services/authService';
import {
  cancelExclusiveRequest,
  declineExclusiveRequest,
  enterBreakMode,
  exitBreakMode,
  exitExclusiveMode,
  formatModeDuration,
  getRelationshipModeSnapshot,
  getUserRelationshipMode,
  requestExclusiveMode,
} from '@/modules';
import {
  applyCoreLock,
  getCoreSettingUnlockDate,
  getUserSettingsForUser,
  isCoreSettingLocked,
  saveUserSettingsForUser,
  type CoreSettingKey,
  type UserSettings,
} from '@/services/userSettingsService';
import { PATH_LABELS } from '@/lib/pathways';
import { ASSESSMENT_STYLE_META } from '@/services/assessmentStyleService';
import {
  consumeExclusiveModeSettingsFocus,
  getExclusiveModeSettingsFocusEvent,
} from '@/lib/exclusiveModeNavigation';

const LOCK_COPY_TITLE = 'Intentional Stability Policy';
const SUPPORT_MESSAGES_STORAGE_KEY = 'rooted-admin-support-messages';

type SettingsSupportIssueType =
  | 'password-issue'
  | 'account-issue'
  | 'billing-issue'
  | 'technical-issue'
  | 'feature-request'
  | 'other';

type DeactivationReason =
  | 'found-someone'
  | 'need-break'
  | 'not-finding-connections'
  | 'personal-reasons'
  | 'platform-issue'
  | 'other';

type DeactivationStep =
  | 'reason'
  | 'break-suggestion'
  | 'found-love'
  | 'found-love-confirmation'
  | 'issue-on-platform'
  | 'billing-notice'
  | 'final-confirmation'
  | 'exit-message';

type MfaAssuranceLevel = 'aal1' | 'aal2' | null;

type PendingTotpEnrollment = {
  factorId: string;
  friendlyName: string;
  qrCode: string;
  secret: string;
  uri: string;
  verifyCode: string;
};

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

const DEACTIVATION_REASON_OPTIONS: { value: DeactivationReason; label: string }[] = [
  { value: 'found-someone', label: 'I found someone' },
  { value: 'need-break', label: 'I need a break from dating' },
  { value: 'not-finding-connections', label: "I'm not finding the connections I'm looking for" },
  { value: 'personal-reasons', label: "I'm leaving for personal reasons" },
  { value: 'platform-issue', label: 'I experienced an issue on the platform' },
  { value: 'other', label: 'Other' },
];

const DEACTIVATION_REASON_LABELS: Record<DeactivationReason, string> = {
  'found-someone': 'I found someone',
  'need-break': 'I need a break from dating',
  'not-finding-connections': "I'm not finding the connections I'm looking for",
  'personal-reasons': "I'm leaving for personal reasons",
  'platform-issue': 'I experienced an issue on the platform',
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
  const [modeRefreshTick, setModeRefreshTick] = useState(0);
  const [exclusiveTargetId, setExclusiveTargetId] = useState('');
  const [showBreakModeConfirm, setShowBreakModeConfirm] = useState(false);
  const [showDeactivateFlow, setShowDeactivateFlow] = useState(false);
  const [deactivationStep, setDeactivationStep] = useState<DeactivationStep>('reason');
  const [deactivationReason, setDeactivationReason] = useState<DeactivationReason | null>(null);
  const [foundLoveYourName, setFoundLoveYourName] = useState('');
  const [foundLovePartnerName, setFoundLovePartnerName] = useState('');
  const [foundLoveEmail, setFoundLoveEmail] = useState('');
  const [foundLoveStory, setFoundLoveStory] = useState('');
  const [foundLovePhotoName, setFoundLovePhotoName] = useState('');
  const [foundLoveSharePermission, setFoundLoveSharePermission] = useState(false);
  const [foundLoveGiveawayOptIn, setFoundLoveGiveawayOptIn] = useState(false);
  const [foundLoveSubmitted, setFoundLoveSubmitted] = useState(false);
  const [isSubmittingFoundLove, setIsSubmittingFoundLove] = useState(false);
  const [isSubmittingIssueReport, setIsSubmittingIssueReport] = useState(false);
  const [issueReportSubmitted, setIssueReportSubmitted] = useState(false);
  const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);
  const [highlightExclusiveModeSection, setHighlightExclusiveModeSection] = useState(false);
  const [hasSupabaseSession, setHasSupabaseSession] = useState(false);
  const [isLoadingMfa, setIsLoadingMfa] = useState(true);
  const [mfaError, setMfaError] = useState('');
  const [verifiedTotpFactors, setVerifiedTotpFactors] = useState<
    Array<{
      id: string;
      friendlyName?: string;
      createdAt: string;
      updatedAt: string;
      lastChallengedAt?: string;
    }>
  >([]);
  const [mfaCurrentLevel, setMfaCurrentLevel] = useState<MfaAssuranceLevel>(null);
  const [mfaNextLevel, setMfaNextLevel] = useState<MfaAssuranceLevel>(null);
  const [pendingTotpEnrollment, setPendingTotpEnrollment] = useState<PendingTotpEnrollment | null>(null);
  const [mfaStepUpCode, setMfaStepUpCode] = useState('');
  const [isStartingMfaEnrollment, setIsStartingMfaEnrollment] = useState(false);
  const [isVerifyingMfaEnrollment, setIsVerifyingMfaEnrollment] = useState(false);
  const [isVerifyingMfaSession, setIsVerifyingMfaSession] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const exclusiveModeSectionRef = useRef<HTMLElement | null>(null);
  const exclusiveModeHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supportSectionRef = useRef<HTMLElement | null>(null);
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
  const relationshipModeSnapshot = useMemo(
    () => getRelationshipModeSnapshot(currentUser.id),
    [currentUser.id, currentUser.mode, modeRefreshTick]
  );
  const exclusiveCandidates = useMemo(
    () => users.filter((user) => matchedUserIds.includes(user.id) && user.id !== currentUser.id),
    [users, matchedUserIds, currentUser.id]
  );
  const exclusivePartnerUser = useMemo(
    () => users.find((user) => user.id === relationshipModeSnapshot.exclusivePartnerId),
    [users, relationshipModeSnapshot.exclusivePartnerId]
  );
  const outgoingExclusiveTargetUser = useMemo(
    () => users.find((user) => user.id === relationshipModeSnapshot.outgoingExclusiveRequestTo),
    [users, relationshipModeSnapshot.outgoingExclusiveRequestTo]
  );
  const incomingExclusiveRequesterUser = useMemo(
    () => users.find((user) => user.id === relationshipModeSnapshot.incomingExclusiveRequestFrom),
    [users, relationshipModeSnapshot.incomingExclusiveRequestFrom]
  );

  useEffect(() => {
    if (exclusiveCandidates.length === 0) {
      setExclusiveTargetId('');
      return;
    }

    setExclusiveTargetId((previous) =>
      exclusiveCandidates.some((candidate) => candidate.id === previous)
        ? previous
        : exclusiveCandidates[0].id
    );
  }, [exclusiveCandidates]);

  useEffect(() => {
    const handleModeUpdated = () => setModeRefreshTick((previous) => previous + 1);
    window.addEventListener('relationship-mode-updated', handleModeUpdated as EventListener);
    const interval = window.setInterval(() => {
      setModeRefreshTick((previous) => previous + 1);
    }, 60000);

    return () => {
      window.removeEventListener('relationship-mode-updated', handleModeUpdated as EventListener);
      window.clearInterval(interval);
    };
  }, []);

  const focusExclusiveModeSection = useCallback(() => {
    if (!exclusiveModeSectionRef.current) return;

    exclusiveModeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightExclusiveModeSection(true);

    if (exclusiveModeHighlightTimeoutRef.current) {
      clearTimeout(exclusiveModeHighlightTimeoutRef.current);
    }

    exclusiveModeHighlightTimeoutRef.current = setTimeout(() => {
      setHighlightExclusiveModeSection(false);
    }, 2200);
  }, []);

  useEffect(() => {
    const focusFromRequest = () => {
      if (!consumeExclusiveModeSettingsFocus()) return;
      window.requestAnimationFrame(() => focusExclusiveModeSection());
    };

    const handleFocusRequest = () => {
      consumeExclusiveModeSettingsFocus();
      focusExclusiveModeSection();
    };

    focusFromRequest();
    window.addEventListener(getExclusiveModeSettingsFocusEvent(), handleFocusRequest);

    return () => {
      window.removeEventListener(getExclusiveModeSettingsFocusEvent(), handleFocusRequest);
      if (exclusiveModeHighlightTimeoutRef.current) {
        clearTimeout(exclusiveModeHighlightTimeoutRef.current);
      }
    };
  }, [focusExclusiveModeSection]);

  const refreshMfaState = useCallback(async () => {
    setIsLoadingMfa(true);
    setMfaError('');

    try {
      const {
        data: { session },
        error: sessionError,
      } = await authService.getSession();

      if (sessionError) {
        setHasSupabaseSession(false);
        setVerifiedTotpFactors([]);
        setMfaCurrentLevel(null);
        setMfaNextLevel(null);
        setPendingTotpEnrollment(null);
        setMfaStepUpCode('');
        setMfaError(sessionError.message);
        return;
      }

      if (!session?.user) {
        setHasSupabaseSession(false);
        setVerifiedTotpFactors([]);
        setMfaCurrentLevel(null);
        setMfaNextLevel(null);
        setPendingTotpEnrollment(null);
        setMfaStepUpCode('');
        return;
      }

      setHasSupabaseSession(true);

      const [factorResult, assuranceResult] = await Promise.all([
        authService.listMfaFactors(),
        authService.getAuthenticatorAssuranceLevel(),
      ]);

      if (factorResult.error) {
        setVerifiedTotpFactors([]);
        setMfaError(factorResult.error.message);
      } else {
        setVerifiedTotpFactors(
          (factorResult.data?.totp ?? []).map((factor) => ({
            id: factor.id,
            friendlyName: factor.friendly_name,
            createdAt: factor.created_at,
            updatedAt: factor.updated_at,
            lastChallengedAt: factor.last_challenged_at,
          }))
        );
      }

      if (assuranceResult.error) {
        setMfaCurrentLevel(null);
        setMfaNextLevel(null);
        setMfaError((previous) => previous || assuranceResult.error?.message || '');
      } else {
        setMfaCurrentLevel(assuranceResult.data.currentLevel);
        setMfaNextLevel(assuranceResult.data.nextLevel);
      }
    } catch (error) {
      console.error('Failed to refresh MFA state:', error);
      setHasSupabaseSession(false);
      setVerifiedTotpFactors([]);
      setMfaCurrentLevel(null);
      setMfaNextLevel(null);
      setMfaError('Unable to load two-factor authentication right now.');
    } finally {
      setIsLoadingMfa(false);
    }
  }, []);

  useEffect(() => {
    void refreshMfaState();
  }, [refreshMfaState, currentUser.id]);

  const handleStartMfaEnrollment = useCallback(async () => {
    setIsStartingMfaEnrollment(true);
    setMfaError('');

    try {
      const friendlyName = currentUser.name
        ? `${currentUser.name}'s Authenticator`
        : 'Rooted Hearts Authenticator';
      const { data, error } = await authService.enrollTotpFactor(friendlyName);

      if (error) {
        setMfaError(error.message);
        return;
      }

      if (!data?.totp) {
        setMfaError('Supabase did not return authenticator setup details.');
        return;
      }

      setPendingTotpEnrollment({
        factorId: data.id,
        friendlyName: data.friendly_name || friendlyName,
        qrCode: `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`,
        secret: data.totp.secret,
        uri: data.totp.uri,
        verifyCode: '',
      });
    } catch (error) {
      console.error('Failed to start MFA enrollment:', error);
      setMfaError('Unable to start two-factor setup right now.');
    } finally {
      setIsStartingMfaEnrollment(false);
    }
  }, [currentUser.name]);

  const handleCancelPendingMfaEnrollment = useCallback(async () => {
    if (!pendingTotpEnrollment) return;

    try {
      await authService.unenrollMfaFactor(pendingTotpEnrollment.factorId);
    } catch (error) {
      console.warn('Failed to clean up pending MFA factor:', error);
    } finally {
      setPendingTotpEnrollment(null);
    }
  }, [pendingTotpEnrollment]);

  const handleVerifyPendingMfaEnrollment = useCallback(async () => {
    if (!pendingTotpEnrollment) return;

    const code = pendingTotpEnrollment.verifyCode.trim();
    if (!code) {
      setMfaError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setIsVerifyingMfaEnrollment(true);
    setMfaError('');

    try {
      const { error } = await authService.challengeAndVerifyMfaFactor(
        pendingTotpEnrollment.factorId,
        code
      );

      if (error) {
        setMfaError(error.message);
        return;
      }

      setPendingTotpEnrollment(null);
      toast.success('Two-factor authentication is now enabled.');
      await refreshMfaState();
    } catch (error) {
      console.error('Failed to verify MFA enrollment:', error);
      setMfaError('Unable to verify that code right now.');
    } finally {
      setIsVerifyingMfaEnrollment(false);
    }
  }, [pendingTotpEnrollment, refreshMfaState]);

  const handleVerifyMfaSession = useCallback(async () => {
    const code = mfaStepUpCode.trim();
    const primaryFactor = verifiedTotpFactors[0];

    if (!primaryFactor) {
      setMfaError('No verified authenticator was found for this account.');
      return;
    }

    if (!code) {
      setMfaError('Enter the current code from your authenticator app.');
      return;
    }

    setIsVerifyingMfaSession(true);
    setMfaError('');

    try {
      const { error } = await authService.challengeAndVerifyMfaFactor(primaryFactor.id, code);
      if (error) {
        setMfaError(error.message);
        return;
      }

      setMfaStepUpCode('');
      toast.success('This settings session is now verified with two-factor auth.');
      await refreshMfaState();
    } catch (error) {
      console.error('Failed to step up MFA session:', error);
      setMfaError('Unable to verify this session right now.');
    } finally {
      setIsVerifyingMfaSession(false);
    }
  }, [mfaStepUpCode, refreshMfaState, verifiedTotpFactors]);

  const handleDisableMfa = useCallback(async () => {
    const primaryFactor = verifiedTotpFactors[0];
    if (!primaryFactor) return;

    if (!window.confirm('Turn off two-factor authentication for this account?')) {
      return;
    }

    setIsDisablingMfa(true);
    setMfaError('');

    try {
      const { error } = await authService.unenrollMfaFactor(primaryFactor.id);

      if (error) {
        setMfaError(
          mfaCurrentLevel !== 'aal2'
            ? 'Verify this settings session with your authenticator code before turning off two-factor auth.'
            : error.message
        );
        return;
      }

      toast.success('Two-factor authentication has been turned off.');
      await refreshMfaState();
    } catch (error) {
      console.error('Failed to disable MFA:', error);
      setMfaError('Unable to turn off two-factor authentication right now.');
    } finally {
      setIsDisablingMfa(false);
    }
  }, [mfaCurrentLevel, refreshMfaState, verifiedTotpFactors]);

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
    ? `Assessment completed in ${PATH_LABELS.alignment}.`
    : (canRetakeAssessment() ? 'Eligible for reassessment now.' : 'Retake is currently locked.');
  const primaryStyleMeta = currentUser.primaryStyle
    ? ASSESSMENT_STYLE_META[currentUser.primaryStyle]
    : null;
  const secondaryStyleMeta = currentUser.secondaryStyle
    ? ASSESSMENT_STYLE_META[currentUser.secondaryStyle]
    : null;
  const hasPrioritySupport =
    currentUser.membershipTier === 'quarterly' || currentUser.membershipTier === 'annual';
  const supportSubjectMaxLength = 100;
  const supportDetailsMinLength = 30;
  const supportDetailsMaxLength = 1200;
  const relationshipModeLabel =
    relationshipModeSnapshot.mode === 'break'
      ? 'Break'
      : relationshipModeSnapshot.mode === 'exclusive'
        ? 'Exclusive'
        : 'Active';
  const modeStatusMessage =
    relationshipModeSnapshot.mode === 'break'
      ? "You're now in Break Mode. You can exit anytime from Settings."
      : relationshipModeSnapshot.mode === 'exclusive'
        ? 'Exclusive Mode is active. Search is paused and messaging is restricted to your exclusive partner.'
        : relationshipModeSnapshot.remainingCooldownMs > 0
          ? `Re-entry cooldown is active for ${formatModeDuration(relationshipModeSnapshot.remainingCooldownMs)}.`
          : 'Active mode is available for normal browsing and matching.';
  const isMfaEnabled = verifiedTotpFactors.length > 0;
  const needsMfaStepUp = isMfaEnabled && mfaCurrentLevel !== 'aal2' && mfaNextLevel === 'aal2';
  const mfaStatusCopy = isLoadingMfa
    ? 'Checking your authenticator status...'
    : !hasSupabaseSession
      ? 'Sign in with a live account to manage two-factor auth.'
      : pendingTotpEnrollment
        ? 'Scan the QR code and confirm the 6-digit code to finish setup.'
        : isMfaEnabled
          ? mfaCurrentLevel === 'aal2'
            ? 'Your account is protected with an authenticator app.'
            : 'Two-factor auth is enabled. Verify this settings session with your authenticator code to manage it.'
          : 'Add an authenticator app for an extra security step at sign-in.';
  const finalBillingDateLabel = currentUser.billingPeriodEnd
    ? formatDate(new Date(currentUser.billingPeriodEnd))
    : 'No billing date on file';

  const formatDateTime = (timestamp?: number | null) => {
    if (!timestamp || !Number.isFinite(timestamp)) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const syncCurrentUserModeToSession = useCallback(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return;

      const parsed = JSON.parse(stored);
      if (!parsed || parsed.id !== currentUser.id) return;

      const nextMode = getUserRelationshipMode(currentUser.id);
      const updatedUser = { ...parsed, mode: nextMode };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('user-login', { detail: updatedUser }));
    } catch (error) {
      console.warn('Failed to sync relationship mode to session user:', error);
    } finally {
      setModeRefreshTick((previous) => previous + 1);
    }
  }, [currentUser.id]);

  const handleEnterBreak = () => {
    const result = enterBreakMode(currentUser.id);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    setShowBreakModeConfirm(false);
    syncCurrentUserModeToSession();
    toast.success("You're now in Break Mode. You can exit anytime from Settings.");
  };

  const handleExitBreak = () => {
    const result = exitBreakMode(currentUser.id);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    toast.success('You are back in Active mode. A 24-hour cooldown is now active before new connections.');
  };

  const handleRequestExclusive = () => {
    if (!exclusiveTargetId) {
      toast.info('Select a member first.');
      return;
    }

    const result = requestExclusiveMode(currentUser.id, exclusiveTargetId);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    if (result.kind === 'exclusive-entered') {
      toast.success('Exclusive Mode is now active for both members.');
      return;
    }
    toast.success('Exclusive request sent.');
  };

  const handleCancelExclusive = () => {
    const result = cancelExclusiveRequest(currentUser.id);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    toast.success('Exclusive request cancelled.');
  };

  const handleAcceptExclusive = () => {
    const requesterId = relationshipModeSnapshot.incomingExclusiveRequestFrom;
    if (!requesterId) {
      toast.info('No incoming request to accept.');
      return;
    }

    const result = requestExclusiveMode(currentUser.id, requesterId);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    if (result.kind === 'exclusive-entered') {
      toast.success('Exclusive Mode is now active for both members.');
      return;
    }
    toast.success('Exclusive request accepted.');
  };

  const handleDeclineExclusive = () => {
    const requesterId = relationshipModeSnapshot.incomingExclusiveRequestFrom;
    if (!requesterId) {
      toast.info('No incoming request to decline.');
      return;
    }

    const result = declineExclusiveRequest(currentUser.id, requesterId);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    toast.success('Exclusive request declined.');
  };

  const handleExitExclusive = () => {
    const result = exitExclusiveMode(currentUser.id);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    toast.success('Exclusive Mode ended. Re-entry cooldown is now active.');
  };

  const loadRecentSupportTickets = useCallback(async () => {
    try {
      const supabaseTickets = await supportService.getSupportMessagesByUser(currentUser.id);
      if (supabaseTickets.length > 0) {
        setRecentSupportTickets(supabaseTickets.slice(0, 5));
        return;
      }
    } catch (error) {
      console.warn('Failed to load support tickets from Supabase, falling back to local storage:', error);
    }

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
          (entry: unknown): entry is SupportMessage =>
            Boolean(
              entry &&
              typeof entry === 'object' &&
              'userId' in entry &&
              'id' in entry &&
              'subject' in entry &&
              'message' in entry &&
              'status' in entry &&
              (entry as SupportMessage).userId === currentUser.id &&
              typeof (entry as SupportMessage).id === 'string' &&
              typeof (entry as SupportMessage).subject === 'string' &&
              typeof (entry as SupportMessage).message === 'string' &&
              typeof (entry as SupportMessage).status === 'string'
            )
        )
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
        .slice(0, 5);

      setRecentSupportTickets(tickets);
    } catch (error) {
      console.warn('Failed to load recent support tickets:', error);
      setRecentSupportTickets([]);
    }
  }, [currentUser.id]);

  useEffect(() => {
    void loadRecentSupportTickets();
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

  useEffect(() => {
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key && event.key !== SUPPORT_MESSAGES_STORAGE_KEY) return;
      void loadRecentSupportTickets();
    };

    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [loadRecentSupportTickets]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void loadRecentSupportTickets();
    };
    const refreshOnVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadRecentSupportTickets();
      }
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibilityChange);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibilityChange);
    };
  }, [loadRecentSupportTickets]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadRecentSupportTickets();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadRecentSupportTickets]);

  useEffect(() => {
    if (!supportReferenceId) return;
    const timeout = window.setTimeout(() => setSupportReferenceId(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [supportReferenceId]);

  const handleRetakeAssessment = () => {
    if (!failedAssessment) {
      toast.info(`Retake is only available for members in ${PATH_LABELS.intentional}.`);
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

  const resetDeactivationFlow = () => {
    setShowDeactivateFlow(false);
    setDeactivationStep('reason');
    setDeactivationReason(null);
    setFoundLoveYourName('');
    setFoundLovePartnerName('');
    setFoundLoveEmail('');
    setFoundLoveStory('');
    setFoundLovePhotoName('');
    setFoundLoveSharePermission(false);
    setFoundLoveGiveawayOptIn(false);
    setFoundLoveSubmitted(false);
    setIsSubmittingFoundLove(false);
    setIsSubmittingIssueReport(false);
    setIssueReportSubmitted(false);
    setIsDeactivatingAccount(false);
  };

  const openDeactivationFlow = () => {
    resetDeactivationFlow();
    setShowDeactivateFlow(true);
  };

  const closeDeactivationFlow = () => {
    if (isSubmittingIssueReport || isDeactivatingAccount) return;
    resetDeactivationFlow();
  };

  const handleContinueFromDeactivationReason = () => {
    if (!deactivationReason) {
      toast.error('Please choose one reason before continuing.');
      return;
    }

    if (deactivationReason === 'need-break') {
      setDeactivationStep('break-suggestion');
      return;
    }

    if (deactivationReason === 'found-someone') {
      setDeactivationStep('found-love');
      return;
    }

    if (deactivationReason === 'platform-issue') {
      setDeactivationStep('issue-on-platform');
      return;
    }

    setDeactivationStep('billing-notice');
  };

  const handleGoToBreakRoomFromDeactivation = () => {
    const result = enterBreakMode(currentUser.id);
    if (!result.ok) {
      toast.info(result.reason);
      return;
    }

    syncCurrentUserModeToSession();
    closeDeactivationFlow();
    setCurrentView('clarity-room');
    toast.success("You're now in Break Mode. Welcome to the Break Room.");
  };

  const handleSubmitIssueReportFromDeactivation = async () => {
    if (isSubmittingIssueReport || issueReportSubmitted) return;

    setIsSubmittingIssueReport(true);
    try {
      const supportId = await submitSupportRequest(
        'technical',
        '[Deactivation] Issue experienced on platform',
        `User selected "I experienced an issue on the platform" during account deactivation.\nReason captured at: ${new Date().toISOString()}\nUser ID: ${currentUser.id}`
      );
      setIssueReportSubmitted(true);
      setSupportReferenceId(supportId);
      void loadRecentSupportTickets();
      toast.success('Issue report submitted. Thank you for reporting this.');
      setDeactivationStep('billing-notice');
    } catch (error) {
      console.error('Failed to submit deactivation issue report:', error);
      toast.error('Unable to submit report right now. You can continue with deactivation.');
    } finally {
      setIsSubmittingIssueReport(false);
    }
  };

  const handleGoBackFromBillingNotice = () => {
    if (deactivationReason === 'need-break') {
      setDeactivationStep('break-suggestion');
      return;
    }

    if (deactivationReason === 'found-someone') {
      setDeactivationStep(foundLoveSubmitted ? 'found-love-confirmation' : 'found-love');
      return;
    }

    if (deactivationReason === 'platform-issue') {
      setDeactivationStep('issue-on-platform');
      return;
    }

    setDeactivationStep('reason');
  };

  const handleSubmitFoundLoveSubmission = async () => {
    if (deactivationReason !== 'found-someone' || isSubmittingFoundLove) return;

    const trimmedEmail = foundLoveEmail.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (foundLoveGiveawayOptIn && trimmedEmail.length === 0) {
      toast.error('Email is required if you choose giveaway entry.');
      return;
    }

    if (trimmedEmail.length > 0 && !emailPattern.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmittingFoundLove(true);
    const details = [
      'Date Night On Us submission from deactivation flow.',
      `Your name: ${foundLoveYourName.trim() || 'Not provided'}`,
      `Partner name: ${foundLovePartnerName.trim() || 'Not provided'}`,
      `Email: ${trimmedEmail || 'Not provided'}`,
      `How they met: ${foundLoveStory.trim() || 'Not provided'}`,
      `Photo attached in browser: ${foundLovePhotoName || 'No'}`,
      `Permission to share story with first names only: ${foundLoveSharePermission ? 'Yes' : 'No'}`,
      `Giveaway opt-in: ${foundLoveGiveawayOptIn ? 'Yes' : 'No'}`,
      `Submitted at: ${new Date().toISOString()}`,
      `User ID: ${currentUser.id}`,
    ].join('\n');

    try {
      await submitSupportRequest('other', '[Date Night On Us] Story submission', details);
      void loadRecentSupportTickets();
      setFoundLoveSubmitted(true);
      setDeactivationStep('found-love-confirmation');
      toast.success('Thank you for sharing your story.');
    } catch (error) {
      console.error('Failed to submit Date Night On Us submission:', error);
      toast.error('Unable to submit right now. Please try again.');
    } finally {
      setIsSubmittingFoundLove(false);
    }
  };

  const handleFinalizeDeactivation = async () => {
    if (!settings || !deactivationReason || isDeactivatingAccount) return;

    setIsDeactivatingAccount(true);
    try {
      try {
        await submitSupportRequest(
          'account',
          '[Deactivation] Member feedback',
          `Reason: ${DEACTIVATION_REASON_LABELS[deactivationReason]}\nSubmitted at: ${new Date().toISOString()}\nUser ID: ${currentUser.id}`
        );
      } catch (error) {
        console.warn('Failed to log deactivation reason:', error);
      }

      const nextSettings: UserSettings = {
        ...settings,
        visibility: { ...settings.visibility, profileVisibility: 'paused' },
      };
      persistSettings(nextSettings);
      await userService.updateUser(currentUser.id, { membershipStatus: 'inactive' });
      setDeactivationStep('exit-message');
      toast.success('Account deactivated.');
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      toast.error(`We couldn't deactivate your account right now. Contact ${SUPPORT_EMAIL}.`);
    } finally {
      setIsDeactivatingAccount(false);
    }
  };

  const handleFinishDeactivationExit = async () => {
    await signOutAndClearLocalUser();
    resetDeactivationFlow();
    setCurrentView('landing');
  };

  const handlePasswordChange = async () => {
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

    if (!currentUser.email) {
      toast.error('This account does not have an email address available for password change.');
      return;
    }

    const { error: signInError } = await authService.signInWithPassword(currentUser.email, currentPassword);
    if (signInError) {
      toast.error('Current password is incorrect.');
      return;
    }

    const { error: updateError } = await authService.updatePassword(newPassword);
    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated.');
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
      setSupportIssueType('password-issue');
      setSupportSubject('');
      setSupportDetails('');
      void loadRecentSupportTickets();
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      toast.error('Unable to submit your ticket right now. Please try again.');
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const getUserTicketStatus = (ticket: SupportMessage): { label: string; className: string } => {
    if (ticket.adminResponse && ticket.adminResponse.trim().length > 0) {
      return {
        label: 'response ready',
        className: 'border-[#D9FF3D]/40 bg-[#D9FF3D]/10 text-[#D9FF3D]',
      };
    }

    switch (ticket.status) {
      case 'resolved':
        return {
          label: 'resolved',
          className: 'border-green-500/30 bg-green-500/10 text-green-300',
        };
      case 'in-progress':
        return {
          label: 'in review',
          className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
        };
      case 'unread':
      default:
        return {
          label: 'received',
          className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
        };
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

  const signOut = async () => {
    await signOutAndClearLocalUser();
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
              <p className="text-[#A9B5AA]">
                {isLoadingMfa ? 'Checking status...' : isMfaEnabled ? 'Enabled' : 'Not enabled'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#F6FFF2]">Authenticator app</p>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      isMfaEnabled
                        ? 'border-[#D9FF3D]/40 bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA]'
                    }`}
                  >
                    {isLoadingMfa ? 'Loading' : isMfaEnabled ? 'Enabled' : 'Available'}
                  </span>
                  {mfaCurrentLevel === 'aal2' && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300">
                      Session verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#A9B5AA]">{mfaStatusCopy}</p>
                {verifiedTotpFactors[0] && (
                  <p className="text-xs text-[#A9B5AA]">
                    Active factor: <span className="text-[#F6FFF2]">{verifiedTotpFactors[0].friendlyName || 'Rooted Hearts Authenticator'}</span>
                  </p>
                )}
              </div>

              {!isLoadingMfa && hasSupabaseSession && !pendingTotpEnrollment && (
                isMfaEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisableMfa}
                    disabled={isDisablingMfa || needsMfaStepUp}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                      isDisablingMfa || needsMfaStepUp
                        ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                        : 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                    }`}
                  >
                    {isDisablingMfa ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Turn Off 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleStartMfaEnrollment()}
                    disabled={isStartingMfaEnrollment}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                      isStartingMfaEnrollment
                        ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                        : 'border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10'
                    }`}
                  >
                    {isStartingMfaEnrollment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Set Up 2FA
                  </button>
                )
              )}
            </div>

            {mfaError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {mfaError}
              </div>
            )}

            {needsMfaStepUp && !pendingTotpEnrollment && (
              <div className="rounded-xl border border-[#D9FF3D]/20 bg-[#111611] p-4 space-y-3">
                <p className="text-sm font-medium text-[#F6FFF2]">Verify this settings session</p>
                <p className="text-xs text-[#A9B5AA]">
                  Enter the current 6-digit code from your authenticator app to manage your two-factor settings in this session.
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={mfaStepUpCode}
                    onChange={(event) => setMfaStepUpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-sm text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] md:max-w-[220px]"
                    placeholder="123456"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyMfaSession()}
                    disabled={isVerifyingMfaSession}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                      isVerifyingMfaSession
                        ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                        : 'border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10'
                    }`}
                  >
                    {isVerifyingMfaSession ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Verify Session
                  </button>
                </div>
              </div>
            )}

            {pendingTotpEnrollment && (
              <div className="rounded-xl border border-[#D9FF3D]/20 bg-[#111611] p-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#F6FFF2]">Finish authenticator setup</p>
                  <p className="text-xs text-[#A9B5AA]">
                    Scan this QR code with your authenticator app, or paste the setup key manually if you prefer.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                  <div className="rounded-xl border border-[#1A211A] bg-white p-3">
                    <img
                      src={pendingTotpEnrollment.qrCode}
                      alt="Rooted Hearts two-factor QR code"
                      className="mx-auto h-auto w-full max-w-[180px]"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#A9B5AA]">Authenticator Label</p>
                      <p className="mt-1 text-sm text-[#F6FFF2]">{pendingTotpEnrollment.friendlyName}</p>
                    </div>
                    <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#A9B5AA]">Manual Setup Key</p>
                      <p className="mt-1 break-all font-mono text-sm text-[#F6FFF2]">{pendingTotpEnrollment.secret}</p>
                    </div>
                    <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#A9B5AA]">Setup URI</p>
                      <p className="mt-1 break-all text-xs text-[#A9B5AA]">{pendingTotpEnrollment.uri}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={pendingTotpEnrollment.verifyCode}
                    onChange={(event) =>
                      setPendingTotpEnrollment((previous) =>
                        previous
                          ? {
                              ...previous,
                              verifyCode: event.target.value.replace(/\D/g, '').slice(0, 6),
                            }
                          : previous
                      )
                    }
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-sm text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D] md:max-w-[220px]"
                    placeholder="Enter 6-digit code"
                  />
                  <button
                    type="button"
                    onClick={() => void handleVerifyPendingMfaEnrollment()}
                    disabled={isVerifyingMfaEnrollment}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                      isVerifyingMfaEnrollment
                        ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                        : 'border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10'
                    }`}
                  >
                    {isVerifyingMfaEnrollment ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Confirm Code
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCancelPendingMfaEnrollment()}
                    className="inline-flex items-center justify-center rounded-lg border border-[#1A211A] px-4 py-2 text-sm text-[#A9B5AA] hover:text-[#F6FFF2]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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

          <div className="grid md:grid-cols-2 gap-3 p-4 bg-[#0B0F0C] border border-[#1A211A] rounded-xl">
            <div>
              <p className="text-xs text-[#A9B5AA] mb-1">Primary Style</p>
              {primaryStyleMeta ? (
                <>
                  <p className="text-sm text-[#F6FFF2]">
                    {primaryStyleMeta.emoji} {primaryStyleMeta.label}
                  </p>
                  <p className="text-xs text-[#A9B5AA]">{primaryStyleMeta.subtitle}</p>
                </>
              ) : (
                <p className="text-xs text-[#A9B5AA]">Complete assessment to unlock your style.</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#A9B5AA] mb-1">Secondary Style</p>
              {secondaryStyleMeta ? (
                <>
                  <p className="text-sm text-[#F6FFF2]">
                    {secondaryStyleMeta.emoji} {secondaryStyleMeta.label}
                  </p>
                  <p className="text-xs text-[#A9B5AA]">{secondaryStyleMeta.subtitle}</p>
                </>
              ) : (
                <p className="text-xs text-[#A9B5AA]">Complete assessment to unlock your style.</p>
              )}
            </div>
          </div>

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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={handlePasswordChange}
              className="btn-primary w-full h-14 flex items-center justify-center"
            >
              Change Password
            </button>
            <button
              onClick={handleDownloadData}
              className="btn-outline w-full h-14 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download My Data
            </button>
            <button
              onClick={openDeactivationFlow}
              className="btn-outline w-full h-14 flex items-center justify-center gap-2"
            >
              <UserX className="w-4 h-4" />
              Deactivate My Account
            </button>
          </div>
          <p className="text-xs text-[#A9B5AA]">
            If you&apos;re leaving, we&apos;d appreciate knowing why so we can improve the platform.
          </p>
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

        <section
          ref={exclusiveModeSectionRef}
          className={`rounded-2xl border p-6 space-y-5 transition-all duration-300 ${
            highlightExclusiveModeSection
              ? 'bg-[#162015] border-[#D9FF3D] shadow-[0_0_0_1px_rgba(217,255,61,0.28),0_0_32px_rgba(217,255,61,0.14)]'
              : 'bg-[#111611] border-[#1A211A]'
          }`}
        >
          <h2 className="font-display text-xl">Break & Relationship Mode</h2>
          <p className="text-sm text-[#A9B5AA]">
            Use Break Mode for a solo pause or Exclusive Mode for a mutual relationship agreement.
          </p>

          <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-2">
            <p className="text-sm text-[#A9B5AA]">Current mode</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm px-2.5 py-1 rounded-full border border-[#D9FF3D]/40 bg-[#D9FF3D]/10 text-[#D9FF3D]">
                {relationshipModeLabel}
              </span>
              {relationshipModeSnapshot.mode === 'active' && relationshipModeSnapshot.cooldownEndsAt && (
                <span className="text-xs text-[#A9B5AA]">
                  Cooldown ends {formatDateTime(relationshipModeSnapshot.cooldownEndsAt)}
                </span>
              )}
            </div>
            <p className="text-xs text-[#A9B5AA]">{modeStatusMessage}</p>
            {relationshipModeSnapshot.mode !== 'active' && (
              <p className="text-xs text-emerald-300">
                Inner and Advanced growth resources are unlocked while this mode is active.
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-3">
              <p className="text-sm text-[#F6FFF2] font-medium">Break Mode</p>
              <p className="text-xs text-[#A9B5AA]">
                Removes you from search and pauses new matches. When you leave Break Mode, a 24-hour cooldown applies before new connections.
              </p>
              {relationshipModeSnapshot.mode === 'break' ? (
                <button
                  onClick={handleExitBreak}
                  className="w-full px-3 py-2 rounded-lg border text-sm border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20"
                >
                  Return to Active Mode
                </button>
              ) : (
                <button
                  onClick={() => setShowBreakModeConfirm(true)}
                  disabled={relationshipModeSnapshot.mode === 'exclusive'}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${
                    relationshipModeSnapshot.mode === 'exclusive'
                      ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                      : 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20'
                  }`}
                >
                  Enter Break Mode
                </button>
              )}
            </div>

            <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-3">
              <p className="text-sm text-[#F6FFF2] font-medium">Exclusive Mode</p>
              <p className="text-xs text-[#A9B5AA]">
                Requires mutual selection. Search is paused and messaging is restricted to the exclusive partner.
              </p>

              {relationshipModeSnapshot.mode === 'exclusive' ? (
                <>
                  <p className="text-xs text-[#A9B5AA]">
                    Partner: <span className="text-[#F6FFF2]">{exclusivePartnerUser?.name || 'Unknown member'}</span>
                  </p>
                  <button
                    onClick={handleExitExclusive}
                    className="w-full px-3 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 text-sm"
                  >
                    Exit Exclusive Mode
                  </button>
                </>
              ) : (
                <>
                  {relationshipModeSnapshot.incomingExclusiveRequestFrom && (
                    <div className="rounded-lg border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-3 space-y-2">
                      <p className="text-xs text-[#F6FFF2]">
                        Incoming request from {incomingExclusiveRequesterUser?.name || relationshipModeSnapshot.incomingExclusiveRequestFrom}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAcceptExclusive}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#D9FF3D] text-[#D9FF3D] text-sm hover:bg-[#D9FF3D]/10"
                        >
                          Accept
                        </button>
                        <button
                          onClick={handleDeclineExclusive}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] text-sm hover:text-[#F6FFF2]"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {relationshipModeSnapshot.outgoingExclusiveRequestTo ? (
                    <div className="rounded-lg border border-[#1A211A] p-3 space-y-2">
                      <p className="text-xs text-[#A9B5AA]">
                        Waiting on {outgoingExclusiveTargetUser?.name || relationshipModeSnapshot.outgoingExclusiveRequestTo}
                      </p>
                      <button
                        onClick={handleCancelExclusive}
                        className="w-full px-3 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] text-sm hover:text-[#F6FFF2]"
                      >
                        Cancel Request
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={exclusiveTargetId}
                        onChange={(e) => setExclusiveTargetId(e.target.value)}
                        disabled={exclusiveCandidates.length === 0}
                        className="w-full px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-sm text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                      >
                        {exclusiveCandidates.length === 0 ? (
                          <option value="">No connected members yet</option>
                        ) : (
                          exclusiveCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        onClick={handleRequestExclusive}
                        disabled={
                          exclusiveCandidates.length === 0 ||
                          !exclusiveTargetId ||
                          relationshipModeSnapshot.mode !== 'active' ||
                          relationshipModeSnapshot.remainingCooldownMs > 0
                        }
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${
                          exclusiveCandidates.length === 0 ||
                          !exclusiveTargetId ||
                          relationshipModeSnapshot.mode !== 'active' ||
                          relationshipModeSnapshot.remainingCooldownMs > 0
                            ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                            : 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20'
                        }`}
                      >
                        Send Exclusive Request
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => setCurrentView(currentUser.assessmentPassed ? 'paid-growth-mode' : 'growth-mode')}
            className="btn-outline"
          >
            {currentUser.assessmentPassed ? `Open ${PATH_LABELS.alignment} Resources` : `Open ${PATH_LABELS.intentional} Resources`}
          </button>
        </section>

        <section ref={supportSectionRef} className="bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5">
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
          <h2 className="font-display text-xl">{PATH_LABELS.intentional} Preferences</h2>
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
                    onClick={() => {
                      setSupportReferenceId(null);
                      setSupportIssueType(option.value);
                    }}
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
                onChange={(e) => {
                  setSupportReferenceId(null);
                  setSupportSubject(e.target.value.slice(0, supportSubjectMaxLength));
                }}
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
                onChange={(e) => {
                  setSupportReferenceId(null);
                  setSupportDetails(e.target.value.slice(0, supportDetailsMaxLength));
                }}
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
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${getUserTicketStatus(ticket).className}`}>
                        {getUserTicketStatus(ticket).label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A9B5AA]">
                      <span className="font-mono">{ticket.id}</span>
                      <span>{new Date(ticket.createdAt).toLocaleString('en-US')}</span>
                    </div>
                    {ticket.adminResponse && (
                      <div className="mt-2 border-t border-[#1A211A] pt-2">
                        <p className="text-[11px] text-[#A9B5AA] mb-1">Support response</p>
                        <p className="text-sm text-[#F6FFF2] whitespace-pre-wrap">{ticket.adminResponse}</p>
                      </div>
                    )}
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
              Intentional Path reminders
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

      {showDeactivateFlow && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {deactivationStep === 'reason' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Deactivate My Account</h3>
                <p className="text-sm text-[#A9B5AA]">
                  If you&apos;re leaving, we&apos;d appreciate knowing why so we can improve the platform.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-[#F6FFF2]">Why are you leaving?</p>
                  <div className="space-y-2">
                    {DEACTIVATION_REASON_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-3 rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="deactivation-reason"
                          value={option.value}
                          checked={deactivationReason === option.value}
                          onChange={() => setDeactivationReason(option.value)}
                          className="h-4 w-4 accent-[#D9FF3D]"
                        />
                        <span className="text-sm text-[#F6FFF2]">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={closeDeactivationFlow}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinueFromDeactivationReason}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deactivationStep === 'break-suggestion' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Take a Break Instead</h3>
                <p className="text-sm text-[#A9B5AA]">
                  Sometimes stepping away for a while is helpful.
                </p>
                <p className="text-sm text-[#A9B5AA]">
                  You can pause your profile and spend time in the Break Room, where you can reflect and reset
                  without leaving the platform.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleGoToBreakRoomFromDeactivation}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors"
                  >
                    Go to Break Room
                  </button>
                  <button
                    onClick={() => setDeactivationStep('billing-notice')}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Continue with Deactivation
                  </button>
                </div>
              </>
            )}

            {deactivationStep === 'found-love' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Date Night On Us ❤️</h3>
                <p className="text-sm text-[#F6FFF2]">Celebrate Your Connection</p>
                <p className="text-sm text-[#A9B5AA]">
                  If you met someone special through Rooted Hearts, we'd love to hear your story.
                </p>
                <p className="text-sm text-[#A9B5AA]">
                  From time to time, we randomly select couples to receive a Date Night On Us as a small celebration of
                  meaningful connections.
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-[#F6FFF2]">Tell Us About Your Connection (Optional)</p>

                  <div className="space-y-1">
                    <label className="text-sm text-[#A9B5AA]">Your Name</label>
                    <input
                      type="text"
                      value={foundLoveYourName}
                      onChange={(e) => setFoundLoveYourName(e.target.value)}
                      className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-[#A9B5AA]">Your Partner's Name</label>
                    <input
                      type="text"
                      value={foundLovePartnerName}
                      onChange={(e) => setFoundLovePartnerName(e.target.value)}
                      className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-[#A9B5AA]">Email Address (Required if selected)</label>
                    <input
                      type="email"
                      value={foundLoveEmail}
                      onChange={(e) => setFoundLoveEmail(e.target.value)}
                      className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-[#A9B5AA]">
                      We will only use this email to contact you if your story is selected.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-[#A9B5AA]">How Did You Meet?</label>
                    <textarea
                      value={foundLoveStory}
                      onChange={(e) => setFoundLoveStory(e.target.value)}
                      placeholder="Tell us how you connected on Rooted Hearts and what made the moment special."
                      rows={4}
                      className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-[#A9B5AA] block">Optional Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => setFoundLovePhotoName(event.target.files?.[0]?.name || '')}
                      className="w-full text-sm text-[#A9B5AA] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-[#1A211A] file:bg-[#0B0F0C] file:text-[#F6FFF2]"
                    />
                    <p className="text-xs text-[#A9B5AA]">Photos may be shared if your story is featured.</p>
                    {foundLovePhotoName && (
                      <p className="text-xs text-[#A9B5AA]">Selected photo: {foundLovePhotoName}</p>
                    )}
                  </div>

                  <p className="text-sm text-[#F6FFF2]">Permissions</p>
                  <label className="flex items-start gap-3 rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={foundLoveSharePermission}
                      onChange={(e) => setFoundLoveSharePermission(e.target.checked)}
                      className="h-4 w-4 mt-0.5 accent-[#D9FF3D]"
                    />
                    <span className="text-sm text-[#F6FFF2]">
                      I give Rooted Hearts permission to share our story (first names only).
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2">
                    <input
                      type="checkbox"
                      checked={foundLoveGiveawayOptIn}
                      onChange={(e) => setFoundLoveGiveawayOptIn(e.target.checked)}
                      className="h-4 w-4 mt-0.5 accent-[#D9FF3D]"
                    />
                    <span className="text-sm text-[#F6FFF2]">Enter us for the Date Night On Us Giveaway</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => setDeactivationStep('reason')}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmitFoundLoveSubmission}
                    disabled={isSubmittingFoundLove}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmittingFoundLove ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : 'Submit Our Story'}
                  </button>
                </div>
              </>
            )}

            {deactivationStep === 'found-love-confirmation' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Thank You ❤️</h3>
                <p className="text-sm text-[#A9B5AA]">
                  We're honored to have been part of your journey.
                </p>
                <p className="text-sm text-[#A9B5AA]">
                  If your submission is randomly selected, we will reach out using the email you provided.
                </p>
                <p className="text-sm text-[#A9B5AA]">
                  You can also keep an eye on our social media pages - your story may be featured to inspire others on
                  their journey to meaningful connection.
                </p>
                <button
                  onClick={() => setDeactivationStep('billing-notice')}
                  className="w-full px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors"
                >
                  Continue to Account Deactivation
                </button>
                <p className="text-xs text-[#A9B5AA]">
                  Entries are selected at random. Submission does not guarantee selection.
                </p>
              </>
            )}

            {deactivationStep === 'issue-on-platform' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">We&apos;re sorry you experienced an issue.</h3>
                <p className="text-sm text-[#A9B5AA]">
                  You can submit a report now, or continue with account deactivation.
                </p>
                {issueReportSubmitted && (
                  <p className="text-sm text-[#D9FF3D]">
                    Report submitted. Thank you for helping us improve the platform.
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleSubmitIssueReportFromDeactivation}
                    disabled={isSubmittingIssueReport || issueReportSubmitted}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmittingIssueReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting Report...
                      </>
                    ) : issueReportSubmitted ? 'Report Submitted' : 'Submit Report'}
                  </button>
                  <button
                    onClick={() => setDeactivationStep('billing-notice')}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Continue to Deactivation
                  </button>
                </div>
                <button
                  onClick={() => {
                    closeDeactivationFlow();
                    setSupportIssueType('technical-issue');
                    supportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-xs text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
                >
                  Open support form instead
                </button>
              </>
            )}

            {deactivationStep === 'billing-notice' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Important Billing Information</h3>
                <p className="text-sm text-[#A9B5AA]">
                  Your subscription will remain active until <span className="text-[#F6FFF2]">{finalBillingDateLabel}</span>.
                </p>
                <p className="text-sm text-[#A9B5AA]">After that date, you will not be charged again.</p>
                <p className="text-sm text-[#F6FFF2]">Your final billing date: {finalBillingDateLabel}</p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleGoBackFromBillingNotice}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setDeactivationStep('final-confirmation')}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deactivationStep === 'final-confirmation' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Are you sure you want to deactivate?</h3>
                <p className="text-sm text-[#A9B5AA]">
                  Your profile will be hidden and your account will no longer appear in the dating pool.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={closeDeactivationFlow}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFinalizeDeactivation}
                    disabled={isDeactivatingAccount}
                    className="flex-1 px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeactivatingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deactivating...
                      </>
                    ) : 'Deactivate My Account'}
                  </button>
                </div>
              </>
            )}

            {deactivationStep === 'exit-message' && (
              <>
                <h3 className="font-display text-2xl text-[#F6FFF2]">Thank you for being part of Rooted Hearts.</h3>
                <p className="text-sm text-[#A9B5AA]">
                  We wish you meaningful connections and happiness wherever your journey leads.
                </p>
                <button
                  onClick={handleFinishDeactivationExit}
                  className="text-xs text-[#A9B5AA] hover:text-[#D9FF3D] underline underline-offset-4 transition-colors"
                >
                  Return anytime by signing back in.
                </button>
              </>
            )}
          </div>
        </div>
      )}

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

      {showBreakModeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#111611] border border-[#1A211A] rounded-2xl p-6 space-y-4">
            <p className="text-sm text-[#D9FF3D]">🌿 Enter Break Mode</p>
            <h3 className="font-display text-2xl text-[#F6FFF2]">Take a Break from the Dating Pool?</h3>
            <p className="text-sm text-[#A9B5AA]">You’re about to step into Break Mode.</p>
            <p className="text-sm text-[#A9B5AA]">
              This space is designed for reflection without outside distractions.
            </p>

            <div className="space-y-2">
              <p className="text-sm text-[#F6FFF2]">While in Break Mode:</p>
              <p className="text-sm text-[#A9B5AA]">• Your profile will be removed from search</p>
              <p className="text-sm text-[#A9B5AA]">• You will not receive new matches</p>
              <p className="text-sm text-[#A9B5AA]">• You retain access to all growth resources</p>
            </div>

            <p className="text-sm text-[#A9B5AA]">This does not affect your membership.</p>

            <div className="space-y-2">
              <p className="text-sm text-[#F6FFF2]">Returning to the Dating Pool:</p>
              <p className="text-sm text-[#A9B5AA]">• You may reactivate your profile</p>
              <p className="text-sm text-[#A9B5AA]">• A 24-hour cooldown period applies before becoming visible again</p>
              <p className="text-sm text-[#A9B5AA]">• Your previous environment ({PATH_LABELS.intentional} or {PATH_LABELS.alignment}) will remain the same</p>
            </div>

            <p className="text-sm text-[#A9B5AA]">Break Mode is about intentional pacing — not starting over.</p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBreakModeConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#1A211A] text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnterBreak}
                className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors"
              >
                Enter Break Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettingsSection;


