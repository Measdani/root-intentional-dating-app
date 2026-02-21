import { supabase } from '@/lib/supabase'
import type { User } from '@/types'

export const userService = {
  async createUser(user: User): Promise<{ error: string | null; data?: User }> {
    const { error, data } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        city: user.city,
        gender: user.gender,
        partnership_intent: user.partnershipIntent,
        family_alignment: user.familyAlignment,
        values: user.values,
        growth_focus: user.growthFocus,
        relationship_vision: user.relationshipVision,
        communication_style: user.communicationStyle,
        photo_url: user.photoUrl,
        bio: user.bio,
        assessment_passed: user.assessmentPassed,
        alignment_score: user.alignmentScore,
        membership_tier: user.membershipTier,
        membership_status: user.membershipStatus,
        billing_period_end: user.billingPeriodEnd,
        consent_timestamp: user.consentTimestamp,
        consent_version: user.consentVersion,
        cancel_at_period_end: user.cancelAtPeriodEnd,
        user_status: user.userStatus,
        background_check_verified: user.backgroundCheckVerified,
        background_check_status: user.backgroundCheckStatus,
        background_check_date: user.backgroundCheckDate,
        suspension_end_date: user.suspensionEndDate,
        is_admin: user.isAdmin,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
      .select()
      .single()

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

    // Map User fields to snake_case for database
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.age !== undefined) updateData.age = updates.age
    if (updates.city !== undefined) updateData.city = updates.city
    if (updates.gender !== undefined) updateData.gender = updates.gender
    if (updates.partnershipIntent !== undefined) updateData.partnership_intent = updates.partnershipIntent
    if (updates.familyAlignment !== undefined) updateData.family_alignment = updates.familyAlignment
    if (updates.values !== undefined) updateData.values = updates.values
    if (updates.growthFocus !== undefined) updateData.growth_focus = updates.growthFocus
    if (updates.relationshipVision !== undefined) updateData.relationship_vision = updates.relationshipVision
    if (updates.communicationStyle !== undefined) updateData.communication_style = updates.communicationStyle
    if (updates.photoUrl !== undefined) updateData.photo_url = updates.photoUrl
    if (updates.bio !== undefined) updateData.bio = updates.bio
    if (updates.assessmentPassed !== undefined) updateData.assessment_passed = updates.assessmentPassed
    if (updates.alignmentScore !== undefined) updateData.alignment_score = updates.alignmentScore
    if (updates.membershipTier !== undefined) updateData.membership_tier = updates.membershipTier
    if (updates.membershipStatus !== undefined) updateData.membership_status = updates.membershipStatus
    if (updates.billingPeriodEnd !== undefined) updateData.billing_period_end = updates.billingPeriodEnd
    if (updates.consentTimestamp !== undefined) updateData.consent_timestamp = updates.consentTimestamp
    if (updates.consentVersion !== undefined) updateData.consent_version = updates.consentVersion
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd
    if (updates.userStatus !== undefined) updateData.user_status = updates.userStatus
    if (updates.backgroundCheckVerified !== undefined) updateData.background_check_verified = updates.backgroundCheckVerified
    if (updates.backgroundCheckStatus !== undefined) updateData.background_check_status = updates.backgroundCheckStatus
    if (updates.backgroundCheckDate !== undefined) updateData.background_check_date = updates.backgroundCheckDate
    if (updates.suspensionEndDate !== undefined) updateData.suspension_end_date = updates.suspensionEndDate
    if (updates.isAdmin !== undefined) updateData.is_admin = updates.isAdmin

    updateData.updated_at = Date.now()

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      console.warn('Failed to update user:', error.message)
      return false
    }

    return true
  },

  async deleteUser(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      console.warn('Failed to delete user:', error.message)
      return false
    }

    return true
  },
}

function mapRowToUser(row: any): User {
  return {
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
    photoUrl: row.photo_url,
    bio: row.bio,
    assessmentPassed: row.assessment_passed,
    alignmentScore: row.alignment_score,
    membershipTier: row.membership_tier,
    membershipStatus: row.membership_status,
    billingPeriodEnd: row.billing_period_end,
    consentTimestamp: row.consent_timestamp,
    consentVersion: row.consent_version,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    userStatus: row.user_status,
    backgroundCheckVerified: row.background_check_verified,
    backgroundCheckStatus: row.background_check_status,
    backgroundCheckDate: row.background_check_date,
    suspensionEndDate: row.suspension_end_date,
    isAdmin: row.is_admin,
  }
}
