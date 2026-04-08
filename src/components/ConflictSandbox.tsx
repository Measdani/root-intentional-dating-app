import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle, MessageCircle, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { returnToResourceSpace } from '@/lib/resourceSpaceNavigation';
import type { PartnerJourneyBadge } from '@/types';
import {
  getPartnerJourneyBadgeLabel,
  hasPartnerJourneyBadge,
  persistPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';

type ScenarioValidationResult = {
  passed: boolean;
  feedback?: string;
};

type ConflictScenario = {
  id: string;
  title: string;
  trigger: string;
  oldSelfPrompt: string;
  oldSelfPlaceholder: string;
  whatIf: string;
  actionTitle: string;
  actionPrompt: string;
  actionPlaceholder: string;
  actionHint: string;
  validator: (value: string) => ScenarioValidationResult;
};

type ConflictSandboxDraft = {
  firstMove: string;
  actionResponse: string;
  whatIfUnlocked: boolean;
  completedAt?: number;
};

type ConflictSandboxProgress = {
  completedScenarioIds: string[];
  drafts: Record<string, ConflictSandboxDraft>;
  completedAt?: number;
};

const intentionalPartnerBadge: PartnerJourneyBadge = 'intentional-partner-badge';
const normalizeInput = (value: string): string =>
  value.toLowerCase().replace(/[\u2019]/g, "'").replace(/\s+/g, ' ').trim();

const tokenizeWords = (value: string): string[] => normalizeInput(value).match(/[a-z']+/g) || [];
const hasMinimumWords = (value: string, minimum: number): boolean => tokenizeWords(value).length >= minimum;
const hasFirstPersonLanguage = (value: string): boolean => /\b(i|me|my|mine)\b/i.test(value);
const containsAnyPhrase = (value: string, phrases: string[]): boolean => {
  const normalized = normalizeInput(value);
  return phrases.some((phrase) => normalized.includes(phrase));
};
const hasQuestionTone = (value: string): boolean =>
  value.includes('?') ||
  containsAnyPhrase(value, ['can we', 'could we', 'help me understand', 'is everything okay', 'what happened', 'who is', 'who\'s']);
const parseListItems = (value: string): string[] =>
  value
    .split(/\r?\n|,|;/g)
    .map((item) => item.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

const validateTransparencyPrompt = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 7)) return { passed: false, feedback: 'Name the feeling and ask a real question.' };
  if (containsAnyPhrase(value, ['show me your phone', 'prove it', 'explain yourself', 'you better', 'liar', 'are you cheating'])) {
    return { passed: false, feedback: 'That still sounds like control. Try first-person language and curiosity.' };
  }
  if (!hasFirstPersonLanguage(value) || !hasQuestionTone(value)) {
    return { passed: false, feedback: 'Own your feeling and invite honesty with a question.' };
  }
  return { passed: true };
};

const validateClarityRequest = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 8)) return { passed: false, feedback: 'Write the message you would actually send.' };
  if (containsAnyPhrase(value, ['forget it', 'never mind', 'i am done', "i'm done", 'ghost', 'ignore'])) {
    return { passed: false, feedback: 'Ask for clarity directly instead of pulling away.' };
  }
  if (!hasQuestionTone(value)) return { passed: false, feedback: 'Turn this into a real check-in question.' };
  return { passed: true };
};

const validateCurrentConnectionTruths = (value: string): ScenarioValidationResult => {
  if (parseListItems(value).length < 3) {
    return { passed: false, feedback: 'Write 3 things that are true about your current connection.' };
  }
  if (containsAnyPhrase(value, ['my ex', 'their ex', 'past relationship', 'used to'])) {
    return { passed: false, feedback: 'Keep this grounded in what is true now, not past comparison.' };
  }
  return { passed: true };
};

const validateClearExpectation = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 8)) return { passed: false, feedback: 'Name the expectation clearly.' };
  if (containsAnyPhrase(value, ['you should know', 'you always', 'you never', 'obvious'])) {
    return { passed: false, feedback: 'State the expectation directly instead of blaming.' };
  }
  if (!hasFirstPersonLanguage(value)) return { passed: false, feedback: 'Use first-person language.' };
  if (!containsAnyPhrase(value, ['moving forward', 'next time', 'i need', 'i would like', 'i would appreciate', 'it helps me'])) {
    return { passed: false, feedback: 'Make the expectation concrete for the future.' };
  }
  return { passed: true };
};

