import type { User } from '@/types';
import type { CommunityId } from './types';

export type PoolFamily = 'core';
export type PoolTrack = 'inner' | 'advanced';
export type PoolId = 'core-inner' | 'core-advanced';

const POOL_MEMBERSHIP_STORAGE_KEY = 'intentional_user_pool_membership_v1';

const normalizePoolId = (value: unknown): PoolId | null => {
  if (value === 'core-inner' || value === 'core-advanced') {
    return value;
  }

  // Legacy aliases from older pool structures.
  if (value === 'core') return 'core-inner';
  if (value === 'lgbtq' || value === 'lgbtq-inner') return 'core-inner';
  if (value === 'lgbtq-advanced' || value === 'lgbtq-test') return 'core-advanced';
  return null;
};

const isPoolId = (value: unknown): value is PoolId => normalizePoolId(value) !== null;

const readPoolMembershipMap = (): Record<string, PoolId> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(POOL_MEMBERSHIP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const normalizedMap: Record<string, PoolId> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      const normalizedPoolId = normalizePoolId(value);
      if (normalizedPoolId) {
        normalizedMap[key] = normalizedPoolId;
      }
    });
    return normalizedMap;
  } catch (error) {
    console.warn('Failed to read pool membership map:', error);
    return {};
  }
};

const writePoolMembershipMap = (map: Record<string, PoolId>): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POOL_MEMBERSHIP_STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Failed to persist pool membership map:', error);
  }
};

export const getPoolFamily = (_poolId: PoolId): PoolFamily => 'core';

export const getPoolTrack = (poolId: PoolId): PoolTrack =>
  poolId.endsWith('-advanced') ? 'advanced' : 'inner';

export const toAdvancedPool = (_poolId: PoolId): PoolId => 'core-advanced';

export const toInnerPool = (_poolId: PoolId): PoolId => 'core-inner';

export const communityIdToPoolId = (_communityId: CommunityId): PoolId => 'core-inner';

export const poolIdToCommunityId = (_poolId: PoolId): CommunityId => 'rooted';

export const isPoolInCommunity = (_poolId: PoolId, communityId: CommunityId): boolean =>
  communityId === 'rooted';

export const getUserPoolId = (user: Partial<User>, fallbackPool: PoolId = 'core-inner'): PoolId => {
  const directPoolId = normalizePoolId(user.poolId);
  if (directPoolId) return directPoolId;

  const map = readPoolMembershipMap();
  const byId = user.id ? map[`id:${user.id}`] : undefined;
  if (isPoolId(byId)) return byId;

  const normalizedEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  const byEmail = normalizedEmail ? map[`email:${normalizedEmail}`] : undefined;
  if (isPoolId(byEmail)) return byEmail;

  return fallbackPool;
};

export const persistUserPoolMembership = (user: Partial<User>, poolId: PoolId): void => {
  if (!user.id && !user.email) return;

  const map = readPoolMembershipMap();
  if (user.id) {
    map[`id:${user.id}`] = poolId;
  }
  if (typeof user.email === 'string' && user.email.trim().length > 0) {
    map[`email:${user.email.trim().toLowerCase()}`] = poolId;
  }
  writePoolMembershipMap(map);
};

export const withUserPoolId = <T extends Partial<User>>(user: T, fallbackPool: PoolId): T & { poolId: PoolId } => {
  const poolId = getUserPoolId(user, fallbackPool);
  return {
    ...user,
    poolId,
  };
};

export const isUserInPool = (user: Partial<User>, poolId: PoolId): boolean =>
  getUserPoolId(user, poolId) === poolId;
