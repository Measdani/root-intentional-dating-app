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

const validateFactualStrengths = (value: string): ScenarioValidationResult => {
  if (parseListItems(value).length < 3) {
    return { passed: false, feedback: 'List 3 strengths you bring to a relationship.' };
  }
  if (containsAnyPhrase(value, ['pretty', 'beautiful', 'hot', 'sexy', 'body', 'face', 'cute', 'looks', 'my ex', 'past relationship'])) {
    return { passed: false, feedback: 'Use inner strengths, not looks or past comparisons.' };
  }
  return { passed: true };
};

const validateValueStatement = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 8)) return { passed: false, feedback: 'Explain why the behavior matters to you.' };
  if (/\byou\b/i.test(value)) return { passed: false, feedback: 'Rewrite it without using the word "you."' };
  if (!hasFirstPersonLanguage(value)) return { passed: false, feedback: 'Use first-person language.' };
  return { passed: true };
};

const validateValueVsPreference = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 12)) return { passed: false, feedback: 'Name 1 value, 1 preference, and the difference.' };
  if (!containsAnyPhrase(value, ['value', 'non-negotiable']) || !containsAnyPhrase(value, ['preference', 'flexible']) || !containsAnyPhrase(value, ['difference', 'because', 'means'])) {
    return { passed: false, feedback: 'Label the value, label the preference, then explain the difference.' };
  }
  return { passed: true };
};

const validateSupportivePause = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 8)) return { passed: false, feedback: 'Write a fuller supportive message.' };
  if (containsAnyPhrase(value, ['you should', 'let me fix', 'i will fix', 'here is the solution', 'apply for'])) {
    return { passed: false, feedback: 'Offer empathy, not problem-solving.' };
  }
  if (!containsAnyPhrase(value, ["i'm here for you", 'i am here for you', 'that sounds hard', 'i hear you', 'i care about you', 'how can i support'])) {
    return { passed: false, feedback: 'Lead with warmth and support.' };
  }
  return { passed: true };
};

const validateAnchorStatement = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 9)) return { passed: false, feedback: 'Make the anchor stronger.' };
  if (containsAnyPhrase(value, ['i am leaving', "i'm leaving", 'break up', 'we are done', "we're done", 'fine, leave'])) {
    return { passed: false, feedback: 'Threat language breaks safety. Try again.' };
  }
  if (!containsAnyPhrase(value, ['frustrated', 'upset', 'hurt', 'angry']) || !containsAnyPhrase(value, ['not going anywhere', 'still here', 'want to solve this', "let's solve this", 'work through this'])) {
    return { passed: false, feedback: 'Include both the emotion and the commitment to stay engaged.' };
  }
  return { passed: true };
};

const validateConfessionOfIntent = (value: string): ScenarioValidationResult => {
  if (!hasMinimumWords(value, 12)) return { passed: false, feedback: 'Go deeper and admit the real motive.' };
  if (!hasFirstPersonLanguage(value)) return { passed: false, feedback: 'Keep the confession in first person.' };
  if (!containsAnyPhrase(value, ['win', 'control', 'power', 'fear', 'afraid', 'defensive', 'hurt', 'protect', 'shame', 'lose'])) {
    return { passed: false, feedback: 'Name the fear, shame, or control underneath the urge to win.' };
  }
  return { passed: true };
};

