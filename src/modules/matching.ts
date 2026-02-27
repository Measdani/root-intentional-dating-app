import type { User } from '@/types';
import type { CommunityMatchingMode } from './types';

export const canUsersMatch = (
  viewer: User,
  candidate: User,
  mode: CommunityMatchingMode
): boolean => {
  if (mode === 'inclusive') {
    return true;
  }

  const oppositeGender = viewer.gender === 'male' ? 'female' : 'male';
  return candidate.gender === oppositeGender;
};
