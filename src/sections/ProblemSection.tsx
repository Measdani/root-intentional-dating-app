import React, { useEffect, useRef, useState } from 'react';

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
      className="section-pinned bg-[#0B0F0C] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80"
          alt="Misty forest"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 gradient-vignette opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F0C]/40 via-transparent to-[#0B0F0C]/40" />
        <div className="absolute inset-y-0 right-0 w-[55vw] bg-gradient-to-l from-[#0B0F0C]/70 via-[#0B0F0C]/45 to-transparent" />
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
        <div className="rounded-2xl border border-white/10 bg-[#0B0F0C]/35 backdrop-blur-[2px] p-6">
          <h2 className="font-display text-[clamp(36px,5vw,72px)] text-[#F6FFF2] mb-6 leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            SWIPE.<br />
            MATCH.<br />
            <span className="text-[#DDE7DE]">FORGET.</span>
          </h2>
          <p className="text-[#E8F2E8] text-lg leading-relaxed drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
            Most apps train you to keep searching. We built something for people who want to stop.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
