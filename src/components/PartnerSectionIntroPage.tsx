import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { returnToResourceSpace } from '@/lib/resourceSpaceNavigation';

type PartnerSectionIntroPageProps = {
  sectionNumber: number;
  title: string;
  children: React.ReactNode;
  afterHero?: React.ReactNode;
};

const PartnerSectionIntroPage: React.FC<PartnerSectionIntroPageProps> = ({
  sectionNumber,
  title,
  children,
  afterHero,
}) => {
  const { setCurrentView } = useApp();

  const handleBack = () => {
    returnToResourceSpace(setCurrentView);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-white">
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Resource Space</span>
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Partner Journey</p>
            <h1 className="font-display text-xl text-[#F6FFF2]">{title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="rounded-2xl border border-[#D9FF3D]/30 bg-[#111611] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Section {sectionNumber}</p>
          <h2 className="mt-2 font-display text-[clamp(30px,4vw,44px)] text-[#F6FFF2]">
            {title}
          </h2>
          <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-[#A9B5AA]">
            {children}
          </div>
        </div>
        {afterHero && <div className="mt-8">{afterHero}</div>}
      </main>
    </div>
  );
};

export default PartnerSectionIntroPage;
