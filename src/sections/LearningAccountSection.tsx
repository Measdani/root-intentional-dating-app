import React from 'react';
import { ArrowLeft, LogOut, Shield, UserRound } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { signOutAndClearLocalUser } from '@/services/authService';

const LearningAccountSection: React.FC = () => {
  const { currentUser, setCurrentView } = useApp();

  const signOut = async () => {
    await signOutAndClearLocalUser();
    setCurrentView('landing');
  };

  return (
    <main className="min-h-screen bg-[#0B0F0C] px-5 py-10 text-[#F6FFF2] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={() => setCurrentView('home')} className="inline-flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#D9FF3D]"><ArrowLeft className="h-4 w-4" /> Back to learning</button>
        <h1 className="mt-10 font-display text-5xl">My account</h1>
        <section className="mt-8 rounded-[28px] border border-[#2A312A] bg-[#111611] p-7">
          <div className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9FF3D]/10 text-[#D9FF3D]"><UserRound className="h-6 w-6" /></span><div><p className="font-semibold">{currentUser?.name || 'Rooted Hearts member'}</p><p className="text-sm text-[#7F8B80]">{currentUser?.email || 'Member account'}</p></div></div>
          <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#2A312A] bg-[#0B0F0C] p-4"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#D9FF3D]" /><div><p className="text-sm font-medium">Private learning profile</p><p className="mt-1 text-xs leading-5 text-[#7F8B80]">The new platform does not display your account to other members.</p></div></div>
          <div className="mt-3 rounded-2xl border border-[#D9FF3D]/20 bg-[#D9FF3D]/5 p-4"><p className="text-xs uppercase tracking-[0.16em] text-[#D9FF3D]">Access plan</p><p className="mt-2 font-medium">Lifetime access</p><p className="mt-1 text-xs leading-5 text-[#7F8B80]">Current and future learning content remains available whenever you sign in.</p></div>
          <button type="button" onClick={signOut} className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#2A312A] px-5 py-2.5 text-sm text-[#A9B5AA] transition hover:border-red-400/40 hover:text-red-300"><LogOut className="h-4 w-4" /> Sign out</button>
        </section>
      </div>
    </main>
  );
};

export default LearningAccountSection;