const validateBuildAnyway = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 12)) {
    return { passed: false, feedback: 'Name the non-negotiable, the flexible preference, and one way to build anyway.' };
  }
  if (
    !containsAnyPhrase(value, ['non-negotiable', 'value']) ||
    !containsAnyPhrase(value, ['preference', 'flexible']) ||
    !containsAnyPhrase(value, ['build anyway', 'shared', 'together', 'way to build'])
  ) {
    return { passed: false, feedback: 'Label all 3 parts so the direction is clear.' };
  }
  return { passed: true };
};

const validateSupportivePause = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 8)) return { passed: false, feedback: 'Write a fuller supportive message.' };
  if (containsAnyPhrase(value, ['you should', 'let me fix', 'i will fix', 'here is the solution', 'apply for'])) {
    return { passed: false, feedback: 'Offer empathy, not problem-solving.' };
  }
  if (!containsAnyPhrase(value, ["i'm here for you", 'i am here for you', "i'm here with you", 'i am here with you', "i'm with you", 'i am with you', 'that sounds hard', 'i hear you', 'i care about you', 'how can i support'])) {
    return { passed: false, feedback: 'Lead with warmth and support.' };
  }
  return { passed: true };
};

const validateAnchorStatement = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 9)) return { passed: false, feedback: 'Make the anchor stronger.' };
  if (containsAnyPhrase(value, ['i am leaving', "i'm leaving", 'break up', 'we are done', "we're done", 'fine, leave'])) {
    return { passed: false, feedback: 'Threat language breaks safety. Try again.' };
  }
  if (!containsAnyPhrase(value, ['frustrated', 'upset', 'hurt', 'angry']) || !containsAnyPhrase(value, ['not going anywhere', 'still here', 'want to solve this', "let's solve this", 'work through this', 'care about us', 'stay connected'])) {
    return { passed: false, feedback: 'Include both the emotion and the commitment to stay engaged.' };
  }
  return { passed: true };
};

const validateTrustPreservingResponse = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 10)) {
    return { passed: false, feedback: 'Write what you would say to protect trust in the moment.' };
  }
  if (containsAnyPhrase(value, ['use this against', 'weapon', 'win this', 'hurt you back'])) {
    return { passed: false, feedback: 'Keep the response focused on protecting trust, not scoring a point.' };
  }
  if (!containsAnyPhrase(value, ['trust', 'respect', 'pause', 'stay respectful', 'care about us', 'come back', 'protect'])) {
    return { passed: false, feedback: 'Make it clear that you are protecting trust in this moment.' };
  }
  return { passed: true };
};

