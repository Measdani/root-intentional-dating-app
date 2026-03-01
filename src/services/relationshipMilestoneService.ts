import type {
  DateOfferResponse,
  MilestoneStage,
  RelationshipMilestones,
  TempCheckAnswer,
  TempCheckOutcome,
  TruthDarePrompt,
  TruthDareResponse,
  UserInteraction,
} from '@/types';

export const SHARED_VIBE_CATALOG = [
  'Morning Coffee',
  'Farmers Market',
  'Bookstore Stop',
  'Thrift Store',
  'Museum Walk',
  'Picnic in the Park',
  'Street Food Crawl',
  'Live Music',
  'Sunset Drive',
  'Game Night',
  'Cooking Together',
  'Late-Night Dessert',
];

export const TRUTH_DARE_PROMPTS: TruthDarePrompt[] = [
  { id: 'truth_l1_1', type: 'truth', level: 1, text: 'What is your most useless talent?' },
  { id: 'truth_l1_2', type: 'truth', level: 1, text: 'What song do you overplay when no one is around?' },
  { id: 'truth_l2_1', type: 'truth', level: 2, text: 'What is a mistake you learned the most from?' },
  { id: 'truth_l2_2', type: 'truth', level: 2, text: 'What does feeling emotionally safe look like for you?' },
  { id: 'truth_l3_1', type: 'truth', level: 3, text: 'What pattern are you actively working to unlearn in love?' },
  { id: 'dare_1', type: 'dare', level: 1, text: 'Send a voice note of you singing 10 seconds of your favorite song.' },
  { id: 'dare_2', type: 'dare', level: 1, text: 'Take a photo of the messiest corner of your room right now.' },
  { id: 'dare_3', type: 'dare', level: 2, text: 'Record a 15-second “day in the life” voice update right now.' },
];

export const VALUE_DEEP_DIVE_OPTIONS = [
  'Personal Space',
  'Frequent Texting',
  'Family Time',
  'Career Ambition',
  'Faith Practice',
  'Financial Discipline',
  'Playfulness',
  'Emotional Openness',
  'Physical Affection',
  'Conflict Repair',
];

type MilestoneAction =
  | { type: 'toggle-vibe-card'; userId: string; item: string }
  | { type: 'submit-truth-dare'; userId: string; promptId: string; response: string }
  | { type: 'submit-temp-check'; userId: string; feelsHeard: number; goalsAligned: number; readiness: number }
  | { type: 'submit-mirror'; userId: string; reflection: string }
  | { type: 'submit-value-deep-dive'; userId: string; picks: string[] }
  | {
      type: 'submit-risk-rhythm-profile';
      userId: string;
      role: 'cautious' | 'eager';
      idealPace?: number;
      worries?: string;
      safestEnvironment?: string;
      connectionPull?: string;
      fearOfWaiting?: string;
      lowRiskMeeting?: string;
    }
  | { type: 'submit-bridge'; userId: string; sweetSpot: number; compromise: string }
  | { type: 'submit-final-check'; userId: string; feelsHeard: number; goalsAligned: number; readiness: number }
  | {
      type: 'propose-date-offer';
      userId: string;
      title: string;
      location: string;
      dateTime: string;
      durationMinutes: number;
      safetyNotes?: string;
    }
  | { type: 'respond-date-offer'; userId: string; response: 'accepted' | 'declined' }
  | { type: 'set-stage'; stage: MilestoneStage };

const clampScore = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(10, Math.round(value)));
};

const clampDurationMinutes = (value: number): number => {
  if (!Number.isFinite(value)) return 60;
  return Math.max(15, Math.min(240, Math.round(value)));
};

const upsertAnswer = (
  answers: TempCheckAnswer[],
  answer: TempCheckAnswer
): TempCheckAnswer[] => {
  const existingIndex = answers.findIndex((item) => item.userId === answer.userId);
  if (existingIndex === -1) return [...answers, answer];
  const next = [...answers];
  next[existingIndex] = answer;
  return next;
};

