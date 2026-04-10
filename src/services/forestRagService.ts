import {
  FOREST_SYSTEM_PROMPT,
  type ForestKnowledgeEntry,
} from '@/data/forestKnowledgeBase';
import { getForestKnowledgeBase } from '@/services/forestKnowledgeService';

export type ForestKnowledgeMatch = ForestKnowledgeEntry & {
  score: number;
  matchedTerms: string[];
};

export type ForestUncertainty = {
  confidence: number;
  label: 'high' | 'medium' | 'low';
  reason: string;
  directTerms: string[];
  rejectedTopics: string[];
};

export type ForestResponse = {
  rawQuestion: string;
  answer: string;
  matches: ForestKnowledgeMatch[];
  redirectUsed: boolean;
  systemPrompt: string;
  uncertainty: ForestUncertainty;
};

const FOREST_FALLBACK_ANSWER =
  'Forest could not find a direct terminology match. Reword your question with the exact pattern, style, or module name you mean.';

const LOW_SIGNAL_TOKENS = new Set([
  'about',
  'actually',
  'after',
  'any',
  'are',
  'around',
  'asked',
  'asking',
  'avoid',
  'can',
  'does',
  'dont',
  'even',
  'feel',
  'from',
  'grab',
  'grabbing',
  'has',
  'have',
  'into',
  'its',
  'just',
  'like',
  'mean',
  'need',
  'only',
  'partner',
  'person',
  'pulling',
  'question',
  'really',
  'relationship',
  'right',
  'someone',
  'something',
  'that',
  'them',
  'they',
  'this',
  'those',
  'use',
  'using',
  'what',
  'when',
  'where',
  'which',
  'why',
  'with',
  'would',
  'your',
]);

const GENERIC_KNOWLEDGE_TOKENS = new Set([
  'alignment',
  'area',
  'blog',
  'forest',
  'hearts',
  'intentional',
  'layer',
  'module',
  'path',
  'resource',
  'rooted',
]);

const STRICT_RESOURCE_TAGS = new Set(['oak', 'willow', 'fern', 'gardener', 'wildflower']);

const FOREST_QUERY_EXPANSIONS: Record<string, string[]> = {
  argue: ['arguing', 'argument', 'arguments', 'fight', 'fighting', 'conflict', 'disagreement'],
  arguing: ['argue', 'argument', 'arguments', 'fight', 'fighting', 'conflict', 'disagreement'],
  argument: ['argue', 'arguing', 'arguments', 'fight', 'fighting', 'conflict', 'disagreement'],
  arguments: ['argue', 'arguing', 'argument', 'fight', 'fighting', 'conflict', 'disagreement'],
  gaslighting: ['gaslight', 'manipulation', 'control', 'confusion', 'distortion', 'lies'],
  abuse: ['control', 'fear', 'punishment', 'coercion', 'manipulation'],
  chemistry: ['attraction', 'impulse', 'flesh', 'peace', 'discernment'],
  counterfeit: ['mask', 'fake', 'inconsistency', 'lovebombing', 'acceleration'],
  fight: ['argue', 'arguing', 'argument', 'arguments', 'fighting', 'conflict', 'disagreement'],
  fighting: ['fight', 'argue', 'arguing', 'argument', 'arguments', 'conflict', 'disagreement'],
  pressure: ['control', 'fear', 'guilt', 'urgency', 'submission'],
};

const FOREST_TOKEN_FAMILIES = [
  ['argue', 'argues', 'argued', 'arguing', 'argument', 'arguments'],
  ['fight', 'fights', 'fighting'],
  ['disagree', 'disagrees', 'disagreed', 'disagreeing', 'disagreement', 'disagreements'],
];

const FOREST_TOKEN_ALIAS_MAP = new Map<string, string[]>(
  FOREST_TOKEN_FAMILIES.flatMap((family) => family.map((token) => [token, family] as const)),
);

export const normalizeForestValue = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export const tokenizeForestValue = (value: string): string[] =>
  normalizeForestValue(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !LOW_SIGNAL_TOKENS.has(token));

const uniqueForestValues = (values: string[]): string[] => Array.from(new Set(values));

const expandForestTokens = (tokens: string[]): Set<string> => {
  const expanded = new Set<string>();

  tokens.forEach((token) => {
    expanded.add(token);
    (FOREST_TOKEN_ALIAS_MAP.get(token) ?? []).forEach((alias) => expanded.add(alias));
  });

  return expanded;
};

