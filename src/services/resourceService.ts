import { supabase } from '@/lib/supabase';
import type { GrowthResource } from '@/types';
import {
  LEGACY_PATH_RESOURCE_RECORD_IDS,
  PATH_RESOURCE_RECORD_IDS,
  type PathResourceBucket,
} from '@/lib/pathways';

const readResourceRow = async (ids: string[]): Promise<{ id: string; data: GrowthResource[] } | null> => {
  const { data, error } = await supabase
    .from('growth_resources')
    .select('id, data')
    .in('id', ids);

  if (error) {
    console.warn('Failed to fetch growth resources from Supabase:', error);
    return null;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const orderedIds = new Map(ids.map((id, index) => [id, index]));
  const row = [...data].sort(
    (a, b) => (orderedIds.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderedIds.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  )[0];

  return row
    ? {
        id: row.id,
        data: Array.isArray(row.data) ? (row.data as GrowthResource[]) : [],
      }
    : null;
};

export const resourceService = {
  async saveResources(
    resources: GrowthResource[],
    bucket: PathResourceBucket = 'intentional'
  ): Promise<{ error: string | null }> {
    try {
      console.log(`[resourceService] Attempting to save ${bucket} resources:`, resources.length);
      const resourceId = PATH_RESOURCE_RECORD_IDS[bucket];
      const legacyResourceId = LEGACY_PATH_RESOURCE_RECORD_IDS[bucket];
      const existingData = await readResourceRow([resourceId, legacyResourceId]);

      let error = null;
      if (existingData) {
        const { error: updateError } = await supabase
          .from('growth_resources')
          .update({
            type: bucket,
            data: resources,
            updated_at: Date.now(),
          })
          .eq('id', existingData.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('growth_resources')
          .insert({
            id: resourceId,
            type: bucket,
            data: resources,
            updated_at: Date.now(),
          });
        error = insertError;
      }

      if (error) {
        console.error('Failed to save resources to Supabase:', error);
        return { error: error.message };
      }
      console.log(`Resources (${bucket}) saved to Supabase`);
      return { error: null };
    } catch (e: any) {
      console.error('Unexpected error saving resources:', e);
      return { error: e.message || 'Unknown error' };
    }
  },

  async getResources(bucket: PathResourceBucket = 'intentional'): Promise<GrowthResource[]> {
    try {
      console.log(`[resourceService.getResources] Fetching ${bucket} resources from Supabase`);
      const row = await readResourceRow([
        PATH_RESOURCE_RECORD_IDS[bucket],
        LEGACY_PATH_RESOURCE_RECORD_IDS[bucket],
      ]);

      if (!row) {
        console.log(`No ${bucket} resources found in Supabase`);
        return [];
      }

      console.log(`Loaded ${bucket} resources from Supabase:`, row.data.length, 'resources');
      return row.data;
    } catch (e: any) {
      console.error('Unexpected error fetching resources:', e);
      return [];
    }
  },
};
