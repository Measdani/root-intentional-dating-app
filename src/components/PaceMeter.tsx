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
    phase: 'Calm Interest vs. Fast Attachment',
    supportingText:
      'Early connection sets the tone. Alignment begins with how pace, interest, and presence are maintained - not rushed.',
    healthyTitle: 'The Healthy Experience',
    healthyExperience:
      'You feel present and engaged - not overwhelmed.\n\nConversation flows with curiosity, not performance.\n\nYou leave feeling clear, not consumed.',
    healthyBehavior:
      'They follow up with intention, not urgency.\n\nCommunication is consistent, but not overwhelming.\n\nThere is space for the connection to develop naturally.',
    unhealthyTitle: 'The Misaligned (Rushed Attachment) Experience',
    unhealthyExperience:
      'You feel pulled in quickly - like something is moving faster than you can process.\n\nThe attention feels intense, but not grounded.\n\nYou feel "chosen" before being fully known.',
    unhealthyDanger:
      'Fast attachment creates emotional pressure before clarity exists.\n\nWhen pace is rushed, you are responding to intensity - not alignment.',
    forestAdvice:
      'In the beginning, alignment feels calm - not consuming.\n\nA healthy partner allows space for you to be known over time.\n\nIf it feels like it\'s moving faster than clarity, it\'s not depth - it\'s acceleration.',
  },
  {
    id: 'week-2-to-4',
    title: 'Week 2 to Week 4',
    phase: 'Building Rhythm & Consistency',
    supportingText:
      'This is where consistency begins to reveal itself.\n\nAlignment is no longer about first impressions - it\'s about whether a steady rhythm can be maintained.',
    healthyTitle: 'The Aligned Experience',
    healthyExperience:
      'A natural rhythm develops.\n\nYou know when you\'ll hear from each other - not because it\'s scheduled, but because it\'s consistent.\n\nThere is no guessing, no spikes - just steady presence.',
    healthyBehavior:
      'Plans are made with intention.\n\nCommunication is consistent, not overwhelming.\n\nBoth people maintain their lives while building together.',
    unhealthyTitle: 'The Misaligned (Inconsistent Energy) Experience',
    unhealthyExperience:
      'The connection feels uneven.\n\nStrong one moment, distant the next.\n\nYou start adjusting yourself to keep the connection stable.',
    unhealthyDanger:
      'Inconsistency creates emotional instability.\n\nWhen you have to adapt to the rhythm instead of co-creating it, alignment begins to break.',
    forestAdvice:
      'Consistency is the clearest form of interest.\n\nIf the connection feels unstable, your nervous system will stay alert - not at peace.\n\nAlignment does not spike. It stabilizes.',
  },
  {
    id: 'month-2',
    title: 'Month 2',
    phase: 'Integration & Real-Life Alignment',
    supportingText:
      'You are now seeing how the connection holds in real life.\n\nAlignment is revealed in how both people handle stress, responsibility, and accountability.',
    healthyTitle: 'The Aligned Experience',
    healthyExperience:
      'You begin to see their real life - not just curated moments.\n\nThere is honesty in how they show up, even when things aren\'t perfect.',
    healthyBehavior:
      'They acknowledge mistakes without deflecting.\n\nVulnerability feels natural, not forced or overwhelming.\n\nYou feel more grounded, not more confused.',
    unhealthyTitle: 'The Misaligned (Avoidance or Imbalance) Experience',
    unhealthyExperience:
      'Something feels slightly off, but hard to name.\n\nAccountability is inconsistent, or vulnerability feels unbalanced.',
    unhealthyDanger:
      'Without accountability, connection cannot stabilize.\n\nAlignment requires both people to take responsibility for how they show up.',
    forestAdvice:
      'By this stage, look for accountability - not perfection.\n\nAlignment is not about never getting it wrong.\n\nIt\'s about how quickly and clearly someone returns to truth.',
  },
  {
    id: 'month-3',
    title: 'Month 3',
    phase: 'Stability & Emotional Safety',
    supportingText:
      'This is where the connection proves whether it can be sustained.\n\nAlignment is no longer about attraction - it\'s about safety, stability, and consistency through conflict.',
    healthyTitle: 'The Aligned Experience',
    healthyExperience:
      'You\'ve experienced disagreement - and the connection held.\n\nYou feel safer after conflict, not more uncertain.',
    healthyBehavior:
      'Both of you repair quickly and clearly.\n\nYou feel comfortable being fully yourself - not performing or managing perception.',
    unhealthyTitle: 'The Misaligned (Instability After Conflict) Experience',
    unhealthyExperience:
      'Conflict creates distance instead of clarity.\n\nThe connection feels weaker after tension, not stronger.',
    unhealthyDanger:
      'If conflict breaks safety, the foundation is unstable.\n\nAlignment strengthens through conflict - it does not collapse under it.',
    forestAdvice:
      'The 90-day mark reveals consistency.\n\nDo not stay for how it started.\n\nStay for how it is sustained.',
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
  const mentionsPaceOrBoundary =
    normalized.includes('pace') ||
    normalized.includes('wait') ||
    normalized.includes('month 3') ||
    normalized.includes('timeline') ||
    normalized.includes('boundary') ||
    normalized.includes('boundaries');
  const mentionsAlignmentOrRespect =
    normalized.includes('alignment') ||
    normalized.includes('align') ||
    normalized.includes('consistent') ||
    normalized.includes('consistency') ||
    normalized.includes('respect') ||
    normalized.includes('partnership') ||
    normalized.includes('partner');
  return mentionsPaceOrBoundary && mentionsAlignmentOrRespect;
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
        'Forest is listening for the alignment truth here: if they cannot meet you in consistency, they cannot meet you in partnership.'
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
              The Alignment Pace Meter
            </div>
            <h3 className="mt-4 font-display text-3xl text-[#F6FFF2]">
              Stay grounded in consistency so the truth can reveal itself
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A9B5AA]">
              Forest walks you through real relationship moments and helps you compare aligned
              consistency with patterns that create confusion, pressure, or instability.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A9B5AA]">
              This is where pacing becomes presence &mdash; and consistency becomes the standard.
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
        <h3 className="mt-2 font-display text-3xl text-[#F6FFF2]">Forest&apos;s Final Alignment Check</h3>
        <p className="mt-4 text-sm leading-relaxed text-[#F6FFF2]">
          If your partner becomes frustrated because you maintain your pace or boundaries, what does that reveal about their ability to sustain alignment?
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#A9B5AA]">
          Alignment respects pace.
          <br />
          If someone cannot meet you in consistency, they cannot meet you in partnership.
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
          placeholder="Describe what their response reveals about consistency, respect, and alignment..."
          className="mt-5 w-full rounded-2xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
        />
        {feedback && <p className="mt-3 text-sm text-amber-300">{feedback}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGraduate}
            className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-2.5 text-sm font-semibold text-[#0B0F0C] hover:brightness-95 transition"
          >
            Confirm Your Alignment
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
