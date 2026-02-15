import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import { ArrowLeft, BookOpen, Clock, CheckCircle, Calendar, Sparkles, TrendingUp, AlertCircle, X } from 'lucide-react';

const GrowthModeSection: React.FC = () => {
  const { assessmentResult, setCurrentView, resetAssessment, currentUser } = useApp();
  const [dismissNotification, setDismissNotification] = useState(false);
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

      {/* Account Status Notification */}
      {(currentUser.userStatus === 'suspended' || currentUser.userStatus === 'needs-growth') && !dismissNotification && (
        <div className={currentUser.userStatus === 'suspended' ? 'bg-red-600/20 border-t border-red-500/30' : 'bg-orange-600/20 border-t border-orange-500/30'}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-start gap-4">
            <AlertCircle className={currentUser.userStatus === 'suspended' ? 'w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' : 'w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5'} />
            <div className="flex-1">
              {currentUser.userStatus === 'suspended' ? (
                <>
                  <h3 className="text-red-300 font-semibold mb-1">Account Suspended</h3>
                  <p className="text-red-200/80 text-sm mb-3">
                    Your account has been temporarily suspended due to violations of our community guidelines. You have been placed in Growth Mode to focus on strengthening your relationship foundation.
                  </p>
                  {currentUser.suspensionEndDate && (
                    <p className="text-red-200/80 text-sm">
                      <strong>Reactivation Date:</strong> {new Date(currentUser.suspensionEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-orange-300 font-semibold mb-1">Account Status: Growth Mode</h3>
                  <p className="text-orange-200/80 text-sm">
                    Your account has transitioned to Growth Mode. You must complete one of the learning paths below before you can resume browsing and matching. This is an opportunity to strengthen your relationship foundation.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setDismissNotification(true)}
              className={currentUser.userStatus === 'suspended' ? 'flex-shrink-0 text-red-300 hover:text-red-200 transition-colors' : 'flex-shrink-0 text-orange-300 hover:text-orange-200 transition-colors'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero Message */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-4">
            Alignment Requires Readiness
          </h2>
          <p className="text-[#A9B5AA] text-lg max-w-2xl mx-auto mb-6">
            Based on your current assessment, we recommend strengthening a few foundational areas before entering partnership mode.
          </p>
          <p className="text-[#A9B5AA] text-base max-w-2xl mx-auto">
            This is not exclusion — it is preparation. Strong partnerships are built on emotional stability, accountability, and conflict repair skills. Entering intentionally protects both you and your future partner.
          </p>
        </div>

        {/* Score Card */}
        {assessmentResult && (
          <div className="bg-[#111611] rounded-[24px] border border-[#1A211A] p-6 md:p-8 mb-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
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

            {/* Assessment Areas Section */}
            {assessmentResult.categoryScores && (
              <div className="mb-6 pt-6 border-t border-[#1A211A]">
                <p className="font-mono-label text-[#A9B5AA] mb-4">Assessment Areas</p>
                <div className="space-y-3">
                  {Object.entries(assessmentResult.categoryScores).map(([category, score]) => (
                    <div key={category} className="flex items-center gap-4">
                      <span className="text-[#F6FFF2] text-sm capitalize flex-1">
                        {category.replace(/-/g, ' ')}
                      </span>
                      <div className="flex-1 max-w-[150px]">
                        <div className="h-1.5 bg-[#1A211A] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              score >= 70 ? 'bg-[#D9FF3D]' : score >= 50 ? 'bg-amber-500' : 'bg-[#A9B5AA]'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[#F6FFF2] text-sm w-10 text-right">{score}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#A9B5AA] mt-4 opacity-75">
                  These areas can be strengthened through guided practice.
                </p>
              </div>
            )}

            {/* Why 6 Months Matters */}
            <div className="pt-6 border-t border-[#1A211A]">
              <p className="font-mono-label text-[#A9B5AA] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Why 6 Months Matters
              </p>
              <div className="space-y-2">
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  <span className="font-medium">Six months allows for measurable behavioral change,</span> not temporary motivation.
                </p>
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  <span className="font-medium">Lasting growth requires repetition, reflection, and practice over time.</span>
                </p>
              </div>
              <p className="text-xs text-[#A9B5AA] mt-3 opacity-75">
                This protects you from rushing into dynamics you are still learning to navigate — and protects your future partner from avoidable harm. Healthy relationships deserve readiness, not urgency.
              </p>
            </div>
          </div>
        )}

        {/* Growth Resources */}
        <div className="mb-12">
          <h3 className="font-mono-label text-[#F6FFF2] mb-2">Complete One Path Below to Re-enter Matchmaking</h3>
          <p className="text-[#A9B5AA] text-sm mb-6">These guided resources help you develop practical skills. Work through at your own pace.</p>
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
          {currentUser.userStatus === 'needs-growth' && (
            <button
              onClick={handleRetake}
              className="btn-primary"
            >
              Retake Assessment
            </button>
          )}
          <button
            onClick={() => setCurrentView('landing')}
            className="btn-outline"
          >
            Return Home
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
