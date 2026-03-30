import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { useAdmin } from '@/store/AdminContext';
import AuthPoolTabs from '@/components/AuthPoolTabs';
import {
  applyRelationshipModeToUser,
  communityIdToPoolId,
  getUserPoolId,
  persistUserPoolMembership,
  toAdvancedPool,
  toInnerPool,
  useCommunity,
} from '@/modules';
import { userService } from '@/services/userService';
import { assessmentService } from '@/services/assessmentService';
import { hasDatingProfile, normalizeUserProfile } from '@/lib/userProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { testUsers } from '@/data/testUsers';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import type { AssessmentResult } from '@/types';
import {
  authService,
  clearAuthRedirectUrlState,
  consumeEmailConfirmationNotice,
  isEmailConfirmationRedirect,
  signOutSupabaseSession,
} from '@/services/authService';
import { pendingSignupService } from '@/services/pendingSignupService';
import {
  buildEmptyStyleScores,
  isAssessmentCoreStyle,
  normalizeStyleScores,
} from '@/services/assessmentStyleService';
import type { AppView } from '@/types';

const GROWTH_MODE_TAB_STORAGE_KEY = 'rooted_growth_mode_active_tab';

const UserLoginSection: React.FC = () => {
  const { setCurrentView, setAssessmentResult } = useApp();
  const { login: adminLogin } = useAdmin();
  const { activeCommunity, activeCommunityId } = useCommunity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [loginUser, setLoginUser] = useState<any>(null);

  const stripInlinePhotoPayloads = (photoUrl?: string) => {
    if (!photoUrl) return photoUrl;
    const kept = photoUrl
      .split('|')
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && !url.startsWith('data:'))
      .join('|');
    return kept || undefined;
  };

  const persistCurrentUserSession = (user: any) => {
    const sessionUser = applyRelationshipModeToUser(user);
    try {
      localStorage.setItem('currentUser', JSON.stringify(sessionUser));
      return sessionUser;
    } catch (error) {
      console.warn('Primary currentUser save failed, retrying with trimmed payload:', error);
    }

    const lightweightUser = {
      ...sessionUser,
      photoUrl: stripInlinePhotoPayloads(sessionUser.photoUrl),
    };

    const cacheKeysToPurge = [
      'assessmentLog',
      'community-blogs',
      'growth-resources',
      'paid-growth-resources',
      'intentional-path-resources',
      'alignment-path-resources',
      'rooted-admin-data',
      'rooted-admin-users',
      'rooted-admin-reports',
      'rooted-admin-support-messages',
      // Cleanup legacy namespaced admin caches that may have already consumed quota.
      'intentional:rooted:rooted-admin-data',
      'intentional:rooted:rooted-admin-users',
      'intentional:rooted:rooted-admin-reports',
      'intentional:rooted:rooted-admin-support-messages',
      'intentional:lgbtq:rooted-admin-data',
      'intentional:lgbtq:rooted-admin-users',
      'intentional:lgbtq:rooted-admin-reports',
      'intentional:lgbtq:rooted-admin-support-messages',
      'intentional:lgbtq-advanced:rooted-admin-data',
      'intentional:lgbtq-advanced:rooted-admin-users',
      'intentional:lgbtq-advanced:rooted-admin-reports',
      'intentional:lgbtq-advanced:rooted-admin-support-messages',
      // Legacy alias cleanup.
      'intentional:lgbtq-test:rooted-admin-data',
      'intentional:lgbtq-test:rooted-admin-users',
      'intentional:lgbtq-test:rooted-admin-reports',
      'intentional:lgbtq-test:rooted-admin-support-messages',
    ];
    cacheKeysToPurge.forEach((key) => localStorage.removeItem(key));

    localStorage.setItem('currentUser', JSON.stringify(lightweightUser));
    return lightweightUser;
  };

  // Check if user is currently suspended
  const isSuspended = (user: any): boolean => {
    if (!user?.suspensionEndDate) return false;
    return new Date().getTime() < user.suspensionEndDate;
  };

  const getCanonicalTestUser = (userEmail: string, checkPassword?: string): any | null => {
    const tester = testUsers.find(
      (u) => u.email.toLowerCase() === userEmail.trim().toLowerCase()
    );
    if (!tester) return null;
    if (checkPassword !== undefined && tester.password !== checkPassword) return null;
    return { ...tester };
  };

  const normalizeAssessmentResult = (raw: any): AssessmentResult | null => {
    if (!raw || typeof raw !== 'object') return null;

    const percentage = typeof raw.percentage === 'number' ? raw.percentage : 0;
    return {
      totalScore: typeof raw.totalScore === 'number'
        ? raw.totalScore
        : Math.round((percentage / 100) * 120),
      percentage,
      passed: typeof raw.passed === 'boolean' ? raw.passed : percentage >= 85,
      categoryScores: raw.categoryScores && typeof raw.categoryScores === 'object' ? raw.categoryScores : {},
      integrityFlags: Array.isArray(raw.integrityFlags) ? raw.integrityFlags : [],
      growthAreas: Array.isArray(raw.growthAreas) ? raw.growthAreas : [],
      styleScores: normalizeStyleScores(raw.styleScores),
      primaryStyle: isAssessmentCoreStyle(raw.primaryStyle) ? raw.primaryStyle : undefined,
      secondaryStyle: isAssessmentCoreStyle(raw.secondaryStyle) ? raw.secondaryStyle : undefined,
    };
  };

  const getSavedAssessmentResult = (userId?: string): AssessmentResult | null => {
    const keys = userId ? [`assessmentResult_${userId}`, 'assessmentResult'] : ['assessmentResult'];

    for (const key of keys) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        const parsed = JSON.parse(saved);
        // Guard against cross-user leakage from the legacy global key.
        if (userId && key === 'assessmentResult' && parsed?.userId !== userId) {
          continue;
        }
        const normalized = normalizeAssessmentResult(parsed);
        if (normalized) return normalized;
      } catch (error) {
        console.error('Failed to parse saved assessment result:', error);
      }
    }

    return null;
  };

  const resolveUserForActivePool = (rawUser: any) => {
    const selectedPoolId = communityIdToPoolId(activeCommunityId);
    const accountPoolId = getUserPoolId(rawUser, selectedPoolId);
    const user = {
      ...rawUser,
      poolId: accountPoolId,
    };

    persistUserPoolMembership(user, accountPoolId);

    return user;
  };

  const syncUserPoolForOutcome = async (
    rawUser: any,
    passedAssessment: boolean,
    persistRemote: boolean
  ) => {
    const currentPoolId = getUserPoolId(rawUser, communityIdToPoolId(activeCommunityId));
    const nextPoolId = passedAssessment ? toAdvancedPool(currentPoolId) : toInnerPool(currentPoolId);

    if (nextPoolId === currentPoolId && rawUser.poolId === nextPoolId) {
      return rawUser;
    }

    const updatedUser = {
      ...rawUser,
      poolId: nextPoolId,
    };
    persistUserPoolMembership(updatedUser, nextPoolId);

    if (persistRemote && updatedUser.id) {
      await userService.updateUser(updatedUser.id, { poolId: nextPoolId });
    }

    return updatedUser;
  };

  const refreshSession = (user: any) => {
    const sessionUser = persistCurrentUserSession(user);
    window.dispatchEvent(new CustomEvent('user-login', { detail: sessionUser }));
    return sessionUser;
  };

  const getPostLoginHomeView = (passedAssessment: boolean): AppView =>
    passedAssessment ? 'paid-growth-mode' : 'growth-mode';

  const primeGardenLanding = () => {
    try {
      localStorage.setItem(GROWTH_MODE_TAB_STORAGE_KEY, 'resources');
    } catch (error) {
      console.warn('Failed to prime Garden landing tab:', error);
    }
  };

  useEffect(() => {
    const shouldShowConfirmationNotice =
      consumeEmailConfirmationNotice() || isEmailConfirmationRedirect();

    if (!shouldShowConfirmationNotice) return;

    clearAuthRedirectUrlState();
    void signOutSupabaseSession();
    setInfoMessage('Your email is confirmed. Sign in to finish setup.');
    toast.success('Your email is confirmed. Sign in to finish setup.');
  }, []);

  const restorePendingSignupProfile = async (
    normalizedEmail: string,
    authUserId: string
  ) => {
    const pendingSignup = pendingSignupService.getByEmail(normalizedEmail);
    if (!pendingSignup) return null;

    const pendingUser = {
      ...pendingSignup,
      id: authUserId,
      email: normalizedEmail,
    };

    const { error: createError, data } = await userService.createUser(pendingUser);
    if (createError) {
      console.warn('Failed to restore pending signup profile:', createError);
      const existingUser = await userService.getUserByEmail(normalizedEmail);
      if (existingUser) {
        pendingSignupService.clear(normalizedEmail);
        return existingUser;
      }
      return null;
    }

    pendingSignupService.clear(normalizedEmail);
    const restoredUser = data ?? pendingUser;
    window.dispatchEvent(new CustomEvent('new-user', { detail: restoredUser }));
    return restoredUser;
  };

  const routeAfterLogin = async (user: any) => {
    const canonicalTester = user?.email ? getCanonicalTestUser(user.email) : null;
    let effectiveUser = canonicalTester || normalizeUserProfile(user);
    const persistRemote = !canonicalTester;

    if (effectiveUser.isAdmin && !hasDatingProfile(effectiveUser)) {
      effectiveUser = await syncUserPoolForOutcome(effectiveUser, true, false);
      refreshSession(effectiveUser);
      primeGardenLanding();
      setCurrentView(getPostLoginHomeView(true));
      return;
    }

    if (isSuspended(effectiveUser)) {
      effectiveUser = await syncUserPoolForOutcome(effectiveUser, false, persistRemote);
      refreshSession(effectiveUser);
      toast.info('Your account is currently under suspension. Please review the growth resources.');
      primeGardenLanding();
      setCurrentView(getPostLoginHomeView(false));
      return;
    }

    if (effectiveUser.userStatus === 'needs-growth') {
      effectiveUser = await syncUserPoolForOutcome(effectiveUser, false, persistRemote);
      refreshSession(effectiveUser);
      primeGardenLanding();
      setCurrentView(getPostLoginHomeView(false));
      return;
    }

    if (effectiveUser.assessmentPassed === true) {
      effectiveUser = await syncUserPoolForOutcome(effectiveUser, true, persistRemote);
      refreshSession(effectiveUser);
      primeGardenLanding();
      setCurrentView(getPostLoginHomeView(true));
      return;
    }

    // Tester accounts must stay canonical and not inherit persisted results
    // from other test sessions/users.
    let savedResult = canonicalTester ? null : getSavedAssessmentResult(effectiveUser.id);
    if (!canonicalTester && !savedResult && effectiveUser.id) {
      savedResult = await assessmentService.getLatestAssessmentResult(effectiveUser.id);
      if (savedResult) {
        try {
          const persistentResult = {
            ...savedResult,
            timestamp: Date.now(),
            userId: effectiveUser.id,
          };
          localStorage.setItem(`assessmentResult_${effectiveUser.id}`, JSON.stringify(persistentResult));
          localStorage.setItem('assessmentResult', JSON.stringify(persistentResult));
        } catch (error) {
          console.warn('Failed to cache fetched assessment result:', error);
        }
      }
    }
    const hasScoredAssessment =
      typeof effectiveUser.alignmentScore === 'number' ||
      typeof effectiveUser.assessmentScore === 'number';

    const hasCompletedAssessment =
      Boolean(savedResult) ||
      effectiveUser.userStatus === 'needs-growth' ||
      (effectiveUser.assessmentPassed === false && hasScoredAssessment);

    if (hasCompletedAssessment) {
      const resolvedPassed =
        typeof effectiveUser.assessmentPassed === 'boolean'
          ? effectiveUser.assessmentPassed
          : Boolean(savedResult?.passed);

      if (savedResult) {
        setAssessmentResult(savedResult);
      } else {
        const fallbackPercentage = Number(effectiveUser.assessmentScore ?? effectiveUser.alignmentScore ?? 0);
        setAssessmentResult({
          totalScore: Math.round((fallbackPercentage / 100) * 120),
          percentage: fallbackPercentage,
          passed: resolvedPassed,
          categoryScores: {},
          integrityFlags: [],
          growthAreas: [],
          styleScores: buildEmptyStyleScores(),
          primaryStyle: isAssessmentCoreStyle(effectiveUser.primaryStyle)
            ? effectiveUser.primaryStyle
            : undefined,
          secondaryStyle: isAssessmentCoreStyle(effectiveUser.secondaryStyle)
            ? effectiveUser.secondaryStyle
            : undefined,
        });
      }
      effectiveUser = await syncUserPoolForOutcome(effectiveUser, resolvedPassed, persistRemote);
      refreshSession(effectiveUser);
      primeGardenLanding();
      setCurrentView(getPostLoginHomeView(resolvedPassed));
      return;
    }

    setCurrentView('assessment');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Tester accounts are canonical and should never drift.
      // If email matches a tester, never fall back to Supabase.
      const testerByEmail = getCanonicalTestUser(normalizedEmail);
      let user: any = null;

      if (testerByEmail) {
        user = getCanonicalTestUser(normalizedEmail, password);
        if (!user) {
          setError('Invalid email or password');
          toast.error('Invalid email or password');
          setIsLoading(false);
          return;
        }
      } else {
        const { data: signInData, error: signInError } = await authService.signInWithPassword(normalizedEmail, password);
        if (signInError) {
          setError('Invalid email or password');
          toast.error('Invalid email or password');
          setIsLoading(false);
          return;
        }

        // Non-tester accounts come from Supabase app data after auth succeeds.
        user = await userService.getUserByEmail(normalizedEmail);
        if (!user && signInData.user?.id) {
          const pendingSignupHadTrimmedPhotos =
            pendingSignupService.wasPhotoPayloadStripped(normalizedEmail);
          user = await restorePendingSignupProfile(normalizedEmail, signInData.user.id);
          if (user && pendingSignupHadTrimmedPhotos) {
            toast.info('Your profile was restored, but you may need to re-add photos if they were not saved in browser storage.');
          }
        }
        if (!user) {
          await signOutSupabaseSession();
          setError('This account is missing its profile record. Contact support.');
          toast.error('Account profile not found.');
          setIsLoading(false);
          return;
        }
      }

      if (!user) {
        setError('Invalid email or password');
        toast.error('Invalid email or password');
        setIsLoading(false);
        return;
      }

      if (user.isAdmin) {
        const adminAuthenticated = await adminLogin(normalizedEmail, password);
        if (!adminAuthenticated) {
          setError('This account does not have admin access.');
          toast.error('This account does not have admin access.');
          setIsLoading(false);
          return;
        }

        localStorage.removeItem('currentUser');
        window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
        toast.success(`Welcome back, ${user.name || 'Admin'}!`);
        setCurrentView('admin-dashboard');
        setIsLoading(false);
        return;
      }

      const pooledUser = resolveUserForActivePool(user);
      const sessionUser = persistCurrentUserSession(pooledUser);
      // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
      window.dispatchEvent(new CustomEvent('user-login', { detail: sessionUser }));
      toast.success(`Welcome back, ${sessionUser.name}!`);

      // Show background check modal only if user passed assessment AND hasn't verified yet
      if (sessionUser.assessmentPassed && !sessionUser.backgroundCheckVerified) {
        setLoginUser(sessionUser);
        setShowBackgroundCheckModal(true);
      } else {
        await routeAfterLogin(sessionUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError('Unable to complete sign in. Please clear storage and try again.');
      toast.error('Unable to complete sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackgroundCheckVerified = () => {
    setShowBackgroundCheckModal(false);
    if (loginUser) {
      try {
        // Update user in localStorage with verified status
        const updatedUser = { ...loginUser, backgroundCheckVerified: true, backgroundCheckStatus: 'verified', backgroundCheckDate: Date.now() };
        const sessionUser = persistCurrentUserSession(updatedUser);
        window.dispatchEvent(new CustomEvent('user-login', { detail: sessionUser }));

        // Now redirect to appropriate view
        void routeAfterLogin(sessionUser);
      } catch (error) {
        console.error('Failed to persist verified user session:', error);
        setError('Unable to complete sign in. Please clear storage and try again.');
        toast.error('Unable to complete sign in. Please try again.');
      }
    }
  };

  const handleDemoLogin = async (userEmail: string) => {
    try {
      let user: any = getCanonicalTestUser(userEmail);

      // If not in test users, try Supabase
      if (!user) {
        user = await userService.getUserByEmail(userEmail);
      }

      if (user) {
        const pooledUser = resolveUserForActivePool(user);
        const sessionUser = persistCurrentUserSession(pooledUser);
        // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
        window.dispatchEvent(new CustomEvent('user-login', { detail: sessionUser }));
        toast.success(`Welcome, ${sessionUser.name}!`);

        // Show background check modal only if user passed assessment AND hasn't verified yet
        if (sessionUser.assessmentPassed && !sessionUser.backgroundCheckVerified) {
          setLoginUser(sessionUser);
          setShowBackgroundCheckModal(true);
        } else {
          await routeAfterLogin(sessionUser);
        }
      }
    } catch (error) {
      console.error('Demo login failed:', error);
      setError('Unable to complete sign in. Please clear storage and try again.');
      toast.error('Unable to complete sign in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center px-4">
      <div className="absolute inset-0">
        <div className="absolute inset-0 grain-overlay" />
      </div>

      <BackgroundCheckModal
        isOpen={showBackgroundCheckModal}
        onClose={() => {
          setShowBackgroundCheckModal(false);
          // Redirect without verification
          if (loginUser) {
            void routeAfterLogin(loginUser);
          }
        }}
        onVerified={handleBackgroundCheckVerified}
      />

      <Card className="relative w-full max-w-md bg-[#111611] border-[#1A211A] shadow-2xl">
        <div className="p-8 space-y-6">
          <AuthPoolTabs />

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-display font-bold text-[#F6FFF2]">
              {activeCommunity.loginTitle}
            </h1>
            <p className="text-sm text-[#A9B5AA]">
              {activeCommunity.loginSubtitle}
            </p>
          </div>

          {infoMessage && (
            <div className="flex gap-3 p-4 bg-[#D9FF3D]/10 border border-[#D9FF3D]/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-[#D9FF3D] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#F6FFF2]">{infoMessage}</p>
            </div>
          )}

          {error && (
            <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#F6FFF2]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="maya@test.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#F6FFF2]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setCurrentView('password-reset')}
              className="text-sm text-[#D9FF3D] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <p className="text-center text-sm text-[#A9B5AA]">
            New to {activeCommunity.name}?{' '}
            <button
              onClick={() => setCurrentView('sign-up')}
              className="text-[#D9FF3D] hover:underline font-medium"
            >
              Create an account
            </button>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1A211A]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#111611] text-[#A9B5AA]">Demo Accounts</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => handleDemoLogin('maya@test.com')}
              className="w-full bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30"
            >
              ✓ Maya (Passed Assessment)
            </Button>
            <Button
              onClick={() => handleDemoLogin('alex@test.com')}
              className="w-full bg-green-600/20 text-green-300 border border-green-500/30 hover:bg-green-600/30"
            >
              ✓ Alex (Passed Assessment)
            </Button>
            <Button
              onClick={() => handleDemoLogin('james@test.com')}
              className="w-full bg-orange-600/20 text-orange-300 border border-orange-500/30 hover:bg-orange-600/30"
            >
              ✗ James (Needs Growth)
            </Button>
          </div>

          <div className="pt-4 border-t border-[#1A211A]">
            <button
              onClick={() => setCurrentView('landing')}
              className="w-full text-sm text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            >
              Back to Home
            </button>
          </div>

          <div className="bg-[#0B0F0C] p-4 rounded-lg text-xs text-[#A9B5AA]">
            <p className="font-semibold text-[#F6FFF2] mb-2">Test Credentials:</p>
            <p>Email: maya@test.com / alex@test.com / james@test.com</p>
            <p>Password: password123</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UserLoginSection;
