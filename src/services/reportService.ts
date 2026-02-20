import { supabase } from '@/lib/supabase'
import type { Report } from '@/types'

export const reportService = {
  async createReport(report: Report): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from('reports')
      .insert({
        id: report.id,
        reporter_id: report.reporterId,
        reported_user_id: report.reportedUserId,
        reason: report.reason,
        details: report.details,
        conversation_id: report.conversationId ?? null,
        status: report.status,
        severity: report.severity,
        created_at: report.createdAt,
        updated_at: report.updatedAt,
      })
      .select()
      .single()

    if (error) {
      console.warn('Supabase report write failed:', error.message)
      return { error: error.message }
    }
    return { error: null }
  },

  async getAllReports(): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      console.warn('Failed to fetch reports from Supabase:', error?.message)
      return []
    }
    return data.map(mapRowToReport)
  },

  async updateReportStatus(reportId: string, status: string): Promise<boolean> {
    const { error } = await supabase
      .from('reports')
      .update({ status, updated_at: Date.now() })
      .eq('id', reportId)

    if (error) {
      console.warn('Failed to update report status:', error.message)
      return false
    }
    return true
  },
}

function mapRowToReport(row: any): Report {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reportedUserId: row.reported_user_id,
    reason: row.reason as any,
    details: row.details,
    conversationId: row.conversation_id,
    status: row.status as any,
    severity: row.severity as any,
    assignedAdminId: row.assigned_admin_id,
    adminNotes: row.admin_notes,
    actionTaken: row.action_taken,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  }
}