const tokenMatchesExpandedSet = (token: string, expandedTokenSet: Set<string>): boolean => {
  if (expandedTokenSet.has(token)) return true;
  return Array.from(expandForestTokens([token])).some((expandedToken) => expandedTokenSet.has(expandedToken));
};

const expandedSetsOverlap = (left: Set<string>, right: Set<string>): boolean =>
  Array.from(left).some((token) => right.has(token));

const matchesStrictResourceTag = (token: string): boolean =>
  Array.from(expandForestTokens([token])).some((expandedToken) => STRICT_RESOURCE_TAGS.has(expandedToken));

export const getForestMatchLabel = (
  match: Pick<ForestKnowledgeEntry, 'category' | 'topic'>,
): string => {
  const category = match.category.trim();
  const topic = match.topic.trim();

  if (!category) return topic;
  if (!topic) return category;

  const normalizedCategory = normalizeForestValue(category);
  const normalizedTopic = normalizeForestValue(topic);

  if (
    !normalizedTopic ||
    normalizedCategory === normalizedTopic ||
    normalizedCategory.endsWith(normalizedTopic)
  ) {
    return topic;
  }

  return `${category} - ${topic}`;
};

const expandQuestionTokens = (question: string): Set<string> => {
  const expanded = new Set(tokenizeForestValue(question));

  Array.from(expanded).forEach((token) => {
    (FOREST_QUERY_EXPANSIONS[token] ?? []).forEach((relatedToken) => {
      tokenizeForestValue(relatedToken).forEach((entry) => expanded.add(entry));
    });
  });

  return expanded;
};

type ForestEntryEvaluation = ForestKnowledgeMatch & {
  phraseMatches: string[];
  contextualHits: string[];
  strictTagMisses: string[];
  directScore: number;
};

const getEntryPhraseCandidates = (entry: ForestKnowledgeEntry): string[] =>
  uniqueForestValues([
    entry.topic,
    entry.starterLabel ?? '',
    entry.starterPrompt ?? '',
    ...entry.keywords,
  ])
    .map((value) => normalizeForestValue(value))
    .filter((value) => tokenizeForestValue(value).length > 0);

const getEntryAnchorTokens = (entry: ForestKnowledgeEntry): string[] =>
  uniqueForestValues(
    [
      entry.topic,
      entry.category,
      entry.starterLabel ?? '',
      entry.starterPrompt ?? '',
      ...entry.keywords,
    ].flatMap((value) => tokenizeForestValue(value)),
  ).filter((token) => !GENERIC_KNOWLEDGE_TOKENS.has(token));

const getEntryContextTokens = (entry: ForestKnowledgeEntry): string[] =>
  uniqueForestValues(
    tokenizeForestValue(entry.content)
      .concat(tokenizeForestValue(entry.searchText ?? ''))
      .concat(tokenizeForestValue(entry.starterPrompt ?? ''))
      .filter((token) => token.length >= 5 && !GENERIC_KNOWLEDGE_TOKENS.has(token)),
  );

const evaluateKnowledgeEntry = (
  question: string,
  entry: ForestKnowledgeEntry,
): ForestEntryEvaluation => {
  const normalizedQuestion = normalizeForestValue(question);
  const rawQuestionTokens = uniqueForestValues(tokenizeForestValue(question));
  const questionTokens = expandForestTokens(rawQuestionTokens);
  const expandedQuestionTokens = expandQuestionTokens(question);
  const topicTokens = expandForestTokens(tokenizeForestValue(entry.topic));
  const keywordTokens = expandForestTokens(entry.keywords.flatMap((keyword) => tokenizeForestValue(keyword)));
  const categoryTokens = expandForestTokens(tokenizeForestValue(entry.category));
  const starterTokens = expandForestTokens(
    tokenizeForestValue(entry.starterLabel ?? '').concat(tokenizeForestValue(entry.starterPrompt ?? '')),
  );
  const phraseCandidates = getEntryPhraseCandidates(entry);
  const anchorTokens = getEntryAnchorTokens(entry);
  const expandedAnchorTokens = expandForestTokens(anchorTokens);
  const contextTokens = getEntryContextTokens(entry);
  const matchedTerms = rawQuestionTokens.filter((token) => tokenMatchesExpandedSet(token, expandedAnchorTokens));
  const phraseMatches = phraseCandidates.filter((phrase) => normalizedQuestion.includes(phrase));
  const contextualHits = contextTokens.filter((token) => expandedQuestionTokens.has(token));
  const strictTags = Array.from(expandedAnchorTokens).filter((token) => STRICT_RESOURCE_TAGS.has(token));
  const matchedStrictTags = strictTags.filter((tag) => questionTokens.has(tag));
  const strictTagMisses = strictTags.filter((tag) => !questionTokens.has(tag));
  const strictGateFailed = strictTags.length > 0 && strictTagMisses.length === strictTags.length;
  const hasDirectCorrelation = matchedTerms.length > 0 || phraseMatches.length > 0;

  let directScore = 0;

  phraseMatches.forEach(() => {
    directScore += 10;
  });

  matchedTerms.forEach((token) => {
    const expandedMatchedToken = expandForestTokens([token]);

    if (expandedSetsOverlap(expandedMatchedToken, topicTokens)) {
      directScore += 6;
      return;
    }

    if (expandedSetsOverlap(expandedMatchedToken, starterTokens)) {
      directScore += 5;
      return;
    }

    if (expandedSetsOverlap(expandedMatchedToken, keywordTokens)) {
      directScore += 5;
      return;
    }

    if (expandedSetsOverlap(expandedMatchedToken, categoryTokens)) {
      directScore += 3;
    }
  });

  matchedStrictTags.forEach(() => {
    directScore += 3;
  });

  const contextualScore = Math.min(contextualHits.length, 4);
  const score = hasDirectCorrelation && !strictGateFailed ? directScore + contextualScore : 0;

  return {
    ...entry,
    score,
    matchedTerms,
    phraseMatches,
    contextualHits,
    strictTagMisses,
    directScore,
  };
};

