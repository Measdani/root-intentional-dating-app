import type {
  ConciergeNudge,
  ConciergeNudgeType,
  ConciergeSnapshot,
  ConciergeState,
  ConversationMessage,
  UserInteraction,
} from '@/types';

const TALK_BALANCE_WINDOW = 10;
const TALK_BALANCE_MIN_MESSAGES = 6;
const TALK_BALANCE_SHARE_THRESHOLD = 0.9;
const OFF_PLATFORM_MIN_MESSAGES = 10;
const NUDGE_COOLDOWN_MESSAGES = 6;
const SNAPSHOT_INTERVAL_MESSAGES = 12;

const DIRECT_COMMUNICATION_PATTERN =
  /\b(i want|i need|i prefer|i value|clear|direct|honest|boundary|boundaries)\b/i;
const WARMTH_PATTERN = /\b(thank|appreciate|glad|happy|care|excited|support)\b/i;
const OFF_PLATFORM_PATTERN =
  /\b(phone|number|text me|call me|whatsapp|telegram|signal|snap(chat)?|instagram|ig\b|email me|gmail|dm me|off app|off platform)\b/i;
const URL_PATTERN = /https?:\/\/|www\./i;
const PHONE_PATTERN = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;

export interface ConciergeEvaluationResult {
  nudges: ConciergeNudge[];
  snapshots: ConciergeSnapshot[];
}

const buildId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getConciergeState = (interaction: UserInteraction): ConciergeState => ({
  nudges: interaction.concierge?.nudges ?? [],
  snapshots: interaction.concierge?.snapshots ?? [],
});

const getMessageShareByUser = (messages: ConversationMessage[]): Record<string, number> => {
  const charCountByUser = messages.reduce<Record<string, number>>((acc, msg) => {
    const length = msg.message.trim().length;
    acc[msg.fromUserId] = (acc[msg.fromUserId] ?? 0) + length;
    return acc;
  }, {});

  const totalChars = Object.values(charCountByUser).reduce((sum, count) => sum + count, 0);
  if (totalChars <= 0) return {};

  return Object.entries(charCountByUser).reduce<Record<string, number>>((acc, [userId, count]) => {
    acc[userId] = count / totalChars;
    return acc;
  }, {});
};

const canEmitNudge = (
  type: ConciergeNudgeType,
  conciergeState: ConciergeState,
  messageCount: number
): boolean => {
  const latestNudgeOfType = [...conciergeState.nudges]
    .filter((nudge) => nudge.type === type)
    .sort((a, b) => b.messageCountAtTrigger - a.messageCountAtTrigger)[0];

  if (!latestNudgeOfType) return true;
  return messageCount - latestNudgeOfType.messageCountAtTrigger >= NUDGE_COOLDOWN_MESSAGES;
};

const shouldTriggerTalkBalanceNudge = (
  interaction: UserInteraction,
  conciergeState: ConciergeState
): boolean => {
  if (interaction.messages.length < TALK_BALANCE_MIN_MESSAGES) return false;
  if (!canEmitNudge('talk-balance', conciergeState, interaction.messages.length)) return false;

  const recentMessages = interaction.messages.slice(-TALK_BALANCE_WINDOW);
  const shareByUser = getMessageShareByUser(recentMessages);
  const userShares = Object.values(shareByUser);

  if (userShares.length < 2) return false;

  const dominantShare = Math.max(...userShares);
  return dominantShare >= TALK_BALANCE_SHARE_THRESHOLD;
};

const containsOffPlatformSignal = (message: string): boolean => {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return OFF_PLATFORM_PATTERN.test(trimmed) || URL_PATTERN.test(trimmed) || PHONE_PATTERN.test(trimmed);
};

const shouldTriggerOffPlatformNudge = (
  interaction: UserInteraction,
  latestMessage: ConversationMessage,
  conciergeState: ConciergeState
): boolean => {
  if (!canEmitNudge('off-platform-early', conciergeState, interaction.messages.length)) return false;
  if (!containsOffPlatformSignal(latestMessage.message)) return false;

  const isTooEarly = interaction.messages.length < OFF_PLATFORM_MIN_MESSAGES || !interaction.photosUnlocked;
  return isTooEarly;
};

const computeStyleMetrics = (messages: ConversationMessage[]) => {
  const totalMessages = messages.length;
  if (totalMessages === 0) {
    return {
      avgLength: 0,
      questionRate: 0,
      directRate: 0,
      warmthRate: 0,
    };
  }

  const totalChars = messages.reduce((sum, msg) => sum + msg.message.trim().length, 0);
  const questions = messages.filter((msg) => msg.message.includes('?')).length;
  const direct = messages.filter((msg) => DIRECT_COMMUNICATION_PATTERN.test(msg.message)).length;
  const warm = messages.filter((msg) => WARMTH_PATTERN.test(msg.message)).length;

  return {
    avgLength: totalChars / totalMessages,
    questionRate: questions / totalMessages,
    directRate: direct / totalMessages,
    warmthRate: warm / totalMessages,
  };
};