const deriveFocus = (answers: TempCheckAnswer[]): 'communication' | 'timing' | 'goals' => {
  if (answers.length < 2) return 'communication';

  const averageFeelsHeard = answers.reduce((sum, answer) => sum + answer.feelsHeard, 0) / answers.length;
  const averageGoals = answers.reduce((sum, answer) => sum + answer.goalsAligned, 0) / answers.length;
  const readinessGap = Math.abs(answers[0].readiness - answers[1].readiness);

  if (readinessGap >= 2) return 'timing';
  if (averageGoals < averageFeelsHeard) return 'goals';
  return 'communication';
};

const evaluateOutcome = (answers: TempCheckAnswer[]): TempCheckOutcome => {
  if (answers.length < 2) return 'pending';
  const everyoneReady = answers.every((answer) => answer.readiness >= 7);
  const everyoneHeard = answers.every((answer) => answer.feelsHeard >= 7);
  const everyoneGoalAligned = answers.every((answer) => answer.goalsAligned >= 7);
  return everyoneReady && everyoneHeard && everyoneGoalAligned ? 'aligned' : 'mismatch';
};

const SHARED_VIBE_ITEM_DETAILS: Record<string, {
  theme: 'cozy' | 'adventure' | 'culture' | 'playful' | 'foodie';
  dateStyle: string;
  spendTimeTip: string;
}> = {
  'Morning Coffee': {
    theme: 'cozy',
    dateStyle: 'slow-start cafe date',
    spendTimeTip: 'start with unhurried check-ins before the day speeds up',
  },
  'Farmers Market': {
    theme: 'foodie',
    dateStyle: 'daylight market walk',
    spendTimeTip: 'choose sensory, low-pressure spaces where you can chat while moving',
  },
  'Bookstore Stop': {
    theme: 'culture',
    dateStyle: 'bookstore + conversation date',
    spendTimeTip: 'add reflective prompts and share what each of you is learning right now',
  },
  'Thrift Store': {
    theme: 'playful',
    dateStyle: 'playful scavenger style date',
    spendTimeTip: 'keep things collaborative and lightly competitive',
  },
  'Museum Walk': {
    theme: 'culture',
    dateStyle: 'gallery walk with mini debriefs',
    spendTimeTip: 'build connection through curiosity and shared interpretation',
  },
  'Picnic in the Park': {
    theme: 'cozy',
    dateStyle: 'simple outdoor reset date',
    spendTimeTip: 'favor calm, open settings that make emotional safety easy',
  },
  'Street Food Crawl': {
    theme: 'foodie',
    dateStyle: 'multi-stop tasting date',
    spendTimeTip: 'plan active dates with small checkpoints to keep momentum high',
  },
  'Live Music': {
    theme: 'adventure',
    dateStyle: 'energy-based event date',
    spendTimeTip: 'mix stimulation with short moments to reconnect one-on-one',
  },
  'Sunset Drive': {
    theme: 'cozy',
    dateStyle: 'scenic decompression date',
    spendTimeTip: 'protect room for intimate conversation and shared quiet',
  },
  'Game Night': {
    theme: 'playful',
    dateStyle: 'structured fun date',
    spendTimeTip: 'use playful rituals to lower pressure and show personality',
  },
  'Cooking Together': {
    theme: 'foodie',
    dateStyle: 'collaborative home-style date',
    spendTimeTip: 'choose co-creation activities that reveal teamwork patterns',
  },
  'Late-Night Dessert': {
    theme: 'foodie',
    dateStyle: 'short sweet-finish date',
    spendTimeTip: 'end dates with a small shared ritual to build consistency',
  },
};

const SHARED_VIBE_THEME_LABELS: Record<'cozy' | 'adventure' | 'culture' | 'playful' | 'foodie', string> = {
  cozy: 'calm intimacy',
  adventure: 'high-energy exploration',
  culture: 'curiosity and depth',
  playful: 'lightness and spontaneity',
  foodie: 'sensory connection',
};

const evaluateSharedVibeUnlock = (
  picksByUser: Record<string, string[]>,
  users: [string, string]
): boolean => users.every((userId) => (picksByUser[userId] ?? []).length >= 3);

