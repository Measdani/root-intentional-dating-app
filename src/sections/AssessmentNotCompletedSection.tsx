import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { PATH_LABELS } from '@/lib/pathways';

const AssessmentNotCompletedSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [showDetails, setShowDetails] = useState(false);

  const growthFocusItems = [
    'Emotional Regulation Foundations',
    'The Art of Accountability',
    'Building Wholeness',
    'Growth-focused dating connections'
  ];

  const handleEnterInnerWork = () => {
    setCurrentView('growth-mode');
  };

  const handleLearnMore = () => {
    setShowDetails(!showDetails);
  };

  return (
    <section className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-4 md:p-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80"
          alt="Forest"
          className="w-full h-full object-cover opacity-20"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full">
        <div className="bg-[#0B0F0C]/95 rounded-2xl border border-[#1A211A] p-8 md:p-12 space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-8 h-8 text-[#D9FF3D] flex-shrink-0 mt-1" />
              <h1 className="text-[#F6FFF2] font-display text-3xl md:text-4xl">
                Assessment Not Completed
              </h1>
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-6 text-[#A9B5AA]">
            <p className="text-base leading-relaxed">
              To protect alignment within our connection environments, the readiness assessment must be completed in one sitting.
            </p>

            <div className="bg-[#111611]/50 border border-[#1A211A] rounded-xl p-6 space-y-3">
              <p className="text-[#F6FFF2] font-semibold">
                Because your assessment was not finished, your account has been placed in <span className="text-[#D9FF3D]">{PATH_LABELS.intentional}</span>.
              </p>
              <p className="text-[#A9B5AA] italic">
                This is not a rejection.
              </p>
              <p className="text-[#A9B5AA]">
                It is a structured starting point.
              </p>
            </div>
          </div>

          {/* What's Available */}
          <div className="space-y-4">
            <h2 className="text-[#F6FFF2] font-semibold text-lg">
              {PATH_LABELS.intentional} provides access to:
            </h2>
            <div className="space-y-3">
              {growthFocusItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#D9FF3D] mt-2 flex-shrink-0" />
                  <p className="text-[#A9B5AA]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Retake Info */}
          <div className="bg-[#111611]/50 border border-[#1A211A] rounded-xl p-6">
            <p className="text-[#A9B5AA] text-sm">
              You may retake the assessment after 6 months of active membership.
            </p>
          </div>

          {/* Details Section */}
          {showDetails && (
            <div className="bg-[#111611]/50 border border-[#1A211A] rounded-xl p-6 space-y-4 animate-in fade-in">
              <h3 className="text-[#F6FFF2] font-semibold">Why Placement Matters</h3>
              <div className="space-y-4 text-[#A9B5AA] text-sm leading-relaxed">
                <p>
                  Our placement process isn't about judgment—it's about creating the right environment for your growth. When an assessment isn't completed, it signals that either the timing wasn't right, or additional reflection is needed before diving into intentional dating.
                </p>
                <p>
                  {PATH_LABELS.intentional} is designed for exactly this: deepening your self-awareness, strengthening your emotional foundations, and preparing you for the kind of intentional connections we facilitate.
                </p>
                <p>
                  Many of our most successful members started in this space. The work you do here directly translates to healthier, more aligned relationships.
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleEnterInnerWork}
              className="w-full bg-[#D9FF3D] text-[#0B0F0C] font-semibold py-4 rounded-xl hover:bg-[#E8FF5C] transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              Enter {PATH_LABELS.intentional}
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleLearnMore}
              className="w-full px-6 py-3 rounded-xl border border-[#D9FF3D]/50 bg-transparent text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition-all duration-300 font-semibold"
            >
              {showDetails ? 'Hide Details' : 'Learn Why Placement Matters'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AssessmentNotCompletedSection;