const buildSnapshotHighlights = (
  interaction: UserInteraction,
  forUserId: string
): { headline: string; highlights: string[]; caution?: string } => {
  const userMessages = interaction.messages.filter((msg) => msg.fromUserId === forUserId);
  const otherUserId = forUserId === interaction.fromUserId ? interaction.toUserId : interaction.fromUserId;
  const otherMessages = interaction.messages.filter((msg) => msg.fromUserId === otherUserId);

  const userMetrics = computeStyleMetrics(userMessages);
  const otherMetrics = computeStyleMetrics(otherMessages);
  const shareByUser = getMessageShareByUser(interaction.messages);
  const shareGap = Math.abs((shareByUser[forUserId] ?? 0.5) - (shareByUser[otherUserId] ?? 0.5));

  const highlights: string[] = [];

  const bothCurious = userMetrics.questionRate >= 0.3 && otherMetrics.questionRate >= 0.3;
  const bothDirect = userMetrics.directRate >= 0.25 && otherMetrics.directRate >= 0.25;
  const bothWarm = userMetrics.warmthRate >= 0.2 && otherMetrics.warmthRate >= 0.2;
  const balanced = shareGap <= 0.25;

  if (bothCurious) {
    highlights.push('You both share a high level of curiosity.');
  }
  if (bothDirect) {
    highlights.push('You both value direct communication.');
  }
  if (balanced) {
    highlights.push('Both voices are showing up with a balanced pace.');
  }
  if (bothWarm) {
    highlights.push('There is a respectful and warm tone in this exchange.');
  }

  if (highlights.length < 2) {
    if (userMetrics.questionRate < 0.2) {
      highlights.push('Adding more open-ended questions could deepen the connection.');
    }
    if (userMetrics.avgLength < 120) {
      highlights.push('Specific examples may help your message style feel more intentional.');
    }
  }

  const headline = bothCurious || bothDirect
    ? 'Compatibility Snapshot: Communication alignment is emerging.'
    : 'Compatibility Snapshot: The room is building steady momentum.';

  const caution = shareGap > 0.45
    ? 'One voice is currently carrying most of the exchange. A direct follow-up question may help rebalance.'
    : undefined;

  return {
    headline,
    highlights: highlights.slice(0, 3),
    caution,
  };
};

const buildSnapshot = (
  interaction: UserInteraction,
  forUserId: string
): ConciergeSnapshot => {
  const summary = buildSnapshotHighlights(interaction, forUserId);
  return {
    id: buildId('concierge_snapshot'),
    userId: forUserId,
    conversationId: interaction.conversationId,
    createdAt: Date.now(),
    messageCount: interaction.messages.length,
    headline: summary.headline,
    highlights: summary.highlights,
    caution: summary.caution,
    source: 'heuristic',
  };
};

const buildNudge = (
  interaction: UserInteraction,
  latestMessage: ConversationMessage,
  type: ConciergeNudgeType
): ConciergeNudge => {
  const messageByType: Record<ConciergeNudgeType, string> = {
    'talk-balance':
      'Concierge check-in: to keep this room healthy, make space for both voices with open-ended questions and reflective replies.',
    'off-platform-early':
      'Concierge check-in: keep the conversation on-platform a bit longer before sharing external contact details.',
  };

  return {
    id: buildId('concierge_nudge'),
    type,
    message: messageByType[type],
    createdAt: Date.now(),
    triggeredByUserId: latestMessage.fromUserId,
    triggeredByMessageId: latestMessage.id,
    messageCountAtTrigger: interaction.messages.length,
    forUserIds: [interaction.fromUserId, interaction.toUserId],
  };
};

const shouldGenerateSnapshot = (
  interaction: UserInteraction,
  conciergeState: ConciergeState
): boolean => {
  const { length: messageCount } = interaction.messages;
  if (messageCount < SNAPSHOT_INTERVAL_MESSAGES) return false;
  if (messageCount % SNAPSHOT_INTERVAL_MESSAGES !== 0) return false;

  const alreadyGeneratedAtCount = conciergeState.snapshots.some(
    (snapshot) => snapshot.messageCount === messageCount
  );
  return !alreadyGeneratedAtCount;
};

export const evaluateConciergeForInteraction = (
  interaction: UserInteraction
): ConciergeEvaluationResult => {
  if (interaction.messages.length === 0) {
    return { nudges: [], snapshots: [] };
  }

  const conciergeState = getConciergeState(interaction);
  const latestMessage = interaction.messages[interaction.messages.length - 1];
  const nudges: ConciergeNudge[] = [];
  const snapshots: ConciergeSnapshot[] = [];

  if (shouldTriggerTalkBalanceNudge(interaction, conciergeState)) {
    nudges.push(buildNudge(interaction, latestMessage, 'talk-balance'));
  }

  if (shouldTriggerOffPlatformNudge(interaction, latestMessage, conciergeState)) {
    nudges.push(buildNudge(interaction, latestMessage, 'off-platform-early'));
  }

  if (shouldGenerateSnapshot(interaction, conciergeState)) {
    snapshots.push(buildSnapshot(interaction, interaction.fromUserId));
    snapshots.push(buildSnapshot(interaction, interaction.toUserId));
  }

  return { nudges, snapshots };
};
