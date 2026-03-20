import type { PartnerJourneyBadge } from '@/types';

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
    label: 'The Intentional Partner Badge',
    sectionTitle: 'The Intentional Partner',
  },
  'healthy-partner-badge': {
    label: 'The Healthy Partner Badge',
    sectionTitle: 'The Healthy Partner',
  },
};

const PARTNER_JOURNEY_BADGE_SET = new Set<PartnerJourneyBadge>(
  Object.keys(PARTNER_JOURNEY_BADGE_META) as PartnerJourneyBadge[]
);

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

export const hasPartnerJourneyBadge = (
  value: unknown,
  badge: PartnerJourneyBadge
): boolean => normalizePartnerJourneyBadges(value).includes(badge);

export const getPartnerJourneyBadgeLabel = (badge: PartnerJourneyBadge): string =>
  PARTNER_JOURNEY_BADGE_META[badge].label;

export const persistPartnerJourneyBadge = (
  badge: PartnerJourneyBadge,
  userId: string
): boolean => {
  let awardedNewBadge = false;

  const mergeBadges = (existing: unknown): PartnerJourneyBadge[] => {
    const current = normalizePartnerJourneyBadges(existing);
    if (!current.includes(badge)) {
      awardedNewBadge = true;
    }

    const next = new Set<PartnerJourneyBadge>(current);
    next.add(badge);
    return Array.from(next);
  };

  try {
    const savedCurrent = localStorage.getItem('currentUser');
    if (savedCurrent) {
      const parsedCurrent = JSON.parse(savedCurrent) as {
        id?: unknown;
        partnerJourneyBadges?: unknown;
      };

      if (parsedCurrent && typeof parsedCurrent === 'object' && parsedCurrent.id === userId) {
        const nextCurrent = {
          ...parsedCurrent,
          partnerJourneyBadges: mergeBadges(parsedCurrent.partnerJourneyBadges),
        };
        localStorage.setItem('currentUser', JSON.stringify(nextCurrent));
        window.dispatchEvent(new CustomEvent('user-login', { detail: nextCurrent }));
      }
    }
  } catch (error) {
    console.warn('Failed to persist current user partner journey badge:', error);
  }

  try {
    const savedUsers = localStorage.getItem('rooted-admin-users');
    if (!savedUsers) return awardedNewBadge;

    const parsedUsers = JSON.parse(savedUsers);
    if (!Array.isArray(parsedUsers)) return awardedNewBadge;

    const nextUsers = parsedUsers.map((user) => {
      if (!user || typeof user !== 'object' || user.id !== userId) return user;
      return {
        ...user,
        partnerJourneyBadges: mergeBadges(
          (user as { partnerJourneyBadges?: unknown }).partnerJourneyBadges
        ),
      };
    });

    localStorage.setItem('rooted-admin-users', JSON.stringify(nextUsers));
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.warn('Failed to persist partner journey badge to user directory:', error);
  }

  return awardedNewBadge;
};
