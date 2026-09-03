import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';
import { accountEnforcementService } from '@/services/accountEnforcementService';
import {
  authService,
  getAuthErrorMessage,
  signOutSupabaseSession,
} from '@/services/authService';
import { pendingSignupService } from '@/services/pendingSignupService';
import { userService } from '@/services/userService';
import type { User } from '@/types';

const isDuplicateEmailError = (message: string | null | undefined): boolean => {
  const normalized = (message || '').toLowerCase();
  return (
    normalized.includes('duplicate key value violates unique constraint') ||
    normalized.includes('users_email_key') ||
    normalized.includes('already exists') ||
    normalized.includes('already registered') ||
    normalized.includes('user_already_exists')
  );
};

const SignUpSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const showDuplicateEmailError = () => {
    setError('This email already has an account. Sign in or use Forgot Password.');
    toast.error('This email already has an account.');
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      setError('Your name is required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Enter a valid email address.');
      return false;
    }
    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    if (!acceptedPolicies) {
      setError('Accept the Terms of Service and Privacy Policy to continue.');
      return false;
    }
    return true;
  };

  const persistSession = (user: User) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('new-user', { detail: user }));
    window.dispatchEvent(new CustomEvent('user-login', { detail: user }));
  };

  const createAccount = async () => {
    if (!validate()) return;

    setError('');
    setIsLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const eligibility = await accountEnforcementService.checkSignupEmail(normalizedEmail);
      if (eligibility.blocked) {
        setError(eligibility.reason || 'This email cannot create an account. Contact support for help.');
        return;
      }
      if (eligibility.existingAccount) {
        showDuplicateEmailError();
        return;
      }

      const { data, error: signUpError } = await authService.signUpWithPassword(normalizedEmail, password);
      if (signUpError) {
        if (isDuplicateEmailError(signUpError.message)) {
          showDuplicateEmailError();
          return;
        }
        setError(getAuthErrorMessage(signUpError, 'sign-up'));
        return;
      }

      if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
        showDuplicateEmailError();
        return;
      }

      const now = Date.now();
      const newUser: User = {
        id: data.user.id,
        email: normalizedEmail,
        name: name.trim(),
        // Neutral compatibility values for legacy columns. These are not used
        // by the learning platform and are not exposed in the signup UI.
        age: 18,
        city: '',
        gender: 'prefer-not-to-say',
        partnershipIntent: 'long-term',
        familyAlignment: {
          hasChildren: false,
          wantsChildren: 'unsure',
          openToPartnerWithParent: 'open-inexperienced',
        },
        values: [],
        growthFocus: '',
        assessmentPassed: false,
        membershipStatus: 'active',
        accessPlan: 'lifetime',
        accessStatus: 'active',
        accessGrantedAt: new Date(now).toISOString(),
        lastViewingPerspective: 'female',
        consentTimestamp: now,
        consentVersion: 'learning-platform-v1',
        userStatus: 'active',
      };

      const pendingResult = pendingSignupService.save(newUser);
      if (!data.session) {
        if (!pendingResult.stored) {
          console.warn('The pending account profile could not be stored locally.');
        }
        toast.success('Account created. Confirm your email, then sign in.');
        setCurrentView('user-login');
        return;
      }

      const { error: profileError, data: savedUser } = await userService.createUser(newUser);
      if (profileError) {
        await signOutSupabaseSession();
        if (isDuplicateEmailError(profileError)) {
          pendingSignupService.clear(normalizedEmail);
          showDuplicateEmailError();
          return;
        }
        setError('Your secure login was created, but account setup could not finish. Please contact support.');
        return;
      }

      pendingSignupService.clear(normalizedEmail);
      persistSession(savedUser ?? newUser);
      toast.success(`Welcome, ${newUser.name}.`);
      setCurrentView('home');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create your account right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F0C] px-5 py-8 text-[#F6FFF2] sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCurrentView('sign-up')} className="inline-flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#D9FF3D]">
            <ArrowLeft className="h-4 w-4" /> Lifetime access
          </button>
          <BrandLogo imageClassName="w-[104px]" />
        </div>

        <section className="mt-12 rounded-[30px] border border-[#2A312A] bg-[#111611] p-7 sm:p-9">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D9FF3D]">Private learning account</p>
          <h1 className="mt-3 font-display text-4xl">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-[#A9B5AA]">Only the information needed to secure and identify your private account is requested.</p>

          {error && (
            <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="mt-7 space-y-4">
            <label className="block text-sm text-[#E8F2E8]">Name
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 outline-none focus:border-[#D9FF3D]/60" />
            </label>
            <label className="block text-sm text-[#E8F2E8]">Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 outline-none focus:border-[#D9FF3D]/60" />
            </label>
            <label className="block text-sm text-[#E8F2E8]">Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 outline-none focus:border-[#D9FF3D]/60" />
            </label>
            <label className="block text-sm text-[#E8F2E8]">Confirm password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 outline-none focus:border-[#D9FF3D]/60" />
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#A9B5AA]">
            <input type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} className="mt-1 h-4 w-4 accent-[#D9FF3D]" />
            <span>I agree to the <button type="button" onClick={() => setCurrentView('terms-of-service')} className="text-[#D9FF3D] hover:underline">Terms of Service</button> and <button type="button" onClick={() => setCurrentView('privacy-policy')} className="text-[#D9FF3D] hover:underline">Privacy Policy</button>.</span>
          </label>

          <button type="button" onClick={createAccount} disabled={isLoading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-3.5 font-semibold text-[#0B0F0C] disabled:cursor-not-allowed disabled:opacity-50">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating secure account…' : 'Create account'}
          </button>
          <p className="mt-5 text-center text-sm text-[#7F8B80]">Already have an account? <button type="button" onClick={() => setCurrentView('user-login')} className="text-[#D9FF3D] hover:underline">Sign in</button></p>
        </section>
      </div>
    </main>
  );
};

export default SignUpSection;
