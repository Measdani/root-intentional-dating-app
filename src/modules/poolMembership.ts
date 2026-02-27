import type { User } from '@/types';
import type { CommunityId } from './types';

export type PoolId = 'core' | 'lgbtq';

const POOL_MEMBERSHIP_STORAGE_KEY = 'intentional_user_pool_membership_v1';

const isPoolId = (value: unknown): value is PoolId =>
  value === 'core' || value === 'lgbtq';

const readPoolMembershipMap = (): Record<string, PoolId> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(POOL_MEMBERSHIP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, PoolId>;
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

export const communityIdToPoolId = (communityId: CommunityId): PoolId =>
  communityId === 'lgbtq' ? 'lgbtq' : 'core';

export const poolIdToCommunityId = (poolId: PoolId): CommunityId =>
  poolId === 'lgbtq' ? 'lgbtq' : 'rooted';

export const getUserPoolId = (user: Partial<User>, fallbackPool: PoolId = 'core'): PoolId => {
  if (isPoolId(user.poolId)) return user.poolId;

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