const buildSharedVibeSummary = (
  picksByUser: Record<string, string[]>,
  users: [string, string]
): string => {
  const [userA, userB] = users;
  const aPicks = picksByUser[userA] ?? [];
  const bPicks = picksByUser[userB] ?? [];
  const uniquePicks = Array.from(new Set([...aPicks, ...bPicks]));
  const sharedItems = getSharedItems(picksByUser, users);

  if (uniquePicks.length === 0) {
    return 'Your vibe read will appear once both of you start pinning cards.';
  }

  const themeScores: Record<string, number> = {};
  uniquePicks.forEach((item) => {
    const detail = SHARED_VIBE_ITEM_DETAILS[item];
    if (!detail) return;
    themeScores[detail.theme] = (themeScores[detail.theme] ?? 0) + 1;
  });
  sharedItems.forEach((item) => {
    const detail = SHARED_VIBE_ITEM_DETAILS[item];
    if (!detail) return;
    themeScores[detail.theme] = (themeScores[detail.theme] ?? 0) + 1;
  });

  const rankedThemes = Object.entries(themeScores)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme as keyof typeof SHARED_VIBE_THEME_LABELS);
  const primaryTheme = rankedThemes[0] ?? 'cozy';
  const secondaryTheme = rankedThemes[1];

  const topDateStyles = Array.from(new Set(
    uniquePicks
      .map((item) => SHARED_VIBE_ITEM_DETAILS[item]?.dateStyle)
      .filter((value): value is string => Boolean(value))
  )).slice(0, 2);

  const topTimeTips = Array.from(new Set(
    uniquePicks
      .map((item) => SHARED_VIBE_ITEM_DETAILS[item]?.spendTimeTip)
      .filter((value): value is string => Boolean(value))
  )).slice(0, 2);

  const overlapSignal = sharedItems.length >= 2
    ? `You already overlap on ${sharedItems.slice(0, 3).join(', ')}.`
    : sharedItems.length === 1
      ? `You align on ${sharedItems[0]}, while also bringing complementary differences.`
      : 'Your picks are complementary, which can create a balanced dynamic when you alternate styles.';

  const themeSignal = secondaryTheme
    ? `Connection signal: ${SHARED_VIBE_THEME_LABELS[primaryTheme]} + ${SHARED_VIBE_THEME_LABELS[secondaryTheme]}.`
    : `Connection signal: ${SHARED_VIBE_THEME_LABELS[primaryTheme]}.`;

  const dateDirection = topDateStyles.length > 0
    ? `Date direction: try ${topDateStyles.join(' or ')}.`
    : 'Date direction: choose a low-pressure public plan with room for conversation.';

  const spendTimeDirection = topTimeTips.length > 0
    ? `How to spend time: ${topTimeTips.join(' Also, ')}.`
    : 'How to spend time: alternate between active moments and reflective conversation.';

  return `${themeSignal} ${overlapSignal} ${dateDirection} ${spendTimeDirection}`;
};

const getParticipants = (interaction: UserInteraction): [string, string] => [
  interaction.fromUserId,
  interaction.toUserId,
];

const createInitialDateOfferState = () => ({
  status: 'not-started' as const,
  responsesByUser: {},
});

export const normalizeMilestones = (
  milestones?: RelationshipMilestones
): RelationshipMilestones => {
  if (!milestones) return createInitialMilestones();
  return {
    ...milestones,
    dateOffer: {
      ...createInitialDateOfferState(),
      ...milestones.dateOffer,
      responsesByUser: {
        ...createInitialDateOfferState().responsesByUser,
        ...(milestones.dateOffer?.responsesByUser ?? {}),
      },
    },
  };
};

const getMilestones = (interaction: UserInteraction): RelationshipMilestones =>
  normalizeMilestones(interaction.milestones);

const getSharedItems = (picksByUser: Record<string, string[]>, users: [string, string]): string[] => {
  const [userA, userB] = users;
  const a = new Set(picksByUser[userA] ?? []);
  const b = new Set(picksByUser[userB] ?? []);
  return [...a].filter((item) => b.has(item));
};

const evaluateTruthOrDareUnlock = (
  responses: TruthDareResponse[],
  users: [string, string]
): boolean => {
  return users.every((userId) => {
    const byUser = responses.filter((response) => response.userId === userId);
    const truthCount = byUser.filter((response) => response.type === 'truth').length;
    return byUser.length >= 2 && truthCount >= 1;
  });
};

