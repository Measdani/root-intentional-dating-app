import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { membershipTiers } from '@/data/assessment';
import { Check, Sparkles } from 'lucide-react';

const MembershipSection: React.FC = () => {
  const { setShowEmailModal, hasJoinedList } = useApp();
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-membership"
      className="min-h-screen bg-[#F3F7F4] relative py-20 px-6"
    >
      {/* Subtle Background Texture */}
      <div className="absolute inset-0 opacity-10">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="font-display text-[clamp(40px,6vw,80px)] text-[#0B0F0C] mb-4">
            MEMBERSHIP
          </h2>
          <p className="text-[#0B0F0C]/60 text-lg md:text-xl max-w-lg">
            A small commitment that keeps the community serious.
          </p>
          <div className="w-16 h-1 bg-[#D9FF3D] mt-6" />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {membershipTiers.map((tier, idx) => (
            <div
              key={tier.id}
              className={`bg-[#0B0F0C] rounded-[28px] p-6 md:p-8 relative transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              }`}
              style={{ transitionDelay: `${200 + idx * 100}ms` }}
            >
              {/* Badge */}
              {tier.badge && (
                <div className="absolute -top-3 right-6 px-3 py-1 bg-[#D9FF3D] rounded-full">
                  <span className="text-[#0B0F0C] text-xs font-semibold">{tier.badge}</span>
                </div>
              )}

              <h3 className="text-[#F6FFF2] font-semibold text-xl mb-2">{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-[#F6FFF2] font-display text-4xl">{tier.price}</span>
                <span className="text-[#A9B5AA] text-sm">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-center gap-3 text-[#A9B5AA] text-sm">
                    <Check className="w-4 h-4 text-[#D9FF3D]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setShowEmailModal(true)}
                className={`w-full py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                  hasJoinedList
                    ? 'bg-[#1A211A] text-[#A9B5AA]'
                    : 'bg-[#D9FF3D] text-[#0B0F0C] hover:scale-105'
                }`}
              >
                {hasJoinedList ? 'You are on the list' : 'Join the list'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="border-t border-[#0B0F0C]/10 pt-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className="font-display text-2xl text-[#0B0F0C]">ROOTED</span>
              <p className="text-[#0B0F0C]/50 text-sm mt-2">
                Dating for people who are ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <a href="#" className="text-[#0B0F0C]/60 hover:text-[#0B0F0C] transition-colors">
                Contact
              </a>
              <a href="#" className="text-[#0B0F0C]/60 hover:text-[#0B0F0C] transition-colors">
                FAQ
              </a>
              <a href="#" className="text-[#0B0F0C]/60 hover:text-[#0B0F0C] transition-colors">
                Privacy
              </a>
              <a href="#" className="text-[#0B0F0C]/60 hover:text-[#0B0F0C] transition-colors">
                Terms
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[#0B0F0C]/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#0B0F0C]/40 text-xs">
              © 2026 Rooted Hearts. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-[#0B0F0C]/40 text-xs">
              <Sparkles className="w-3 h-3" />
              Built with intention
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
};

export default MembershipSection;
