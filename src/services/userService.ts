import { supabase } from '@/lib/supabase'
import { accountDeletionService } from '@/services/accountDeletionService'
import { validateRequiredProfileBio } from '@/lib/profileTextValidation'
import { normalizeUserProfile } from '@/lib/userProfile'
import { validateUsCityState } from '@/lib/usLocationValidation'
import type { User } from '@/types'

export const userService = {
  async createUser(user: User): Promise<{ error: string | null; data?: User }> {
    const locationValidation = await validateUsCityState(user.city)
    if (!locationValidation.isValid) {
      return { error: locationValidation.error }
    }
    const bioValidation = validateRequiredProfileBio(user.bio ?? '')
    if (!bioValidation.isValid) {
      return { error: bioValidation.error ?? 'About You is required.' }
    }

    const basePayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      age: user.age,
      city: locationValidation.canonicalCityState,
      gender: user.gender,
      partnership_intent: user.partnershipIntent,
      family_alignment: user.familyAlignment,
      values: user.values,
      growth_focus: user.growthFocus,
      relationship_vision: user.relationshipVision,
      communication_style: user.communicationStyle,
      photo_url: user.photoUrl,
      bio: bioValidation.normalizedBio,
      assessment_passed: user.assessmentPassed,
      alignment_score: user.alignmentScore,
      membership_tier: user.membershipTier,
      membership_status: user.membershipStatus,
      billing_period_end: user.billingPeriodEnd,
      consent_timestamp: user.consentTimestamp,
      consent_version: user.consentVersion,
      guidelines_ack_required: user.guidelinesAckRequired,
      guidelines_acknowledged_at: user.guidelinesAcknowledgedAt,
      moderation_note: user.moderationNote,
      cancel_at_period_end: user.cancelAtPeriodEnd,
      user_status: user.userStatus,
      background_check_verified: user.backgroundCheckVerified,
      background_check_status: user.backgroundCheckStatus,
      background_check_date: user.backgroundCheckDate,
      suspension_end_date: user.suspensionEndDate,
      is_admin: user.isAdmin,
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    let { error, data } = await supabase
      .from('users')
      .insert({
        ...basePayload,
        ...(user.poolId ? { pool_id: user.poolId } : {}),
        ...(user.primaryStyle ? { primary_style: user.primaryStyle } : {}),
        ...(user.secondaryStyle ? { secondary_style: user.secondaryStyle } : {}),
      })
      .select()
      .single()

    if (
      error &&
      (user.poolId || user.primaryStyle || user.secondaryStyle) &&
      (shouldRetryWithoutPoolId(error.message) || shouldRetryWithoutStyleColumns(error.message))
    ) {
      // Backward-compatible retry for schemas that do not support pool/style columns yet.
      const fallbackPayload = { ...basePayload } as Record<string, unknown>
      if (shouldRetryWithoutStyleColumns(error.message)) {
        delete fallbackPayload.primary_style
        delete fallbackPayload.secondary_style
      }
      const retry = await supabase
        .from('users')
        .insert(fallbackPayload)
        .select()
        .single()
      error = retry.error
      data = retry.data
    }

    if (error) {
      console.warn('Supabase user create failed:', error.message)
      return { error: error.message }
    }

    return { error: null, data: data ? mapRowToUser(data) : undefined }
  },

  async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.warn('Failed to fetch user from Supabase:', error?.message)
      return null
    }

    return mapRowToUser(data)
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return null
    }

    return mapRowToUser(data)
  },

  async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.warn('Failed to fetch users from Supabase:', error?.message)
      return []
    }

    return data.map(mapRowToUser)
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    const updateData: any = {}

    if (updates.city !== undefined) {
      const locationValidation = await validateUsCityState(updates.city)
      if (!locationValidation.isValid) {
        console.warn('Rejected invalid city update:', locationValidation.error)
        return false
      }
      updateData.city = locationValidation.canonicalCityState
    }

    // Map User fields to snake_case for database
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.age !== undefined) updateData.age = updates.age
    if (updates.gender !== undefined) updateData.gender = updates.gender
    if (updates.partnershipIntent !== undefined) updateData.partnership_intent = updates.partnershipIntent
    if (updates.familyAlignment !== undefined) updateData.family_alignment = updates.familyAlignment
    if (updates.values !== undefined) updateData.values = updates.values
    if (updates.growthFocus !== undefined) updateData.growth_focus = updates.growthFocus
    if (updates.relationshipVision !== undefined) updateData.relationship_vision = updates.relationshipVision
    if (updates.communicationStyle !== undefined) updateData.communication_style = updates.communicationStyle
    if (updates.primaryStyle !== undefined) updateData.primary_style = updates.primaryStyle
    if (updates.secondaryStyle !== undefined) updateData.secondary_style = updates.secondaryStyle
    if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl
    if (updates.bio !== undefined) updateData.bio = updates.bio
    if (updates.assessmentPassed !== undefined) updateData.assessment_passed = updates.assessmentPassed
    if (updates.alignmentScore !== undefined) updateData.alignment_score = updates.alignmentScore
    if (updates.membershipTier !== undefined) updateData.membership_tier = updates.membershipTier
    if (updates.membershipStatus !== undefined) updateData.membership_status = updates.membershipStatus
    if (updates.billingPeriodEnd !== undefined) updateData.billing_period_end = updates.billingPeriodEnd
    if (updates.consentTimestamp !== undefined) updateData.consent_timestamp = updates.consentTimestamp
    if (updates.consentVersion !== undefined) updateData.consent_version = updates.consentVersion
    if (updates.guidelinesAckRequired !== undefined) updateData.guidelines_ack_required = updates.guidelinesAckRequired
    if ('guidelinesAcknowledgedAt' in updates) updateData.guidelines_acknowledged_at = updates.guidelinesAcknowledgedAt ?? null
    if (updates.moderationNote !== undefined) updateData.moderation_note = updates.moderationNote
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd
    if (updates.poolId !== undefined) updateData.pool_id = updates.poolId
    if (updates.userStatus !== undefined) updateData.user_status = updates.userStatus
    if (updates.backgroundCheckVerified !== undefined) updateData.background_check_verified = updates.backgroundCheckVerified
    if (updates.backgroundCheckStatus !== undefined) updateData.background_check_status = updates.backgroundCheckStatus
    if (updates.backgroundCheckDate !== undefined) updateData.background_check_date = updates.backgroundCheckDate
    if ('suspensionEndDate' in updates) updateData.suspension_end_date = updates.suspensionEndDate ?? null
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin

    updateData.updated_at = Date.now()

    let { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (
      error &&
      (
        (updateData.pool_id !== undefined && shouldRetryWithoutPoolId(error.message)) ||
        (hasStyleColumns(updateData) && shouldRetryWithoutStyleColumns(error.message))
      )
    ) {
      if (shouldRetryWithoutPoolId(error.message)) {
        delete updateData.pool_id
      }
      if (shouldRetryWithoutStyleColumns(error.message)) {
        delete updateData.primary_style
        delete updateData.secondary_style
      }
      const retry = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
      error = retry.error
    }

    if (error) {
      console.warn('Failed to update user:', error.message)
      return false
    }

    return true
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      await accountDeletionService.adminDeleteUser(userId)
    } catch (error) {
      console.warn(
        'Failed to delete user:',
        error instanceof Error ? error.message : 'unknown error'
      )
      return false
    }

    return true
  },
}

