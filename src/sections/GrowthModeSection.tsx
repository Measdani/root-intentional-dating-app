import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Calendar, Sparkles, Target } from 'lucide-react';

const GrowthModeSection: React.FC = () => {
  const { assessmentResult, setCurrentView, resetAssessment } = useApp();
  const [activeResource, setActiveResource] = useState<string | null>(null);

  const handleRetake = () => {
    resetAssessment();
    setCurrentView('landing');
    setTimeout(() => {
      const section = document.getElementById('section-assessment');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl text-[#F6FFF2]">Growth Mode</h1>
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero Message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-4">
            This Is Not Rejection
          </h2>
          <p className="text-[#A9B5AA] text-lg max-w-lg mx-auto">
            It is preparation. Healing is honored here. Structured, supported, and never lonely.
          </p>
        </div>

        {/* Score Card */}
        {assessmentResult && (
          <div className="bg-[#111611] rounded-[24px] border border-[#1A211A] p-6 md:p-8 mb-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <p className="font-mono-label text-[#A9B5AA] mb-2">Your Assessment Score</p>
                <div className="flex items-baseline gap-2 justify-center md:justify-start">
                  <span className="text-5xl font-display text-[#F6FFF2]">{assessmentResult.percentage}%</span>
                  <span className="text-[#A9B5AA]">/ 78% threshold</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center px-6 py-3 bg-[#1A211A] rounded-xl">
                  <Calendar className="w-5 h-5 text-[#D9FF3D] mx-auto mb-1" />
                  <p className="text-xs text-[#A9B5AA]">Retake in</p>
                  <p className="text-[#F6FFF2] font-medium">6 months</p>
                </div>
              </div>
            </div>

            {assessmentResult.growthAreas.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#1A211A]">
                <p className="font-mono-label text-[#A9B5AA] mb-3">Your Growth Areas</p>
                <div className="flex flex-wrap gap-2">
                  {assessmentResult.growthAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-sm rounded-full flex items-center gap-1.5"
                    >
                      <Target className="w-3 h-3" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Growth Resources */}
        <div className="mb-10">
          <h3 className="font-mono-label text-[#A9B5AA] mb-6">Recommended Resources</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {growthResources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => setActiveResource(activeResource === resource.id ? null : resource.id)}
                className={`bg-[#111611] rounded-[20px] border p-5 cursor-pointer transition-all duration-300 ${
                  activeResource === resource.id
                    ? 'border-[#D9FF3D]'
                    : 'border-[#1A211A] hover:border-[#2A312A]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#1A211A] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-[#D9FF3D]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#F6FFF2] font-medium mb-1">{resource.title}</h4>
                    <p className="text-[#A9B5AA] text-sm mb-3">{resource.description}</p>
                    <div className="flex items-center gap-4 text-xs text-[#A9B5AA]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.estimatedTime}
                      </span>
                      <span className="px-2 py-0.5 bg-[#1A211A] rounded-full">
                        {resource.category}
                      </span>
                    </div>
                  </div>
                </div>

                {activeResource === resource.id && (
                  <div className="mt-4 pt-4 border-t border-[#1A211A]">
                    <p className="text-[#A9B5AA] text-sm mb-3">
                      This resource will help you develop practical skills in {resource.category.toLowerCase()}.
                      Work through it at your own pace.
                    </p>
                    <button className="text-[#D9FF3D] text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Mark as started
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setCurrentView('landing')}
            className="btn-primary"
          >
            Return Home
          </button>
          <button
            onClick={handleRetake}
            className="btn-outline"
          >
            Retake Assessment
          </button>
        </div>

        {/* Encouragement */}
        <div className="mt-12 text-center">
          <p className="text-[#A9B5AA]/60 text-sm max-w-md mx-auto">
            "The work you do now will be the foundation of the relationship you want later. 
            This is not a delay—it is an investment."
          </p>
        </div>
      </main>
    </div>
  );
};

export default GrowthModeSection;
