import React from 'react';
import { ArrowLeft, Check, LockKeyhole } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';

const included = [
  'All four learning areas',
  'Female and male perspectives',
  'Ask Rooted Hearts answers',
  'Future lessons and platform updates',
  'Saved resources, journal, and progress tools',
];

const LifetimeAccessSection: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <main className="rh-page-background min-h-screen px-5 py-8 text-[#F6FFF2] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCurrentView('landing')} className="inline-flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#D9FF3D]"><ArrowLeft className="h-4 w-4" /> Back</button>
          <BrandLogo imageClassName="w-[104px]" />
        </div>
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-[1fr_.85fr]">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-[#D9FF3D]">One payment. Continued growth.</p>
            <h1 className="mt-4 font-display text-5xl leading-tight sm:text-6xl">Lifetime access to Rooted Hearts.</h1>
            <p className="mt-5 text-lg leading-8 text-[#A9B5AA]">No subscription tiers and no locked learning paths. Sign in whenever you need guidance and explore at your own pace.</p>
            <ul className="mt-8 space-y-4">{included.map((item) => <li key={item} className="flex items-center gap-3 text-[#DDE8DD]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D9FF3D]/10 text-[#D9FF3D]"><Check className="h-3.5 w-3.5" /></span>{item}</li>)}</ul>
          </section>
          <section className="rounded-[30px] border border-[#D9FF3D]/20 bg-[#111611] p-7 sm:p-8">
            <LockKeyhole className="h-6 w-6 text-[#D9FF3D]" />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#D9FF3D]">Founding price</p>
            <div className="mt-2 flex items-end gap-3"><span className="font-display text-6xl leading-none">$60</span><span className="pb-1 text-[#A9B5AA]">one time</span></div>
            <p className="mt-4 text-sm leading-6 text-[#A9B5AA]">The price will increase to <span className="font-semibold text-[#F6FFF2]">$99</span> as the library expands. Join now and your lifetime access will never require another payment.</p>
            <button type="button" onClick={() => setCurrentView('create-account')} className="mt-8 w-full rounded-full bg-[#D9FF3D] px-5 py-3.5 text-sm font-semibold text-[#0B0F0C]">Get lifetime access for $60</button>
            <button type="button" onClick={() => setCurrentView('user-login')} className="mt-3 w-full rounded-full border border-[#2A312A] px-5 py-3 text-sm text-[#A9B5AA]">Sign in to an existing account</button>
            <p className="mt-4 text-center text-xs text-[#6F7A70]">No subscription. No recurring charges.</p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default LifetimeAccessSection;