function mapRowToUser(row: any): User {
  return normalizeUserProfile({
    id: row.id,
    email: row.email,
    name: row.name,
    age: row.age,
    city: row.city,
    gender: row.gender,
    partnershipIntent: row.partnership_intent,
    familyAlignment: row.family_alignment,
    values: row.values,
    growthFocus: row.growth_focus,
    relationshipVision: row.relationship_vision,
    communicationStyle: row.communication_style,
    primaryStyle: row.primary_style,
    secondaryStyle: row.secondary_style,
    photoUrl: row.photo_url,
    bio: row.bio,
    assessmentPassed: row.assessment_passed,
    alignmentScore: row.alignment_score,
    membershipTier: row.membership_tier,
    membershipStatus: row.membership_status,
    billingPeriodEnd: row.billing_period_end,
    consentTimestamp: row.consent_timestamp,
    consentVersion: row.consent_version,
    guidelinesAckRequired: row.guidelines_ack_required,
    guidelinesAcknowledgedAt: row.guidelines_acknowledged_at,
    moderationNote: row.moderation_note,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    poolId: toPoolId(row.pool_id),
    userStatus: row.user_status,
    backgroundCheckVerified: row.background_check_verified,
    backgroundCheckStatus: row.background_check_status,
    backgroundCheckDate: row.background_check_date,
    suspensionEndDate: row.suspension_end_date,
    isAdmin: row.is_admin,
  })
}

function toPoolId(value: unknown): User['poolId'] {
  if (value === 'core-inner' || value === 'core-advanced') return value
  // Legacy alias support while old data still exists.
  if (value === 'core') return 'core-inner'
  if (value === 'lgbtq' || value === 'lgbtq-inner') return 'core-inner'
  if (value === 'lgbtq-test' || value === 'lgbtq-advanced') return 'core-advanced'
  return undefined
}

function isMissingPoolIdColumnError(message: string): boolean {
  const normalized = (message || '').toLowerCase()
  return normalized.includes('pool_id') && (
    normalized.includes('column') ||
    normalized.includes('schema cache') ||
    normalized.includes('does not exist')
  )
}

function isUnsupportedPoolIdValueError(message: string): boolean {
  const normalized = (message || '').toLowerCase()
  return normalized.includes('pool') && (
    normalized.includes('invalid input value for enum') ||
    normalized.includes('violates check constraint') ||
    normalized.includes('not one of the allowed values')
  )
}

function shouldRetryWithoutPoolId(message: string): boolean {
  return isMissingPoolIdColumnError(message) || isUnsupportedPoolIdValueError(message)
}

function hasStyleColumns(payload: Record<string, unknown>): boolean {
  return payload.primary_style !== undefined || payload.secondary_style !== undefined
}

function shouldRetryWithoutStyleColumns(message: string): boolean {
  const normalized = (message || '').toLowerCase()
  const hasStyleColumnReference =
    normalized.includes('primary_style') || normalized.includes('secondary_style')
  if (!hasStyleColumnReference) return false

  return (
    normalized.includes('column') ||
    normalized.includes('schema cache') ||
    normalized.includes('does not exist')
  )
}
