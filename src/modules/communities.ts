import type { CommunityDefinition, CommunityId } from './types';

export const COMMUNITY_QUERY_PARAM = 'community';
export const ACTIVE_COMMUNITY_STORAGE_KEY = 'intentional-active-community';

export const COMMUNITIES: Record<CommunityId, CommunityDefinition> = {
  rooted: {
    id: 'rooted',
    name: 'Rooted Hearts',
    shortName: 'Rooted',
    heroTitle: 'ROOTED HEARTS',
    heroTagline: 'Dating for people who are intentional.',
    loginTitle: 'Welcome to Rooted Hearts',
    loginSubtitle: 'Sign in to browse profiles',
    signupGenderGuidance:
      'Rooted Hearts currently supports men and women seeking opposite-sex partnerships.',
    signupPlatformConfirmation:
      'I confirm that Rooted Hearts is a men and women platform designed for opposite-sex partnerships, currently available only to Georgia residents, and understand that my experience depends on my participation, alignment, and engagement within this ecosystem.',
    matchingMode: 'opposite-gender',
  },
};

export const COMMUNITY_LIST = Object.values(COMMUNITIES);

export const isCommunityId = (value: string | null | undefined): value is CommunityId => {
  if (!value) return false;
  return value in COMMUNITIES;
};

export const getCommunityDefinition = (communityId: CommunityId): CommunityDefinition =>
  COMMUNITIES[communityId];

const parseCommunityId = (value: string | null | undefined): CommunityId | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'lgbtq' || normalized === 'lgbtq-inner' || normalized === 'lgbtq-advanced' || normalized === 'lgbtq-test') {
    return 'rooted';
  }
  return isCommunityId(normalized) ? normalized : null;
};

export const resolveActiveCommunityId = (): CommunityId => {
  if (typeof window === 'undefined') return 'rooted';

  const url = new URL(window.location.href);
  const queryCommunity = parseCommunityId(url.searchParams.get(COMMUNITY_QUERY_PARAM));
  if (queryCommunity) return queryCommunity;

  const pathCommunity = parseCommunityId(
    url.pathname
      .split('/')
      .filter(Boolean)[0]
  );
  if (pathCommunity) return pathCommunity;

  try {
    const persistedCommunity = parseCommunityId(
      window.localStorage.getItem(ACTIVE_COMMUNITY_STORAGE_KEY)
    );
    if (persistedCommunity) return persistedCommunity;
  } catch (error) {
    console.warn('Failed to read active community from storage:', error);
  }

  return 'rooted';
};

export const persistActiveCommunityId = (communityId: CommunityId): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, communityId);
  } catch (error) {
    console.warn('Failed to persist active community:', error);
  }
};

export const buildCommunityHref = (communityId: CommunityId): string => {
  if (typeof window === 'undefined') {
    return `/?${COMMUNITY_QUERY_PARAM}=${communityId}`;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(COMMUNITY_QUERY_PARAM, communityId);
  return `${url.pathname}${url.search}${url.hash}`;
};