const getRoleAssignment = (
  answers: TempCheckAnswer[]
): { cautiousUserId?: string; eagerUserId?: string } => {
  if (answers.length < 2) return {};
  const [first, second] = answers;
  if (first.readiness === second.readiness) return {};
  return first.readiness < second.readiness
    ? { cautiousUserId: first.userId, eagerUserId: second.userId }
    : { cautiousUserId: second.userId, eagerUserId: first.userId };
};

const buildSafetyPlan = (milestones: RelationshipMilestones): string | undefined => {
  const cautious = milestones.rhythmRisk.cautiousProfile;
  const eager = milestones.rhythmRisk.eagerProfile;
  if (!cautious || !eager) return undefined;

  const bridgeEntries = Object.values(milestones.rhythmRisk.bridgeByUser);
  const bridge = bridgeEntries[bridgeEntries.length - 1];
  if (!bridge) return undefined;

  return `We will honor the Rhythm by ${eager.lowRiskMeeting || 'planning a short in-person spark check'}, and we will lower the Risk by implementing ${cautious.safestEnvironment || 'a short public meetup with clear exit options'}.`;
};

export const createInitialMilestones = (): RelationshipMilestones => ({
  stage: 'shared-vibe',
  sharedVibe: {
    prompt: 'If we were to spend a perfect Saturday together, what would it look like?',
    catalog: SHARED_VIBE_CATALOG,
    picksByUser: {},
    sharedItems: [],
  },
  truthOrDare: {
    prompts: TRUTH_DARE_PROMPTS,
    responses: [],
  },
  tempCheck: {
    answers: [],
    outcome: 'pending',
  },
  mirror: {
    responsesByUser: {},
    revealed: false,
  },
  valueDeepDive: {
    options: VALUE_DEEP_DIVE_OPTIONS,
    picksByUser: {},
    overlap: [],
  },
  rhythmRisk: {
    bridgeByUser: {},
  },
  finalCheck: {
    answers: [],
    outcome: 'pending',
  },
  dateOffer: createInitialDateOfferState(),
  updatedAt: Date.now(),
});

