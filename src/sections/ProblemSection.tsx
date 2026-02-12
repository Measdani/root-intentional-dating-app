import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

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

  const scrollToAssessment = () => {
    const section = document.getElementById('section-assessment');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-problem"
      className="section-pinned bg-[#0B0F0C] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80"
          alt="Misty forest"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F0C]/70 via-transparent to-[#0B0F0C]/70" />
      </div>

      {/* Left Circle */}
      <div
        className={`absolute left-[5vw] top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[50vw]'
        }`}
      >
        <div className="w-[45vw] h-[45vw] max-w-[520px] max-h-[520px] circle-frame">
          <div className="absolute inset-3 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1511497584788-876760111969?w=600&q=80"
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F0C]/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right Text Block */}
      <div
        className={`absolute right-[8vw] top-1/2 -translate-y-1/2 max-w-[420px] transition-all duration-1000 delay-200 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[40vw]'
        }`}
      >
        <h2 className="font-display text-[clamp(36px,5vw,72px)] text-[#F6FFF2] mb-6 leading-none">
          SWIPE.<br />
          MATCH.<br />
          <span className="text-[#A9B5AA]">FORGET.</span>
        </h2>
        <p className="text-[#A9B5AA] text-lg leading-relaxed mb-6">
          Most apps train you to keep searching. We built something for people who want to stop.
        </p>
        <div className="w-16 h-0.5 bg-[#D9FF3D] mb-6" />
        <button
          onClick={scrollToAssessment}
          className="inline-flex items-center gap-2 text-[#D9FF3D] font-medium hover:gap-4 transition-all duration-300"
        >
          See how we are different
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

export default ProblemSection;