const CONFLICT_SANDBOX_SCENARIOS: ConflictScenario[] = [
  {
    id: 'unknown-name',
    title: 'Maintaining Trust',
    trigger:
      'You are spending time together and notice something that could easily trigger insecurity. Nothing is confirmed - just a moment where trust is tested.',
    oldSelfPrompt:
      'What assumption could create distance if you act on it instead of addressing it?',
    oldSelfPlaceholder:
      'Example: I could assume something is wrong and shut down before I ask about it.',
    whatIf:
      '"In alignment, trust is maintained through clarity, not control.\nIf something feels off, the goal is not to investigate - it\'s to understand."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write how you would invite clarity without accusation.',
    actionPlaceholder:
      'I noticed something stirred insecurity in me, and I want to stay open instead of assuming. Can we talk about it?',
    actionHint:
      'Lead with honesty, not control.',
    validator: validateTransparencyPrompt,
  },
  {
    id: 'slow-fade',
    title: 'Maintaining Consistency',
    trigger:
      'Communication slows down between you. The connection is not gone, but the rhythm has shifted.',
    oldSelfPrompt:
      'What story could you tell yourself that would cause you to withdraw instead of check in?',
    oldSelfPlaceholder:
      'Example: I could tell myself they are losing interest and pull back before I ask what changed.',
    whatIf:
      '"Alignment doesn\'t disappear in uncertainty. It communicates through it."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write a message that checks in without pressure or assumption.',
    actionPlaceholder:
      'Hey, I noticed our rhythm shifted a bit. I care about staying clear with you - how are you feeling lately?',
    actionHint:
      'Check in gently and leave room for honesty.',
    validator: validateClarityRequest,
  },
  {
    id: 'comparison-trap',
    title: 'Staying Present in Your Connection',
    trigger:
      'You notice something from your partner\'s past that could pull your focus away from what is being built now.',
    oldSelfPrompt:
      'What comparison could weaken your presence in the relationship?',
    oldSelfPlaceholder:
      'Example: I could compare myself to their past and miss what we are actually creating together.',
    whatIf:
      '"Alignment stays grounded in what is real, not what once was."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write 3 things that are true about your current connection.',
    actionPlaceholder:
      '1. We are building trust in real time.\n2. We communicate more clearly each week.\n3. What we have now deserves my full presence.',
    actionHint:
      'Keep this focused on what is true now.',
    validator: validateCurrentConnectionTruths,
  },
  {
    id: 'mind-reader',
    title: 'Choosing Clarity Over Assumption',
    trigger:
      'Something does not happen the way you expected. You are left filling in the blanks.',
    oldSelfPrompt:
      'What assumption could you make that creates unnecessary tension?',
    oldSelfPlaceholder:
      'Example: I could assume they do not care instead of naming what I expected.',
    whatIf:
      '"Unspoken expectations create silent distance."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write how you would express your expectation clearly moving forward.',
    actionPlaceholder:
      'Moving forward, I would like us to let each other know if plans change because clear communication helps me stay grounded.',
    actionHint:
      'Name the expectation directly and respectfully.',
    validator: validateClearExpectation,
  },
  {
    id: 'checklist',
    title: 'Aligning Values in Real Life',
    trigger:
      'You discover a difference between you and your partner that challenges your expectations.',
    oldSelfPrompt:
      'What rigid expectation could limit your ability to build with this person?',
    oldSelfPlaceholder:
      'Example: I could treat one difference as proof we cannot work instead of looking at our shared direction.',
    whatIf:
      '"Alignment is not sameness. It is shared direction."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Identify:\n1 non-negotiable\n1 flexible preference\n1 way to build anyway',
    actionPlaceholder:
      'Non-negotiable: Integrity\nFlexible preference: Shared hobbies\nBuild anyway: We can stay connected by honoring our values and creating rituals we both enjoy.',
    actionHint:
      'Name all 3 clearly so the foundation stays visible.',
    validator: validateBuildAnyway,
  },
  {
    id: 'over-functioner',
    title: 'Supporting Without Overstepping',
    trigger:
      'Your partner is going through something difficult.',
    oldSelfPrompt:
      'What urge could cause you to take control instead of support?',
    oldSelfPlaceholder:
      'Example: I could rush in to manage everything so I do not have to sit with their discomfort.',
    whatIf:
      '"Support builds connection. Control creates imbalance."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write a response that offers presence without solving.',
    actionPlaceholder:
      'I am here with you. I do not need to fix this right now - I want to support you in the way that feels best for you.',
    actionHint:
      'Offer steadiness, not management.',
    validator: validateSupportivePause,
  },
  {
    id: 'emotional-hostage',
    title: 'Maintaining Emotional Safety',
    trigger:
      'A disagreement happens and emotions rise.',
    oldSelfPrompt:
      'What reaction could make the space feel unsafe instead of stable?',
    oldSelfPlaceholder:
      'Example: I could threaten distance or shut down instead of staying honest and steady.',
    whatIf:
      '"Alignment protects the connection even during conflict."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write a response that expresses emotion without threatening the relationship.',
    actionPlaceholder:
      'I am upset right now, but I care about us and want to work through this without turning against each other.',
    actionHint:
      'Let the emotion be real while keeping the relationship safe.',
    validator: validateAnchorStatement,
  },
  {
    id: 'vulnerability-weaponizer',
    title: 'Protecting Vulnerability',
    trigger:
      'You are in a tense moment and feel the urge to use something personal shared with you.',
    oldSelfPrompt:
      'What impulse could damage trust in this moment?',
    oldSelfPlaceholder:
      'Example: I could reach for something personal to protect myself instead of protecting the connection.',
    whatIf:
      '"In alignment, vulnerability is protected - never used as leverage."',
    actionTitle: 'Aligned Response',
    actionPrompt:
      'Write what you would say instead that preserves trust.',
    actionPlaceholder:
      'I want to stay respectful here. I am hurt, and I need a pause before I say something that damages the trust between us.',
    actionHint:
      'Protect what was shared, even while you are hurt.',
    validator: validateTrustPreservingResponse,
  },
];

