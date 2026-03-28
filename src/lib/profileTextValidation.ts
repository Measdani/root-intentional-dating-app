export const PROFILE_BIO_MIN_CHAR_COUNT = 20;
export const PROFILE_GROWTH_FOCUS_MIN_CHAR_COUNT = 4;

const WORD_PATTERN = /[a-z]+(?:['-][a-z]+)*/gi;
const LONG_CONSONANT_CLUSTER_PATTERN = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
const REPEATED_CHARACTER_PATTERN = /(.)\1{3,}/i;

const getWords = (value: string): string[] =>
  value.match(WORD_PATTERN)?.map((word) => word.toLowerCase()) ?? [];

const countVowels = (value: string): number =>
  (value.match(/[aeiouy]/gi) ?? []).length;

const isSuspiciousWord = (word: string): boolean => {
  if (word.length < 8) return false;

  const vowelRatio = countVowels(word) / word.length;
  const hasLongConsonantCluster = LONG_CONSONANT_CLUSTER_PATTERN.test(word);
  const hasRepeatedCharacters = REPEATED_CHARACTER_PATTERN.test(word);

  return (
    hasRepeatedCharacters ||
    (word.length >= 10 && hasLongConsonantCluster) ||
    (word.length >= 12 && (vowelRatio < 0.22 || vowelRatio > 0.8))
  );
};

export const looksLikeKeyboardSmash = (value: string): boolean => {
  const words = getWords(value);
  if (words.length === 0) return false;

  const suspiciousWords = words.filter(isSuspiciousWord);
  if (suspiciousWords.length === 0) return false;

  const alphaCharacters = value.replace(/[^a-z]/gi, '');
  const suspiciousCharacterCount = suspiciousWords.reduce(
    (total, word) => total + word.length,
    0
  );
  const suspiciousCharacterShare =
    alphaCharacters.length > 0
      ? suspiciousCharacterCount / alphaCharacters.length
      : 0;

  return suspiciousWords.length >= 2 || suspiciousCharacterShare >= 0.45;
};

export type ProfileBioValidationResult = {
  isValid: boolean;
  error: string | null;
  normalizedBio: string;
};

export type ProfileTextValidationResult = {
  isValid: boolean;
  error: string | null;
  normalizedText: string;
};

export const validateRequiredProfileBio = (
  value: string
): ProfileBioValidationResult => {
  const normalizedBio = value.trim();

  if (!normalizedBio) {
    return {
      isValid: false,
      error: 'About You is required.',
      normalizedBio,
    };
  }

  if (normalizedBio.length < PROFILE_BIO_MIN_CHAR_COUNT) {
    return {
      isValid: false,
      error:
        `About You must be at least ${PROFILE_BIO_MIN_CHAR_COUNT} characters and use real words.`,
      normalizedBio,
    };
  }

  if (looksLikeKeyboardSmash(normalizedBio)) {
    return {
      isValid: false,
      error:
        'Please use real words in About You instead of random letters or keyboard-smash text.',
      normalizedBio,
    };
  }

  return {
    isValid: true,
    error: null,
    normalizedBio,
  };
};

export const validateGrowthFocusText = (
  value: string
): ProfileTextValidationResult => {
  const normalizedText = value.trim();
  const words = getWords(normalizedText);

  if (!normalizedText) {
    return {
      isValid: false,
      error: 'Growth Focus is required.',
      normalizedText,
    };
  }

  if (
    normalizedText.length < PROFILE_GROWTH_FOCUS_MIN_CHAR_COUNT ||
    words.length === 0
  ) {
    return {
      isValid: false,
      error:
        'Growth Focus should be a short real phrase, not random letters.',
      normalizedText,
    };
  }

  if (looksLikeKeyboardSmash(normalizedText)) {
    return {
      isValid: false,
      error:
        'Please use real words in Growth Focus instead of random letters or keyboard-smash text.',
      normalizedText,
    };
  }

  return {
    isValid: true,
    error: null,
    normalizedText,
  };
};
