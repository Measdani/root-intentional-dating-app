import { supabase } from '@/lib/supabase'

type DeleteOwnAccountPayload = {
  action: 'self_delete'
}

type AdminDeleteUserPayload = {
  action: 'admin_delete'
  target_user_id: string
}

type DeleteAccountPayload = DeleteOwnAccountPayload | AdminDeleteUserPayload

export interface AccountDeletionResult {
  status: 'deleted'
  deletedUserId: string
  mode: 'self' | 'admin'
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

const invokeDelete = async (
  payload: DeleteAccountPayload,
  fallbackMessage: string
): Promise<AccountDeletionResult> => {
  const { data, error } = await supabase.functions.invoke('account-delete', {
    body: payload,
  })

  if (error) {
    throw new Error(await toMessage(fallbackMessage, error))
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Account deletion response was invalid.')
  }

  const response = data as Partial<AccountDeletionResult> & { deleted_user_id?: unknown }
  const deletedUserId =
    typeof response.deletedUserId === 'string'
      ? response.deletedUserId
      : typeof response.deleted_user_id === 'string'
        ? response.deleted_user_id
        : null

  if (
    response.status !== 'deleted' ||
    (response.mode !== 'self' && response.mode !== 'admin') ||
    !deletedUserId
  ) {
    throw new Error('Account deletion response was invalid.')
  }

  return {
    status: 'deleted',
    deletedUserId,
    mode: response.mode,
  }
}

export const accountDeletionService = {
  async deleteOwnAccount(): Promise<AccountDeletionResult> {
    return invokeDelete(
      { action: 'self_delete' },
      'Unable to delete your account right now.'
    )
  },

  async adminDeleteUser(targetUserId: string): Promise<AccountDeletionResult> {
    return invokeDelete(
      { action: 'admin_delete', target_user_id: targetUserId },
      'Unable to delete this account right now.'
    )
  },
}
