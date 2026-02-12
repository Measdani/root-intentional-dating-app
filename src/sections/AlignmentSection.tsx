import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Heart, Eye, MapPin, ArrowRight } from 'lucide-react';

const AlignmentSection: React.FC = () => {
  const { users, setSelectedUser, setCurrentView } = useApp();
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

  const handleViewProfile = (user: typeof users[0]) => {
    setSelectedUser(user);
    setCurrentView('profile');
  };

  const topMatch = users[0];

  return (
    <section
      ref={sectionRef}
      id="section-alignment"
      className="section-pinned bg-[#0B0F0C] flex items-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80"
          alt="Forest canopy"
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#0B0F0C]/70 via-transparent to-[#0B0F0C]/70" />
      </div>

      {/* Left Text Block */}
      <div
        className={`absolute left-[8vw] top-1/2 -translate-y-1/2 max-w-[400px] transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[40vw]'
        }`}
      >
        <h2 className="font-display text-[clamp(32px,4.5vw,64px)] text-[#F6FFF2] mb-6 leading-none">
          VALUES FIRST.<br />
          <span className="text-[#A9B5AA]">PHOTOS SECOND.</span>
        </h2>
        <p className="text-[#A9B5AA] text-lg leading-relaxed mb-6">
          See alignment before you see vanity. Decide from substance.
        </p>
        <div className="w-16 h-0.5 bg-[#D9FF3D] mb-6" />
        <button
          onClick={() => setCurrentView('browse')}
          className="inline-flex items-center gap-2 text-[#D9FF3D] font-medium hover:gap-4 transition-all duration-300"
        >
          Browse all profiles
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right Circle with Profile Card */}
      <div
        className={`absolute right-[5vw] top-1/2 -translate-y-1/2 transition-all duration-1000 delay-200 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[50vw]'
        }`}
      >
        <div className="w-[45vw] h-[45vw] max-w-[520px] max-h-[520px] circle-frame relative">
          <div className="absolute inset-3 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80"
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-[#0B0F0C]/60 to-transparent" />
          </div>

          {/* Profile Card */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%]">
            <div className="card-rooted p-5 md:p-6">
              {/* Card Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                  <span className="text-[#0B0F0C] font-display text-lg md:text-xl">
                    {topMatch.name[0]}
                  </span>
                </div>
                <div>
                  <h3 className="text-[#0B0F0C] font-semibold text-lg">{topMatch.name}, {topMatch.age}</h3>
                  <div className="flex items-center gap-1 text-[#0B0F0C]/60 text-sm">
                    <MapPin className="w-3 h-3" />
                    {topMatch.city}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-2xl md:text-3xl font-display text-[#D9FF3D]">
                    {topMatch.alignmentScore}%
                  </div>
                  <div className="text-xs text-[#0B0F0C]/50 font-mono-label">Alignment</div>
                </div>
              </div>

              {/* Values */}
              <div className="mb-4">
                <p className="text-xs text-[#0B0F0C]/50 font-mono-label mb-2">TOP 5 VALUES</p>
                <div className="flex flex-wrap gap-1.5">
                  {topMatch.values.map((value, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-[#0B0F0C] text-[#F6FFF2] text-xs rounded-full"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Growth Focus */}
              <div className="mb-4">
                <p className="text-xs text-[#0B0F0C]/50 font-mono-label mb-1">GROWTH FOCUS</p>
                <p className="text-[#0B0F0C] text-sm">{topMatch.growthFocus}</p>
              </div>

              {/* Family Intent */}
              <div className="mb-5">
                <p className="text-xs text-[#0B0F0C]/50 font-mono-label mb-1">FAMILY INTENT</p>
                <p className="text-[#0B0F0C] text-sm capitalize">
                  {topMatch.familyAlignment.wantsChildren.replace(/-/g, ' ')} · {' '}
                  {topMatch.familyAlignment.hasChildren ? 'Has children' : 'No children'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleViewProfile(topMatch)}
                  className="flex-1 py-2.5 bg-[#0B0F0C] text-[#F6FFF2] rounded-full text-sm font-medium hover:bg-[#1A211A] transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Profile
                </button>
                <button className="w-10 h-10 rounded-full border-2 border-[#0B0F0C] flex items-center justify-center hover:bg-[#0B0F0C] hover:text-[#F6FFF2] transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlignmentSection;
