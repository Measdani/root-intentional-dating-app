import { ASSESSMENT_CORE_STYLES } from '@/services/assessmentStyleService';
import { userService } from '@/services/userService';
import type { AssessmentCoreStyle, PartnerJourneyBadge, User } from '@/types';

type PartnerJourneyBadgeMeta = {
  label: string;
  sectionTitle: string;
};

export const PARTNER_JOURNEY_BADGE_META: Record<PartnerJourneyBadge, PartnerJourneyBadgeMeta> = {
  'aware-partner-badge': {
    label: 'The Aware Partner Badge',
    sectionTitle: 'The Aware Partner',
  },
  'intentional-partner-badge': {
    label: 'The Aligned Partner Badge',
    sectionTitle: 'The Aligned Partner',
  },
  'healthy-partner-badge': {
    label: 'The Healthy Partner Badge',
    sectionTitle: 'The Healthy Partner',
  },
};

const PARTNER_JOURNEY_BADGE_SET = new Set<PartnerJourneyBadge>(
  Object.keys(PARTNER_JOURNEY_BADGE_META) as PartnerJourneyBadge[]
);

const GROWTH_STYLE_BADGE_SET = new Set<AssessmentCoreStyle>(ASSESSMENT_CORE_STYLES);

export const normalizePartnerJourneyBadges = (value: unknown): PartnerJourneyBadge[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<PartnerJourneyBadge>();
  value.forEach((entry) => {
    if (typeof entry === 'string' && PARTNER_JOURNEY_BADGE_SET.has(entry as PartnerJourneyBadge)) {
      unique.add(entry as PartnerJourneyBadge);
    }
  });

  return Array.from(unique);
};

export const normalizeGrowthStyleBadges = (value: unknown): AssessmentCoreStyle[] => {
  if (!Array.isArray(value)) return [];

  const unique = new Set<AssessmentCoreStyle>();
  value.forEach((entry) => {
    if (typeof entry === 'string' && GROWTH_STYLE_BADGE_SET.has(entry as AssessmentCoreStyle)) {
      unique.add(entry as AssessmentCoreStyle);
    }
  });

  return Array.from(unique);
};

export const hasPartnerJourneyBadge = (
  value: unknown,
  badge: PartnerJourneyBadge
): boolean => normalizePartnerJourneyBadges(value).includes(badge);

export const getPartnerJourneyBadgeLabel = (badge: PartnerJourneyBadge): string =>
  PARTNER_JOURNEY_BADGE_META[badge].label;

type PersistUserBadgeConfig<T extends string> = {
  userId: string;
  badge: T;
  storageField: 'partnerJourneyBadges' | 'growthStyleBadges';
  normalize: (value: unknown) => T[];
  toRemotePatch: (values: T[]) => Partial<User>;
  remoteWarningLabel: string;
};

const mergeBadgeValue = <T extends string>(
  existing: unknown,
  badge: T,
  normalize: (value: unknown) => T[],
  onAwardedNewBadge: () => void
): T[] => {
  const current = normalize(existing);
  if (!current.includes(badge)) {
    onAwardedNewBadge();
  }

  const next = new Set<T>(current);
  next.add(badge);
  return Array.from(next);
};

const persistUserBadgeCollection = async <T extends string>({
  userId,
  badge,
  storageField,
  normalize,
  toRemotePatch,
  remoteWarningLabel,
}: PersistUserBadgeConfig<T>): Promise<boolean> => {
  let awardedNewBadge = false;
  let nextValuesForUser: T[] | null = null;

  const markAwarded = () => {
    awardedNewBadge = true;
  };

  try {
    const savedCurrent = localStorage.getItem('currentUser');
    if (savedCurrent) {
      const parsedCurrent = JSON.parse(savedCurrent) as {
        id?: unknown;
        partnerJourneyBadges?: unknown;
        growthStyleBadges?: unknown;
      };

      if (parsedCurrent && typeof parsedCurrent === 'object' && parsedCurrent.id === userId) {
        const nextValues = mergeBadgeValue(
          parsedCurrent[storageField],
          badge,
          normalize,
          markAwarded
        );
        const nextCurrent = {
          ...parsedCurrent,
          [storageField]: nextValues,
        };
        nextValuesForUser = nextValues;
        localStorage.setItem('currentUser', JSON.stringify(nextCurrent));
        window.dispatchEvent(new CustomEvent('user-login', { detail: nextCurrent }));
      }
    }
  } catch (error) {
    console.warn(`Failed to persist current user ${storageField}:`, error);
  }

  try {
    const savedUsers = localStorage.getItem('rooted-admin-users');
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      if (Array.isArray(parsedUsers)) {
        const nextUsers = parsedUsers.map((user) => {
          if (!user || typeof user !== 'object' || user.id !== userId) return user;

          const nextValues = mergeBadgeValue(
            (user as { partnerJourneyBadges?: unknown; growthStyleBadges?: unknown })[storageField],
            badge,
            normalize,
            markAwarded
          );
          nextValuesForUser = nextValues;

          return {
            ...user,
            [storageField]: nextValues,
          };
        });

        localStorage.setItem('rooted-admin-users', JSON.stringify(nextUsers));
        window.dispatchEvent(new Event('storage'));
      }
    }
  } catch (error) {
    console.warn(`Failed to persist ${storageField} to user directory:`, error);
  }

  if (!nextValuesForUser) {
    try {
      const remoteUser = await userService.getUser(userId);
      if (remoteUser) {
        nextValuesForUser = mergeBadgeValue(
          remoteUser[storageField],
          badge,
          normalize,
          markAwarded
        );
      }
    } catch (error) {
      console.warn(`Failed to load remote user while persisting ${storageField}:`, error);
    }
  }

  if (nextValuesForUser) {
    const updated = await userService.updateUser(userId, toRemotePatch(nextValuesForUser));
    if (!updated) {
      console.warn(`Failed to persist ${remoteWarningLabel} to Supabase user profile.`);
    }
  }

  return awardedNewBadge;
};

export const persistPartnerJourneyBadge = async (
  badge: PartnerJourneyBadge,
  userId: string
): Promise<boolean> =>
  persistUserBadgeCollection({
    userId,
    badge,
    storageField: 'partnerJourneyBadges',
    normalize: normalizePartnerJourneyBadges,
    toRemotePatch: (values) => ({ partnerJourneyBadges: values }),
    remoteWarningLabel: 'partner journey badge',
  });

export const persistGrowthStyleBadge = async (
  badge: AssessmentCoreStyle,
  userId: string
): Promise<boolean> =>
  persistUserBadgeCollection({
    userId,
    badge,
    storageField: 'growthStyleBadges',
    normalize: normalizeGrowthStyleBadges,
    toRemotePatch: (values) => ({ growthStyleBadges: values }),
    remoteWarningLabel: 'growth style badge',
  });
