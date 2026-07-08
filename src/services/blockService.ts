import { supabase } from '@/lib/supabase'

export const blockService = {
  // Users this person has blocked.
  async getBlockedByMe(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)

    if (error || !data) {
      console.warn('Failed to load blocked users:', error?.message)
      return []
    }

    return data.map((row) => row.blocked_id as string)
  },

  // Users who have blocked this person.
  async getBlockedMe(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', userId)

    if (error || !data) {
      console.warn('Failed to load blocked-by users:', error?.message)
      return []
    }

    return data.map((row) => row.blocker_id as string)
  },

  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_blocks')
      .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })

    if (error) {
      console.warn('Failed to block user:', error.message)
      return false
    }

    return true
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)

    if (error) {
      console.warn('Failed to unblock user:', error.message)
      return false
    }

    return true
  },
}
