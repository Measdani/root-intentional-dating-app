import React, { useMemo, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import {
  communityIdToPoolId,
  getUserPoolId,
  persistUserPoolMembership,
  toAdvancedPool,
  toInnerPool,
  useCommunity,
} from '@/modules';
import { Check, AlertTriangle, TrendingUp, Lock } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { userService } from '@/services/userService';

const AssessmentResultSection: React.FC = () => {
  const { assessmentResult, setCurrentView, canRetakeAssessment, getNextRetakeDate } = useApp();
  const { activeCommunity } = useCommunity();
  const isLgbtqCommunity = activeCommunity.matchingMode === 'inclusive';

  if (!assessmentResult) return null;

  // Auto-save assessment result immediately when component mounts
  useEffect(() => {
    const saveResult = async () => {
      let userId: string | undefined;
      console.log('[AssessmentResult] Component mounted, auto-saving result...', {
        passed: assessmentResult.passed,
        percentage: assessmentResult.percentage
      });

      // Save to database first
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          userId = user.id;
          await assessmentService.saveAssessmentResult(user.id, assessmentResult);
          console.log('[AssessmentResult] Saved to Supabase');
        }
      } catch (err) {
        console.error('[AssessmentResult] Failed to save to database:', err);
      }

      // Save assessment result to persistent storage (survives logout/login)
      try {
        const persistentResult = {
          ...assessmentResult,
          timestamp: Date.now(),
          userId,
        };
        localStorage.setItem('assessmentResult', JSON.stringify(persistentResult));
        if (userId) {
          localStorage.setItem(`assessmentResult_${userId}`, JSON.stringify(persistentResult));
        }
        console.log('[AssessmentResult] Saved to localStorage assessmentResult');
      } catch (err) {
        console.error('[AssessmentResult] Failed to save assessmentResult:', err);
      }

      // Write assessmentPassed + score back to currentUser in localStorage
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const rawUser = JSON.parse(savedUser);
          const currentPoolId = getUserPoolId(rawUser, communityIdToPoolId(activeCommunity.id));
          const nextPoolId = assessmentResult.passed
            ? toAdvancedPool(currentPoolId)
            : toInnerPool(currentPoolId);
          const updated = {
            ...rawUser,
            assessmentPassed: assessmentResult.passed,
            alignmentScore: assessmentResult.percentage,
            userStatus: assessmentResult.passed ? 'active' : 'needs-growth',
            poolId: nextPoolId,
          };
          persistUserPoolMembership(updated, nextPoolId);
          localStorage.setItem('currentUser', JSON.stringify(updated));
          await userService.updateUser(updated.id, {
            assessmentPassed: updated.assessmentPassed,
            alignmentScore: updated.alignmentScore,
            userStatus: updated.userStatus,
            poolId: nextPoolId,
          });
          window.dispatchEvent(new CustomEvent('user-login', { detail: updated }));
          console.log('[AssessmentResult] Auto-saved result. userStatus:', updated.userStatus);
        }
      } catch (err) {
        console.error('[AssessmentResult] Failed to update assessmentPassed:', err);
      }
    };

    saveResult();
  }, [assessmentResult, activeCommunity.id]);

  const handleContinue = async () => {
    let userId: string | undefined;
    // Save to database first
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        userId = user.id;
        await assessmentService.saveAssessmentResult(user.id, assessmentResult);
      }
    } catch (err) {
      console.error('Failed to save assessment result to database:', err);
    }

    // Save assessment result to persistent storage (survives logout/login)
    try {
      const persistentResult = {
        ...assessmentResult,
        timestamp: Date.now(),
        userId,
      };
      localStorage.setItem('assessmentResult', JSON.stringify(persistentResult));
      if (userId) {
        localStorage.setItem(`assessmentResult_${userId}`, JSON.stringify(persistentResult));
      }
    } catch (err) {
      console.error('Failed to save assessment result:', err);
    }

    // Write assessmentPassed + score back to currentUser in localStorage
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const rawUser = JSON.parse(savedUser);
        const currentPoolId = getUserPoolId(rawUser, communityIdToPoolId(activeCommunity.id));
        const nextPoolId = assessmentResult.passed
          ? toAdvancedPool(currentPoolId)
          : toInnerPool(currentPoolId);
        const updated = {
          ...rawUser,
          assessmentPassed: assessmentResult.passed,
          alignmentScore: assessmentResult.percentage,
          userStatus: assessmentResult.passed ? 'active' : 'needs-growth',
          poolId: nextPoolId,
        };
        persistUserPoolMembership(updated, nextPoolId);
        localStorage.setItem('currentUser', JSON.stringify(updated));
        await userService.updateUser(updated.id, {
          assessmentPassed: updated.assessmentPassed,
          alignmentScore: updated.alignmentScore,
          userStatus: updated.userStatus,
          poolId: nextPoolId,
        });
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

  const strengths = [
    'You showed honesty in your responses, which is the foundation for growth.',
    'You completed a reflective process that many avoid.',
    'You now have clarity on where to focus for healthier partnership.'
  ];

  const developmentAreas = assessmentResult.growthAreas.length > 0
    ? assessmentResult.growthAreas
    : [
      'Emotional regulation during conflict',
      'Communication clarity and repair skills',
      'Boundary awareness and consistency'
    ];
  const normalizedIntegrityFlags = assessmentResult.integrityFlags.map((flag) => {
    if (flag === 'Multiple concerning responses detected') {
      return 'Your responses indicate meaningful opportunities for deeper skill development.';
    }
    if (flag === 'Significant growth areas identified') {
      return 'Strengthening these areas will improve relationship stability and connection quality.';
    }
    return flag;
  });

  const formatRetakeDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
              {assessmentResult.passed
                ? isLgbtqCommunity
                  ? 'Welcome to LGBTQ+ Alignment Space'
                  : 'Welcome to Alignment Space'
                : isLgbtqCommunity
                  ? 'LGBTQ+ Inner Work Space'
                  : 'Inner Work Space'}
            </h2>
            <p className="text-[#A9B5AA] text-lg">
              {assessmentResult.passed
                ? isLgbtqCommunity
                  ? 'You demonstrate emotional maturity, integrity, and intentionality - the foundation of this LGBTQ+ community space.'
                  : 'You demonstrate emotional maturity, integrity, and intentionality - the foundation this community is built on.'
                : isLgbtqCommunity
                  ? 'This is not rejection. It is preparation for stronger, safer connection.'
                  : 'This is not rejection. It is preparation.'}
            </p>
          </div>

          {assessmentResult.passed ? (
            <div className="mb-10 text-center p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
              <p className="font-mono-label text-[#A9B5AA] mb-2">Alignment Score</p>
              <p className="text-5xl font-display text-[#D9FF3D]">{assessmentResult.percentage}%</p>
            </div>
          ) : (
            <div className="mb-10 p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
              <p className="text-[#D9FF3D] font-semibold mb-2">Growth Mode: Skill Development Phase</p>
              <p className="text-sm text-[#A9B5AA] leading-relaxed mb-3">
                {isLgbtqCommunity
                  ? 'Based on your assessment responses, Growth Mode has been activated to support intentional skill development before re-entry into the LGBTQ+ alignment pool.'
                  : 'Based on your assessment responses, Growth Mode has been activated to support intentional skill development before re-entry into the alignment pool.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-[#F6FFF2]">
                <Lock className="w-4 h-4 text-[#A9B5AA]" />
                <span>
                  {canRetake
                    ? 'Retake available now'
                    : `Retake available: ${nextRetakeDate ? formatRetakeDate(nextRetakeDate) : 'later'}`}
                </span>
              </div>
            </div>
          )}

          {/* Category Scores */}
          {assessmentResult.passed && (
            <div className="mb-10">
              <h3 className="font-mono-label text-[#A9B5AA] mb-4">Relationship Readiness Profile</h3>
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
                            score >= 70 ? 'bg-[#D9FF3D]' : 'bg-amber-400'
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
          )}

          {assessmentResult.passed && (
            <div className="mb-10 p-4 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
              <h3 className="text-[#D9FF3D] font-medium mb-2">Areas to Continue Strengthening</h3>
              <p className="text-sm text-[#A9B5AA]">Accountability (Growth Focus)</p>
            </div>
          )}

          {/* Integrity Flags */}
          {normalizedIntegrityFlags.length > 0 && (
            <div className="mb-10 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-amber-500 font-medium mb-1">Growth Insights</h4>
                  <ul className="space-y-1">
                    {normalizedIntegrityFlags.map((flag, idx) => (
                      <li key={idx} className="text-[#A9B5AA] text-sm">{flag}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {!assessmentResult.passed && (
            <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
                <h3 className="text-[#D9FF3D] font-medium mb-3">Your Strengths</h3>
                <ul className="space-y-2">
                  {strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-[#A9B5AA]">{strength}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
                <h3 className="text-amber-500 font-medium mb-3">Growth Focus Areas</h3>
                <ul className="space-y-2">
                  {developmentAreas.map((area, idx) => (
                    <li key={idx} className="text-sm text-[#A9B5AA] capitalize">{area}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleContinue}
              className="btn-primary flex-1"
            >
              {assessmentResult.passed
                ? isLgbtqCommunity
                  ? 'Explore LGBTQ+ Profiles'
                  : 'Explore Profiles'
                : isLgbtqCommunity
                  ? 'Enter LGBTQ+ Inner Work Space'
                  : 'Enter Inner Work Space'}
            </button>
            {!assessmentResult.passed && (
              <button
                onClick={() => setCurrentView('community-blog')}
                className="px-6 py-3 rounded-lg border border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition-all duration-200 font-medium"
              >
                Explore Our Relationship Philosophy
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultSection;
