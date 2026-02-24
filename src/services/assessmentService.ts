import { supabase } from '@/lib/supabase'
import type { AssessmentResult } from '@/types'

interface SavedAssessmentResult {
  id: string
  user_id: string
  passed: boolean
  percentage: number
  answered_at: number
  integrity_flags?: string[]
  growth_areas?: string[]
}

export const assessmentService = {
  async saveAssessmentResult(
    userId: string,
    result: AssessmentResult
  ): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase
        .from('assessment_results')
        .insert({
          id: `ar_${userId}_${Date.now()}`,
          user_id: userId,
          passed: result.passed,
          percentage: result.percentage,
          answered_at: Date.now(),
          integrity_flags: result.integrityFlags || [],
          growth_areas: result.growthAreas || [],
        })
        .select()
        .single()

      if (error) {
        console.warn('Supabase assessment result write failed:', error.message)
        return { error: error.message }
      }
      return { error: null }
    } catch (err) {
      console.error('Failed to save assessment result:', err)
      return { error: String(err) }
    }
  },

  async getLatestAssessmentResult(userId: string): Promise<AssessmentResult | null> {
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', userId)
        .order('answered_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        console.warn('Failed to fetch assessment result from Supabase:', error?.message)
        return null
      }

      return mapRowToAssessmentResult(data)
    } catch (err) {
      console.error('Failed to get latest assessment result:', err)
      return null
    }
  },

  async getAllAssessmentResults(userId: string): Promise<AssessmentResult[]> {
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', userId)
        .order('answered_at', { ascending: false })

      if (error || !data) {
        console.warn('Failed to fetch assessment results from Supabase:', error?.message)
        return []
      }

      return data.map(mapRowToAssessmentResult)
    } catch (err) {
      console.error('Failed to get assessment results:', err)
      return []
    }
  },
}

function mapRowToAssessmentResult(row: any): AssessmentResult {
  return {
    passed: row.passed,
    percentage: row.percentage,
    integrityFlags: row.integrity_flags || [],
    growthAreas: row.growth_areas || [],
  }
}
