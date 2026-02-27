import React, { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { useAdmin } from '@/store/AdminContext';
import AuthPoolTabs from '@/components/AuthPoolTabs';
import {
  communityIdToPoolId,
  getCommunityDefinition,
  getUserPoolId,
  persistUserPoolMembership,
  poolIdToCommunityId,
  useCommunity,
} from '@/modules';
import { userService } from '@/services/userService';
import { assessmentService } from '@/services/assessmentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { testUsers } from '@/data/testUsers';
import { mockAdminCredentials } from '@/data/admins';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import type { AssessmentResult } from '@/types';

const UserLoginSection: React.FC = () => {
  const { setCurrentView, setAssessmentResult } = useApp();
  const { login: adminLogin } = useAdmin();
  const { activeCommunity, activeCommunityId, switchCommunity } = useCommunity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      console.warn('Primary currentUser save failed, retrying with trimmed payload:', error);
    }

    const lightweightUser = {
      ...user,
      photoUrl: stripInlinePhotoPayloads(user.photoUrl),
    };

    const cacheKeysToPurge = [
      'assessmentLog',
      'community-blogs',
      'growth-resources',
      'paid-growth-resources',
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
      totalScore: typeof raw.totalScore === 'number' ? raw.totalScore : Math.round(percentage),
      percentage,
      passed: Boolean(raw.passed),
      categoryScores: raw.categoryScores && typeof raw.categoryScores === 'object' ? raw.categoryScores : {},
      integrityFlags: Array.isArray(raw.integrityFlags) ? raw.integrityFlags : [],
      growthAreas: Array.isArray(raw.growthAreas) ? raw.growthAreas : [],
    };
  };

  const getSavedAssessmentResult = (userId?: string): AssessmentResult | null => {
    const keys = userId ? [`assessmentResult_${userId}`, 'assessmentResult'] : ['assessmentResult'];

    for (const key of keys) {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) continue;
        const parsed = JSON.parse(saved);
        // Guard against cross-user leakage from legacy global key.
        if (userId && parsed?.userId && parsed.userId !== userId) {
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

    if (accountPoolId !== selectedPoolId) {
      const targetCommunityId = poolIdToCommunityId(accountPoolId);
      const targetCommunity = getCommunityDefinition(targetCommunityId);
      switchCommunity(targetCommunityId);

      window.dispatchEvent(
        new CustomEvent('auth-pool-redirect-banner', {
          detail: {
            message: `You're signed in to ${targetCommunity.name}. We redirected you to your space.`,
          },
        })
      );
    }

    return user;
  };

  const routeAfterLogin = async (user: any) => {
    const canonicalTester = user?.email ? getCanonicalTestUser(user.email) : null;
    const effectiveUser = canonicalTester || user;

    if (isSuspended(user)) {
      toast.info('Your account is currently under suspension. Please review the growth resources.');
      setCurrentView('growth-mode');
      return;
    }

    if (effectiveUser.assessmentPassed === true) {
      setCurrentView('browse');
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
      if (savedResult) {
        setAssessmentResult(savedResult);
      } else {
        const fallbackPercentage = Number(effectiveUser.assessmentScore ?? effectiveUser.alignmentScore ?? 0);
        setAssessmentResult({
          totalScore: Math.round(fallbackPercentage),
          percentage: fallbackPercentage,
          passed: Boolean(effectiveUser.assessmentPassed),
          categoryScores: {},
          integrityFlags: [],
          growthAreas: [],
        });
      }
      setCurrentView('assessment-result');
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
      const isAdminEmail = Object.prototype.hasOwnProperty.call(mockAdminCredentials, normalizedEmail);

      // Silent admin login path through the regular login screen.
      if (isAdminEmail) {
        const adminAuthenticated = await adminLogin(normalizedEmail, password);
        if (!adminAuthenticated) {
          setError('Invalid email or password');
          toast.error('Invalid email or password');
          setIsLoading(false);
          return;
        }

        localStorage.removeItem('currentUser');
        window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
        setCurrentView('admin-dashboard');
        setIsLoading(false);
        return;
      }

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
        // Non-tester accounts come from Supabase.
        user = await userService.getUserByEmail(normalizedEmail);
      }

      if (!user) {
        setError('Invalid email or password');
        toast.error('Invalid email or password');
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
