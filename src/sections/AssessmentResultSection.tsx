import React, { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { Check, AlertTriangle, TrendingUp, RotateCcw, Lock } from 'lucide-react';

const AssessmentResultSection: React.FC = () => {
  const { assessmentResult, setCurrentView, resetAssessment, canRetakeAssessment, getNextRetakeDate } = useApp();

  if (!assessmentResult) return null;

  const handleContinue = () => {
    // Write assessmentPassed + score back to currentUser in localStorage
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const updated = {
          ...JSON.parse(savedUser),
          assessmentPassed: assessmentResult.passed,
          alignmentScore: assessmentResult.percentage,
        };
        localStorage.setItem('currentUser', JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('user-login', { detail: updated }));
      }
    } catch (err) {
      console.error('Failed to update assessmentPassed:', err);
    }

    // Route based on assessment result
    if (assessmentResult.passed) {
      setCurrentView('browse');
    } else {
      setCurrentView('growth-mode');
    }
  };

  const canRetake = useMemo(() => canRetakeAssessment(), [canRetakeAssessment]);
  const nextRetakeDate = useMemo(() => getNextRetakeDate(), [getNextRetakeDate]);

  const formatRetakeDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0">
        <img
          src="https://images.unsplash.com/photo-1516214104703-d870798883c5?w=1920&q=80"
          alt="Nature"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-[#0B0F0C]/70" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="bg-[#111611]/90 backdrop-blur-sm rounded-[32px] border border-[#1A211A] p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                assessmentResult.passed ? 'bg-[#D9FF3D]/20' : 'bg-amber-500/20'
              }`}
            >
              {assessmentResult.passed ? (
                <Check className="w-10 h-10 text-[#D9FF3D]" />
              ) : (
                <TrendingUp className="w-10 h-10 text-amber-500" />
              )}
            </div>
            <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-3">
              {assessmentResult.passed ? 'You Passed' : 'Inner Work Space'}
            </h2>
            <p className="text-[#A9B5AA] text-lg">
              {assessmentResult.passed
                ? 'You demonstrate the readiness this community values.'
                : 'This is not rejection. It is preparation.'}
            </p>
          </div>

          {/* Score Display */}
          <div className="flex items-center justify-center gap-8 mb-10">
            <div className="text-center">
              <div className="text-5xl font-display text-[#F6FFF2] mb-1">
                {assessmentResult.percentage}%
              </div>
              <div className="font-mono-label text-[#A9B5AA]">Overall Score</div>
            </div>
            <div className="w-px h-16 bg-[#1A211A]" />
            <div className="text-center">
              <div className="text-5xl font-display text-[#D9FF3D] mb-1">
                78%
              </div>
              <div className="font-mono-label text-[#A9B5AA]">Threshold</div>
            </div>
          </div>

          {/* Category Scores */}
          <div className="mb-10">
            <h3 className="font-mono-label text-[#A9B5AA] mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(assessmentResult.categoryScores).map(([category, score]) => (
                <div key={category} className="flex items-center gap-4">
                  <span className="text-[#F6FFF2] text-sm capitalize flex-1">
                    {category.replace(/-/g, ' ')}
                  </span>
                  <div className="flex-1 max-w-[200px]">
                    <div className="h-2 bg-[#1A211A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          score >= 70 ? 'bg-[#D9FF3D]' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[#F6FFF2] text-sm w-12 text-right">{score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Integrity Flags */}
          {assessmentResult.integrityFlags.length > 0 && (
            <div className="mb-10 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-amber-500 font-medium mb-1">Areas for Attention</h4>
                  <ul className="space-y-1">
                    {assessmentResult.integrityFlags.map((flag, idx) => (
                      <li key={idx} className="text-[#A9B5AA] text-sm">{flag}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Growth Areas */}
          {!assessmentResult.passed && assessmentResult.growthAreas.length > 0 && (
            <div className="mb-10">
              <h3 className="font-mono-label text-[#A9B5AA] mb-3">Recommended Growth Areas</h3>
              <div className="flex flex-wrap gap-2">
                {assessmentResult.growthAreas.map((area, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[#1A211A] text-[#F6FFF2] text-sm rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContinue}
              className="btn-primary flex-1"
            >
              {assessmentResult.passed ? 'Explore Profiles' : 'Enter Inner Work Space'}
            </button>
            {!assessmentResult.passed && (
              canRetake ? (
                <button
                  onClick={handleRetake}
                  className="btn-outline flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake Assessment
                </button>
              ) : (
                <div className="flex-1 sm:flex-1 px-4 py-3.5 bg-[#1A211A]/50 border border-[#1A211A] rounded-lg flex items-center justify-center gap-3">
                  <Lock className="w-4 h-4 text-[#A9B5AA]" />
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-[#F6FFF2] font-medium">Assessment Locked</p>
                    <p className="text-xs text-[#A9B5AA]">
                      You can retake on {nextRetakeDate ? formatRetakeDate(nextRetakeDate) : 'later'}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultSection;
