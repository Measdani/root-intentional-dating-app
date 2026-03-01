import { supabase } from '@/lib/supabase';
import type { ConciergeSnapshot, ConversationMessage, UserInteraction } from '@/types';

interface ConciergeAiResponse {
  headline?: string;
  highlights?: string[];
  caution?: string;
  model?: string;
}

const normalizeHighlights = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 3);
};

const buildPayloadMessages = (messages: ConversationMessage[]) =>
  messages.slice(-30).map((message) => ({
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    message: message.message,
    timestamp: message.timestamp,
  }));

export const enrichConciergeSnapshotWithAI = async (
  interaction: UserInteraction,
  snapshot: ConciergeSnapshot
): Promise<ConciergeSnapshot | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('concierge-vibe-check', {
      body: {
        conversationId: interaction.conversationId,
        userId: snapshot.userId,
        messageCount: interaction.messages.length,
        messages: buildPayloadMessages(interaction.messages),
      },
    });

    if (error || !data || typeof data !== 'object') {
      return null;
    }

    const parsed = data as ConciergeAiResponse;
    const headline = typeof parsed.headline === 'string' ? parsed.headline.trim() : '';
    const highlights = normalizeHighlights(parsed.highlights);
    const caution = typeof parsed.caution === 'string' ? parsed.caution.trim() : undefined;

    if (!headline || highlights.length === 0) {
      return null;
    }

    return {
      ...snapshot,
      headline,
      highlights,
      caution: caution || snapshot.caution,
      source: 'ai',
      aiModel: typeof parsed.model === 'string' ? parsed.model : undefined,
    };
  } catch (error) {
    console.warn('Concierge AI enrichment unavailable, continuing with heuristic snapshot:', error);
    return null;
  }
};
