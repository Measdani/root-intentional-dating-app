import { supabase } from '@/lib/supabase';
import type { ForestResponse } from '@/services/forestRagService';
import { normalizeForestValue, tokenizeForestValue } from '@/services/forestRagService';

type ForestUnmatchedQueryInsert = {
  question: string;
  response: ForestResponse;
  pageContext?: string;
};

export const logForestUnmatchedQuery = async ({
  question,
  response,
  pageContext,
}: ForestUnmatchedQueryInsert): Promise<void> => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion || !response.redirectUsed) return;

  const normalizedQuery = normalizeForestValue(trimmedQuestion);
  const tokenSnapshot = Array.from(new Set(tokenizeForestValue(trimmedQuestion))).slice(0, 20);
  const topTopics = response.matches.map((match) => match.topic).slice(0, 3);

  const { error } = await supabase.from('rh_forest_unmatched_queries').insert({
    query_text: trimmedQuestion,
    normalized_query: normalizedQuery || trimmedQuestion.toLowerCase(),
    token_snapshot: tokenSnapshot,
    match_count: response.matches.length,
    top_score: response.matches[0]?.score ?? 0,
    top_topics: topTopics,
    page_context: pageContext?.trim() || null,
  });

  if (error) {
    console.warn('Failed to log unmatched Forest query:', error.message);
  }
};
