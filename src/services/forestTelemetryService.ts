import { supabase } from '@/lib/supabase';
import type { ForestResponse } from '@/services/forestRagService';
import { normalizeForestValue, tokenizeForestValue } from '@/services/forestRagService';

type ForestUnmatchedQueryInsert = {
  question: string;
  response: ForestResponse;
  pageContext?: string;
};

const isForestUncertaintySchemaError = (error: { code?: string; message?: string; details?: string } | null): boolean => {
  if (!error) return false;

  const errorText = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    error.code === 'PGRST204' ||
    errorText.includes('uncertainty_') ||
    errorText.includes('direct_terms') ||
    errorText.includes('rejected_topics')
  );
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
  const topTopics =
    response.matches.length > 0
      ? response.matches.map((match) => match.topic).slice(0, 3)
      : response.uncertainty.rejectedTopics.slice(0, 3);
  const baseInsert = {
    query_text: trimmedQuestion,
    normalized_query: normalizedQuery || trimmedQuestion.toLowerCase(),
    token_snapshot: tokenSnapshot,
    match_count: response.matches.length,
    top_score: response.matches[0]?.score ?? 0,
    top_topics: topTopics,
    page_context: pageContext?.trim() || null,
  };

  let { error } = await supabase.from('rh_forest_unmatched_queries').insert({
    ...baseInsert,
    uncertainty_label: response.uncertainty.label,
    uncertainty_reason: response.uncertainty.reason,
    uncertainty_confidence: response.uncertainty.confidence,
    direct_terms: response.uncertainty.directTerms,
    rejected_topics: response.uncertainty.rejectedTopics,
  });

  if (isForestUncertaintySchemaError(error)) {
    const retry = await supabase.from('rh_forest_unmatched_queries').insert(baseInsert);
    error = retry.error;
  }

  if (error) {
    console.warn('Failed to log unmatched Forest query:', error.message);
  }
};
