import { supabase } from '@/lib/supabase';
import type { GrowthResource } from '@/types';

export const resourceService = {
  async saveResources(resources: GrowthResource[], type: 'free' | 'paid' = 'free'): Promise<{ error: string | null }> {
    try {
      // Store resources as JSON in a single record per type
      const { error } = await supabase
        .from('growth_resources')
        .upsert(
          {
            id: `resources_${type}`,
            type,
            data: resources,
            updated_at: Date.now(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Failed to save resources to Supabase:', error);
        return { error: error.message };
      }
      console.log(`Resources (${type}) saved to Supabase`);
      return { error: null };
    } catch (e: any) {
      console.error('Unexpected error saving resources:', e);
      return { error: e.message || 'Unknown error' };
    }
  },

  async getResources(type: 'free' | 'paid' = 'free'): Promise<GrowthResource[]> {
    try {
      const { data, error } = await supabase
        .from('growth_resources')
        .select('data')
        .eq('id', `resources_${type}`)
        .single();

      if (error) {
        console.warn(`Failed to fetch ${type} resources from Supabase:`, error.message);
        return [];
      }

      if (!data || !data.data) {
        console.log(`No ${type} resources found in Supabase`);
        return [];
      }

      console.log(`Loaded ${type} resources from Supabase:`, data.data.length, 'resources');
      return data.data;
    } catch (e: any) {
      console.error('Unexpected error fetching resources:', e);
      return [];
    }
  },
};
