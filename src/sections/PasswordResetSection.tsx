import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import {
  authService,
  clearPasswordResetUrlState,
  signOutSupabaseSession,
} from '@/services/authService';

const PasswordResetSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPreparingRecovery, setIsPreparingRecovery] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeRecovery = async () => {
      const result = await authService.preparePasswordRecovery();
      if (!isMounted) return;

      if (result.error) {
        setError(result.error);
      }

      if (result.isRecoveryFlow && result.session?.user) {
        setIsRecoveryMode(true);
      } else if (result.isRecoveryFlow) {
        setError('This reset link is invalid or expired. Request a new password reset email.');
      }

      setIsPreparingRecovery(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setError('');
        setIsPreparingRecovery(false);
        return;
      }

      if (session?.user && (isRecoveryMode || event === 'SIGNED_IN')) {
        setIsRecoveryMode(true);
        setError('');
        setIsPreparingRecovery(false);
      }
    });

    void initializeRecovery();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isRecoveryMode]);

  const handleSendReset = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }

    setError('');
    setIsSendingReset(true);

    try {
      const { error: resetError } = await authService.sendPasswordResetEmail(trimmedEmail);
      if (resetError) {
        setError(resetError.message);
        return;
      }

      toast.success('Password reset email sent. Use the newest link in your inbox.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError('Enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsUpdatingPassword(true);

    try {
      const { error: updateError } = await authService.updatePassword(newPassword);
      if (updateError) {
        setError(updateError.message);
        return;
      }

      clearPasswordResetUrlState();
      await signOutSupabaseSession();
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated. Sign in with your new password.');
      setCurrentView('user-login');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center px-4">
      <div className="absolute inset-0">
        <div className="absolute inset-0 grain-overlay" />
      </div>

      <Card className="relative w-full max-w-md bg-[#111611] border-[#1A211A] shadow-2xl">
        <div className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-display font-bold text-[#F6FFF2]">
              {isRecoveryMode ? 'Set a New Password' : 'Reset Your Password'}
            </h1>
            <p className="text-sm text-[#A9B5AA]">
              {isRecoveryMode
                ? 'Enter your new password below to finish recovery.'
                : 'Send yourself a secure reset link to this app.'}
            </p>
          </div>

          {error && (
            <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {isPreparingRecovery ? (
            <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-6 text-center text-sm text-[#A9B5AA]">
              <div className="flex items-center justify-center gap-2 text-[#F6FFF2]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing password recovery...
              </div>
            </div>
          ) : isRecoveryMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-[#F6FFF2]">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-[#F6FFF2]">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
                />
              </div>

              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="w-full bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSendReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-[#F6FFF2]">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-[#0B0F0C] border-[#1A211A] text-[#F6FFF2]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSendingReset}
                className="w-full bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Reset Email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-[#1A211A]">
            <button
              type="button"
              onClick={() => {
                clearPasswordResetUrlState();
                setCurrentView('user-login');
              }}
              className="w-full text-sm text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PasswordResetSection;
