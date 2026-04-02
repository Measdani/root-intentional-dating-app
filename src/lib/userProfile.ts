import type { User } from '@/types';

const DEFAULT_FAMILY_ALIGNMENT: User['familyAlignment'] = {
  hasChildren: false,
  wantsChildren: 'unsure',
  openToPartnerWithParent: 'comfortable',
};

export const hasDatingProfile = (user: Partial<User>): boolean => {
  const hasValues = Array.isArray(user.values) && user.values.length > 0;
  const hasGrowthFocus = typeof user.growthFocus === 'string' && user.growthFocus.trim().length > 0;
  return Boolean(user.partnershipIntent && user.familyAlignment && hasValues && hasGrowthFocus);
};

export const normalizeUserProfile = (user: Partial<User>): User => {
  const familyAlignment = user.familyAlignment ?? DEFAULT_FAMILY_ALIGNMENT;

  return {
    id: user.id ?? 'unknown-user',
    name: user.name?.trim() || 'Rooted User',
    age: typeof user.age === 'number' && Number.isFinite(user.age) ? user.age : 30,
    city: user.city?.trim() || 'Profile setup pending',
    gender: user.gender ?? 'prefer-not-to-say',
    genderIdentity: user.genderIdentity ?? user.gender ?? 'prefer-not-to-say',
    genderIdentityCustom: user.genderIdentityCustom,
    openToDating: Array.isArray(user.openToDating) ? user.openToDating : undefined,
    openToDatingCustom: user.openToDatingCustom,
    identityExpression: user.identityExpression,
    identityExpressionCustom: user.identityExpressionCustom,
    identityExpressionVisibility: user.identityExpressionVisibility,
    partnershipIntent: user.partnershipIntent ?? 'long-term',
    familyAlignment: {
      hasChildren:
        typeof familyAlignment.hasChildren === 'boolean'
          ? familyAlignment.hasChildren
          : DEFAULT_FAMILY_ALIGNMENT.hasChildren,
      wantsChildren:
        familyAlignment.wantsChildren ?? DEFAULT_FAMILY_ALIGNMENT.wantsChildren,
      openToPartnerWithParent:
        familyAlignment.openToPartnerWithParent ?? DEFAULT_FAMILY_ALIGNMENT.openToPartnerWithParent,
    },
    values: Array.isArray(user.values) ? user.values.filter((value): value is string => typeof value === 'string') : [],
    growthFocus: user.growthFocus?.trim() || 'Profile setup in progress',
    relationshipVision: user.relationshipVision,
    communicationStyle: user.communicationStyle,
    financialMindset: user.financialMindset,
    lifestyleAlignment: user.lifestyleAlignment,
    alignmentScore: typeof user.alignmentScore === 'number' ? user.alignmentScore : undefined,
    primaryStyle: user.primaryStyle,
    secondaryStyle: user.secondaryStyle,
    photoUrl: user.photoUrl,
    bio: user.bio,
    communityBoundaries: user.communityBoundaries,
    suspensionEndDate:
      typeof user.suspensionEndDate === 'number' ? user.suspensionEndDate : undefined,
    assessmentPassed:
      typeof user.assessmentPassed === 'boolean' ? user.assessmentPassed : false,
    membershipTier: user.membershipTier ?? 'monthly',
    email: user.email?.trim().toLowerCase() || undefined,
    userStatus: user.userStatus ?? 'active',
    isAdmin: typeof user.isAdmin === 'boolean' ? user.isAdmin : undefined,
    backgroundCheckVerified:
      typeof user.backgroundCheckVerified === 'boolean' ? user.backgroundCheckVerified : false,
    backgroundCheckStatus: user.backgroundCheckStatus ?? 'pending',
    backgroundCheckDate:
      typeof user.backgroundCheckDate === 'number' ? user.backgroundCheckDate : undefined,
    billingPeriodEnd:
      typeof user.billingPeriodEnd === 'number' ? user.billingPeriodEnd : undefined,
    consentTimestamp:
      typeof user.consentTimestamp === 'number' ? user.consentTimestamp : undefined,
    consentVersion: user.consentVersion,
    guidelinesAckRequired:
      typeof user.guidelinesAckRequired === 'boolean' ? user.guidelinesAckRequired : false,
    guidelinesAcknowledgedAt:
      typeof user.guidelinesAcknowledgedAt === 'number' ? user.guidelinesAcknowledgedAt : undefined,
    moderationNote: user.moderationNote,
    membershipStatus: user.membershipStatus ?? 'active',
    cancelAtPeriodEnd:
      typeof user.cancelAtPeriodEnd === 'boolean' ? user.cancelAtPeriodEnd : false,
    poolId: user.poolId,
    mode: user.mode ?? 'active',
    growthStyleBadges: user.growthStyleBadges,
    partnerJourneyBadges: user.partnerJourneyBadges,
  };
};
