import React from 'react';

const ProblemSection: React.FC = () => {
  return (
    <section
      id="section-problem"
      className="section-pinned bg-[#0B0F0C] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1511497584788-876760111969?w=1920&q=80"
          alt="Misty forest"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 gradient-vignette opacity-5" />
      </div>

      {/* Left Circle */}
      <div className="absolute left-[5vw] top-1/2 -translate-y-1/2">
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
      <div className="absolute right-[8vw] top-1/2 -translate-y-1/2 max-w-[420px] bg-[#0B0F0C]/85 backdrop-blur-sm rounded-lg p-8">
        <h2 className="font-display text-[clamp(36px,5vw,72px)] text-[#F6FFF2] mb-6 leading-none">
          SWIPE.<br />
          MATCH.<br />
          <span className="text-[#A9B5AA]">FORGET.</span>
        </h2>
        <p className="text-[#A9B5AA] text-lg leading-relaxed">
          Most apps train you to keep searching. We built something for people who want to stop.
        </p>
      </div>
    </section>
  );
};

export default ProblemSection;
