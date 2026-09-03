import React, { useState } from 'react';
import { ArrowLeft, LogOut, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { signOutAndClearLocalUser } from '@/services/authService';
import { accountDeletionService } from '@/services/accountDeletionService';

const UserSettingsSection: React.FC = () => {
  const { currentUser, setCurrentView, setShowSupportModal } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const signOut = async () => {
    await signOutAndClearLocalUser();
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
  };

  const removeAccount = async () => {
    if (!window.confirm('Permanently delete your Rooted Hearts account? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await accountDeletionService.deleteOwnAccount();
      await signOutAndClearLocalUser();
      toast.success('Your account has been deleted.');
      setCurrentView('landing');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete your account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F0C] px-4 py-10 text-[#E8F2E8] sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <button onClick={() => setCurrentView('home')} className="inline-flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#F6FFF2]">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <header>
          <h1 className="font-display text-3xl">Account settings</h1>
          <p className="mt-2 text-sm text-[#A9B5AA]">Manage your account and lifetime access.</p>
        </header>

        <section className="rounded-2xl border border-[#1A211A] bg-[#111611] p-6">
          <p className="text-sm text-[#A9B5AA]">Signed in as</p>
          <p className="mt-1 font-medium text-[#F6FFF2]">{currentUser.name}</p>
          <p className="text-sm text-[#A9B5AA]">{currentUser.email}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 px-3 py-1 text-xs text-[#D9FF3D]">
            <ShieldCheck className="h-3.5 w-3.5" /> Lifetime access
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => setShowSupportModal(true)} className="flex items-center gap-3 rounded-xl border border-[#2A312A] bg-[#111611] p-4 text-left hover:border-[#3A4A3A]">
            <Mail className="h-4 w-4 text-[#D9FF3D]" /> Contact support
          </button>
          <button onClick={signOut} className="flex items-center gap-3 rounded-xl border border-[#2A312A] bg-[#111611] p-4 text-left hover:border-[#3A4A3A]">
            <LogOut className="h-4 w-4 text-[#A9B5AA]" /> Sign out
          </button>
        </section>

        <section className="flex flex-wrap gap-4 text-sm text-[#A9B5AA]">
          <button onClick={() => setCurrentView('privacy-policy')} className="hover:text-[#D9FF3D]">Privacy policy</button>
          <button onClick={() => setCurrentView('terms-of-service')} className="hover:text-[#D9FF3D]">Terms of service</button>
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="font-medium text-red-200">Delete account</h2>
          <p className="mt-2 text-sm text-[#A9B5AA]">Permanently removes your account and access.</p>
          <button onClick={removeAccount} disabled={isDeleting} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200 disabled:opacity-50">
            <Trash2 className="h-4 w-4" /> {isDeleting ? 'Deleting…' : 'Delete account'}
          </button>
        </section>
      </div>
    </main>
  );
};

export default UserSettingsSection;
