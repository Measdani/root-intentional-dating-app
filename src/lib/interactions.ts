import type { InteractionState, UserInteraction } from '@/types';

const getLatestMessageTimestamp = (interaction: UserInteraction): number =>
  interaction.messages.reduce((latest, message) => Math.max(latest, message.timestamp), 0);

export const getInteractionRecency = (interaction: UserInteraction): number =>
  Math.max(interaction.updatedAt, interaction.createdAt, getLatestMessageTimestamp(interaction));

export const getLatestUniqueInteractions = (state: InteractionState): UserInteraction[] => {
  const latestByConversationId = new Map<string, UserInteraction>();

  [
    ...Object.values(state.sentInterests),
    ...Object.values(state.receivedInterests),
  ].forEach((interaction) => {
    const existing = latestByConversationId.get(interaction.conversationId);
    if (!existing || getInteractionRecency(interaction) >= getInteractionRecency(existing)) {
      latestByConversationId.set(interaction.conversationId, interaction);
    }
  });

  return Array.from(latestByConversationId.values()).sort(
    (a, b) => getInteractionRecency(b) - getInteractionRecency(a)
  );
};

export const findLatestConversationById = (
  state: InteractionState,
  conversationId: string
): UserInteraction | null =>
  getLatestUniqueInteractions(state).find(
    (interaction) => interaction.conversationId === conversationId
  ) ?? null;

export const findLatestConversationForUsers = (
  state: InteractionState,
  userAId: string,
  userBId: string
): UserInteraction | null =>
  getLatestUniqueInteractions(state).find(
    (interaction) =>
      (interaction.fromUserId === userAId && interaction.toUserId === userBId) ||
      (interaction.fromUserId === userBId && interaction.toUserId === userAId)
  ) ?? null;
