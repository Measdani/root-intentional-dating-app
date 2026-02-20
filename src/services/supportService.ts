import { supabase } from '@/lib/supabase'
import type { SupportMessage } from '@/types'

export const supportService = {
  async createSupportMessage(msg: SupportMessage): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('support_messages')
      .insert({
        id: msg.id,
        user_id: msg.userId,
        user_email: msg.userEmail,
        user_name: msg.userName,
        membership_tier: msg.membershipTier,
        category: msg.category,
        subject: msg.subject,
        message: msg.message,
        status: msg.status,
        priority: msg.priority,
        created_at: msg.createdAt,
        updated_at: msg.updatedAt,
      })

    if (error) {
      console.warn('Supabase support message write failed:', error.message)
      return { error: error.message }
    }
    return { error: null }
  },

  async getAllSupportMessages(): Promise<SupportMessage[]> {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.warn('Failed to fetch support messages from Supabase:', error?.message)
      return []
    }
    return data.map(mapRowToSupportMessage)
  },

  async updateStatus(
    messageId: string,
    status: SupportMessage['status'],
    adminResponse?: string
  ): Promise<boolean> {
    const updates: any = {
      status,
      updated_at: Date.now(),
    }
    if (adminResponse) {
      updates.admin_response = adminResponse
    }
    if (status === 'resolved') {
      updates.resolved_at = Date.now()
    }

    const { error } = await supabase
      .from('support_messages')
      .update(updates)
      .eq('id', messageId)

    if (error) {
      console.warn('Failed to update support message status:', error.message)
      return false
    }
    return true
  },
}

function mapRowToSupportMessage(row: any): SupportMessage {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    membershipTier: row.membership_tier as any,
    category: row.category as any,
    subject: row.subject,
    message: row.message,
    status: row.status as any,
    priority: row.priority as any,
    assignedAdminId: row.assigned_admin_id,
    adminResponse: row.admin_response,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }
}
