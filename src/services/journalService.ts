import { supabase } from '@/lib/supabase';

export interface JournalEntry {
  id: string;
  user_id: string;
  section_key: 'notes' | 'boundaries' | 'needs' | 'non-negotiables' | 'triggers' | 'connections';
  related_user_id?: string;
  title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const JOURNAL_STORAGE_KEY = 'rooted_clarity_entries_v1';

const SECTION_KEYS: JournalEntry['section_key'][] = [
  'notes',
  'boundaries',
  'needs',
  'non-negotiables',
  'triggers',
  'connections',
];

const isSectionKey = (value: unknown): value is JournalEntry['section_key'] =>
  typeof value === 'string' && SECTION_KEYS.includes(value as JournalEntry['section_key']);

const readCurrentLocalUserId = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem('currentUser');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { id?: unknown };
    return typeof parsed.id === 'string' && parsed.id.trim().length > 0 ? parsed.id : null;
  } catch (error) {
    console.warn('Failed to read Clarity Room current user:', error);
    return null;
  }
};

const normalizeEntry = (entry: Partial<JournalEntry>): JournalEntry | null => {
  if (
    typeof entry.id !== 'string' ||
    typeof entry.user_id !== 'string' ||
    !isSectionKey(entry.section_key) ||
    typeof entry.content !== 'string' ||
    typeof entry.created_at !== 'string' ||
    typeof entry.updated_at !== 'string'
  ) {
    return null;
  }

  return {
    id: entry.id,
    user_id: entry.user_id,
    section_key: entry.section_key,
    related_user_id:
      typeof entry.related_user_id === 'string' && entry.related_user_id.trim().length > 0
        ? entry.related_user_id
        : undefined,
    title: typeof entry.title === 'string' ? entry.title : undefined,
    content: entry.content,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
};

const readLocalJournalMap = (): Record<string, JournalEntry[]> => {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce<Record<string, JournalEntry[]>>((acc, [userId, value]) => {
      if (!Array.isArray(value)) return acc;

      const normalizedEntries = value
        .map((entry) => normalizeEntry(entry as Partial<JournalEntry>))
        .filter((entry): entry is JournalEntry => entry !== null);

      if (normalizedEntries.length > 0) {
        acc[userId] = normalizedEntries;
      }

      return acc;
    }, {});
  } catch (error) {
    console.warn('Failed to read Clarity Room entries:', error);
    return {};
  }
};

const writeLocalJournalMap = (map: Record<string, JournalEntry[]>) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Failed to save Clarity Room entries:', error);
  }
};

const getLocalEntriesForUser = (userId: string): JournalEntry[] => readLocalJournalMap()[userId] ?? [];

const setLocalEntriesForUser = (userId: string, entries: JournalEntry[]) => {
  const map = readLocalJournalMap();
  if (entries.length === 0) {
    delete map[userId];
  } else {
    map[userId] = entries;
  }
  writeLocalJournalMap(map);
};

const upsertLocalEntry = (entry: JournalEntry) => {
  const existingEntries = getLocalEntriesForUser(entry.user_id);
  const nextEntries = existingEntries.filter((existing) => existing.id !== entry.id);
  nextEntries.unshift(entry);
  nextEntries.sort((first, second) => second.created_at.localeCompare(first.created_at));
  setLocalEntriesForUser(entry.user_id, nextEntries);
};

const removeLocalEntry = (userId: string, entryId: string) => {
  const existingEntries = getLocalEntriesForUser(userId);
  setLocalEntriesForUser(
    userId,
    existingEntries.filter((entry) => entry.id !== entryId)
  );
};

const resolveJournalContext = async (): Promise<{ authUserId: string | null; storageUserId: string | null }> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return {
      authUserId: user?.id ?? null,
      storageUserId: user?.id ?? readCurrentLocalUserId(),
    };
  } catch (error) {
    console.warn('Failed to resolve Clarity Room auth user:', error);
    return {
      authUserId: null,
      storageUserId: readCurrentLocalUserId(),
    };
  }
};

const mergeEntries = (remoteEntries: JournalEntry[], localEntries: JournalEntry[]): JournalEntry[] =>
  Array.from(
    new Map(
      [...remoteEntries, ...localEntries]
        .map((entry) => [entry.id, entry] as const)
    ).values()
  ).sort((first, second) => second.created_at.localeCompare(first.created_at));

