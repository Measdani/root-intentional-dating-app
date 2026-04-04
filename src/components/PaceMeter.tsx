import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, Clock, Heart, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { returnToResourceSpace } from '@/lib/resourceSpaceNavigation';
import type { PartnerJourneyBadge } from '@/types';
import {
  getPartnerJourneyBadgeLabel,
  hasPartnerJourneyBadge,
  persistPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';

type PaceMeterStage = {
  id: string;
  title: string;
  phase: string;
  supportingText: string;
  healthyTitle: string;
  healthyExperience: string;
  healthyBehavior: string;
  unhealthyTitle: string;
  unhealthyExperience: string;
  unhealthyDanger: string;
  forestAdvice: string;
};

type StageRevealState = {
  healthy: boolean;
  unhealthy: boolean;
};

type PaceMeterProgress = {
  revealedCards: Record<string, StageRevealState>;
  graduationAnswer: string;
  completedAt?: number;
};

const healthyPartnerBadge: PartnerJourneyBadge = 'healthy-partner-badge';
const PACE_METER_STAGES: PaceMeterStage[] = [
  {
    id: 'week-1',
    title: 'The First Meet & Week 1',
    phase: 'The "Spark" vs. The "Burn"',
    supportingText:
      'People often mistake high anxiety for "butterflies." Forest helps them recalibrate.',
    healthyTitle: 'The Healthy Experience',
    healthyExperience:
      'You feel curious and energized. They ask questions about your life. You leave the date feeling "seen," not "swept away."',
    healthyBehavior:
      'They text the next day to say they had a good time. No pressure.',
    unhealthyTitle: 'The Unhealthy (Lovebombing) Experience',
    unhealthyExperience:
      'You feel intoxicated or "chosen." They tell you you are "perfect" or "unlike anyone they have ever met."',
    unhealthyDanger:
      'If it feels like a movie, remember that movies are scripted. They are falling in love with a projection, not you.',
    forestAdvice:
      'In Week 1, a healthy partner is a stranger you are enjoying. An unhealthy partner is a stranger acting like your soulmate.',
  },
  {
    id: 'week-2-to-4',
    title: 'Week 2 to Week 4',
    phase: 'The "Pattern" Phase',
    supportingText:
      'This is where the "3-Week Consistency Check" happens.',
    healthyTitle: 'The Healthy Experience',
    healthyExperience:
      'A rhythm develops. You know when you will hear from them. They respect your schedule and do not get moody if you have plans with friends.',
    healthyBehavior:
      'They suggest a second or third date a few days in advance.',
    unhealthyTitle: 'The Unhealthy (Narc/Control) Experience',
    unhealthyExperience:
      'They start testing you. They might go silent for two days to see if you will chase them, or they get passive-aggressive if you do not respond immediately.',
    unhealthyDanger:
      'This is the start of Intermittent Reinforcement. They are training you to crave their validation.',
    forestAdvice:
      'Consistency is the only factual proof of interest. If the energy is spiky, your nervous system will stay on high alert. That is not passion; it is instability.',
  },
  {
    id: 'month-2',
    title: 'Month 2',
    phase: 'The "Integration" Phase',
    supportingText:
      'This is the middle of the 333 Rule. You are moving past the surface.',
    healthyTitle: 'The Healthy Experience',
    healthyExperience:
      'You start seeing their real life. You meet a friend or two. You see how they handle stress like a traffic jam or a late waiter.',
    healthyBehavior:
      'They share small vulnerabilities. They do not have a perfect story for everything.',
    unhealthyTitle: 'The Unhealthy (The Mask) Experience',
    unhealthyExperience:
      'They still feel too good to be true. Or they start sharing trauma stories too early to make you feel bad for them.',
    unhealthyDanger:
      'If they are always the victim in their past stories, they will eventually make you the villain in their current one.',
    forestAdvice:
      'By Month 2, look for accountability. Do they apologize when they are wrong? Or do they twist the story?',
  },
  {
    id: 'month-3',
    title: 'Month 3',
    phase: 'The "Mask-Off" Milestone',
    supportingText:
      'The 333 Rule says the mask falls off here. This is the "Truth" month.',
    healthyTitle: 'The Healthy Experience',
    healthyExperience:
      'You have had your first real disagreement. You both used the tools from Layer 2. You feel safer after the fight because you handled it well.',
    healthyBehavior:
      'You feel comfortable being un-glamorous around them.',
    unhealthyTitle: 'The Unhealthy (The Devaluation) Experience',
    unhealthyExperience:
      'Now that they have you, the compliments stop. They start making jokes at your expense or comparing you to others.',
    unhealthyDanger:
      'The narcissistic cycle moves from idealization to devaluation. If they hit the 3-month mark and suddenly become cold, believe the coldness, not the initial heat.',
    forestAdvice:
      'The 90-day mark is the factual truth. If you do not like who they are today, do not stay for who they were in Week 1.',
  },
];

const createEmptyProgress = (): PaceMeterProgress => ({
  revealedCards: {},
  graduationAnswer: '',
});

const loadProgress = (storageKey: string): PaceMeterProgress => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return createEmptyProgress();

    const parsed = JSON.parse(saved) as Partial<PaceMeterProgress>;
    const revealedCards = parsed.revealedCards && typeof parsed.revealedCards === 'object'
      ? Object.entries(parsed.revealedCards).reduce((acc, [stageId, value]) => {
          if (!PACE_METER_STAGES.some((stage) => stage.id === stageId) || !value || typeof value !== 'object') {
            return acc;
          }

          const state = value as Partial<StageRevealState>;
          acc[stageId] = {
            healthy: Boolean(state.healthy),
            unhealthy: Boolean(state.unhealthy),
          };
          return acc;
        }, {} as Record<string, StageRevealState>)
      : {};

    return {
      revealedCards,
      graduationAnswer: typeof parsed.graduationAnswer === 'string' ? parsed.graduationAnswer : '',
      completedAt: Number.isFinite(Number(parsed.completedAt)) ? Number(parsed.completedAt) : undefined,
    };
  } catch (error) {
    console.warn('Failed to load Pace Meter progress:', error);
    return createEmptyProgress();
  }
};