const CONFLICT_SANDBOX_SCENARIOS: ConflictScenario[] = [
  {
    id: 'unknown-name',
    title: 'Jealousy',
    trigger:
      'Forest: "Scenario time. You are cuddling on the couch, and your partner\'s phone lights up. It is a text from Alex saying, \'That was fun today!\'. You do not know an Alex. What is your first move?"',
    oldSelfPrompt:
      'Type the first move your old self would want to make in that moment.',
    oldSelfPlaceholder:
      'Example: I would want to check the phone the second they look away...',
    whatIf:
      'Forest: "Okay, let\'s play that out. You spy. You find out Alex is just a coworker, but now you are carrying a secret.\n\nThe Chain Reaction: Next week, when they mention Alex, you act weird. They feel your tension and start closing off to protect themselves. You just traded trust for a temporary hit of certainty.\n\nThe Truth: Feeling threatened by outside friends usually means you are looking for safety in control rather than connection. If you cannot trust them to have a life outside of you, this is not a match. It is a hostage situation."',
    actionTitle: 'Transparency Prompt',
    actionPrompt:
      'Draft what you would actually say to invite honesty without accusation.',
    actionPlaceholder:
      'Hey, I saw a name pop up and felt a little spark of insecurity. Who is Alex?',
    actionHint:
      'Use first-person language, name the feeling, and ask with curiosity.',
    validator: validateTransparencyPrompt,
  },
  {
    id: 'slow-fade',
    title: 'The Slow Fade',
    trigger:
      'Forest: "You have been on three great dates. Suddenly, the person you are seeing takes 24 hours to text back and the energy feels off. What does your old self want to do next?"',
    oldSelfPrompt:
      'Type the reaction your nervous system wants to reach for first.',
    oldSelfPlaceholder:
      'Example: I would pull back, act cold, and make them wonder where I went...',
    whatIf:
      'Forest: "If you ghost them now to win, you are teaching your nervous system that running away is safer than asking for clarity. What if they just had a family emergency? By cutting them off, you killed a potential connection over a story you made up in your head."',
    actionTitle: 'Clarity Request',
    actionPrompt:
      'Write the message that asks for clarity instead of disappearing.',
    actionPlaceholder:
      'Hey, I noticed the energy shifted. Is everything okay, or are we moving in different directions?',
    actionHint:
      'Lead with observation, then ask for clarity instead of assuming the ending.',
    validator: validateClarityRequest,
  },
  {
    id: 'comparison-trap',
    title: 'The Comparison Trap',
    trigger:
      'Forest: "You are scrolling through your match\'s social media and see they still have photos up with an ex from two years ago. What story does your old self start telling?"',
    oldSelfPrompt:
      'Type the first insecure conclusion that starts forming in your head.',
    oldSelfPlaceholder:
      'Example: I would assume they are not over their ex and start comparing myself...',
    whatIf:
      'Forest: "Comparing your Day 1 to their Year 2 with someone else is factual self-sabotage. What if those photos are just markers of their history, not a threat to your future? If you act out now, you are competing with a ghost instead of building with the person in front of you."',
    actionTitle: '3 Factual Strengths',
    actionPrompt:
      'List 3 factual strengths you bring to a relationship that have nothing to do with your looks or your past.',
    actionPlaceholder:
      '1. I stay consistent when things get hard.\n2. I communicate directly instead of hinting.\n3. I take accountability when I miss the mark.',
    actionHint:
      'Keep this grounded in character, values, and behavior.',
    validator: validateFactualStrengths,
  },
  {
    id: 'mind-reader',
    title: 'The Mind Reader',
    trigger:
      'Forest: "Your partner said they would call at 8:00 PM. It is 9:30 PM. They have not called. What is the story your old self wants to believe?"',
    oldSelfPrompt:
      'Type the assumption you would usually make before speaking up.',
    oldSelfPlaceholder:
      'Example: I would decide they do not respect me and then go silent...',
    whatIf:
      'Forest: "You are punishing them for a boundary you never set. What if you just told them, \'I value punctuality because it makes me feel respected\'? Silence does not teach people how to love you. It just teaches them how to fear your moods."',
    actionTitle: 'Value Statement',
    actionPrompt:
      'Write a value statement that explains why the behavior matters to you without using the word "you."',
    actionPlaceholder:
      'Punctuality matters to me because consistency helps me feel respected and settled.',
    actionHint:
      'Stay out of blame. Make the value clear in first-person language.',
    validator: validateValueStatement,
  },
  {
    id: 'checklist',
    title: 'The Checklist',
    trigger:
      'Forest: "You meet someone amazing, but they do not share one of your must-have hobbies. What does your old self want to do with that difference?"',
    oldSelfPrompt:
      'Type the rigid thought that shows up first.',
    oldSelfPlaceholder:
      'Example: I would take it as proof we are not compatible and move on...',
    whatIf:
      'Forest: "You are looking for a twin, not a partner. What if their different interests are exactly what you need to grow? A healthy partner complements you. They do not mirror you. If you keep looking for a clone, you will stay single and bored."',
    actionTitle: 'Value vs Preference',
    actionPrompt:
      'Identify 1 non-negotiable value, 1 flexible preference, and explain the difference.',
    actionPlaceholder:
      'Value: Integrity\nPreference: Hiking\nDifference: Integrity shapes how trust works in the relationship, while hobbies can differ without breaking the foundation.',
    actionHint:
      'Name all 3 parts clearly so Forest can see the difference.',
    validator: validateValueVsPreference,
  },
  {
    id: 'over-functioner',
    title: 'The Over-Functioner',
    trigger:
      'Forest: "You are dating someone who is going through a rough patch at work. You start booking their appointments, sending job listings, and trying to fix their life. What makes your old self reach for control?"',
    oldSelfPrompt:
      'Type the first justification that shows up for over-helping.',
    oldSelfPlaceholder:
      'Example: I would tell myself I am just being supportive, even if I am taking over...',
    whatIf:
      'Forest: "You are trying to earn love by being useful. What if they just need a partner, not a project manager? By fixing them, you are creating an imbalance where they feel inadequate and you feel exhausted. That is a recipe for resentment, not harmony."',
    actionTitle: 'Supportive Pause',
    actionPrompt:
      'Draft a message that offers empathy without offering a solution.',
    actionPlaceholder:
      'That sounds like a heavy week. I am here for you, and I care about how you are carrying it. Let me know how I can support you.',
    actionHint:
      'Offer warmth and presence. Do not manage the problem for them.',
    validator: validateSupportivePause,
  },
  {
    id: 'emotional-hostage',
    title: 'The Emotional Hostage',
    trigger:
      'Forest: "You have a small disagreement about weekend plans. What threat or dramatic move does your old self want to reach for?"',
    oldSelfPrompt:
      'Type the escalation your old self would be tempted to use.',
    oldSelfPlaceholder:
      'Example: I would say maybe we should just cancel everything and leave it there...',
    whatIf:
      'Forest: "You are using the relationship as a weapon. What if they finally say, \'Okay, leave\'? You created an environment where your partner is constantly walking on eggshells. You cannot build a home on a foundation of threats. This is emotional volatility, and it is a slow-acting poison. It is not passion. It is a lack of safety."',
    actionTitle: 'Anchor Statement',
    actionPrompt:
      'Write a response that names the frustration and explicitly reaffirms the commitment.',
    actionPlaceholder:
      'I am frustrated right now, but I am not going anywhere. I want to solve this with you once we both settle down.',
    actionHint:
      'The relationship must feel safe even while conflict is happening.',
    validator: validateAnchorStatement,
  },
  {
    id: 'vulnerability-weaponizer',
    title: 'The Vulnerability Weaponizer',
    trigger:
      'Forest: "You are in a heated argument, and you are losing. What does your old self want to pull from your partner\'s deepest vulnerability?"',
    oldSelfPrompt:
      'Type the temptation your old self feels in that heated moment.',
    oldSelfPlaceholder:
      'Example: I would want to bring up something painful they trusted me with...',
    whatIf:
      'Forest: "You just committed the ultimate sin of intimacy. You took their blueprint and used it to burn them. What if they never tell you the truth again? You just traded soul-level trust for a five-minute victory. In a healthy relationship, secrets are sacred ground, not ammunition. This behavior is deadly because it kills the safe space required for love to survive."',
    actionTitle: 'Confession of Intent',
    actionPrompt:
      'Admit to Forest why you feel the need to win at the cost of the other person\'s heart.',
    actionPlaceholder:
      'I want to win when I feel hurt and powerless. Using their vulnerability gives me a sense of control, but it damages the trust I actually want.',
    actionHint:
      'Own the fear, shame, or control under the behavior.',
    validator: validateConfessionOfIntent,
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
      setFirstMoveFeedback('Forest wants your honest first move before opening the chain reaction.');
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
              Practice Maintaining Alignment in Real Moments
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
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Step 1 - The Trigger</p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#F6FFF2]">{activeScenario.trigger}</p>
            </div>

            <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Step 2 - Your Old Self</p>
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
                  Let Forest play out the chain reaction
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {activeDraft.whatIfUnlocked && (
              <>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <p className="text-xs uppercase tracking-wide text-amber-200">Step 3 - Forest&apos;s What If Chain</p>
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