const buildLocalEntry = (
  userId: string,
  sectionKey: JournalEntry['section_key'],
  content: string,
  title?: string,
  relatedUserId?: string,
  existingEntry?: JournalEntry
): JournalEntry => {
  const now = new Date().toISOString();

  return {
    id:
      existingEntry?.id ??
      `local_journal_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
    user_id: userId,
    section_key: sectionKey,
    related_user_id: relatedUserId || undefined,
    title,
    content,
    created_at: existingEntry?.created_at ?? now,
    updated_at: now,
  };
};

export const journalService = {
  async getEntriesBySection(sectionKey: JournalEntry['section_key']): Promise<JournalEntry[]> {
    const { authUserId, storageUserId } = await resolveJournalContext();
    if (!storageUserId) return [];

    const localEntries = getLocalEntriesForUser(storageUserId).filter(
      (entry) => entry.section_key === sectionKey
    );

    if (!authUserId) {
      return localEntries;
    }

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', authUserId)
        .eq('section_key', sectionKey)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch journal entries:', error);
        return localEntries;
      }

      const remoteEntries = (data || []).map((entry) => normalizeEntry(entry)).filter(
        (entry): entry is JournalEntry => entry !== null
      );
      const mergedEntries = mergeEntries(remoteEntries, localEntries);
      setLocalEntriesForUser(storageUserId, mergeEntries(getLocalEntriesForUser(storageUserId), remoteEntries));
      return mergedEntries.filter((entry) => entry.section_key === sectionKey);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return localEntries;
    }
  },

  async createEntry(
    sectionKey: JournalEntry['section_key'],
    content: string,
    title?: string,
    relatedUserId?: string
  ): Promise<JournalEntry | null> {
    const trimmedContent = content.trim();
    if (!trimmedContent) return null;

    const { authUserId, storageUserId } = await resolveJournalContext();
    const resolvedUserId = storageUserId ?? authUserId;
    if (!resolvedUserId) {
      console.error('No user available for Clarity Room save');
      return null;
    }

    if (authUserId) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert({
            user_id: authUserId,
            section_key: sectionKey,
            title,
            content: trimmedContent,
            related_user_id: relatedUserId || null,
          })
          .select()
          .single();

        if (!error) {
          const normalized = normalizeEntry(data);
          if (normalized) {
            upsertLocalEntry(normalized);
            return normalized;
          }
        }

        if (error) {
          console.error('Failed to create entry:', error);
        }
      } catch (error) {
        console.error('Error creating entry:', error);
      }
    }

    const localEntry = buildLocalEntry(
      resolvedUserId,
      sectionKey,
      trimmedContent,
      title,
      relatedUserId
    );
    upsertLocalEntry(localEntry);
    return localEntry;
  },

  async updateEntry(
    entryId: string,
    content: string,
    title?: string,
    relatedUserId?: string
  ): Promise<JournalEntry | null> {
    const trimmedContent = content.trim();
    if (!trimmedContent) return null;

    const { authUserId, storageUserId } = await resolveJournalContext();
    if (!storageUserId && !authUserId) return null;

    const existingLocalEntries = storageUserId ? getLocalEntriesForUser(storageUserId) : [];
    const existingLocalEntry = existingLocalEntries.find((entry) => entry.id === entryId);

    if (authUserId && !entryId.startsWith('local_journal_')) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .update({
            content: trimmedContent,
            title,
            related_user_id: relatedUserId || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entryId)
          .eq('user_id', authUserId)
          .select()
          .single();

        if (!error) {
          const normalized = normalizeEntry(data);
          if (normalized) {
            upsertLocalEntry(normalized);
            return normalized;
          }
        }

        if (error) {
          console.error('Failed to update entry:', error);
        }
      } catch (error) {
        console.error('Error updating entry:', error);
      }
    }

    if (!storageUserId || !existingLocalEntry) return null;

    const fallbackEntry = buildLocalEntry(
      storageUserId,
      existingLocalEntry.section_key,
      trimmedContent,
      title,
      relatedUserId,
      existingLocalEntry
    );
    upsertLocalEntry(fallbackEntry);
    return fallbackEntry;
  },

  async deleteEntry(entryId: string): Promise<boolean> {
    const { authUserId, storageUserId } = await resolveJournalContext();
    if (!storageUserId && !authUserId) return false;

    if (authUserId && !entryId.startsWith('local_journal_')) {
      try {
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', entryId)
          .eq('user_id', authUserId);

        if (error) {
          console.error('Failed to delete entry:', error);
        } else if (storageUserId) {
          removeLocalEntry(storageUserId, entryId);
          return true;
        }
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }

    if (!storageUserId) return false;

    removeLocalEntry(storageUserId, entryId);
    return true;
  },
};
