import {
  FOREST_SYSTEM_PROMPT,
  type ForestKnowledgeEntry,
} from '@/data/forestKnowledgeBase';
import { getForestKnowledgeBase } from '@/services/forestKnowledgeService';

export type ForestKnowledgeMatch = ForestKnowledgeEntry & {
  score: number;
};

export type ForestResponse = {
  answer: string;
  matches: ForestKnowledgeMatch[];
  redirectUsed: boolean;
  systemPrompt: string;
};

const FOREST_FALLBACK_ANSWER =
  'Forest stays inside the Knowledge Base. If this question is outside what is stored here, return to the 333/777 rules or the 3 Layers: The Standard, The Detox, and Self-Awareness.';

const LOW_SIGNAL_TOKENS = new Set([
  'about',
  'after',
  'avoid',
  'can',
  'feel',
  'from',
  'have',
  'into',
  'just',
  'like',
  'need',
  'partner',
  'person',
  'relationship',
  'someone',
  'that',
  'them',
  'they',
  'this',
  'what',
  'with',
  'would',
  'your',
]);

const FOREST_QUERY_EXPANSIONS: Record<string, string[]> = {
  gaslighting: ['gaslight', 'manipulation', 'control', 'confusion', 'distortion', 'lies'],
  abuse: ['control', 'fear', 'punishment', 'coercion', 'manipulation'],
  chemistry: ['attraction', 'impulse', 'flesh', 'peace', 'discernment'],
  counterfeit: ['mask', 'fake', 'inconsistency', 'lovebombing', 'acceleration'],
  pressure: ['control', 'fear', 'guilt', 'urgency', 'submission'],
};

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !LOW_SIGNAL_TOKENS.has(token));

const expandQuestionTokens = (question: string): Set<string> => {
  const expanded = new Set(tokenize(question));

  Array.from(expanded).forEach((token) => {
    (FOREST_QUERY_EXPANSIONS[token] ?? []).forEach((relatedToken) => {
      tokenize(relatedToken).forEach((entry) => expanded.add(entry));
    });
  });

  return expanded;
};

const scoreKnowledgeEntry = (question: string, entry: ForestKnowledgeEntry): number => {
  const normalizedQuestion = normalize(question);
  const questionTokens = expandQuestionTokens(question);
  let score = 0;

  entry.keywords.forEach((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword && normalizedQuestion.includes(normalizedKeyword)) {
      score += 7;
    }
  });

  tokenize(entry.topic).forEach((token) => {
    if (questionTokens.has(token)) score += 5;
  });

  tokenize(entry.category).forEach((token) => {
    if (questionTokens.has(token)) score += 3;
  });

  tokenize(entry.content)
    .concat(tokenize(entry.searchText ?? ''))
    .filter((token) => token.length >= 5)
    .forEach((token) => {
      if (questionTokens.has(token)) score += 1;
    });

  return score;
};

const getTopMatches = (question: string, knowledgeBase: ForestKnowledgeEntry[]): ForestKnowledgeMatch[] =>
  knowledgeBase.map((entry) => ({
    ...entry,
    score: scoreKnowledgeEntry(question, entry),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

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

export const askForest = async (question: string): Promise<ForestResponse> => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return {
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
    };
  }

  const knowledgeBase = await getForestKnowledgeBase();
  const matches = getTopMatches(trimmedQuestion, knowledgeBase);
  if (matches.length === 0 || matches[0].score < 5) {
    return {
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
    };
  }

  const [primaryMatch, secondaryMatch] = matches;
  const answerParts = [
    `Forest hears this most clearly through ${primaryMatch.topic}. ${primaryMatch.content}`,
    secondaryMatch
      ? `Hold it alongside ${secondaryMatch.topic}. ${secondaryMatch.content}`
      : null,
    buildForestAction(primaryMatch),
  ].filter((part): part is string => Boolean(part));

  return {
    answer: answerParts.join('\n\n'),
    matches,
    redirectUsed: false,
    systemPrompt: FOREST_SYSTEM_PROMPT,
  };
};
