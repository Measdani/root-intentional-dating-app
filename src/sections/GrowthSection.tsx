import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Sprout, BookOpen, Calendar } from 'lucide-react';
import { growthResources } from '@/data/assessment';

const GrowthSection: React.FC = () => {
  const { setCurrentView } = useApp();
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
      id="section-growth"
      className="section-pinned bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1920&q=80"
          alt="Growing tree"
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-[#0B0F0C]/50" />
      </div>

      {/* Center Circle */}
      <div
        className={`relative z-10 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <div className="w-[90vw] h-[90vw] max-w-[680px] max-h-[680px] circle-frame">
          <div className="absolute inset-4 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=700&q=80"
              alt=""
              className="w-full h-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/90 via-[#0B0F0C]/50 to-[#0B0F0C]/70" />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-6 md:px-10 w-full max-w-lg">
            <div
              className={`w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-5 transition-all duration-700 delay-200 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
            >
              <Sprout className="w-8 h-8 text-[#D9FF3D]" />
            </div>

            <h2
              className={`font-display text-[clamp(28px,4vw,48px)] text-[#F6FFF2] mb-4 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              NOT READY?<br />THAT'S OKAY.
            </h2>

            <p
              className={`text-[#A9B5AA] text-base md:text-lg mb-6 max-w-sm mx-auto transition-all duration-700 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              Growth Mode gives you tools, not rejection. Come back stronger.
            </p>

            {/* Growth Resources Preview */}
            <div
              className={`grid grid-cols-3 gap-2 mb-6 transition-all duration-700 delay-600 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {growthResources.slice(0, 3).map((resource) => (
                <div
                  key={resource.id}
                  className="bg-[#111611]/80 backdrop-blur-sm rounded-xl p-3 border border-[#1A211A]"
                >
                  <BookOpen className="w-4 h-4 text-[#D9FF3D] mb-2" />
                  <p className="text-[#F6FFF2] text-xs font-medium leading-tight">{resource.title}</p>
                  <p className="text-[#A9B5AA] text-[10px] mt-1">{resource.estimatedTime}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCurrentView('growth-mode')}
              className={`btn-primary transition-all duration-700 delay-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Learn about Growth Mode
            </button>

            <p
              className={`text-[#A9B5AA]/60 text-xs mt-4 transition-all duration-700 delay-800 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              Retake assessment after 6 months
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GrowthSection;
