import React, { useEffect, useRef, useState } from 'react';

import founderPortrait from '../assets/meashia-founder.jpeg';

const founderMessage = [
  'Most apps train you to keep searching. We built something for people who are ready to stop.',
  "I'm rooting for you - in how you grow, how you choose, and how you love. Not just here, but in every connection you step into.",
];

const ProblemSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-problem"
      className="section-pinned h-auto min-h-[100svh] bg-[#0B0F0C] py-16 sm:py-20 lg:h-screen lg:py-0"
    >
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80"
          alt="Misty forest"
          className="h-full w-full object-cover opacity-90 brightness-110 contrast-105"
        />
        <div className="absolute inset-0 gradient-vignette opacity-8" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F0C]/15 via-[#0B0F0C]/5 to-[#0B0F0C]/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#0B0F0C]/35" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-6 sm:px-8 lg:flex-row lg:justify-between lg:gap-16 lg:px-16">
        <div
          className={`w-full max-w-[520px] transition-all duration-1000 ease-out ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-16 opacity-0'
          }`}
        >
          <div className="circle-frame relative mx-auto aspect-square w-[82vw] max-w-[520px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-3 overflow-hidden rounded-full">
              <img
                src={founderPortrait}
                alt="Meashia, founder of Rooted Hearts"
                className="h-full w-full object-cover object-[center_18%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/22 via-transparent to-white/12" />
            </div>
          </div>

          <div className="mx-auto mt-5 w-fit rounded-full border border-white/15 bg-[#0B0F0C]/55 px-4 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-[#F6FFF2]/80 backdrop-blur-sm sm:text-xs sm:tracking-[0.24em]">
            Founder of Rooted Hearts
          </div>
        </div>

        <div
          className={`w-full max-w-[640px] transition-all duration-1000 delay-200 ease-out ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
          }`}
        >
          <div className="rounded-[30px] border border-white/20 bg-[#0B0F0C]/50 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-7 lg:p-8">
            <p className="font-mono-label mb-4 text-[#D9FF3D]">Founder Note</p>

            <h2 className="font-display mb-5 max-w-[12ch] text-[clamp(24px,3.3vw,42px)] leading-[1.04] text-[#F6FFF2] drop-shadow-[0_3px_14px_rgba(0,0,0,0.45)] sm:mb-6">
              This Was Built With Intention.
            </h2>

            <div className="space-y-4 text-[14px] leading-relaxed text-[#F6FFF2] sm:space-y-5 sm:text-base">
              {founderMessage.map((paragraph) => (
                <p key={paragraph} className="max-w-[34rem] text-[#F6FFF2]/94">
                  {paragraph}
                </p>
              ))}

              <div className="rounded-[22px] border border-[#D9FF3D]/20 bg-white/5 px-5 py-4 text-[14px] text-[#F6FFF2] sm:text-base">
                This isn&apos;t about perfect people. It&apos;s about intentional ones.
              </div>
            </div>

            <p className="mt-7 border-t border-white/10 pt-5 text-[14px] text-[#F6FFF2] sm:mt-8 sm:text-base">
              -- Meashia, Founder of Rooted Hearts
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
