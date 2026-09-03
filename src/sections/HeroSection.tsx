import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';

const HeroSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const scrollToNext = () => {
    document.getElementById('section-problem')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0F0C] px-6 text-center">
      <div className="grain-overlay" />
      <div className={`relative z-10 mx-auto max-w-3xl transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <BrandLogo className="mb-10 flex justify-center" imageClassName="w-[120px] sm:w-[150px]" />
        <p className="font-mono-label mb-4 text-[#D9FF3D]">Guided personal growth</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-[#F6FFF2] sm:text-7xl">Build healthier relationship patterns.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#A9B5AA] sm:text-lg">
          Learn through structured assessments, guided reflections, and practical resources designed for lasting change.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <button onClick={() => setCurrentView('sign-up')} className="btn-primary inline-flex items-center justify-center gap-2">Get lifetime access <ArrowRight className="h-4 w-4" /></button>
          <button onClick={() => setCurrentView('user-login')} className="btn-outline">Sign in</button>
        </div>
      </div>
      <button onClick={scrollToNext} className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-[#A9B5AA]" aria-label="Learn more">
        <ChevronDown className="h-5 w-5" />
      </button>
    </section>
  );
};

export default HeroSection;
