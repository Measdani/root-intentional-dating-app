import { supabase } from '@/lib/supabase';
import type { GrowthResource } from '@/types';

export const resourceService = {
  async saveResources(resources: GrowthResource[], type: 'free' | 'paid' = 'free'): Promise<{ error: string | null }> {
    try {
      console.log(`[resourceService] Attempting to save ${type} resources:`, resources.length);
      const resourceId = `resources_${type}`;

      // First check if record exists
      const { data: existingData } = await supabase
        .from('growth_resources')
        .select('id')
        .eq('id', resourceId)
        .single();

      let error;
      if (existingData) {
        // Record exists, update it
        const { error: updateError } = await supabase
          .from('growth_resources')
          .update({
            type,
            data: resources,
            updated_at: Date.now(),
          })
          .eq('id', resourceId);
        error = updateError;
      } else {
        // Record doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('growth_resources')
          .insert({
            id: resourceId,
            type,
            data: resources,
            updated_at: Date.now(),
          });
        error = insertError;
      }

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
