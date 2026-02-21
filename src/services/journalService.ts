import { supabase } from '@/lib/supabase';

export interface JournalEntry {
  id: string;
  user_id: string;
  section_key: 'boundaries' | 'needs' | 'non-negotiables' | 'triggers' | 'connections';
  related_user_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const journalService = {
  async getEntriesBySection(sectionKey: JournalEntry['section_key']): Promise<JournalEntry[]> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('section_key', sectionKey)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch journal entries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return [];
    }
  },

  async createEntry(
    sectionKey: JournalEntry['section_key'],
    content: string,
    title?: string,
    relatedUserId?: string
  ): Promise<JournalEntry | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        return null;
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          section_key: sectionKey,
          title,
          content,
          related_user_id: relatedUserId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create entry:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating entry:', error);
      return null;
    }
  },

  async updateEntry(
    entryId: string,
    content: string,
    title?: string,
    relatedUserId?: string
  ): Promise<JournalEntry | null> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          content,
          title,
          related_user_id: relatedUserId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update entry:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error updating entry:', error);
      return null;
    }
  },

  async deleteEntry(entryId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);

      if (error) {
        console.error('Failed to delete entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  },
};
