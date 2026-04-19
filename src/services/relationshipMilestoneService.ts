import type {
  DateOfferResponse,
  MilestoneStage,
  OppositePromptRound,
  OppositePromptResponse,
  RelationshipMilestones,
  TempCheckAnswer,
  TempCheckOutcome,
  User,
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

export const OPPOSITE_PROMPT_ROUNDS: OppositePromptRound[] = [
  {
    id: 'root-reveal',
    emoji: '🌳',
    title: 'Root or Reveal',
    options: [
      { id: 'root', label: 'Root', prompt: 'What does commitment mean to you?', responseKind: 'answer' },
      { id: 'reveal', label: 'Reveal', prompt: 'Share something people misunderstand about you.', responseKind: 'answer' },
    ],
  },
  {
    id: 'depth-light',
    emoji: '🌿',
    title: 'Depth or Light',
    options: [
      { id: 'depth', label: 'Depth', prompt: 'What’s a fear you don’t say out loud often?', responseKind: 'answer' },
      { id: 'light', label: 'Light', prompt: 'What does consistency mean to you?', responseKind: 'answer' },
    ],
  },
  {
    id: 'open-explore',
    emoji: '🌻',
    title: 'Open or Explore',
    options: [
      { id: 'open', label: 'Open', prompt: 'Answer something honestly.', responseKind: 'answer' },
      { id: 'explore', label: 'Explore', prompt: 'What do you enjoy doing when you feel at peace?', responseKind: 'answer' },
    ],
  },
  {
    id: 'stay-share',
    emoji: '🌼',
    title: 'Stay or Share',
    options: [
      { id: 'stay', label: 'Stay', prompt: 'What does trust look like to you?', responseKind: 'answer' },
      { id: 'share', label: 'Share', prompt: 'What kind of life are you building?', responseKind: 'answer' },
    ],
  },
  {
    id: 'align-ask',
    emoji: '🌱',
    title: 'Align or Ask',
    options: [
      { id: 'align', label: 'Align', prompt: 'What makes you feel most like yourself?', responseKind: 'answer' },
      { id: 'ask', label: 'Ask', prompt: 'What makes you feel appreciated?', responseKind: 'answer' },
    ],
  },
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
  | { type: 'submit-opposite-prompt'; userId: string; roundId: string; optionId: string; response: string }
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
  | { type: 'set-handoff-choice'; userId: string; choice: 'converse' | 'continue' }
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

const OPPOSITE_PROMPT_THEME_LABELS: Record<string, string> = {
  root: 'commitment',
  reveal: 'how each person is often misunderstood',
  depth: 'fears that rarely get named out loud',
  light: 'what consistency means in practice',
  open: 'honest self-disclosure',
  explore: 'what peace feels like in daily life',
  stay: 'what trust looks like',
  share: 'the kind of life each person is building',
  align: 'what helps each person feel most like themselves',
  ask: 'what makes each person feel appreciated',
};

const evaluateSharedVibeUnlock = (
  picksByUser: Record<string, string[]>,
  users: [string, string]
): boolean => users.every((userId) => (picksByUser[userId] ?? []).length >= 3);

const isSharedVibeCompleteForUser = (
  picksByUser: Record<string, string[]>,
  userId: string
): boolean => (picksByUser[userId] ?? []).length >= 3;

const hasAnySharedVibeComplete = (
  picksByUser: Record<string, string[]>,
  users: [string, string]
): boolean => users.some((userId) => isSharedVibeCompleteForUser(picksByUser, userId));

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

const createTransitionHandoff = (
  fromStage: MilestoneStage,
  toStage: MilestoneStage,
  now: number
) => ({
  fromStage,
  toStage,
  unlockedAt: now,
  choicesByUser: {},
});

const queueStageTransition = (
  milestones: RelationshipMilestones,
  fromStage: MilestoneStage,
  toStage: MilestoneStage,
  now: number
): RelationshipMilestones => {
  const existing = milestones.handoff;
  if (existing && existing.fromStage === fromStage && existing.toStage === toStage) {
    return milestones;
  }

  return {
    ...milestones,
    handoff: createTransitionHandoff(fromStage, toStage, now),
  };
};

const createInitialDateOfferState = () => ({
  status: 'not-started' as const,
  responsesByUser: {},
});

const createInitialOppositePromptState = () => ({
  rounds: OPPOSITE_PROMPT_ROUNDS,
  responses: [] as OppositePromptResponse[],
});

const normalizeOppositePromptState = (
  state: RelationshipMilestones['truthOrDare'] | undefined
): RelationshipMilestones['truthOrDare'] => {
  const rounds = Array.isArray(state?.rounds) && state.rounds.length > 0
    ? state.rounds
        .filter((round): round is OppositePromptRound => Boolean(round?.id) && Array.isArray(round?.options) && round.options.length === 2)
        .slice(0, OPPOSITE_PROMPT_ROUNDS.length)
    : [];

  const responses = Array.isArray(state?.responses)
    ? state.responses.filter(
        (response): response is OppositePromptResponse =>
          Boolean(response?.id) &&
          Boolean(response?.roundId) &&
          Boolean(response?.optionId) &&
          Boolean(response?.userId) &&
          typeof response?.response === 'string'
      )
    : [];

  return {
    rounds: rounds.length === OPPOSITE_PROMPT_ROUNDS.length ? rounds : OPPOSITE_PROMPT_ROUNDS,
    responses,
    unlockedAt: state?.unlockedAt,
  };
};

export const normalizeMilestones = (
  milestones?: RelationshipMilestones
): RelationshipMilestones => {
  if (!milestones) return createInitialMilestones();
  return {
    ...milestones,
    handoff: milestones.handoff ?? null,
    truthOrDare: normalizeOppositePromptState(milestones.truthOrDare),
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

const formatForestList = (values: string[]): string => {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
};

const getRoundResponses = (
  responses: OppositePromptResponse[],
  roundId: string
): OppositePromptResponse[] => responses.filter((response) => response.roundId === roundId);

const getRoundOption = (
  round: OppositePromptRound,
  optionId: string
) => round.options.find((option) => option.id === optionId) ?? null;

const getOppositeOption = (
  round: OppositePromptRound,
  optionId: string
) => round.options.find((option) => option.id !== optionId) ?? null;

const isRoundComplete = (
  round: OppositePromptRound,
  responses: OppositePromptResponse[],
  users: [string, string]
): boolean => users.every((userId) => getRoundResponses(responses, round.id).some((response) => response.userId === userId));

const getCurrentIncompleteRound = (
  rounds: OppositePromptRound[],
  responses: OppositePromptResponse[],
  users: [string, string]
): OppositePromptRound | null => rounds.find((round) => !isRoundComplete(round, responses, users)) ?? null;

export const buildForestTempCheckReflection = ({
  milestones,
  currentUser,
  otherUser,
}: {
  milestones: RelationshipMilestones;
  currentUser: Pick<User, 'id' | 'name'>;
  otherUser: Pick<User, 'id' | 'name'>;
}): string | null => {
  const users = [currentUser.id, otherUser.id] as [string, string];
  const sharedVibeSummary = milestones.sharedVibe.summary?.trim()
    || buildSharedVibeSummary(milestones.sharedVibe.picksByUser, users);

  const completedRounds = milestones.truthOrDare.rounds
    .map((round) => {
      const responses = getRoundResponses(milestones.truthOrDare.responses, round.id);
      const currentResponse = responses.find((response) => response.userId === currentUser.id);
      const otherResponse = responses.find((response) => response.userId === otherUser.id);

      if (!currentResponse || !otherResponse) return null;

      const currentOption = getRoundOption(round, currentResponse.optionId);
      const otherOption = getRoundOption(round, otherResponse.optionId);
      if (!currentOption || !otherOption) return null;

      return {
        currentOption,
        otherOption,
      };
    })
    .filter((entry): entry is {
      currentOption: NonNullable<ReturnType<typeof getRoundOption>>;
      otherOption: NonNullable<ReturnType<typeof getRoundOption>>;
    } => Boolean(entry));

  if (!sharedVibeSummary && completedRounds.length === 0) return null;

  const currentLabels = completedRounds.map((entry) => entry.currentOption.label);
  const otherLabels = completedRounds.map((entry) => entry.otherOption.label);
  const themes = Array.from(new Set(
    completedRounds.flatMap((entry) => [
      OPPOSITE_PROMPT_THEME_LABELS[entry.currentOption.id],
      OPPOSITE_PROMPT_THEME_LABELS[entry.otherOption.id],
    ]).filter((value): value is string => Boolean(value))
  ));

  const sections = [
    sharedVibeSummary ? `Shared vibe signal: ${sharedVibeSummary}` : null,
    completedRounds.length > 0
      ? `Across Root / Reveal, ${currentUser.name} moved through ${formatForestList(currentLabels)}, while ${otherUser.name} moved through ${formatForestList(otherLabels)}. Together, you have already talked about ${formatForestList(themes)}.`
      : null,
    "Forest's direct read: this connection looks strongest when honesty stays calm, expectations stay spoken, and consistency is given room to speak louder than chemistry alone. Use Temp Check to notice whether that grounded signal feels heard, aligned, and ready on both sides.",
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
};

const isTruthOrDareCompleteForUser = (
  rounds: OppositePromptRound[],
  responses: OppositePromptResponse[],
  userId: string
): boolean => rounds.every((round) => getRoundResponses(responses, round.id).some((response) => response.userId === userId));

const hasAnyTruthOrDareComplete = (
  rounds: OppositePromptRound[],
  responses: OppositePromptResponse[],
  users: [string, string]
): boolean => users.some((userId) => isTruthOrDareCompleteForUser(rounds, responses, userId));

const evaluateTruthOrDareUnlock = (
  rounds: OppositePromptRound[],
  responses: OppositePromptResponse[],
  users: [string, string]
): boolean => users.every((userId) => isTruthOrDareCompleteForUser(rounds, responses, userId));

const getDefaultHandoffToStage = (stage: MilestoneStage): MilestoneStage | null => {
  if (stage === 'shared-vibe') return 'truth-or-dare';
  if (stage === 'truth-or-dare') return 'temp-check';
  return null;
};

const canAdvanceFromHandoff = (
  milestones: RelationshipMilestones,
  fromStage: MilestoneStage,
  users: [string, string]
): boolean => {
  if (fromStage === 'shared-vibe') {
    return evaluateSharedVibeUnlock(milestones.sharedVibe.picksByUser, users);
  }
  if (fromStage === 'truth-or-dare') {
    return evaluateTruthOrDareUnlock(milestones.truthOrDare.rounds, milestones.truthOrDare.responses, users);
  }
  return true;
};

const ensureHandoffForCurrentStage = (
  milestones: RelationshipMilestones,
  userId: string,
  now: number
): RelationshipMilestones => {
  if (milestones.handoff && milestones.handoff.fromStage === milestones.stage) {
    return milestones;
  }

  const toStage = getDefaultHandoffToStage(milestones.stage);
  if (!toStage) return milestones;

  if (milestones.stage === 'shared-vibe' && !isSharedVibeCompleteForUser(milestones.sharedVibe.picksByUser, userId)) {
    return milestones;
  }

  if (
    milestones.stage === 'truth-or-dare' &&
    !isTruthOrDareCompleteForUser(milestones.truthOrDare.rounds, milestones.truthOrDare.responses, userId)
  ) {
    return milestones;
  }

  return queueStageTransition(milestones, milestones.stage, toStage, now);
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
    ...createInitialOppositePromptState(),
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
  handoff: null,
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
      const anyUserReady = hasAnySharedVibeComplete(picksByUser, users);
      const summary = buildSharedVibeSummary(picksByUser, users);

      const nextMilestones: RelationshipMilestones = {
        ...milestones,
        sharedVibe: {
          ...milestones.sharedVibe,
          picksByUser,
          sharedItems,
          summary,
          unlockedAt: canUnlock ? (milestones.sharedVibe.unlockedAt ?? now) : milestones.sharedVibe.unlockedAt,
        },
        handoff: !anyUserReady && milestones.handoff?.fromStage === 'shared-vibe'
          ? null
          : milestones.handoff,
        updatedAt: now,
      };

      if (anyUserReady && milestones.stage === 'shared-vibe') {
        return queueStageTransition(nextMilestones, 'shared-vibe', 'truth-or-dare', now);
      }

      return nextMilestones;
    }

    case 'submit-opposite-prompt': {
      if (!users.includes(action.userId)) return milestones;

      const round = milestones.truthOrDare.rounds.find((item) => item.id === action.roundId);
      if (!round) return milestones;

      const currentRound = getCurrentIncompleteRound(milestones.truthOrDare.rounds, milestones.truthOrDare.responses, users);
      if (!currentRound || currentRound.id !== round.id) return milestones;

      const sanitized = action.response.trim();
      if (!sanitized) return milestones;

      const roundResponses = getRoundResponses(milestones.truthOrDare.responses, round.id);
      const existingResponse = roundResponses.find((response) => response.userId === action.userId);
      if (existingResponse) return milestones;

      const otherResponse = roundResponses.find((response) => response.userId !== action.userId);
      const assignedOption = otherResponse
        ? getOppositeOption(round, otherResponse.optionId)
        : getRoundOption(round, action.optionId);

      if (!assignedOption || assignedOption.id !== action.optionId) return milestones;

      const nextResponse: OppositePromptResponse = {
        id: `orp_${now}_${Math.random().toString(36).slice(2, 8)}`,
        roundId: round.id,
        optionId: assignedOption.id,
        userId: action.userId,
        response: sanitized,
        completedAt: now,
      };

      const responses = [...milestones.truthOrDare.responses, nextResponse];

      const unlocked = evaluateTruthOrDareUnlock(milestones.truthOrDare.rounds, responses, users);
      const anyUserReady = hasAnyTruthOrDareComplete(milestones.truthOrDare.rounds, responses, users);
      const nextMilestones: RelationshipMilestones = {
        ...milestones,
        truthOrDare: {
          ...milestones.truthOrDare,
          responses,
          unlockedAt: unlocked ? (milestones.truthOrDare.unlockedAt ?? now) : milestones.truthOrDare.unlockedAt,
        },
        handoff: !anyUserReady && milestones.handoff?.fromStage === 'truth-or-dare'
          ? null
          : milestones.handoff,
        updatedAt: now,
      };

      if (anyUserReady && milestones.stage === 'truth-or-dare') {
        return queueStageTransition(nextMilestones, 'truth-or-dare', 'temp-check', now);
      }

      return nextMilestones;
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

      const nextMilestones: RelationshipMilestones = {
        ...milestones,
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
        handoff: outcome === 'pending' && milestones.handoff?.fromStage === 'temp-check'
          ? null
          : milestones.handoff,
        updatedAt: now,
      };

      if (milestones.stage === 'temp-check' && outcome === 'aligned') {
        return queueStageTransition(nextMilestones, 'temp-check', 'date-offer', now);
      }

      if (milestones.stage === 'temp-check' && outcome === 'mismatch') {
        return queueStageTransition(nextMilestones, 'temp-check', 'bridge', now);
      }

      return nextMilestones;
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

      const finalized: RelationshipMilestones = {
        ...next,
        handoff: !readyForFinal && next.handoff?.fromStage === 'bridge' ? null : next.handoff,
        rhythmRisk: {
          ...next.rhythmRisk,
          safetyPlan: buildSafetyPlan(next) ?? next.rhythmRisk.safetyPlan,
        },
      };

      if (readyForFinal && next.stage === 'bridge') {
        return queueStageTransition(finalized, 'bridge', 'final-check', now);
      }

      return finalized;
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

      const nextMilestones: RelationshipMilestones = {
        ...milestones,
        finalCheck: {
          answers,
          outcome,
          completedAt: outcome !== 'pending' ? now : milestones.finalCheck.completedAt,
        },
        handoff: outcome === 'pending' && milestones.handoff?.fromStage === 'final-check'
          ? null
          : milestones.handoff,
        updatedAt: now,
      };

      if (milestones.stage === 'final-check' && outcome === 'aligned') {
        return queueStageTransition(nextMilestones, 'final-check', 'date-offer', now);
      }

      if (milestones.stage === 'final-check' && outcome === 'mismatch') {
        return queueStageTransition(nextMilestones, 'final-check', 'resource-path', now);
      }

      return nextMilestones;
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
        handoff: null,
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
        handoff: null,
        updatedAt: now,
      };
    }

    case 'set-handoff-choice': {
      if (!users.includes(action.userId)) return milestones;
      const milestonesWithHandoff = ensureHandoffForCurrentStage(milestones, action.userId, now);
      const handoff = milestonesWithHandoff.handoff;
      if (!handoff || handoff.fromStage !== milestonesWithHandoff.stage) return milestonesWithHandoff;

      const choicesByUser = {
        ...handoff.choicesByUser,
        [action.userId]: action.choice,
      };
      const everyoneContinues = users.every((userId) => choicesByUser[userId] === 'continue');
      const readyToAdvance = everyoneContinues && canAdvanceFromHandoff(milestonesWithHandoff, handoff.fromStage, users);

      return {
        ...milestonesWithHandoff,
        stage: readyToAdvance ? handoff.toStage : milestonesWithHandoff.stage,
        handoff: readyToAdvance
          ? null
          : {
              ...handoff,
              choicesByUser,
            },
        updatedAt: now,
      };
    }

    case 'set-stage':
      return {
        ...milestones,
        stage: action.stage,
        handoff: null,
        updatedAt: now,
      };

    default:
      return milestones;
  }
};

export type { MilestoneAction };