const getForestQuestionTerms = (question: string): string[] =>
  uniqueForestValues(tokenizeForestValue(question));

const buildRejectedTopics = (evaluations: ForestEntryEvaluation[]): string[] =>
  evaluations
    .filter(
      (entry) =>
        entry.score === 0 &&
        (entry.strictTagMisses.length > 0 ||
          entry.matchedTerms.length > 0 ||
          entry.phraseMatches.length > 0 ||
          entry.contextualHits.length > 0),
    )
    .sort((a, b) => {
      if (b.strictTagMisses.length !== a.strictTagMisses.length) {
        return b.strictTagMisses.length - a.strictTagMisses.length;
      }

      if (b.directScore !== a.directScore) return b.directScore - a.directScore;
      return b.contextualHits.length - a.contextualHits.length;
    })
    .map((entry) => entry.topic)
    .filter((topic, index, values) => values.indexOf(topic) === index)
    .slice(0, 4);

const getTopMatches = (
  question: string,
  knowledgeBase: ForestKnowledgeEntry[],
): { matches: ForestKnowledgeMatch[]; rejectedTopics: string[] } => {
  const evaluations = knowledgeBase
    .map((entry) => evaluateKnowledgeEntry(question, entry))
    .sort((a, b) => b.score - a.score);

  const matches = evaluations
    .filter((entry) => entry.score > 0)
    .slice(0, 2)
    .map((entry) => ({
      category: entry.category,
      topic: entry.topic,
      content: entry.content,
      keywords: entry.keywords,
      searchText: entry.searchText,
      actionText: entry.actionText,
      starterLabel: entry.starterLabel,
      starterPrompt: entry.starterPrompt,
      displayOrder: entry.displayOrder,
      score: entry.score,
      matchedTerms: entry.matchedTerms,
    }));

  return {
    matches,
    rejectedTopics: buildRejectedTopics(evaluations),
  };
};

const buildForestAction = (match: ForestKnowledgeMatch): string => {
  if (typeof match.actionText === 'string' && match.actionText.trim().length > 0) {
    return match.actionText;
  }

  switch (match.topic) {
    case 'Gaslighting and Reality Distortion':
      return 'Do not argue with the distortion. Slow the connection down, document the pattern, and trust the difference between peace and confusion.';
    case 'Pressure, Control, and False Peace':
      return 'If peace only exists when you stay small, that is not peace. Step back from pressure and let their pattern reveal itself without your self-betrayal.';
    case 'Lovebombing and Acceleration':
      return 'Refuse urgency. Let time, consistency, and peace do the testing before deeper access is given.';
    case 'The Counterfeit and the Mask':
      return "Do not explain away the mask. Watch consistency longer than chemistry and let what's false fall on its own.";
    case 'Spirit vs. Flesh':
      return 'Ask what is leading: peace or urgency. If peace is missing, slow down until discernment returns.';
    default:
      return 'Let clarity, consistency, and peace speak before emotion takes the lead.';
  }
};

const buildPrimaryResponse = (match: ForestKnowledgeMatch): string => match.content;

const buildSecondaryResponse = (match: ForestKnowledgeMatch): string => match.content;

