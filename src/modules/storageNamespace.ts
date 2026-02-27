import type { CommunityId } from './types';

const NAMESPACE_EXACT_KEYS = new Set<string>([
  'currentUser',
  'assessmentResult',
  'assessmentLog',
  'assessmentAbandonment',
  'growth-resources',
  'paid-growth-resources',
  'community-blogs',
]);

const NAMESPACE_PREFIXES = [
  'rooted_',
  'rooted-',
  'assessmentResult_',
  'consent_choice_',
  'congrats_shown_',
];

const NON_NAMESPACED_PREFIXES = [
  'rooted-admin-',
];

const toNamespacedKey = (communityId: CommunityId, key: string): string =>
  `intentional:${communityId}:${key}`;

const shouldNamespace = (key: string): boolean =>
  !NON_NAMESPACED_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
  (
    NAMESPACE_EXACT_KEYS.has(key) ||
    NAMESPACE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );

interface StoragePatchState {
  activeCommunityId: CommunityId;
  originals: {
    getItem: Storage['getItem'];
    setItem: Storage['setItem'];
    removeItem: Storage['removeItem'];
  };
}

declare global {
  interface Window {
    __intentionalStoragePatchState__?: StoragePatchState;
  }
}

export const setStorageNamespaceCommunity = (communityId: CommunityId): void => {
  if (typeof window === 'undefined') return;

  if (!window.__intentionalStoragePatchState__) {
    installStorageNamespace(communityId);
    return;
  }

  window.__intentionalStoragePatchState__.activeCommunityId = communityId;
};

export const installStorageNamespace = (communityId: CommunityId): void => {
  if (typeof window === 'undefined') return;

  const existingState = window.__intentionalStoragePatchState__;
  if (existingState) {
    existingState.activeCommunityId = communityId;
    return;
  }

  const localStorageRef = window.localStorage;
  const originals = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
  };

  const state: StoragePatchState = {
    activeCommunityId: communityId,
    originals,
  };
  window.__intentionalStoragePatchState__ = state;

  Storage.prototype.getItem = function patchedGetItem(key: string): string | null {
    if (this !== localStorageRef || !shouldNamespace(key)) {
      return originals.getItem.call(this, key);
    }

    const scopedValue = originals.getItem.call(
      this,
      toNamespacedKey(state.activeCommunityId, key)
    );

    if (scopedValue !== null) return scopedValue;

    // Backward compatibility: rooted can still read legacy non-namespaced keys.
    if (state.activeCommunityId === 'rooted') {
      return originals.getItem.call(this, key);
    }

    return null;
  };

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string): void {
    if (this !== localStorageRef || !shouldNamespace(key)) {
      originals.setItem.call(this, key, value);
      return;
    }

    originals.setItem.call(this, toNamespacedKey(state.activeCommunityId, key), value);

    // Keep rooted data mirrored in legacy keys to avoid breaking older flows.
    if (state.activeCommunityId === 'rooted') {
      originals.setItem.call(this, key, value);
    }
  };

  Storage.prototype.removeItem = function patchedRemoveItem(key: string): void {
    if (this !== localStorageRef || !shouldNamespace(key)) {
      originals.removeItem.call(this, key);
      return;
    }

    originals.removeItem.call(this, toNamespacedKey(state.activeCommunityId, key));

    // Keep rooted cleanup behavior compatible with legacy keys.
    if (state.activeCommunityId === 'rooted') {
      originals.removeItem.call(this, key);
    }
  };
};
