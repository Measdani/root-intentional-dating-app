import {
  FOREST_KNOWLEDGE_BASE,
  FOREST_SYSTEM_PROMPT,
  type ForestKnowledgeEntry,
} from '@/data/forestKnowledgeBase';

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

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);

const scoreKnowledgeEntry = (question: string, entry: ForestKnowledgeEntry): number => {
  const normalizedQuestion = normalize(question);
  const questionTokens = new Set(tokenize(question));
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
    .filter((token) => token.length >= 5)
    .forEach((token) => {
      if (questionTokens.has(token)) score += 1;
    });

  return score;
};

const getTopMatches = (question: string): ForestKnowledgeMatch[] =>
  FOREST_KNOWLEDGE_BASE.map((entry) => ({
    ...entry,
    score: scoreKnowledgeEntry(question, entry),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

export const askForest = (question: string): ForestResponse => {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return {
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
    };
  }

  const matches = getTopMatches(trimmedQuestion);
  if (matches.length === 0) {
    return {
      answer: FOREST_FALLBACK_ANSWER,
      matches: [],
      redirectUsed: true,
      systemPrompt: FOREST_SYSTEM_PROMPT,
    };
  }

  const [primaryMatch, secondaryMatch] = matches;
  const answerParts = [
    `Forest is grounding this in ${primaryMatch.topic}. ${primaryMatch.content}`,
    secondaryMatch
      ? `Hold it alongside ${secondaryMatch.topic}. ${secondaryMatch.content}`
      : null,
    'Move slowly enough for clarity and peace to speak before emotion takes the lead.',
  ].filter((part): part is string => Boolean(part));

  return {
    answer: answerParts.join('\n\n'),
    matches,
    redirectUsed: false,
    systemPrompt: FOREST_SYSTEM_PROMPT,
  };
};
