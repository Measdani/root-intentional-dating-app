const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD',
  'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
  'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY',
  'DC',
]);

const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

export const US_LOCATION_FORMAT_ERROR =
  'Enter your city as "City, ST" or "City, State".';
export const US_LOCATION_STATE_ERROR =
  'Enter a valid U.S. state abbreviation or full state name.';
export const US_LOCATION_NOT_FOUND_ERROR =
  'Enter a real U.S. city and state, like "Atlanta, GA".';
export const US_LOCATION_LOOKUP_ERROR =
  'Location validation is temporarily unavailable. Please try again.';

type PlaceIndex = Record<string, Record<string, string>>;

export type UsLocationValidationResult =
  | {
      isValid: true;
      city: string;
      stateCode: string;
      canonicalCityState: string;
    }
  | {
      isValid: false;
      error: string;
    };

let placeIndexPromise: Promise<PlaceIndex> | null = null;

const normalizeToken = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'’]/g, '')
    .replace(/[/(),-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitCityState = (value: string): { city: string; state: string } | null => {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length !== 2) return null;

  return {
    city: parts[0],
    state: parts[1],
  };
};

const resolveStateCode = (value: string): string | null => {
  const normalized = normalizeToken(value);
  if (!normalized) return null;

  if (normalized === 'district of columbia' || normalized === 'dc' || normalized === 'd c') {
    return 'DC';
  }

  const compact = normalized.replace(/\s+/g, '').toUpperCase();
  if (compact.length === 2 && US_STATE_CODES.has(compact)) {
    return compact;
  }

  return US_STATE_NAME_TO_CODE[normalized] ?? null;
};

const buildCityAliases = (value: string): string[] => {
  const normalized = normalizeToken(value);
  if (!normalized) return [];

  const aliases = new Set([normalized]);

  if (normalized.startsWith('saint ')) {
    aliases.add(`st ${normalized.slice('saint '.length)}`);
  }
  if (normalized.startsWith('st ')) {
    aliases.add(`saint ${normalized.slice('st '.length)}`);
  }
  if (normalized.startsWith('sainte ')) {
    aliases.add(`ste ${normalized.slice('sainte '.length)}`);
  }
  if (normalized.startsWith('ste ')) {
    aliases.add(`sainte ${normalized.slice('ste '.length)}`);
  }
  if (normalized.startsWith('mount ')) {
    aliases.add(`mt ${normalized.slice('mount '.length)}`);
  }
  if (normalized.startsWith('mt ')) {
    aliases.add(`mount ${normalized.slice('mt '.length)}`);
  }
  if (normalized.startsWith('fort ')) {
    aliases.add(`ft ${normalized.slice('fort '.length)}`);
  }
  if (normalized.startsWith('ft ')) {
    aliases.add(`fort ${normalized.slice('ft '.length)}`);
  }

  return Array.from(aliases);
};

const loadPlaceIndex = async (): Promise<PlaceIndex> => {
  if (!placeIndexPromise) {
    placeIndexPromise = import('@/data/usPlaceIndex').then(
      (module) => module.US_PLACE_INDEX as PlaceIndex
    );
  }

  return placeIndexPromise;
};

export const preloadUsPlaceIndex = (): void => {
  void loadPlaceIndex();
};

export const validateUsCityState = async (
  value: string
): Promise<UsLocationValidationResult> => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { isValid: false, error: 'City is required' };
  }

  const parsed = splitCityState(trimmedValue);
  if (!parsed) {
    return { isValid: false, error: US_LOCATION_FORMAT_ERROR };
  }

  const stateCode = resolveStateCode(parsed.state);
  if (!stateCode) {
    return { isValid: false, error: US_LOCATION_STATE_ERROR };
  }

  if (parsed.city.length < 2) {
    return { isValid: false, error: US_LOCATION_NOT_FOUND_ERROR };
  }

  try {
    const placeIndex = await loadPlaceIndex();
    const statePlaces = placeIndex[stateCode];
    if (!statePlaces) {
      return { isValid: false, error: US_LOCATION_STATE_ERROR };
    }

    for (const alias of buildCityAliases(parsed.city)) {
      const canonicalCity = statePlaces[alias];
      if (canonicalCity) {
        return {
          isValid: true,
          city: canonicalCity,
          stateCode,
          canonicalCityState: `${canonicalCity}, ${stateCode}`,
        };
      }
    }

    return { isValid: false, error: US_LOCATION_NOT_FOUND_ERROR };
  } catch (error) {
    console.warn('Failed to load U.S. place index:', error);
    return { isValid: false, error: US_LOCATION_LOOKUP_ERROR };
  }
};