const needsQuestionRefinement = (question: string): boolean => {
  const normalizedQuestion = normalizeForestValue(question);
  return (
    /^(what is|whats|what s|define|tell me about)\s+/.test(normalizedQuestion) ||
    tokenizeForestValue(question).length <= 1
  );
};

const getForestUncertainty = ({
  rawQuestion,
  matches,
  rejectedTopics,
  redirectUsed,
}: {
  rawQuestion: string;
  matches: ForestKnowledgeMatch[];
  rejectedTopics: string[];
  redirectUsed: boolean;
}): ForestUncertainty => {
  const questionTerms = getForestQuestionTerms(rawQuestion).slice(0, 6);
  const matchedDirectTerms = uniqueForestValues(matches.flatMap((match) => match.matchedTerms));
  const directTerms = (matchedDirectTerms.length > 0 ? matchedDirectTerms : questionTerms).slice(0, 6);

  if (redirectUsed) {
    return {
      confidence: rejectedTopics.length > 0 ? 18 : 8,
      label: 'low',
      reason:
        rejectedTopics.length > 0
          ? 'Forest found nearby material, but it did not correlate directly enough to the user’s own wording, so it used the reword fallback instead of reaching.'
          : 'Forest could not find a direct terminology match in the available doctrine, module, or blog entries, so it triggered the reword fallback.',
      directTerms,
      rejectedTopics,
    };
  }

  const topMatch = matches[0];
  const secondMatch = matches[1];
  const scoreGap = secondMatch ? topMatch.score - secondMatch.score : topMatch.score;
  const confidence = Math.max(35, Math.min(98, topMatch.score * 6 + scoreGap * 4));
  const label =
    topMatch.score >= 18 && scoreGap >= 4 && directTerms.length >= 2
      ? 'high'
      : topMatch.score >= 10
        ? 'medium'
        : 'low';

  return {
    confidence,
    label,
    reason:
      label === 'high'
        ? 'Forest found a strong direct terminology match and kept the answer grounded to those entries.'
        : label === 'medium'
          ? 'Forest found a direct match, but the wording overlaps nearby topics, so the answer stayed narrowly grounded.'
          : 'Forest found only a thin direct match and kept the response constrained to avoid reaching.',
    directTerms,
    rejectedTopics,
  };
};

export const askForest = async (question: string): Promise<ForestResponse> => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return {
      rawQuestion: trimmedQuestion,
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
      uncertainty: {
        confidence: 0,
        label: 'low',
        reason: 'Forest did not receive a usable question.',
        directTerms: [],
        rejectedTopics: [],
      },
    };
  }

  const knowledgeBase = await getForestKnowledgeBase();
  const { matches, rejectedTopics } = getTopMatches(trimmedQuestion, knowledgeBase);
  const questionTerms = getForestQuestionTerms(trimmedQuestion);
  const topMatchHasStrictIdentityTerm =
    matches[0]?.matchedTerms.some((term) => matchesStrictResourceTag(term)) ?? false;
  const isAmbiguousLowSignalMatch =
    !topMatchHasStrictIdentityTerm &&
    matches.length > 1 &&
    matches[0].score - matches[1].score <= 2 &&
    matches[0].matchedTerms.length <= 1 &&
    questionTerms.length <= 3;
  const minimumScore = topMatchHasStrictIdentityTerm ? 6 : 8;

  if (matches.length === 0 || matches[0].score < minimumScore || isAmbiguousLowSignalMatch) {
    return {
      rawQuestion: trimmedQuestion,
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
      uncertainty: getForestUncertainty({
        rawQuestion: trimmedQuestion,
        matches,
        rejectedTopics,
        redirectUsed: true,
      }),
    };
  }

  const [primaryMatch, secondaryMatch] = matches;
  const answerParts = [
    buildPrimaryResponse(primaryMatch),
    secondaryMatch ? buildSecondaryResponse(secondaryMatch) : null,
    buildForestAction(primaryMatch),
    needsQuestionRefinement(trimmedQuestion)
      ? 'If you want a clearer answer, ask Forest about a specific tension or pattern, like love vs urgency, peace vs chemistry, or covenant vs contract.'
      : null,
  ].filter((part): part is string => Boolean(part));

  return {
    rawQuestion: trimmedQuestion,
    answer: answerParts.join('\n\n'),
    matches,
    redirectUsed: false,
    systemPrompt: FOREST_SYSTEM_PROMPT,
    uncertainty: getForestUncertainty({
      rawQuestion: trimmedQuestion,
      matches,
      rejectedTopics,
      redirectUsed: false,
    }),
  };
};
