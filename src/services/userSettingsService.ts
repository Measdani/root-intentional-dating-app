import type { User } from '@/types';

export const CORE_LOCK_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type ProfileVisibilityMode = 'alignment-pool' | 'paused' | 'private';
export type PhotoVisibilityMode = 'blur-until-mutual' | 'first-photo-only' | 'hidden';
export type IdentityFieldVisibilityMode = 'always-visible' | 'after-mutual-interest' | 'private';
export type RelationshipIntentSetting =
  | 'marriage-focused'
  | 'long-term-partnership'
  | 'open-but-serious'
  | 'not-sure-yet';
export type ChildrenPreferenceSetting =
  | 'wants-children'
  | 'has-children'
  | 'open-to-partner-with-children'
  | 'not-open-to-children';
export type MonogamyStructureSetting =
  | 'monogamous-only'
  | 'ethically-non-monogamous'
  | 'undecided';
export type RelocationOpennessSetting =
  | 'willing-to-relocate'
  | 'not-willing'
  | 'local-only';
export type CommunicationPaceSetting = 'slow' | 'daily';

export type CoreSettingKey =
  | 'relationshipIntent'
  | 'childrenPreference'
  | 'monogamyStructure'
  | 'relocationOpenness'
  | 'lifestyleSmoking'
  | 'lifestyleSubstanceUse'
  | 'lifestyleReligionNonNegotiables';

export interface UserSettings {
  visibility: {
    profileVisibility: ProfileVisibilityMode;
    photoVisibility: PhotoVisibilityMode;
    genderIdentityVisibility: IdentityFieldVisibilityMode;
    identityExpressionVisibility: IdentityFieldVisibilityMode;
  };
  alignmentPreferences: {
    relationshipIntent: RelationshipIntentSetting;
    childrenPreference: ChildrenPreferenceSetting;
    monogamyStructure: MonogamyStructureSetting;
    relocationOpenness: RelocationOpennessSetting;
    lifestyleDealbreakers: {
      smoking: boolean;
      substanceUse: boolean;
      religionNonNegotiables: boolean;
    };
  };
  growth: {
    showGrowthFocusToMatches: boolean;
    retakeNotifications: boolean;
  };
  communicationBoundaries: {
    communicationPace: CommunicationPaceSetting;
    need24HoursBeforeConflict: boolean;
    noYelling: boolean;
    noLateNightArguments: boolean;
  };
  safety: {
    requireBackgroundBadgeForMeetups: boolean;
    onlyMatchWithVerifiedAccounts: boolean;
    hiddenWordsFilter: boolean;
  };
  notifications: {
    newAlignmentMatches: boolean;
    messageRequests: boolean;
    innerWorkReminders: boolean;
    blogUpdates: boolean;
    growthMilestones: boolean;
  };
  coreLocks: Record<CoreSettingKey, number | null>;
}

const STORAGE_KEY = 'rooted_user_settings_v1';

const createEmptyCoreLocks = (): Record<CoreSettingKey, number | null> => ({
  relationshipIntent: null,
  childrenPreference: null,
  monogamyStructure: null,
  relocationOpenness: null,
  lifestyleSmoking: null,
  lifestyleSubstanceUse: null,
  lifestyleReligionNonNegotiables: null,
});

const mapIntent = (intent?: User['partnershipIntent']): RelationshipIntentSetting => {
  if (intent === 'marriage') return 'marriage-focused';
  if (intent === 'long-term') return 'long-term-partnership';
  return 'open-but-serious';
};

const mapChildrenPreference = (user?: User): ChildrenPreferenceSetting => {
  if (!user?.familyAlignment) return 'open-to-partner-with-children';
  if (user.familyAlignment.hasChildren) return 'has-children';
  if (user.familyAlignment.wantsChildren === 'wants') return 'wants-children';
  if (user.familyAlignment.openToPartnerWithParent === 'prefers-child-free') return 'not-open-to-children';
  return 'open-to-partner-with-children';
};

const mapIdentityVisibility = (
  user: User | undefined,
  field: 'gender-identity' | 'identity-expression'
): IdentityFieldVisibilityMode => {
  const defaultVisibility: IdentityFieldVisibilityMode = 'always-visible';

  if (field === 'gender-identity') return defaultVisibility;

  if (user?.identityExpressionVisibility === 'after-mutual-interest') {
    return 'after-mutual-interest';
  }

  if (user?.identityExpressionVisibility === 'always-visible') {
    return 'always-visible';
  }

  return defaultVisibility;
};

