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
import { Check, TrendingUp, Lock } from 'lucide-react';
import { assessmentService } from '@/services/assessmentService';
import { userService } from '@/services/userService';
import { ASSESSMENT_STYLE_META } from '@/services/assessmentStyleService';
import { PATH_LABELS } from '@/lib/pathways';

const AssessmentResultSection: React.FC = () => {
  const { assessmentResult, setCurrentView, canRetakeAssessment, getNextRetakeDate } = useApp();
  const { activeCommunity } = useCommunity();
  const isLgbtqCommunity = activeCommunity.matchingMode === 'inclusive';

  if (!assessmentResult) return null;

  useEffect(() => {
    const saveResult = async () => {
      let userId: string | undefined;
      console.log('[AssessmentResult] Component mounted, auto-saving result...', {
        passed: assessmentResult.passed,
        percentage: assessmentResult.percentage,
      });

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
            primaryStyle: assessmentResult.primaryStyle,
            secondaryStyle: assessmentResult.secondaryStyle,
            userStatus: assessmentResult.passed ? 'active' : 'needs-growth',
            poolId: nextPoolId,
          };
          persistUserPoolMembership(updated, nextPoolId);
          localStorage.setItem('currentUser', JSON.stringify(updated));
          await userService.updateUser(updated.id, {
            assessmentPassed: updated.assessmentPassed,
            alignmentScore: updated.alignmentScore,
            primaryStyle: updated.primaryStyle,
            secondaryStyle: updated.secondaryStyle,
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

    void saveResult();
  }, [assessmentResult, activeCommunity.id]);

  const handleContinue = async () => {
    let userId: string | undefined;
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
          primaryStyle: assessmentResult.primaryStyle,
          secondaryStyle: assessmentResult.secondaryStyle,
          userStatus: assessmentResult.passed ? 'active' : 'needs-growth',
          poolId: nextPoolId,
        };
        persistUserPoolMembership(updated, nextPoolId);
        localStorage.setItem('currentUser', JSON.stringify(updated));
        await userService.updateUser(updated.id, {
          assessmentPassed: updated.assessmentPassed,
          alignmentScore: updated.alignmentScore,
          primaryStyle: updated.primaryStyle,
          secondaryStyle: updated.secondaryStyle,
          userStatus: updated.userStatus,
          poolId: nextPoolId,
        });
        window.dispatchEvent(new CustomEvent('user-login', { detail: updated }));
      }
    } catch (err) {
      console.error('Failed to update assessmentPassed:', err);
    }

    if (assessmentResult.passed) {
      setCurrentView('browse');
    } else {
      setCurrentView('growth-mode');
    }
  };

  const canRetake = useMemo(() => canRetakeAssessment(), [canRetakeAssessment]);
  const nextRetakeDate = useMemo(() => getNextRetakeDate(), [getNextRetakeDate]);
  const primaryStyleMeta = assessmentResult.primaryStyle
    ? ASSESSMENT_STYLE_META[assessmentResult.primaryStyle]
    : null;
  const secondaryStyleMeta = assessmentResult.secondaryStyle
    ? ASSESSMENT_STYLE_META[assessmentResult.secondaryStyle]
    : null;
  const environmentLabel = assessmentResult.passed ? PATH_LABELS.alignment : PATH_LABELS.intentional;

  const formatRetakeDate = (date: Date) => date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-6">
      <div className="fixed inset-0">
        <img
          src="https://images.unsplash.com/photo-1516214104703-d870798883c5?w=1920&q=80"
          alt="Nature"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-[#0B0F0C]/70" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="bg-[#111611]/90 backdrop-blur-sm rounded-[32px] border border-[#1A211A] p-8 md:p-12">
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
              The Root of Your Connection
            </h2>
            <p className="text-[#A9B5AA] text-base mb-2">
              Understanding how we show up in relationships is one of the most powerful steps toward building the connection we truly want.
            </p>
            <p className="text-[#A9B5AA] text-base">
              Thank you for taking the time to complete the assessment.
            </p>
          </div>

          <div className="mb-8 p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
            <p className="text-[#A9B5AA] text-sm leading-relaxed">
              Your responses help us understand how you approach communication, emotional regulation, and connection in relationships. Based on your answers, we&apos;ve identified both your dating environment and your relationship style.
            </p>
          </div>

          <div className="mb-8 p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
            <h3 className="text-[#D9FF3D] font-medium mb-2">Your Dating Environment</h3>
            <p className="text-[#F6FFF2] text-lg mb-2">
              You are entering {environmentLabel}.
            </p>
            <p className="text-sm text-[#A9B5AA] leading-relaxed mb-3">
              This space is designed to support healthy connection while continuing personal growth. Wherever you begin, the goal of Rooted Hearts is the same - helping people build relationships grounded in honesty, respect, and emotional awareness.
            </p>
            {!assessmentResult.passed && (
              <div className="flex items-center gap-2 text-sm text-[#F6FFF2]">
                <Lock className="w-4 h-4 text-[#A9B5AA]" />
                <span>
                  {canRetake
                    ? 'Retake available now'
                    : `Retake available: ${nextRetakeDate ? formatRetakeDate(nextRetakeDate) : 'later'}`}
                </span>
              </div>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
              <p className="text-[#A9B5AA] text-sm mb-2">Your Dating Style</p>
              <p className="text-sm text-[#A9B5AA] mb-4">
                Most people express a blend of relationship styles, but one or two typically stand out.
              </p>
              <p className="text-xs text-[#A9B5AA] mb-2">Primary Style</p>
              {primaryStyleMeta ? (
                <>
                  <p className="text-[#F6FFF2] font-medium">
                    {primaryStyleMeta.emoji} {primaryStyleMeta.label} - {primaryStyleMeta.subtitle}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#A9B5AA]">Not enough style data yet.</p>
              )}
            </div>

            <div className="p-4 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
              <p className="text-xs text-[#A9B5AA] mb-2">Secondary Style</p>
              {secondaryStyleMeta ? (
                <>
                  <p className="text-[#F6FFF2] font-medium">
                    {secondaryStyleMeta.emoji} {secondaryStyleMeta.label} - {secondaryStyleMeta.subtitle}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#A9B5AA]">Not enough style data yet.</p>
              )}
            </div>
          </div>

          <p className="text-sm text-[#A9B5AA] mb-4">
            Understanding your style can help you communicate more clearly, navigate conflict more effectively, and build deeper connection with others.
          </p>

          <div className="mb-8 p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
            <h3 className="text-[#D9FF3D] font-medium mb-3">What You Have Access To</h3>
            <p className="text-sm text-[#A9B5AA] mb-3">
              Inside your space you will have access to several tools designed to support both connection and personal growth:
            </p>
            <ul className="space-y-2 text-sm text-[#A9B5AA] list-disc pl-5">
              <li>{PATH_LABELS.intentional} and {PATH_LABELS.alignment} resources</li>
              <li>A private journal area for reflection and personal insight</li>
              <li>The dating pool, where you can meet others approaching relationships intentionally</li>
              <li>A Break Area if you ever feel burnt out and want to focus on personal growth</li>
              <li>A Private 1-on-1 space where you and a partner of your choosing can slow things down and have a private "date before the date," allowing you to talk and see how you align before meeting in person</li>
            </ul>
          </div>

          <div className="mb-10 p-5 bg-[#111611]/80 border border-[#1A211A] rounded-xl">
            <h3 className="text-[#D9FF3D] font-medium mb-3">A Personal Note</h3>
            <p className="text-sm text-[#A9B5AA] leading-relaxed mb-3">
              I built this platform because I wanted to give others the tools I wish I had.
            </p>
            <p className="text-sm text-[#A9B5AA] leading-relaxed mb-3">
              My hope is that you find the connection your heart is longing for, and that along the way you discover more about yourself as well.
            </p>
            <p className="text-sm text-[#F6FFF2] leading-relaxed">Grow, learn, and intertwine in love.</p>
            <p className="text-sm text-[#A9B5AA] mt-3">- Founder, Meashia Daniels</p>
          </div>

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
                  ? `Enter ${PATH_LABELS.intentional}`
                  : `Enter ${PATH_LABELS.intentional}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultSection;