const createEmptyProgress = (): ConflictSandboxProgress => ({ completedScenarioIds: [], drafts: {} });

const normalizeDraft = (value: unknown): ConflictSandboxDraft => {
  if (!value || typeof value !== 'object') {
    return { firstMove: '', actionResponse: '', whatIfUnlocked: false };
  }

  const draft = value as {
    firstMove?: unknown;
    actionResponse?: unknown;
    whatIfUnlocked?: unknown;
    completedAt?: unknown;
  };

  return {
    firstMove: typeof draft.firstMove === 'string' ? draft.firstMove : '',
    actionResponse: typeof draft.actionResponse === 'string' ? draft.actionResponse : '',
    whatIfUnlocked: Boolean(draft.whatIfUnlocked),
    completedAt: Number.isFinite(Number(draft.completedAt)) ? Number(draft.completedAt) : undefined,
  };
};

const loadProgress = (storageKey: string): ConflictSandboxProgress => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return createEmptyProgress();

    const parsed = JSON.parse(saved) as Partial<ConflictSandboxProgress>;
    const completedScenarioIds = Array.isArray(parsed.completedScenarioIds)
      ? Array.from(
          new Set(
            parsed.completedScenarioIds.filter(
              (scenarioId): scenarioId is string =>
                typeof scenarioId === 'string' &&
                CONFLICT_SANDBOX_SCENARIOS.some((scenario) => scenario.id === scenarioId)
            )
          )
        )
      : [];

    const drafts = parsed.drafts && typeof parsed.drafts === 'object'
      ? Object.entries(parsed.drafts).reduce((acc, [scenarioId, value]) => {
          if (!CONFLICT_SANDBOX_SCENARIOS.some((scenario) => scenario.id === scenarioId)) return acc;
          acc[scenarioId] = normalizeDraft(value);
          return acc;
        }, {} as Record<string, ConflictSandboxDraft>)
      : {};

    return {
      completedScenarioIds,
      drafts,
      completedAt: Number.isFinite(Number(parsed.completedAt)) ? Number(parsed.completedAt) : undefined,
    };
  } catch (error) {
    console.warn('Failed to load Conflict Sandbox progress:', error);
    return createEmptyProgress();
  }
};

