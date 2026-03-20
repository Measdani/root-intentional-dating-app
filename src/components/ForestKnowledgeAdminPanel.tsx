import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  forestKnowledgeAdminService,
  type ForestKnowledgeRecord,
  type ForestUnmatchedQueryRecord,
  type ForestKnowledgeUpsertInput,
} from '@/services/forestKnowledgeAdminService';

const createEmptyForestEntry = (): ForestKnowledgeUpsertInput => ({
  slug: '',
  category: '',
  topic: '',
  content: '',
  actionText: '',
  keywords: [],
  starterLabel: '',
  starterPrompt: '',
  displayOrder: 0,
  isActive: true,
});

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

type ForestUnmatchedQueryGroup = {
  normalizedQuery: string;
  latestQuery: string;
  totalCount: number;
  lastSeenAt?: string;
  pageContexts: string[];
  tokenSnapshot: string[];
  topTopics: string[];
};

const formatTimestamp = (value?: string): string => {
  if (!value) return 'Unknown';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';

  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const ForestKnowledgeAdminPanel: React.FC = () => {
  const [entries, setEntries] = useState<ForestKnowledgeRecord[]>([]);
  const [unmatchedQueries, setUnmatchedQueries] = useState<ForestUnmatchedQueryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ForestKnowledgeRecord | null>(null);
  const [formData, setFormData] = useState<ForestKnowledgeUpsertInput>(createEmptyForestEntry);
  const [keywordsInput, setKeywordsInput] = useState('');

  const activeCount = useMemo(() => entries.filter((entry) => entry.isActive).length, [entries]);
  const unmatchedGroups = useMemo<ForestUnmatchedQueryGroup[]>(() => {
    const grouped = new Map<string, ForestUnmatchedQueryGroup>();

    unmatchedQueries.forEach((query) => {
      const key = query.normalizedQuery || query.queryText.trim().toLowerCase();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          normalizedQuery: key,
          latestQuery: query.queryText,
          totalCount: 1,
          lastSeenAt: query.createdAt,
          pageContexts: query.pageContext ? [query.pageContext] : [],
          tokenSnapshot: query.tokenSnapshot.slice(0, 8),
          topTopics: query.topTopics.slice(0, 3),
        });
        return;
      }

      existing.totalCount += 1;

      const existingTime = existing.lastSeenAt ? new Date(existing.lastSeenAt).getTime() : 0;
      const queryTime = query.createdAt ? new Date(query.createdAt).getTime() : 0;
      if (queryTime >= existingTime) {
        existing.latestQuery = query.queryText;
        existing.lastSeenAt = query.createdAt;
      }

      if (query.pageContext && !existing.pageContexts.includes(query.pageContext)) {
        existing.pageContexts = [...existing.pageContexts, query.pageContext].slice(0, 4);
      }

      query.tokenSnapshot.forEach((token) => {
        if (!existing.tokenSnapshot.includes(token) && existing.tokenSnapshot.length < 8) {
          existing.tokenSnapshot.push(token);
        }
      });

      query.topTopics.forEach((topic) => {
        if (!existing.topTopics.includes(topic) && existing.topTopics.length < 4) {
          existing.topTopics.push(topic);
        }
      });
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.totalCount !== b.totalCount) return b.totalCount - a.totalCount;

      const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [unmatchedQueries]);

  const loadEntries = async () => {
    setIsLoading(true);
    const [nextEntries, nextUnmatchedQueries] = await Promise.all([
      forestKnowledgeAdminService.getAll(),
      forestKnowledgeAdminService.getUnmatchedQueries(),
    ]);
    setEntries(nextEntries);
    setUnmatchedQueries(nextUnmatchedQueries);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const openCreateForm = () => {
    setSelectedEntry(null);
    setFormData(createEmptyForestEntry());
    setKeywordsInput('');
    setShowForm(true);
  };

  const openEditForm = (entry: ForestKnowledgeRecord) => {
    setSelectedEntry(entry);
    setFormData({
      slug: entry.slug,
      category: entry.category,
      topic: entry.topic,
      content: entry.content,
      actionText: entry.actionText,
      keywords: entry.keywords,
      starterLabel: entry.starterLabel,
      starterPrompt: entry.starterPrompt,
      displayOrder: entry.displayOrder,
      isActive: entry.isActive,
    });
    setKeywordsInput(entry.keywords.join(', '));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setFormData(createEmptyForestEntry());
    setKeywordsInput('');
  };

  const handleSave = async () => {
    const topic = formData.topic.trim();
    const category = formData.category.trim();
    const content = formData.content.trim();
    const slug = (formData.slug.trim() || slugify(topic)).trim();
    const keywords = keywordsInput
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    if (!topic || !category || !content) {
      toast.error('Category, topic, and content are required.');
      return;
    }

    if (!slug) {
      toast.error('A valid slug is required.');
      return;
    }

    const payload: ForestKnowledgeUpsertInput = {
      ...formData,
      slug,
      category,
      topic,
      content,
      actionText: formData.actionText.trim(),
      starterLabel: formData.starterLabel.trim(),
      starterPrompt: formData.starterPrompt.trim(),
      keywords,
      displayOrder: Number.isFinite(formData.displayOrder) ? formData.displayOrder : 0,
    };

    const result = selectedEntry
      ? await forestKnowledgeAdminService.update(selectedEntry.id, payload)
      : await forestKnowledgeAdminService.create(payload);

    if (result.error || !result.data) {
      toast.error(`Forest save failed: ${result.error || 'Unknown error'}`);
      return;
    }

    setEntries((previous) => {
      const nextEntries = selectedEntry
        ? previous.map((entry) => (entry.id === selectedEntry.id ? result.data! : entry))
        : [result.data!, ...previous];

      return [...nextEntries].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.topic.localeCompare(b.topic);
      });
    });

    toast.success(
      selectedEntry
        ? 'Forest knowledge updated in public.rh_forest_knowledge.'
        : 'Forest knowledge saved to public.rh_forest_knowledge.',
    );
    closeForm();
  };

  const handleDelete = async (entry: ForestKnowledgeRecord) => {
    if (!window.confirm(`Delete "${entry.topic}" from public.rh_forest_knowledge?`)) return;

    const result = await forestKnowledgeAdminService.remove(entry.id);
    if (result.error) {
      toast.error(`Forest delete failed: ${result.error}`);
      return;
    }

    setEntries((previous) => previous.filter((item) => item.id !== entry.id));
    toast.success('Forest knowledge entry deleted.');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-display font-bold text-[#F6FFF2]">
            Forest Knowledge ({entries.length})
          </h3>
          <p className="text-sm text-[#A9B5AA]">
            This panel writes directly to `public.rh_forest_knowledge`. Active entries: {activeCount}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => void loadEntries()}
            variant="outline"
            className="border-[#2A312A] bg-[#111611] text-[#F6FFF2] hover:bg-[#1A211A]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Table
          </Button>
          <Button
            onClick={openCreateForm}
            className="bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#C4E622]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Forest Entry
          </Button>
        </div>
      </div>

      <Card className="border-[#1A211A] bg-[#111611] p-4">
        <p className="text-sm text-[#F6FFF2]">
          Use this tab for Forest-only doctrine and spiritual framing. Resource Area modules still
          belong in the resource editor, and long teaching content still belongs in blogs.
        </p>
      </Card>

      <Card className="border-[#1A211A] bg-[#111611] p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-[#F6FFF2]">
              Unmatched Forest Questions ({unmatchedGroups.length} unique / {unmatchedQueries.length} total)
            </h4>
            <p className="text-sm text-[#A9B5AA]">
              These are prompts Forest could not match strongly enough to answer. Use them to spot
              missing keywords, new doctrine needs, or Resource Area gaps.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 text-sm text-[#A9B5AA]">
              Loading unmatched Forest questions...
            </div>
          ) : unmatchedGroups.length === 0 ? (
            <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4 text-sm text-[#A9B5AA]">
              No unmatched Forest questions have been logged yet.
            </div>
          ) : (
            unmatchedGroups.slice(0, 12).map((group) => (
              <div
                key={group.normalizedQuery}
                className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-[#F6FFF2]">{group.latestQuery}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[#A9B5AA]">
                      Last seen {formatTimestamp(group.lastSeenAt)}
                    </p>
                    <p className="mt-2 text-sm text-[#A9B5AA]">
                      Search key: <span className="text-[#F6FFF2]">{group.normalizedQuery}</span>
                    </p>
                  </div>
                  <Badge className="w-fit border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 text-[#D9FF3D]">
                    {group.totalCount} miss{group.totalCount === 1 ? '' : 'es'}
                  </Badge>
                </div>

                {group.pageContexts.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.pageContexts.map((pageContext) => (
                      <Badge
                        key={`${group.normalizedQuery}-${pageContext}`}
                        className="border border-[#2A312A] bg-[#111611] text-[#A9B5AA]"
                      >
                        {pageContext}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {group.tokenSnapshot.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.tokenSnapshot.map((token) => (
                      <Badge
                        key={`${group.normalizedQuery}-${token}`}
                        className="border border-[#2A312A] bg-[#111611] text-[#A9B5AA]"
                      >
                        {token}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {group.topTopics.length > 0 ? (
                  <p className="mt-3 text-sm text-[#A9B5AA]">
                    Closest topics seen before fallback:{' '}
                    <span className="text-[#F6FFF2]">{group.topTopics.join(', ')}</span>
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="border-[#1A211A] bg-[#111611] p-6 text-sm text-[#A9B5AA]">
            Loading Forest knowledge from `public.rh_forest_knowledge`...
          </Card>
        ) : entries.length === 0 ? (
          <Card className="border-[#1A211A] bg-[#111611] p-6 text-sm text-[#A9B5AA]">
            No Forest entries found in `public.rh_forest_knowledge` yet.
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} className="border-[#1A211A] bg-[#111611] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <BookOpen className="h-5 w-5 text-[#D9FF3D]" />
                    <h4 className="text-lg font-semibold text-[#F6FFF2]">{entry.topic}</h4>
                    <Badge className="border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 text-[#D9FF3D]">
                      {entry.category}
                    </Badge>
                    <Badge
                      className={
                        entry.isActive
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border border-[#2A312A] bg-[#0B0F0C] text-[#A9B5AA]'
                      }
                    >
                      {entry.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge className="border border-[#2A312A] bg-[#0B0F0C] text-[#A9B5AA]">
                      Order {entry.displayOrder}
                    </Badge>
                  </div>
                  <p className="mb-3 text-sm text-[#A9B5AA]">Slug: {entry.slug}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#F6FFF2]">
                    {entry.content}
                  </p>
                  {entry.actionText ? (
                    <p className="mt-3 text-sm text-[#D9FF3D]">Action: {entry.actionText}</p>
                  ) : null}
                  {entry.keywords.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.keywords.map((keyword) => (
                        <Badge
                          key={`${entry.id}-${keyword}`}
                          className="border border-[#2A312A] bg-[#0B0F0C] text-[#A9B5AA]"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {entry.starterLabel || entry.starterPrompt ? (
                    <div className="mt-4 rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-3">
                      <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Starter Prompt</p>
                      <p className="mt-2 text-sm text-[#F6FFF2]">
                        {entry.starterLabel || 'Unnamed'}: {entry.starterPrompt || 'No prompt text'}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditForm(entry)}
                    className="text-[#D9FF3D]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(entry)}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={closeForm} />
          <Card className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-[#1A211A] bg-[#111611] p-8">
            <button
              type="button"
              onClick={closeForm}
              className="absolute right-4 top-4 rounded-full bg-[#1A211A] p-2 text-[#A9B5AA] hover:text-[#F6FFF2]"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="mb-6 font-display text-2xl text-[#F6FFF2]">
              {selectedEntry ? 'Edit Forest Entry' : 'Create Forest Entry'}
            </h2>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Category *</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, category: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                    placeholder="Layer 2: The Detox"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Topic *</label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        topic: event.target.value,
                        slug:
                          selectedEntry || previous.slug.trim().length > 0
                            ? previous.slug
                            : slugify(event.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                    placeholder="Gaslighting and Reality Distortion"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Slug *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, slug: slugify(event.target.value) }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                    placeholder="gaslighting-and-reality-distortion"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Display Order</label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(event) =>
                      setFormData((previous) => ({
                        ...previous,
                        displayOrder: Number(event.target.value) || 0,
                      }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, content: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                  rows={6}
                  placeholder="Core Forest teaching for this topic..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Action Text</label>
                <textarea
                  value={formData.actionText}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, actionText: event.target.value }))
                  }
                  className="w-full resize-none rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                  rows={3}
                  placeholder="Optional closing instruction Forest should give..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Keywords</label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(event) => setKeywordsInput(event.target.value)}
                  className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                  placeholder="gaslighting, manipulation, confusion, control"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Starter Label</label>
                  <input
                    type="text"
                    value={formData.starterLabel}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, starterLabel: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                    placeholder="Gaslighting"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F6FFF2]">Starter Prompt</label>
                  <input
                    type="text"
                    value={formData.starterPrompt}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, starterPrompt: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[#1A211A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                    placeholder="How do I recognize gaslighting early?"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(event) =>
                    setFormData((previous) => ({ ...previous, isActive: event.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <label className="text-sm text-[#F6FFF2]">Active entry</label>
              </div>

              <div className="flex gap-3 border-t border-[#1A211A] pt-4">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  className="flex-1 rounded-xl bg-[#D9FF3D] py-3 font-medium text-[#0B0F0C] transition-transform hover:scale-[1.02]"
                >
                  {selectedEntry ? 'Update Entry' : 'Create Entry'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl bg-[#1A211A] py-3 font-medium text-[#A9B5AA] transition-colors hover:text-[#F6FFF2]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default ForestKnowledgeAdminPanel;
