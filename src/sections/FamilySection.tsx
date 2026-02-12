import React, { useEffect, useRef, useState } from 'react';
import { Check, Users, Baby, Heart } from 'lucide-react';

const FamilySection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const familyOptions = [
    { id: 'wants', label: 'Wants children', icon: Baby },
    { id: 'open', label: 'Open to children', icon: Heart },
    { id: 'does-not-want', label: 'Does not want children', icon: Users },
  ];

  return (
    <section
      ref={sectionRef}
      id="section-family"
      className="section-pinned bg-[#0B0F0C] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80"
          alt="Tree grove"
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F0C]/70 via-transparent to-[#0B0F0C]/70" />
      </div>

      {/* Left Circle with Intent Card */}
      <div
        className={`absolute left-[5vw] top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[50vw]'
        }`}
      >
        <div className="w-[45vw] h-[45vw] max-w-[520px] max-h-[520px] circle-frame relative">
          <div className="absolute inset-3 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&q=80"
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F0C]/60 to-transparent" />
          </div>

          {/* Intent Card */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%]">
            <div className="card-rooted p-5 md:p-6">
              <h3 className="text-[#0B0F0C] font-semibold text-lg mb-4">Family Intent</h3>
              <p className="text-[#0B0F0C]/60 text-sm mb-5">
                State your intentions clearly. Filter by what actually matters.
              </p>

              <div className="space-y-2.5">
                {familyOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedOption === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-[#D9FF3D] bg-[#D9FF3D]/10'
                          : 'border-[#0B0F0C]/10 hover:border-[#0B0F0C]/30'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-[#D9FF3D]' : 'bg-[#0B0F0C]/5'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${isSelected ? 'text-[#0B0F0C]' : 'text-[#0B0F0C]/50'}`}
                        />
                      </div>
                      <span className="text-[#0B0F0C] text-sm font-medium flex-1 text-left">
                        {option.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#D9FF3D]" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-[#0B0F0C]/10">
                <p className="text-xs text-[#0B0F0C]/50">
                  This will be visible on your profile. You can change it anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Text Block */}
      <div
        className={`absolute right-[8vw] top-1/2 -translate-y-1/2 max-w-[400px] transition-all duration-1000 delay-200 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[40vw]'
        }`}
      >
        <h2 className="font-display text-[clamp(32px,4.5vw,64px)] text-[#F6FFF2] mb-6 leading-none">
          NO GUESSING.<br />
          <span className="text-[#A9B5AA]">NO GAMES.</span>
        </h2>
        <p className="text-[#A9B5AA] text-lg leading-relaxed mb-6">
          Family intent is stated upfront. Filter by what actually matters. No awkward third-date revelations.
        </p>
        <div className="w-16 h-0.5 bg-[#D9FF3D]" />
      </div>
    </section>
  );
};

export default FamilySection;