const recognizesBoundaryTruth = (value: string): boolean => {
  const normalized = value.toLowerCase();
  const mentionsPace = normalized.includes('pace') || normalized.includes('wait') || normalized.includes('month 3') || normalized.includes('timeline');
  const mentionsRespectOrBoundary =
    normalized.includes('boundary') ||
    normalized.includes('boundaries') ||
    normalized.includes('respect') ||
    normalized.includes('standard') ||
    normalized.includes('pressure');
  return mentionsPace && mentionsRespectOrBoundary;
};

const PaceMeter: React.FC = () => {
  const { currentUser, setCurrentView } = useApp();
  const progressStorageKey = useMemo(
    () => `rooted_healthy_partner_pace_meter_${currentUser.id}`,
    [currentUser.id]
  );
  const [progress, setProgress] = useState<PaceMeterProgress>(() => loadProgress(progressStorageKey));
  const [feedback, setFeedback] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);
  const badgeEarned = hasPartnerJourneyBadge(currentUser.partnerJourneyBadges, healthyPartnerBadge);

  useEffect(() => {
    setProgress(loadProgress(progressStorageKey));
  }, [progressStorageKey]);

  useEffect(() => () => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
  }, []);

  const persistProgress = (nextProgress: PaceMeterProgress) => {
    setProgress(nextProgress);
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
    } catch (error) {
      console.warn('Failed to persist Pace Meter progress:', error);
    }
  };

  const revealedCount = PACE_METER_STAGES.reduce((count, stage) => {
    const stageState = progress.revealedCards[stage.id];
    return count + (stageState?.healthy ? 1 : 0) + (stageState?.unhealthy ? 1 : 0);
  }, 0);
  const allCardsViewed = revealedCount === PACE_METER_STAGES.length * 2;
  const sectionCompleted = badgeEarned || Boolean(progress.completedAt);

  const revealCard = (stageId: string, side: keyof StageRevealState) => {
    setFeedback(null);
    persistProgress({
      ...progress,
      revealedCards: {
        ...progress.revealedCards,
        [stageId]: {
          healthy: progress.revealedCards[stageId]?.healthy || false,
          unhealthy: progress.revealedCards[stageId]?.unhealthy || false,
          [side]: true,
        },
      },
    });
  };

  const returnToResources = () => {
    returnToResourceSpace(setCurrentView);
  };

  const queueReturnToResources = () => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
    redirectTimeoutRef.current = window.setTimeout(returnToResources, 1200);
  };

  const handleGraduate = () => {
    if (!allCardsViewed) {
      setFeedback('Review both cards in all 4 stages before the graduation moment unlocks.');
      return;
    }

    if (!recognizesBoundaryTruth(progress.graduationAnswer)) {
      setFeedback(
        'Forest is listening for the boundary truth here: if they cannot respect your pace, they cannot respect your standards.'
      );
      return;
    }

    const nextProgress = {
      ...progress,
      completedAt: Date.now(),
    };
    persistProgress(nextProgress);
    setFeedback(null);

    const badgeWasNew = persistPartnerJourneyBadge(healthyPartnerBadge, currentUser.id);
    toast.success(
      badgeWasNew
        ? `${getPartnerJourneyBadgeLabel(healthyPartnerBadge)} unlocked. Returning to Resource Space.`
        : 'Pace Meter complete. Returning to Resource Space.'
    );
    queueReturnToResources();
  };

  if (sectionCompleted) {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Section Complete</p>
            <h3 className="mt-2 font-display text-3xl text-[#F6FFF2]">The Pace Meter</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100">
              Forest signed off on your standard. The Healthy Partner Badge is now tied to your profile.
            </p>
          </div>
          <button
            onClick={returnToResources}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-500/10 transition"
          >
            Return to Resource Space
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PACE_METER_STAGES.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-emerald-400/20 bg-[#0B0F0C]/60 px-4 py-4">
              <p className="text-[11px] uppercase tracking-wide text-emerald-200">Stage {index + 1}</p>
              <p className="mt-1 text-sm font-medium text-[#F6FFF2]">{stage.title}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-wide text-emerald-200">
                <CheckCircle className="h-3.5 w-3.5" />
                Reviewed
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#D9FF3D]/25 bg-[#111611] p-6 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9FF3D]/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#D9FF3D]">
              <Sparkles className="h-3.5 w-3.5" />
              The Pace Meter
            </div>
            <h3 className="mt-4 font-display text-3xl text-[#F6FFF2]">Slow the fantasy down until the facts can speak</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A9B5AA]">
              Forest walks through the first 90 days and helps you compare healthy pacing with the patterns that create confusion, control, or false intensity.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-4 min-w-[220px]">
            <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Section Progress</p>
            <p className="mt-2 text-3xl font-semibold text-[#F6FFF2]">{revealedCount}/{PACE_METER_STAGES.length * 2}</p>
            <p className="mt-1 text-sm text-[#A9B5AA]">Reveal both cards in all 4 stages to unlock graduation.</p>
            <div className="mt-4 h-2 rounded-full bg-[#1A211A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D9FF3D] transition-all"
                style={{ width: `${(revealedCount / (PACE_METER_STAGES.length * 2)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {PACE_METER_STAGES.map((stage, index) => {
        const stageState = progress.revealedCards[stage.id] || { healthy: false, unhealthy: false };

        return (
          <section key={stage.id} className="rounded-3xl border border-[#1A211A] bg-[#111611] p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Stage {index + 1}</p>
                <h3 className="mt-2 font-display text-3xl text-[#F6FFF2]">{stage.title}</h3>
                <p className="mt-1 text-sm font-medium text-[#D9FF3D]">{stage.phase}</p>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A9B5AA]">{stage.supportingText}</p>
              </div>
              <div className="rounded-full border border-[#2A312A] px-3 py-1 text-xs font-medium text-[#A9B5AA]">
                {stageState.healthy && stageState.unhealthy ? 'Stage reviewed' : 'Reveal both views'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => revealCard(stage.id, 'healthy')}
                className={`rounded-3xl border p-5 text-left transition ${
                  stageState.healthy
                    ? 'border-emerald-400/30 bg-emerald-500/10'
                    : 'border-[#D9FF3D]/20 bg-[#0B0F0C] hover:border-[#D9FF3D]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Flip Card</p>
                    <h4 className="mt-1 text-xl font-semibold text-[#F6FFF2]">{stage.healthyTitle}</h4>
                  </div>
                </div>
                {stageState.healthy ? (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm leading-relaxed text-[#F6FFF2]">{stage.healthyExperience}</p>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-emerald-200">Behavior</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#D8F8DE]">{stage.healthyBehavior}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-relaxed text-[#A9B5AA]">Tap to reveal the healthy pace in this stage.</p>
                )}
              </button>

              <button
                type="button"
                onClick={() => revealCard(stage.id, 'unhealthy')}
                className={`rounded-3xl border p-5 text-left transition ${
                  stageState.unhealthy
                    ? 'border-amber-400/30 bg-amber-500/10'
                    : 'border-[#D9FF3D]/20 bg-[#0B0F0C] hover:border-[#D9FF3D]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-200">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Flip Card</p>
                    <h4 className="mt-1 text-xl font-semibold text-[#F6FFF2]">{stage.unhealthyTitle}</h4>
                  </div>
                </div>
                {stageState.unhealthy ? (
                  <div className="mt-5 space-y-4">
                    <p className="text-sm leading-relaxed text-[#F6FFF2]">{stage.unhealthyExperience}</p>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-amber-200">The Danger</p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-50">{stage.unhealthyDanger}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-relaxed text-[#A9B5AA]">Tap to reveal the unhealthy pace in this stage.</p>
                )}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-5">
              <div className="flex items-center gap-2 text-[#D9FF3D]">
                <Clock className="h-4 w-4" />
                <p className="text-xs uppercase tracking-[0.18em]">Forest&apos;s Advice</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">{stage.forestAdvice}</p>
            </div>
          </section>
        );
      })}

      <section className="rounded-3xl border border-[#D9FF3D]/25 bg-[#111611] p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">The Graduation Moment</p>
        <h3 className="mt-2 font-display text-3xl text-[#F6FFF2]">Forest&apos;s Final Prompt</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#F6FFF2]">
          If a partner gets angry because you want to wait until Month 3 to move in together,
          what does that tell you about their respect for The Standard?
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#A9B5AA]">
          Forest is listening for the truth: if they cannot handle your pace, they cannot handle your boundaries.
        </p>
        <textarea
          value={progress.graduationAnswer}
          onChange={(event) => {
            if (feedback) setFeedback(null);
            persistProgress({
              ...progress,
              graduationAnswer: event.target.value,
            });
          }}
          rows={4}
          placeholder="Type what their reaction tells you about respect, pace, and boundaries..."
          className="mt-5 w-full rounded-2xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
        />
        {feedback && <p className="mt-3 text-sm text-amber-300">{feedback}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGraduate}
            className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-2.5 text-sm font-semibold text-[#0B0F0C] hover:brightness-95 transition"
          >
            Unlock The Healthy Partner Badge
            <ArrowRight className="h-4 w-4" />
          </button>
          {!allCardsViewed && (
            <span className="text-sm text-[#A9B5AA]">Review all 8 cards first to finish this section.</span>
          )}
        </div>
      </section>
    </div>
  );
};

export default PaceMeter;
