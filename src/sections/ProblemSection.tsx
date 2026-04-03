import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';

import founderPortrait from '../assets/meashia-founder.jpeg';

const founderMessage = [
  'Most apps train you to keep searching. We built something for people who are ready to stop.',
  "I'm rooting for you - in how you grow, how you choose, and how you love. Not just here, but in every connection you step into.",
];

const forestPromptSuggestions = [
  'Does this connection feel aligned?',
  'Why do I feel uncertain about this person?',
  'How do I communicate this clearly?',
  'Is this something I should walk away from?',
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

  const openForestAssistant = () => {
    window.dispatchEvent(new Event('open-forest-assistant'));
  };

  return (
    <section
      ref={sectionRef}
      id="section-problem"
      className="section-pinned h-auto min-h-[100svh] overflow-visible bg-[#0B0F0C] py-16 sm:py-20 lg:h-auto lg:py-20"
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
          className={`w-full max-w-[520px] translate-y-4 sm:translate-y-6 transition-all duration-1000 ease-out ${
            isVisible ? 'translate-x-0 opacity-100' : '-translate-x-16 opacity-0'
          }`}
        >
          <div className="circle-frame relative mx-auto aspect-square w-[82vw] max-w-[520px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-3 overflow-hidden rounded-full">
              <img
                src={founderPortrait}
                alt="Meashia, founder of Rooted Hearts"
                className="h-full w-full object-cover object-[center_24%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/22 via-transparent to-white/12" />
            </div>
          </div>
        </div>

        <div
          className={`w-full max-w-[640px] transition-all duration-1000 delay-200 ease-out ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-16 opacity-0'
          }`}
        >
          <div className="space-y-6">
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

            <div className="rounded-[30px] border border-[#D9FF3D]/18 bg-[#0B0F0C]/45 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono-label text-[#A9B5AA]">In-App Guide</p>
                  <h3 className="mt-3 font-display text-[clamp(22px,3vw,38px)] leading-[1.06] text-[#F6FFF2]">
                    You&apos;re Not Navigating This Alone
                  </h3>
                  <p className="mt-3 max-w-[32rem] text-[15px] leading-relaxed text-[#F6FFF2]/82 sm:text-base">
                    Meet <span className="font-semibold text-[#D9FF3D]">Forest</span> - your in-app guide
                    for clarity, reflection, and grounded connection.
                  </p>
                </div>
                <div className="hidden rounded-2xl border border-[#D9FF3D]/25 bg-[#111611]/80 p-3 text-[#D9FF3D] sm:flex">
                  <MessageCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-[#D9FF3D]/16 bg-[#111611]/45 p-5 sm:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-[#D9FF3D]/35 bg-[radial-gradient(circle_at_center,rgba(217,255,61,0.18),rgba(11,15,12,0.72)_68%)] shadow-[0_0_40px_rgba(217,255,61,0.08)]">
                      <div className="absolute inset-4 rounded-full border border-[#D9FF3D]/12" />
                      <Sparkles className="h-16 w-16 text-[#D9FF3D]" />
                    </div>
                    <div className="-mt-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#D9FF3D]/35 bg-[#263012] text-[#D9FF3D] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-[15px] leading-relaxed text-[#F6FFF2]/88 sm:text-base">
                      <span className="font-semibold text-[#D9FF3D]">Forest</span> is your
                      {' '}
                      <span className="font-semibold text-[#D9FF3D]">Objective Spiritual Observer</span>
                      {' '}designed to help you slow down, reflect, and make grounded decisions.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#F6FFF2]/70 sm:text-base">
                      Whether you&apos;re unsure about a connection, working through emotions, or trying
                      to understand what feels right, Forest helps you stay aligned with who you are
                      and what you&apos;re building.
                    </p>
                    <p className="mt-4 text-[15px] leading-relaxed text-[#F6FFF2]/70 sm:text-base">
                      This isn&apos;t advice based on trends. It&apos;s guidance rooted in the same
                      principles that shape this platform.
                    </p>

                    <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                      <div className="xl:min-w-[220px]">
                        <p className="text-sm text-[#A9B5AA]">You can ask Forest:</p>
                        <button
                          type="button"
                          onClick={openForestAssistant}
                          className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-6 py-3 text-sm font-semibold text-[#0B0F0C] transition-all hover:scale-[1.02] hover:brightness-95"
                        >
                          <Send className="h-4 w-4" />
                          Ask Forest
                        </button>
                      </div>

                      <div className="grid flex-1 gap-3">
                        {forestPromptSuggestions.map((prompt) => (
                          <div
                            key={prompt}
                            className="rounded-full border border-white/10 bg-[#0B0F0C]/50 px-4 py-3 text-sm leading-snug text-[#F6FFF2]/72"
                          >
                            {prompt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
