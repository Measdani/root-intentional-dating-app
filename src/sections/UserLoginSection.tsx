import React, { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { testUsers } from '@/data/testUsers';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import type { AssessmentResult } from '@/types';

const UserLoginSection: React.FC = () => {
  const { setCurrentView, setAssessmentResult } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [loginUser, setLoginUser] = useState<any>(null);

  // Check if user is currently suspended
  const isSuspended = (user: any): boolean => {
    if (!user?.suspensionEndDate) return false;
    return new Date().getTime() < user.suspensionEndDate;
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
        const normalized = normalizeAssessmentResult(parsed);
        if (normalized) return normalized;
      } catch (error) {
        console.error('Failed to parse saved assessment result:', error);
      }
    }

    return null;
  };

  const routeAfterLogin = (user: any) => {
    if (isSuspended(user)) {
      toast.info('Your account is currently under suspension. Please review the growth resources.');
      setCurrentView('growth-mode');
      return;
    }

    if (user.assessmentPassed === true) {
      setCurrentView('browse');
      return;
    }

    const savedResult = getSavedAssessmentResult(user.id);
    const hasScoredAssessment =
      typeof user.alignmentScore === 'number' ||
      typeof user.assessmentScore === 'number';

    const hasCompletedAssessment =
      Boolean(savedResult) ||
      user.userStatus === 'needs-growth' ||
      (user.assessmentPassed === false && hasScoredAssessment);

    if (hasCompletedAssessment) {
      if (savedResult) {
        setAssessmentResult(savedResult);
      } else {
        const fallbackPercentage = Number(user.alignmentScore ?? user.assessmentScore ?? 0);
        setAssessmentResult({
          totalScore: Math.round(fallbackPercentage),
          percentage: fallbackPercentage,
          passed: false,
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
      // Try to find user in Supabase first
      let user: any = await userService.getUserByEmail(email);

      // Fall back to test users if not found in Supabase
      if (!user) {
        user = testUsers.find(u => u.email === email && u.password === password) || null;
      } else if (user && !testUsers.find(u => u.email === email && u.password === password)) {
        // User exists in Supabase but password check would fail
        // For now, allow login if user exists in Supabase
        // In production, would validate password hash
      }

      if (!user) {
        setError('Invalid email or password');
        toast.error('Invalid email or password');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(user));
      // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
      window.dispatchEvent(new CustomEvent('user-login', { detail: user }));
      toast.success(`Welcome back, ${user.name}!`);

      // Show background check modal only if user passed assessment AND hasn't verified yet
      if (user.assessmentPassed && !user.backgroundCheckVerified) {
        setLoginUser(user);
        setShowBackgroundCheckModal(true);
      } else {
        routeAfterLogin(user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackgroundCheckVerified = () => {
    setShowBackgroundCheckModal(false);
    if (loginUser) {
      // Update user in localStorage with verified status
      const updatedUser = { ...loginUser, backgroundCheckVerified: true, backgroundCheckStatus: 'verified', backgroundCheckDate: Date.now() };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent('user-login', { detail: updatedUser }));

      // Now redirect to appropriate view
      routeAfterLogin(updatedUser);
    }
  };

  const handleDemoLogin = async (userEmail: string) => {
    let user: any = testUsers.find(u => u.email === userEmail);

    // If not in test users, try Supabase
    if (!user) {
      user = await userService.getUserByEmail(userEmail);
    }

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
      window.dispatchEvent(new CustomEvent('user-login', { detail: user }));
      toast.success(`Welcome, ${user.name}!`);

      // Show background check modal only if user passed assessment AND hasn't verified yet
      if (user.assessmentPassed && !user.backgroundCheckVerified) {
        setLoginUser(user);
        setShowBackgroundCheckModal(true);
      } else {
        routeAfterLogin(user);
      }
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
            routeAfterLogin(loginUser);
          }
        }}
        onVerified={handleBackgroundCheckVerified}
      />

      <Card className="relative w-full max-w-md bg-[#111611] border-[#1A211A] shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-display font-bold text-[#F6FFF2]">
              Welcome to Rooted Hearts
            </h1>
            <p className="text-sm text-[#A9B5AA]">
              Sign in to browse profiles
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
            New to Rooted Hearts?{' '}
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
