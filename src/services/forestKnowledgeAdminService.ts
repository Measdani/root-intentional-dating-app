import { supabase } from '@/lib/supabase';

export type ForestKnowledgeRecord = {
  id: string;
  slug: string;
  category: string;
  topic: string;
  content: string;
  actionText: string;
  keywords: string[];
  starterLabel: string;
  starterPrompt: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ForestKnowledgeUpsertInput = {
  slug: string;
  category: string;
  topic: string;
  content: string;
  actionText: string;
  keywords: string[];
  starterLabel: string;
  starterPrompt: string;
  displayOrder: number;
  isActive: boolean;
};

export type ForestUnmatchedQueryRecord = {
  id: string;
  queryText: string;
  normalizedQuery: string;
  tokenSnapshot: string[];
  matchCount: number;
  topScore: number;
  topTopics: string[];
  pageContext: string;
  createdAt?: string;
};

type ForestKnowledgeRow = {
  id: string;
  slug: string;
  category: string;
  topic: string;
  content: string;
  action_text: string | null;
  keywords: string[] | null;
  starter_label: string | null;
  starter_prompt: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ForestUnmatchedQueryRow = {
  id: string;
  query_text: string;
  normalized_query: string;
  token_snapshot: string[] | null;
  match_count: number | null;
  top_score: number | null;
  top_topics: string[] | null;
  page_context: string | null;
  created_at: string | null;
};

const mapRowToForestKnowledgeRecord = (row: ForestKnowledgeRow): ForestKnowledgeRecord => ({
  id: row.id,
  slug: row.slug,
  category: row.category,
  topic: row.topic,
  content: row.content,
  actionText: row.action_text ?? '',
  keywords: Array.isArray(row.keywords) ? row.keywords : [],
  starterLabel: row.starter_label ?? '',
  starterPrompt: row.starter_prompt ?? '',
  displayOrder: typeof row.display_order === 'number' ? row.display_order : 0,
  isActive: row.is_active !== false,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const mapInputToRow = (input: ForestKnowledgeUpsertInput) => ({
  slug: input.slug,
  category: input.category,
  topic: input.topic,
  content: input.content,
  action_text: input.actionText || null,
  keywords: input.keywords,
  starter_label: input.starterLabel || null,
  starter_prompt: input.starterPrompt || null,
  display_order: input.displayOrder,
  is_active: input.isActive,
});

const mapRowToForestUnmatchedQueryRecord = (
  row: ForestUnmatchedQueryRow,
): ForestUnmatchedQueryRecord => ({
  id: row.id,
  queryText: row.query_text,
  normalizedQuery: row.normalized_query,
  tokenSnapshot: Array.isArray(row.token_snapshot) ? row.token_snapshot : [],
  matchCount: typeof row.match_count === 'number' ? row.match_count : 0,
  topScore: typeof row.top_score === 'number' ? row.top_score : 0,
  topTopics: Array.isArray(row.top_topics) ? row.top_topics : [],
  pageContext: row.page_context ?? '',
  createdAt: row.created_at ?? undefined,
});

export const forestKnowledgeAdminService = {
  async getAll(): Promise<ForestKnowledgeRecord[]> {
    try {
      const { data, error } = await supabase
        .from('rh_forest_knowledge')
        .select('*')
        .order('display_order', { ascending: true })
        .order('topic', { ascending: true });

      if (error) {
        console.warn('Failed to load Forest knowledge:', error.message);
        return [];
      }

      return Array.isArray(data)
        ? data.map((row) => mapRowToForestKnowledgeRecord(row as ForestKnowledgeRow))
        : [];
    } catch (error) {
      console.error('Unexpected error loading Forest knowledge:', error);
      return [];
    }
  },

  async create(input: ForestKnowledgeUpsertInput): Promise<{ data: ForestKnowledgeRecord | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('rh_forest_knowledge')
        .insert(mapInputToRow(input))
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to create Forest knowledge entry:', error.message);
        return { data: null, error: error.message };
      }

      return { data: mapRowToForestKnowledgeRecord(data as ForestKnowledgeRow), error: null };
    } catch (error: any) {
      console.error('Unexpected error creating Forest knowledge entry:', error);
      return { data: null, error: error?.message || 'Unknown error' };
    }
  },

  async update(
    id: string,
    input: ForestKnowledgeUpsertInput,
  ): Promise<{ data: ForestKnowledgeRecord | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('rh_forest_knowledge')
        .update(mapInputToRow(input))
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to update Forest knowledge entry:', error.message);
        return { data: null, error: error.message };
      }

      return { data: mapRowToForestKnowledgeRecord(data as ForestKnowledgeRow), error: null };
    } catch (error: any) {
      console.error('Unexpected error updating Forest knowledge entry:', error);
      return { data: null, error: error?.message || 'Unknown error' };
    }
  },

  async remove(id: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.from('rh_forest_knowledge').delete().eq('id', id);

      if (error) {
        console.warn('Failed to delete Forest knowledge entry:', error.message);
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Unexpected error deleting Forest knowledge entry:', error);
      return { error: error?.message || 'Unknown error' };
    }
  },

  async getUnmatchedQueries(): Promise<ForestUnmatchedQueryRecord[]> {
    try {
      const { data, error } = await supabase
        .from('rh_forest_unmatched_queries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load unmatched Forest queries:', error.message);
        return [];
      }

      return Array.isArray(data)
        ? data.map((row) => mapRowToForestUnmatchedQueryRecord(row as ForestUnmatchedQueryRow))
        : [];
    } catch (error) {
      console.error('Unexpected error loading unmatched Forest queries:', error);
      return [];
    }
  },
};