const ConflictSandbox: React.FC = () => {
  const { currentUser, setCurrentView } = useApp();
  const progressStorageKey = useMemo(
    () => `rooted_intentional_partner_conflict_sandbox_${currentUser.id}`,
    [currentUser.id]
  );
  const [progress, setProgress] = useState<ConflictSandboxProgress>(() => loadProgress(progressStorageKey));
  const [firstMoveFeedback, setFirstMoveFeedback] = useState<string | null>(null);
  const redirectTimeoutRef = useRef<number | null>(null);
  const badgeEarned = hasPartnerJourneyBadge(currentUser.partnerJourneyBadges, intentionalPartnerBadge);

  useEffect(() => {
    setProgress(loadProgress(progressStorageKey));
  }, [progressStorageKey]);

  useEffect(() => () => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
  }, []);

  const persistProgress = (nextProgress: ConflictSandboxProgress) => {
    setProgress(nextProgress);
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
    } catch (error) {
      console.warn('Failed to persist Conflict Sandbox progress:', error);
    }
  };

  const completedIdSet = new Set(progress.completedScenarioIds);
  const sectionCompleted =
    badgeEarned ||
    Boolean(progress.completedAt) ||
    progress.completedScenarioIds.length >= CONFLICT_SANDBOX_SCENARIOS.length;
  const activeScenario =
    CONFLICT_SANDBOX_SCENARIOS.find((scenario) => !completedIdSet.has(scenario.id)) ||
    CONFLICT_SANDBOX_SCENARIOS[CONFLICT_SANDBOX_SCENARIOS.length - 1];
  const activeDraft = progress.drafts[activeScenario.id] || {
    firstMove: '',
    actionResponse: '',
    whatIfUnlocked: false,
  };

  useEffect(() => {
    setFirstMoveFeedback(null);
  }, [activeScenario.id]);

  const returnToResources = () => {
    returnToResourceSpace(setCurrentView);
  };

  const queueReturnToResources = () => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
    redirectTimeoutRef.current = window.setTimeout(returnToResources, 1200);
  };

  const updateDraft = (scenarioId: string, patch: Partial<ConflictSandboxDraft>) => {
    const nextProgress: ConflictSandboxProgress = {
      ...progress,
      drafts: {
        ...progress.drafts,
        [scenarioId]: {
          ...(progress.drafts[scenarioId] || {
            firstMove: '',
            actionResponse: '',
            whatIfUnlocked: false,
          }),
          ...patch,
        },
      },
    };
    persistProgress(nextProgress);
  };

  const handleRevealWhatIf = () => {
    if (!hasMinimumWords(activeDraft.firstMove, 5)) {
      setFirstMoveFeedback('Forest wants your honest first reaction before reflecting the aligned path.');
      return;
    }
    setFirstMoveFeedback(null);
    updateDraft(activeScenario.id, { whatIfUnlocked: true });
  };

  const handlePassScenario = () => {
    if (!activeDraft.whatIfUnlocked) {
      return;
    }

    const nextCompletedScenarioIds = Array.from(new Set([...progress.completedScenarioIds, activeScenario.id]));
    const nextProgress: ConflictSandboxProgress = {
      ...progress,
      completedScenarioIds: nextCompletedScenarioIds,
      drafts: {
        ...progress.drafts,
        [activeScenario.id]: {
          ...activeDraft,
          whatIfUnlocked: true,
          completedAt: Date.now(),
        },
      },
      completedAt:
        nextCompletedScenarioIds.length >= CONFLICT_SANDBOX_SCENARIOS.length
          ? Date.now()
          : progress.completedAt,
    };

    persistProgress(nextProgress);
    setFirstMoveFeedback(null);

    if (nextCompletedScenarioIds.length >= CONFLICT_SANDBOX_SCENARIOS.length) {
      const badgeWasNew = persistPartnerJourneyBadge(intentionalPartnerBadge, currentUser.id);
      toast.success(
        badgeWasNew
          ? `You chose understanding over reaction. That's growth. ${getPartnerJourneyBadgeLabel(intentionalPartnerBadge)} unlocked. Returning to Resource Space.`
          : 'You chose understanding over reaction. That\'s growth. Returning to Resource Space.'
      );
      queueReturnToResources();
      return;
    }

    toast.success('You chose understanding over reaction. That\'s growth.');
  };

  if (sectionCompleted) {
    return (
      <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Section Complete</p>
            <h3 className="mt-2 font-display text-3xl text-[#F6FFF2]">Alignment Achieved</h3>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-emerald-100">
              You completed every scenario and demonstrated your ability to maintain a healthy,
              intentional relationship in real situations.
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
          {CONFLICT_SANDBOX_SCENARIOS.map((scenario, index) => (
            <div key={scenario.id} className="rounded-2xl border border-emerald-400/20 bg-[#0B0F0C]/60 px-4 py-4">
              <p className="text-[11px] uppercase tracking-wide text-emerald-200">Scenario {index + 1}</p>
              <p className="mt-1 text-sm font-medium text-[#F6FFF2]">{scenario.title}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-wide text-emerald-200">
                <CheckCircle className="h-3.5 w-3.5" />
                Completed
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
              The Alignment Practice
            </div>
            <h3 className="mt-4 font-display text-3xl text-[#F6FFF2]">
              Practice the aligned response before real moments require it
            </h3>
            <p className="mt-2 text-sm font-medium text-[#D9FF3D]">
              You&apos;re not being tested &mdash; you&apos;re strengthening how you show up in a
              real relationship.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#A9B5AA]">
              Forest will guide you through real-life scenarios that challenge communication, trust,
              and emotional stability &mdash; so you can respond with alignment, not instinct.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-4 min-w-[220px]">
            <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Section Progress</p>
            <p className="mt-2 text-3xl font-semibold text-[#F6FFF2]">{progress.completedScenarioIds.length}/{CONFLICT_SANDBOX_SCENARIOS.length}</p>
            <p className="mt-1 text-sm text-[#A9B5AA]">Complete every scenario to demonstrate alignment.</p>
            <div className="mt-4 h-2 rounded-full bg-[#1A211A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D9FF3D] transition-all"
                style={{ width: `${(progress.completedScenarioIds.length / CONFLICT_SANDBOX_SCENARIOS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CONFLICT_SANDBOX_SCENARIOS.map((scenario, index) => {
            const isCompleted = completedIdSet.has(scenario.id);
            const isActive = scenario.id === activeScenario.id;
            return (
              <div
                key={scenario.id}
                className={`rounded-2xl border px-4 py-4 transition ${
                  isCompleted
                    ? 'border-emerald-400/30 bg-emerald-500/10'
                    : isActive
                      ? 'border-[#D9FF3D]/40 bg-[#D9FF3D]/10'
                      : 'border-[#1A211A] bg-[#0B0F0C]'
                }`}
              >
                <p className="text-[11px] uppercase tracking-wide text-[#A9B5AA]">Scenario {index + 1}</p>
                <p className="mt-1 text-sm font-medium text-[#F6FFF2]">{scenario.title}</p>
                <p className={`mt-3 text-[11px] uppercase tracking-wide ${isCompleted ? 'text-emerald-200' : isActive ? 'text-[#D9FF3D]' : 'text-[#738073]'}`}>
                  {isCompleted ? 'Completed' : isActive ? 'In progress' : 'Locked until previous clears'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-3xl border border-[#1A211A] bg-[#111611] p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D]/15 px-3 py-1 text-xs font-medium text-[#D9FF3D]">
              <Target className="h-3.5 w-3.5" />
              Scenario {CONFLICT_SANDBOX_SCENARIOS.findIndex((scenario) => scenario.id === activeScenario.id) + 1}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1A211A] px-3 py-1 text-xs font-medium text-[#A9B5AA]">
              <MessageCircle className="h-3.5 w-3.5" />
              Forest Dialogue Tree
            </div>
          </div>

          <h4 className="mt-4 font-display text-3xl text-[#F6FFF2]">{activeScenario.title}</h4>

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Step 1 - The Moment</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#F6FFF2]">{activeScenario.trigger}</p>
            </div>

            <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Step 2 - Drift Risk</p>
              <p className="mt-3 text-sm leading-relaxed text-[#A9B5AA]">{activeScenario.oldSelfPrompt}</p>
              <textarea
                value={activeDraft.firstMove}
                onChange={(event) => {
                  if (firstMoveFeedback) setFirstMoveFeedback(null);
                  updateDraft(activeScenario.id, { firstMove: event.target.value });
                }}
                rows={4}
                placeholder={activeScenario.oldSelfPlaceholder}
                className="mt-4 w-full rounded-2xl border border-[#1A211A] bg-[#111611] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
              />
              {firstMoveFeedback && <p className="mt-3 text-sm text-amber-300">{firstMoveFeedback}</p>}
              {!activeDraft.whatIfUnlocked && (
                <button
                  onClick={handleRevealWhatIf}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D9FF3D]/30 px-4 py-2 text-sm font-medium text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition"
                >
                  Let Forest reflect the aligned path
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {activeDraft.whatIfUnlocked && (
              <>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <p className="text-xs uppercase tracking-wide text-amber-200">Step 3 - Forest Reflection</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-amber-50">{activeScenario.whatIf}</p>
                </div>

                <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-5">
                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Step 4 - {activeScenario.actionTitle}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">{activeScenario.actionPrompt}</p>
                  <p className="mt-2 text-sm text-[#A9B5AA]">{activeScenario.actionHint}</p>
                  <textarea
                    value={activeDraft.actionResponse}
                    onChange={(event) => {
                      updateDraft(activeScenario.id, { actionResponse: event.target.value });
                    }}
                    rows={5}
                    placeholder={activeScenario.actionPlaceholder}
                    className="mt-4 w-full rounded-2xl border border-[#1A211A] bg-[#111611] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
                  />
                  <button
                    onClick={handlePassScenario}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-2.5 text-sm font-semibold text-[#0B0F0C] hover:brightness-95 transition"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-[#1A211A] bg-[#111611] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Forest&apos;s Role</p>
            <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
              Forest doesn&apos;t choose for you &mdash; he reflects what alignment looks like.
              <br />
              Every response should reflect the partner you are committed to being.
            </p>
          </div>

          <div className="rounded-3xl border border-[#1A211A] bg-[#111611] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">What Alignment Looks Like</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#A9B5AA]">
              <li>Ownership without defensiveness</li>
              <li>Clarity instead of assumption</li>
              <li>Boundaries without control</li>
              <li>Consistency over intensity</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#1A211A] bg-[#111611] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Alignment Achieved</p>
            <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
              Complete all scenarios to demonstrate your ability to maintain a healthy,
              intentional relationship in real situations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictSandbox;
