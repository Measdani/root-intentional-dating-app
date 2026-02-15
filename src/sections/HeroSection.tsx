import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { ChevronDown } from 'lucide-react';

const HeroSection: React.FC = () => {
  const { setShowEmailModal, hasJoinedList } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('section-problem');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-hero"
      className="section-pinned bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background Image with Vignette */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80"
          alt="Forest path"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F0C]/40 via-transparent to-[#0B0F0C]/60" />
      </div>

      {/* Center Circle Frame */}
      <div
        className={`relative z-10 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="w-[85vw] h-[85vw] max-w-[720px] max-h-[720px] circle-frame relative">
          {/* Inner Circle Content */}
          <div className="absolute inset-4 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80"
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/80 via-transparent to-[#0B0F0C]/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-8">
            <h1
              className={`font-display text-[clamp(48px,10vw,120px)] text-[#F6FFF2] mb-4 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              ROOTED HEARTS
            </h1>
            <p
              className={`text-[clamp(16px,2vw,24px)] text-[#A9B5AA] max-w-md mx-auto mb-10 transition-all duration-700 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              Dating for people who are intentional.
            </p>
            <button
              onClick={() => setShowEmailModal(true)}
              className={`btn-primary transition-all duration-700 delay-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {hasJoinedList ? 'You are on the list' : 'Join the list'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Label */}
      <div
        className={`absolute bottom-8 left-8 z-20 transition-all duration-700 delay-900 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="font-mono-label text-[#A9B5AA] mb-2">Intentional Dating</div>
        <div className="w-12 h-0.5 bg-[#D9FF3D]" />
      </div>

      {/* Bottom Center Scroll Indicator */}
      <button
        onClick={scrollToNext}
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 transition-all duration-700 delay-1000 hover:opacity-80 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-mono-label text-[#A9B5AA]">Scroll</span>
        <ChevronDown className="w-5 h-5 text-[#A9B5AA] scroll-indicator" />
      </button>

      {/* Top Right Join Button */}
      <button
        onClick={() => setShowEmailModal(true)}
        className={`absolute top-8 right-8 z-20 btn-outline text-xs py-2.5 px-5 transition-all duration-700 delay-600 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Join the list
      </button>

      {/* Logo Top Left */}
      <div
        className={`absolute top-8 left-8 z-20 transition-all duration-700 delay-400 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-display text-xl text-[#F6FFF2]">ROOTED HEARTS</span>
      </div>
    </section>
  );
};

export default HeroSection;
