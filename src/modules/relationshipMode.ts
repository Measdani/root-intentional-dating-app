import type { RelationshipMode, User } from '@/types';

const STORAGE_KEY = 'rooted_relationship_mode_state_v1';
export const RELATIONSHIP_MODE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

interface RelationshipModeStore {
  modeByUserId: Record<string, RelationshipMode>;
  reEntryCooldownByUserId: Record<string, number>;
  exclusivePartnerByUserId: Record<string, string>;
  pendingExclusiveByUserId: Record<string, string>;
}

export interface RelationshipModeSnapshot {
  mode: RelationshipMode;
  cooldownEndsAt: number | null;
  remainingCooldownMs: number;
  exclusivePartnerId: string | null;
  outgoingExclusiveRequestTo: string | null;
  incomingExclusiveRequestFrom: string | null;
}

interface ModeActionSuccess {
  ok: true;
  kind:
    | 'break-entered'
    | 'break-exited'
    | 'exclusive-requested'
    | 'exclusive-entered'
    | 'exclusive-exited'
    | 'exclusive-request-cancelled'
    | 'exclusive-request-declined';
  affectedUserIds: string[];
  partnerId?: string;
  cooldownEndsAt?: number;
}

interface ModeActionFailure {
  ok: false;
  reason: string;
  remainingMs?: number;
}

export type RelationshipModeActionResult = ModeActionSuccess | ModeActionFailure;

const createEmptyStore = (): RelationshipModeStore => ({
  modeByUserId: {},
  reEntryCooldownByUserId: {},
  exclusivePartnerByUserId: {},
  pendingExclusiveByUserId: {},
});

const normalizeMode = (value: unknown): RelationshipMode => {
  if (value === 'break' || value === 'exclusive') return value;
  return 'active';
};

const toRecord = (value: unknown): Record<string, string> =>
  value && typeof value === 'object' ? (value as Record<string, string>) : {};

const toNumberRecord = (value: unknown): Record<string, number> =>
  value && typeof value === 'object' ? (value as Record<string, number>) : {};

const readStore = (): RelationshipModeStore => {
  if (typeof window === 'undefined') return createEmptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createEmptyStore();

    const modeByUserIdRaw = toRecord((parsed as any).modeByUserId);
    const normalizedModes: Record<string, RelationshipMode> = {};
    Object.entries(modeByUserIdRaw).forEach(([userId, mode]) => {
      normalizedModes[userId] = normalizeMode(mode);
    });

    return {
      modeByUserId: normalizedModes,
      reEntryCooldownByUserId: toNumberRecord((parsed as any).reEntryCooldownByUserId),
      exclusivePartnerByUserId: toRecord((parsed as any).exclusivePartnerByUserId),
      pendingExclusiveByUserId: toRecord((parsed as any).pendingExclusiveByUserId),
    };
  } catch (error) {
    console.warn('Failed to read relationship mode state:', error);
    return createEmptyStore();
  }
};

const writeStore = (store: RelationshipModeStore): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn('Failed to persist relationship mode state:', error);
  }
};

const dispatchModeUpdated = (affectedUserIds: string[]): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('relationship-mode-updated', {
      detail: {
        affectedUserIds,
        timestamp: Date.now(),
      },
    })
  );
};

const findIncomingRequester = (store: RelationshipModeStore, userId: string): string | null => {
  const incoming = Object.entries(store.pendingExclusiveByUserId).find(
    ([requesterId, targetId]) => requesterId !== userId && targetId === userId
  );
  return incoming ? incoming[0] : null;
};

const removeRequestsForUser = (store: RelationshipModeStore, userId: string): void => {
  delete store.pendingExclusiveByUserId[userId];

  Object.entries(store.pendingExclusiveByUserId).forEach(([requesterId, targetId]) => {
    if (targetId === userId) {
      delete store.pendingExclusiveByUserId[requesterId];
    }
  });
};

const getCooldownEnd = (store: RelationshipModeStore, userId: string, now: number): number | null => {
  const cooldownRaw = Number(store.reEntryCooldownByUserId[userId]);
  if (!Number.isFinite(cooldownRaw)) return null;
  if (cooldownRaw <= now) return null;
  return cooldownRaw;
};

const buildSnapshot = (
  store: RelationshipModeStore,
  userId: string,
  now = Date.now()
): RelationshipModeSnapshot => {
  const rawMode = normalizeMode(store.modeByUserId[userId]);
  const partnerRaw = store.exclusivePartnerByUserId[userId];
  const partnerId = typeof partnerRaw === 'string' && partnerRaw.trim().length > 0 ? partnerRaw : null;
  const mode: RelationshipMode = rawMode === 'exclusive' && !partnerId ? 'active' : rawMode;
  const cooldownEndsAt = getCooldownEnd(store, userId, now);

  return {
    mode,
    cooldownEndsAt,
    remainingCooldownMs: cooldownEndsAt ? Math.max(cooldownEndsAt - now, 0) : 0,
    exclusivePartnerId: mode === 'exclusive' ? partnerId : null,
    outgoingExclusiveRequestTo: store.pendingExclusiveByUserId[userId] ?? null,
    incomingExclusiveRequestFrom: findIncomingRequester(store, userId),
  };
};

