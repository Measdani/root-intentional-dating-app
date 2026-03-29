import { supabase } from '@/lib/supabase'

export interface SignupEligibilityResult {
  blocked: boolean
  existingAccount: boolean
  reason: string | null
}

type SignupEligibilityResponse = {
  blocked?: unknown
  existing_account?: unknown
  reason?: unknown
}

export interface AdminBanResult {
  status: 'banned'
  deletedUserId: string
  blockedEmail: string
}

const toMessage = async (fallback: string, error: unknown): Promise<string> => {
  if (!error || typeof error !== 'object') return fallback

  const candidate = error as { message?: unknown; context?: unknown }
  if (candidate.context instanceof Response) {
    try {
      const body = await candidate.context.clone().json() as {
        error?: unknown
        details?: unknown
      }
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error
      }
      if (typeof body.details === 'string' && body.details.trim()) {
        return body.details
      }
    } catch {
      // Ignore parse issues and fall back to the generic message.
    }
  }

  return typeof candidate.message === 'string' && candidate.message.trim()
    ? candidate.message
    : fallback
}

export const accountEnforcementService = {
  async checkSignupEmail(email: string): Promise<SignupEligibilityResult> {
    const { data, error } = await supabase.functions.invoke('account-enforcement', {
      body: {
        action: 'check_signup_email',
        email,
      },
    })

    if (error) {
      throw new Error(await toMessage('Unable to validate this email right now.', error))
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Account enforcement response was invalid.')
    }

    const response = data as SignupEligibilityResponse
    if (
      typeof response.blocked !== 'boolean' ||
      typeof response.existing_account !== 'boolean'
    ) {
      throw new Error('Account enforcement response was invalid.')
    }

    return {
      blocked: response.blocked,
      existingAccount: response.existing_account,
      reason: typeof response.reason === 'string' ? response.reason : null,
    }
  },

  async adminBanUser(
    targetUserId: string,
    reason: string,
    sourceReportId?: string
  ): Promise<AdminBanResult> {
    const { data, error } = await supabase.functions.invoke('account-enforcement', {
      body: {
        action: 'admin_ban_user',
        target_user_id: targetUserId,
        reason,
        source_report_id: sourceReportId ?? null,
      },
    })

    if (error) {
      throw new Error(await toMessage('Unable to ban this user right now.', error))
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Account enforcement response was invalid.')
    }

    const response = data as {
      status?: unknown
      deleted_user_id?: unknown
      blocked_email?: unknown
    }

    if (
      response.status !== 'banned' ||
      typeof response.deleted_user_id !== 'string' ||
      typeof response.blocked_email !== 'string'
    ) {
      throw new Error('Account enforcement response was invalid.')
    }

    return {
      status: 'banned',
      deletedUserId: response.deleted_user_id,
      blockedEmail: response.blocked_email,
    }
  },
}