export const createDefaultUserSettings = (user?: User): UserSettings => ({
  visibility: {
    profileVisibility: 'alignment-pool',
    photoVisibility: 'blur-until-mutual',
    genderIdentityVisibility: mapIdentityVisibility(user, 'gender-identity'),
    identityExpressionVisibility: mapIdentityVisibility(user, 'identity-expression'),
  },
  alignmentPreferences: {
    relationshipIntent: mapIntent(user?.partnershipIntent),
    childrenPreference: mapChildrenPreference(user),
    monogamyStructure: 'monogamous-only',
    relocationOpenness: 'local-only',
    lifestyleDealbreakers: {
      smoking: false,
      substanceUse: false,
      religionNonNegotiables: false,
    },
  },
  growth: {
    showGrowthFocusToMatches: true,
    retakeNotifications: true,
  },
  communicationBoundaries: {
    communicationPace: 'daily',
    need24HoursBeforeConflict: false,
    noYelling: true,
    noLateNightArguments: true,
  },
  safety: {
    requireBackgroundBadgeForMeetups: false,
    onlyMatchWithVerifiedAccounts: false,
    hiddenWordsFilter: false,
  },
  notifications: {
    newAlignmentMatches: true,
    messageRequests: true,
    innerWorkReminders: true,
    blogUpdates: true,
    growthMilestones: true,
  },
  coreLocks: createEmptyCoreLocks(),
});

const normalizeUserSettings = (settings: UserSettings | undefined, user?: User): UserSettings => {
  const defaults = createDefaultUserSettings(user);

  if (!settings) return defaults;

  return {
    ...defaults,
    ...settings,
    visibility: {
      ...defaults.visibility,
      ...settings.visibility,
    },
    alignmentPreferences: {
      ...defaults.alignmentPreferences,
      ...settings.alignmentPreferences,
      lifestyleDealbreakers: {
        ...defaults.alignmentPreferences.lifestyleDealbreakers,
        ...settings.alignmentPreferences?.lifestyleDealbreakers,
      },
    },
    growth: {
      ...defaults.growth,
      ...settings.growth,
    },
    communicationBoundaries: {
      ...defaults.communicationBoundaries,
      ...settings.communicationBoundaries,
    },
    safety: {
      ...defaults.safety,
      ...settings.safety,
    },
    notifications: {
      ...defaults.notifications,
      ...settings.notifications,
    },
    coreLocks: {
      ...createEmptyCoreLocks(),
      ...settings.coreLocks,
    },
  };
};

export const getAllUserSettingsMap = (): Record<string, UserSettings> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse user settings map:', error);
    return {};
  }
};

const saveAllUserSettingsMap = (map: Record<string, UserSettings>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Failed to save user settings map:', error);
  }
};

export const getUserSettingsForUser = (userId: string, user?: User): UserSettings => {
  const map = getAllUserSettingsMap();
  const normalized = normalizeUserSettings(map[userId], user);
  map[userId] = normalized;
  saveAllUserSettingsMap(map);
  return normalized;
};

export const saveUserSettingsForUser = (userId: string, settings: UserSettings): void => {
  const map = getAllUserSettingsMap();
  map[userId] = normalizeUserSettings(settings);
  saveAllUserSettingsMap(map);
};

export const removeUserSettingsForUser = (userId: string): void => {
  const map = getAllUserSettingsMap();
  delete map[userId];
  saveAllUserSettingsMap(map);
};

export const isCoreSettingLocked = (
  settings: UserSettings,
  key: CoreSettingKey,
  now = Date.now()
): boolean => {
  const unlockAt = settings.coreLocks[key];
  return typeof unlockAt === 'number' && unlockAt > now;
};

export const getCoreSettingUnlockDate = (settings: UserSettings, key: CoreSettingKey): Date | null => {
  const unlockAt = settings.coreLocks[key];
  if (typeof unlockAt !== 'number') return null;
  return new Date(unlockAt);
};

export const applyCoreLock = (settings: UserSettings, key: CoreSettingKey, now = Date.now()): UserSettings => {
  return {
    ...settings,
    coreLocks: {
      ...settings.coreLocks,
      [key]: now + CORE_LOCK_DURATION_MS,
    },
  };
};