export const formatModeDuration = (ms: number): string => {
  const safeMs = Math.max(0, Math.ceil(ms));
  const totalMinutes = Math.ceil(safeMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${Math.max(minutes, 1)}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const getRelationshipModeSnapshot = (userId: string): RelationshipModeSnapshot => {
  if (!userId) {
    return {
      mode: 'active',
      cooldownEndsAt: null,
      remainingCooldownMs: 0,
      exclusivePartnerId: null,
      outgoingExclusiveRequestTo: null,
      incomingExclusiveRequestFrom: null,
    };
  }
  return buildSnapshot(readStore(), userId);
};

export const getUserRelationshipMode = (userId: string): RelationshipMode =>
  getRelationshipModeSnapshot(userId).mode;

export const applyRelationshipModeToUser = <T extends User>(user: T): T => {
  if (!user?.id) return user;
  return {
    ...user,
    mode: getUserRelationshipMode(user.id),
  };
};

export const isUserAvailableForNewMatches = (userId: string): boolean => {
  const snapshot = getRelationshipModeSnapshot(userId);
  return snapshot.mode === 'active' && snapshot.remainingCooldownMs <= 0;
};

export const getNewMatchBlockReason = (fromUserId: string, toUserId: string): string | null => {
  const fromSnapshot = getRelationshipModeSnapshot(fromUserId);
  const toSnapshot = getRelationshipModeSnapshot(toUserId);

  if (fromSnapshot.mode === 'break') {
    return 'Break Mode is active. New matches are paused.';
  }
  if (fromSnapshot.mode === 'exclusive') {
    return 'Exclusive Mode is active. New matches are paused.';
  }
  if (fromSnapshot.remainingCooldownMs > 0) {
    return `Re-entry cooldown is active for ${formatModeDuration(fromSnapshot.remainingCooldownMs)}.`;
  }

  if (toSnapshot.mode !== 'active' || toSnapshot.remainingCooldownMs > 0) {
    return 'This member is unavailable for new matches right now.';
  }

  return null;
};

export const canUsersCreateNewMatch = (fromUserId: string, toUserId: string): boolean =>
  getNewMatchBlockReason(fromUserId, toUserId) === null;

export const getMessageBlockReason = (fromUserId: string, toUserId: string): string | null => {
  const fromSnapshot = getRelationshipModeSnapshot(fromUserId);
  const toSnapshot = getRelationshipModeSnapshot(toUserId);

  if (fromSnapshot.mode === 'exclusive') {
    if (fromSnapshot.exclusivePartnerId !== toUserId) {
      return 'Exclusive Mode only allows messaging your exclusive partner.';
    }
    if (toSnapshot.mode !== 'exclusive' || toSnapshot.exclusivePartnerId !== fromUserId) {
      return 'Your exclusive partner link is no longer active.';
    }
    return null;
  }

  if (toSnapshot.mode === 'exclusive' && toSnapshot.exclusivePartnerId !== fromUserId) {
    return 'This member is in Exclusive Mode and unavailable for messaging.';
  }

  return null;
};

export const canUsersExchangeMessages = (fromUserId: string, toUserId: string): boolean =>
  getMessageBlockReason(fromUserId, toUserId) === null;

export const enterBreakMode = (userId: string): RelationshipModeActionResult => {
  if (!userId) return { ok: false, reason: 'Unable to update mode for this account.' };

  const store = readStore();
  const snapshot = buildSnapshot(store, userId);
  if (snapshot.mode === 'exclusive') {
    return { ok: false, reason: 'Exit Exclusive Mode before entering Break Mode.' };
  }
  if (snapshot.mode === 'break') {
    return {
      ok: false,
      reason: 'Break Mode is already active.',
    };
  }

  store.modeByUserId[userId] = 'break';
  delete store.reEntryCooldownByUserId[userId];
  delete store.exclusivePartnerByUserId[userId];
  removeRequestsForUser(store, userId);
  writeStore(store);
  dispatchModeUpdated([userId]);

  return {
    ok: true,
    kind: 'break-entered',
    affectedUserIds: [userId],
  };
};

export const exitBreakMode = (userId: string): RelationshipModeActionResult => {
  if (!userId) return { ok: false, reason: 'Unable to update mode for this account.' };

  const store = readStore();
  const snapshot = buildSnapshot(store, userId);
  if (snapshot.mode !== 'break') {
    return { ok: false, reason: 'Break Mode is not active for this account.' };
  }
  const cooldownEndsAt = Date.now() + RELATIONSHIP_MODE_COOLDOWN_MS;

  store.modeByUserId[userId] = 'active';
  store.reEntryCooldownByUserId[userId] = cooldownEndsAt;
  writeStore(store);
  dispatchModeUpdated([userId]);

  return {
    ok: true,
    kind: 'break-exited',
    affectedUserIds: [userId],
    cooldownEndsAt,
  };
};

export const requestExclusiveMode = (
  requesterId: string,
  targetUserId: string
): RelationshipModeActionResult => {
  if (!requesterId || !targetUserId) {
    return { ok: false, reason: 'Select a member first.' };
  }
  if (requesterId === targetUserId) {
    return { ok: false, reason: 'You cannot enter Exclusive Mode with yourself.' };
  }

  const store = readStore();
  const requesterSnapshot = buildSnapshot(store, requesterId);
  const targetSnapshot = buildSnapshot(store, targetUserId);

  if (requesterSnapshot.mode !== 'active') {
    return { ok: false, reason: 'Return to Active mode before requesting Exclusive Mode.' };
  }
  if (requesterSnapshot.remainingCooldownMs > 0) {
    return {
      ok: false,
      reason: `Re-entry cooldown is active for ${formatModeDuration(requesterSnapshot.remainingCooldownMs)}.`,
      remainingMs: requesterSnapshot.remainingCooldownMs,
    };
  }

  if (targetSnapshot.mode !== 'active' || targetSnapshot.remainingCooldownMs > 0) {
    return { ok: false, reason: 'This member is unavailable for Exclusive Mode right now.' };
  }

  // Mutual request -> activate Exclusive Mode for both.
  if (store.pendingExclusiveByUserId[targetUserId] === requesterId) {
    store.modeByUserId[requesterId] = 'exclusive';
    store.modeByUserId[targetUserId] = 'exclusive';
    store.exclusivePartnerByUserId[requesterId] = targetUserId;
    store.exclusivePartnerByUserId[targetUserId] = requesterId;
    delete store.reEntryCooldownByUserId[requesterId];
    delete store.reEntryCooldownByUserId[targetUserId];
    removeRequestsForUser(store, requesterId);
    removeRequestsForUser(store, targetUserId);
    writeStore(store);
    dispatchModeUpdated([requesterId, targetUserId]);

    return {
      ok: true,
      kind: 'exclusive-entered',
      affectedUserIds: [requesterId, targetUserId],
      partnerId: targetUserId,
    };
  }

  store.pendingExclusiveByUserId[requesterId] = targetUserId;
  writeStore(store);
  dispatchModeUpdated([requesterId, targetUserId]);

  return {
    ok: true,
    kind: 'exclusive-requested',
    affectedUserIds: [requesterId, targetUserId],
    partnerId: targetUserId,
  };
};

export const cancelExclusiveRequest = (requesterId: string): RelationshipModeActionResult => {
  if (!requesterId) return { ok: false, reason: 'Unable to cancel request for this account.' };

  const store = readStore();
  const targetUserId = store.pendingExclusiveByUserId[requesterId];
  if (!targetUserId) {
    return { ok: false, reason: 'No outgoing Exclusive Mode request found.' };
  }

  delete store.pendingExclusiveByUserId[requesterId];
  writeStore(store);
  dispatchModeUpdated([requesterId, targetUserId]);

  return {
    ok: true,
    kind: 'exclusive-request-cancelled',
    affectedUserIds: [requesterId, targetUserId],
    partnerId: targetUserId,
  };
};

export const declineExclusiveRequest = (
  userId: string,
  requesterId: string
): RelationshipModeActionResult => {
  if (!userId || !requesterId) return { ok: false, reason: 'Unable to decline this request.' };

  const store = readStore();
  if (store.pendingExclusiveByUserId[requesterId] !== userId) {
    return { ok: false, reason: 'This request is no longer available.' };
  }

  delete store.pendingExclusiveByUserId[requesterId];
  writeStore(store);
  dispatchModeUpdated([userId, requesterId]);

  return {
    ok: true,
    kind: 'exclusive-request-declined',
    affectedUserIds: [userId, requesterId],
    partnerId: requesterId,
  };
};

export const exitExclusiveMode = (userId: string): RelationshipModeActionResult => {
  if (!userId) return { ok: false, reason: 'Unable to update mode for this account.' };

  const store = readStore();
  const snapshot = buildSnapshot(store, userId);
  if (snapshot.mode !== 'exclusive') {
    return { ok: false, reason: 'Exclusive Mode is not active for this account.' };
  }

  const cooldownEndsAt = Date.now() + RELATIONSHIP_MODE_COOLDOWN_MS;
  const affectedUserIds = [userId];
  const partnerId = snapshot.exclusivePartnerId ?? undefined;

  store.modeByUserId[userId] = 'active';
  store.reEntryCooldownByUserId[userId] = cooldownEndsAt;
  delete store.exclusivePartnerByUserId[userId];
  removeRequestsForUser(store, userId);

  if (partnerId) {
    store.modeByUserId[partnerId] = 'active';
    store.reEntryCooldownByUserId[partnerId] = cooldownEndsAt;
    delete store.exclusivePartnerByUserId[partnerId];
    removeRequestsForUser(store, partnerId);
    affectedUserIds.push(partnerId);
  }

  writeStore(store);
  dispatchModeUpdated(affectedUserIds);

  return {
    ok: true,
    kind: 'exclusive-exited',
    affectedUserIds,
    partnerId,
    cooldownEndsAt,
  };
};