export const applyMilestoneAction = (
  interaction: UserInteraction,
  action: MilestoneAction
): RelationshipMilestones => {
  const milestones = getMilestones(interaction);
  const users = getParticipants(interaction);
  const now = Date.now();

  switch (action.type) {
    case 'toggle-vibe-card': {
      const current = milestones.sharedVibe.picksByUser[action.userId] ?? [];
      const hasItem = current.includes(action.item);
      const nextPicks = hasItem
        ? current.filter((item) => item !== action.item)
        : [...current, action.item];

      const picksByUser = {
        ...milestones.sharedVibe.picksByUser,
        [action.userId]: nextPicks,
      };
      const sharedItems = getSharedItems(picksByUser, users);
      const canUnlock = evaluateSharedVibeUnlock(picksByUser, users);
      const summary = buildSharedVibeSummary(picksByUser, users);

      return {
        ...milestones,
        stage: canUnlock && milestones.stage === 'shared-vibe' ? 'truth-or-dare' : milestones.stage,
        sharedVibe: {
          ...milestones.sharedVibe,
          picksByUser,
          sharedItems,
          summary,
          unlockedAt: canUnlock ? (milestones.sharedVibe.unlockedAt ?? now) : milestones.sharedVibe.unlockedAt,
        },
        updatedAt: now,
      };
    }

    case 'submit-truth-dare': {
      const prompt = milestones.truthOrDare.prompts.find((item) => item.id === action.promptId);
      if (!prompt) return milestones;

      const sanitized = action.response.trim();
      if (!sanitized) return milestones;

      const existingIndex = milestones.truthOrDare.responses.findIndex(
        (response) => response.userId === action.userId && response.promptId === action.promptId
      );

      const nextResponse: TruthDareResponse = {
        id: existingIndex === -1
          ? `td_${now}_${Math.random().toString(36).slice(2, 8)}`
          : milestones.truthOrDare.responses[existingIndex].id,
        promptId: prompt.id,
        type: prompt.type,
        level: prompt.level,
        userId: action.userId,
        response: sanitized,
        completedAt: now,
      };

      const responses = existingIndex === -1
        ? [...milestones.truthOrDare.responses, nextResponse]
        : milestones.truthOrDare.responses.map((response, index) => (
            index === existingIndex ? nextResponse : response
          ));

      const unlocked = evaluateTruthOrDareUnlock(responses, users);
      return {
        ...milestones,
        stage: unlocked && milestones.stage === 'truth-or-dare' ? 'temp-check' : milestones.stage,
        truthOrDare: {
          ...milestones.truthOrDare,
          responses,
          unlockedAt: unlocked ? (milestones.truthOrDare.unlockedAt ?? now) : milestones.truthOrDare.unlockedAt,
        },
        updatedAt: now,
      };
    }

    case 'submit-temp-check': {
      const answer: TempCheckAnswer = {
        userId: action.userId,
        feelsHeard: clampScore(action.feelsHeard),
        goalsAligned: clampScore(action.goalsAligned),
        readiness: clampScore(action.readiness),
        submittedAt: now,
      };
      const answers = upsertAnswer(milestones.tempCheck.answers, answer);
      const outcome = evaluateOutcome(answers);
      const roleAssignment = getRoleAssignment(answers);

      return {
        ...milestones,
        stage: outcome === 'aligned'
          ? 'date-offer'
          : outcome === 'mismatch'
            ? 'bridge'
            : milestones.stage === 'shared-vibe'
              ? 'temp-check'
              : milestones.stage,
        tempCheck: {
          answers,
          outcome,
          suggestedFocus: outcome === 'mismatch' ? deriveFocus(answers) : milestones.tempCheck.suggestedFocus,
          completedAt: outcome !== 'pending' ? now : milestones.tempCheck.completedAt,
        },
        rhythmRisk: {
          ...milestones.rhythmRisk,
          ...roleAssignment,
        },
        updatedAt: now,
      };
    }

    case 'submit-mirror': {
      const reflection = action.reflection.trim();
      if (!reflection) return milestones;
      const responsesByUser = {
        ...milestones.mirror.responsesByUser,
        [action.userId]: reflection,
      };
      const revealed = users.every((userId) => Boolean(responsesByUser[userId]));

      return {
        ...milestones,
        mirror: {
          responsesByUser,
          revealed,
        },
        updatedAt: now,
      };
    }

    case 'submit-value-deep-dive': {
      const normalizedPicks = Array.from(new Set(action.picks.map((item) => item.trim()).filter(Boolean))).slice(0, 3);
      const picksByUser = {
        ...milestones.valueDeepDive.picksByUser,
        [action.userId]: normalizedPicks,
      };
      const overlap = getSharedItems(picksByUser, users);

      return {
        ...milestones,
        valueDeepDive: {
          ...milestones.valueDeepDive,
          picksByUser,
          overlap,
        },
        updatedAt: now,
      };
    }

    case 'submit-risk-rhythm-profile': {
      if (action.role === 'cautious') {
        const idealPace = clampScore(action.idealPace ?? 5);
        const worries = (action.worries ?? '').trim();
        const safestEnvironment = (action.safestEnvironment ?? '').trim();

        if (!worries || !safestEnvironment) return milestones;

        const next = {
          ...milestones,
          rhythmRisk: {
            ...milestones.rhythmRisk,
            cautiousProfile: {
              idealPace,
              worries,
              safestEnvironment,
              submittedAt: now,
            },
          },
          updatedAt: now,
        };
        return {
          ...next,
          rhythmRisk: {
            ...next.rhythmRisk,
            safetyPlan: buildSafetyPlan(next) ?? next.rhythmRisk.safetyPlan,
          },
        };
      }

      const connectionPull = (action.connectionPull ?? '').trim();
      const fearOfWaiting = (action.fearOfWaiting ?? '').trim();
      const lowRiskMeeting = (action.lowRiskMeeting ?? '').trim();
      if (!connectionPull || !fearOfWaiting || !lowRiskMeeting) return milestones;

      const next = {
        ...milestones,
        rhythmRisk: {
          ...milestones.rhythmRisk,
          eagerProfile: {
            connectionPull,
            fearOfWaiting,
            lowRiskMeeting,
            submittedAt: now,
          },
        },
        updatedAt: now,
      };
      return {
        ...next,
        rhythmRisk: {
          ...next.rhythmRisk,
          safetyPlan: buildSafetyPlan(next) ?? next.rhythmRisk.safetyPlan,
        },
      };
    }

    case 'submit-bridge': {
      const compromise = action.compromise.trim();
      if (!compromise) return milestones;

      const next = {
        ...milestones,
        rhythmRisk: {
          ...milestones.rhythmRisk,
          bridgeByUser: {
            ...milestones.rhythmRisk.bridgeByUser,
            [action.userId]: {
              sweetSpot: clampScore(action.sweetSpot),
              compromise,
              submittedAt: now,
            },
          },
        },
        updatedAt: now,
      };

      const bothBridgeSubmitted = users.every((userId) => Boolean(next.rhythmRisk.bridgeByUser[userId]));
      const hasMirror = next.mirror.revealed;
      const hasValueSelections = users.every((userId) => Boolean(next.valueDeepDive.picksByUser[userId]?.length));
      const readyForFinal = bothBridgeSubmitted && hasMirror && hasValueSelections;

      return {
        ...next,
        stage: readyForFinal && next.stage === 'bridge' ? 'final-check' : next.stage,
        rhythmRisk: {
          ...next.rhythmRisk,
          safetyPlan: buildSafetyPlan(next) ?? next.rhythmRisk.safetyPlan,
        },
      };
    }

    case 'submit-final-check': {
      const answer: TempCheckAnswer = {
        userId: action.userId,
        feelsHeard: clampScore(action.feelsHeard),
        goalsAligned: clampScore(action.goalsAligned),
        readiness: clampScore(action.readiness),
        submittedAt: now,
      };
      const answers = upsertAnswer(milestones.finalCheck.answers, answer);
      const outcome = evaluateOutcome(answers);

      return {
        ...milestones,
        stage: outcome === 'aligned'
          ? 'date-offer'
          : outcome === 'mismatch'
            ? 'resource-path'
            : 'final-check',
        finalCheck: {
          answers,
          outcome,
          completedAt: outcome !== 'pending' ? now : milestones.finalCheck.completedAt,
        },
        updatedAt: now,
      };
    }

    case 'propose-date-offer': {
      const title = action.title.trim();
      const location = action.location.trim();
      const dateTime = action.dateTime.trim();
      const safetyNotes = (action.safetyNotes ?? '').trim();
      const durationMinutes = clampDurationMinutes(action.durationMinutes);
      if (!title || !location || !dateTime) return milestones;

      const responsesByUser = users.reduce<Record<string, DateOfferResponse>>((acc, userId) => {
        acc[userId] = userId === action.userId ? 'accepted' : 'pending';
        return acc;
      }, {});

      return {
        ...milestones,
        stage: 'date-offer',
        dateOffer: {
          status: 'proposed',
          proposedByUserId: action.userId,
          proposal: {
            title,
            location,
            dateTime,
            durationMinutes,
            safetyNotes,
            proposedAt: now,
          },
          responsesByUser,
          confirmedAt: undefined,
          declinedByUserId: undefined,
        },
        updatedAt: now,
      };
    }

    case 'respond-date-offer': {
      if (!milestones.dateOffer.proposal) return milestones;
      if (!users.includes(action.userId)) return milestones;

      const responsesByUser = {
        ...milestones.dateOffer.responsesByUser,
        [action.userId]: action.response,
      };

      const normalizedResponses = users.reduce<Record<string, DateOfferResponse>>((acc, userId) => {
        acc[userId] = responsesByUser[userId] ?? 'pending';
        return acc;
      }, {});

      const declinedUserId = users.find((userId) => normalizedResponses[userId] === 'declined');
      const everyoneAccepted = users.every((userId) => normalizedResponses[userId] === 'accepted');
      const status = declinedUserId
        ? 'declined'
        : everyoneAccepted
          ? 'confirmed'
          : 'proposed';

      return {
        ...milestones,
        stage: 'date-offer',
        dateOffer: {
          ...milestones.dateOffer,
          responsesByUser: normalizedResponses,
          status,
          confirmedAt: status === 'confirmed' ? now : milestones.dateOffer.confirmedAt,
          declinedByUserId: declinedUserId,
        },
        updatedAt: now,
      };
    }

    case 'set-stage':
      return {
        ...milestones,
        stage: action.stage,
        updatedAt: now,
      };

    default:
      return milestones;
  }
};

export type { MilestoneAction };

