import { supabase } from '@/lib/supabase';
import { sampleBlogs } from '@/data/blogs';
import { growthModuleContent } from '@/data/growthModuleContent';
import {
  FOREST_KNOWLEDGE_BASE,
  FOREST_STARTER_PROMPTS,
  type ForestKnowledgeEntry,
  type ForestStarterPrompt,
} from '@/data/forestKnowledgeBase';
import { resourceService } from '@/services/resourceService';
import type { BlogArticle, GrowthResource, GrowthResourceModule } from '@/types';

type ForestKnowledgeRow = {
  category: string | null;
  topic: string | null;
  content: string | null;
  keywords: string[] | null;
  action_text: string | null;
  starter_label: string | null;
  starter_prompt: string | null;
  display_order: number | null;
};

type BlogRow = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  category: string;
  author: string | null;
  published: boolean;
  module_only: boolean | null;
};

let knowledgeCache: ForestKnowledgeEntry[] | null = null;
let knowledgeRequest: Promise<ForestKnowledgeEntry[]> | null = null;
let knowledgeCacheFetchedAt = 0;

const FOREST_KNOWLEDGE_CACHE_TTL_MS = 30_000;

export const invalidateForestKnowledgeCache = (): void => {
  knowledgeCache = null;
  knowledgeRequest = null;
  knowledgeCacheFetchedAt = 0;
};

const orderModules = (modules: GrowthResourceModule[] | undefined): GrowthResourceModule[] => {
  if (!Array.isArray(modules)) return [];

  return [...modules].sort((a, b) => {
    const aOrder = Number.isFinite(a.orderIndex) ? a.orderIndex : Number.MAX_SAFE_INTEGER;
    const bOrder = Number.isFinite(b.orderIndex) ? b.orderIndex : Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.title || '').localeCompare(b.title || '');
  });
};

const buildResourceSummary = (resource: GrowthResource): string =>
  [
    resource.description,
    Array.isArray(resource.learningOutcomes) && resource.learningOutcomes.length > 0
      ? `Learning outcomes: ${resource.learningOutcomes.join('; ')}.`
      : null,
    resource.areasToBeMindfulOf ? `Be mindful of: ${resource.areasToBeMindfulOf}.` : null,
    resource.closingReflection ? `Closing reflection: ${resource.closingReflection}.` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');

const buildResourceSearchText = (resource: GrowthResource): string =>
  [
    resource.title,
    resource.category,
    resource.description,
    resource.estimatedTime,
    resource.learningOutcomes?.join(' '),
    resource.areasToBeMindfulOf,
    resource.closingReflection,
    orderModules(resource.modules)
      .map((module) => [module.title, module.description, module.exercise].filter(Boolean).join(' '))
      .join(' '),
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');

const buildResourceKnowledgeEntries = (
  resources: GrowthResource[],
  resourceAreaLabel: 'The Intentional Path Resource Area' | 'The Alignment Path Resource Area',
): ForestKnowledgeEntry[] =>
  resources.flatMap((resource) => {
    const resourceEntry: ForestKnowledgeEntry = {
      category: `${resourceAreaLabel}: ${resource.category}`,
      topic: resource.title,
      content: buildResourceSummary(resource),
      searchText: buildResourceSearchText(resource),
      keywords: [resource.title, resource.category, ...(resource.learningOutcomes ?? [])].filter(Boolean),
      actionText: `Return to ${resource.title} in the Resource Area and work the next module with this question in view.`,
    };

    const moduleEntries = orderModules(resource.modules).map((module) => {
      const sharedModuleContent = growthModuleContent[module.id];

      return {
        category: `${resourceAreaLabel}: ${resource.title}`,
        topic: module.title,
        content: [
          module.description,
          sharedModuleContent ? sharedModuleContent.keyPoints.slice(0, 2).join(' ') : null,
          module.exercise ? `Practice: ${module.exercise}` : null,
        ]
          .filter((part): part is string => Boolean(part))
          .join(' '),
        searchText: [
          resource.title,
          resource.category,
          module.title,
          module.description,
          module.exercise,
          sharedModuleContent?.keyPoints.join(' '),
          sharedModuleContent?.exercise.join(' '),
        ]
          .filter((part): part is string => Boolean(part))
          .join(' '),
        keywords: [resource.title, resource.category, module.title].filter(Boolean),
        actionText: `Go back to ${resource.title} and complete ${module.title} before making your next move in this connection.`,
      };
    });

    return [resourceEntry, ...moduleEntries];
  });

const mapBlogRowToBlog = (row: BlogRow): BlogArticle => ({
  id: row.id,
  title: row.title,
  content: row.content,
  excerpt: row.excerpt,
  category: row.category,
  author: row.author ?? undefined,
  readTime: undefined,
  published: row.published,
  moduleOnly: Boolean(row.module_only),
  createdAt: 0,
  updatedAt: 0,
});

const buildBlogKnowledgeEntries = (blogs: BlogArticle[]): ForestKnowledgeEntry[] =>
  blogs
    .filter((blog) => blog.published)
    .map((blog) => ({
      category: blog.moduleOnly ? 'Resource Area Blog' : 'Rooted Insights Blog',
      topic: blog.title,
      content: blog.excerpt || blog.content,
      searchText: [blog.title, blog.category, blog.excerpt, blog.content, blog.author].filter(Boolean).join(' '),
      keywords: [blog.title, blog.category, blog.author ?? ''].filter(Boolean),
      actionText: `Revisit "${blog.title}" and pull out the one truth or boundary this situation is exposing.`,
    }));

const getPublishedBlogs = async (): Promise<BlogArticle[]> => {
  const { data, error } = await supabase
    .from('blogs')
    .select('id, title, content, excerpt, category, author, published, module_only')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Failed to fetch Forest blog knowledge from Supabase:', error.message);
    return sampleBlogs.filter((blog) => blog.published);
  }

  return Array.isArray(data) && data.length > 0
    ? data.map((row) => mapBlogRowToBlog(row as BlogRow))
    : sampleBlogs.filter((blog) => blog.published);
};

const normalizeForestKnowledgeRow = (row: ForestKnowledgeRow): ForestKnowledgeEntry | null => {
  if (
    typeof row.category !== 'string' ||
    typeof row.topic !== 'string' ||
    typeof row.content !== 'string' ||
    !row.category.trim() ||
    !row.topic.trim() ||
    !row.content.trim()
  ) {
    return null;
  }

  return {
    category: row.category.trim(),
    topic: row.topic.trim(),
    content: row.content.trim(),
    keywords: Array.isArray(row.keywords)
      ? row.keywords.filter((keyword): keyword is string => typeof keyword === 'string' && keyword.trim().length > 0)
      : [],
    actionText: typeof row.action_text === 'string' && row.action_text.trim().length > 0 ? row.action_text.trim() : undefined,
    starterLabel:
      typeof row.starter_label === 'string' && row.starter_label.trim().length > 0
        ? row.starter_label.trim()
        : undefined,
    starterPrompt:
      typeof row.starter_prompt === 'string' && row.starter_prompt.trim().length > 0
        ? row.starter_prompt.trim()
        : undefined,
    displayOrder: typeof row.display_order === 'number' ? row.display_order : undefined,
  };
};

export const getForestKnowledgeBase = async (): Promise<ForestKnowledgeEntry[]> => {
  if (knowledgeCache && Date.now() - knowledgeCacheFetchedAt < FOREST_KNOWLEDGE_CACHE_TTL_MS) {
    return knowledgeCache;
  }

  if (knowledgeRequest) return knowledgeRequest;

  knowledgeRequest = (async () => {
    const [
      { data, error },
      intentionalResources,
      alignmentResources,
      publishedBlogs,
    ] = await Promise.all([
      supabase
        .from('rh_forest_knowledge')
        .select('category, topic, content, keywords, action_text, starter_label, starter_prompt, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('topic', { ascending: true }),
      resourceService.getResources('intentional'),
      resourceService.getResources('alignment'),
      getPublishedBlogs(),
    ]);

    if (error) {
      console.warn('Failed to fetch Forest doctrine from Supabase:', error.message);
    }

    const doctrineEntries = (data ?? [])
      .map((row) => normalizeForestKnowledgeRow(row as ForestKnowledgeRow))
      .filter((entry): entry is ForestKnowledgeEntry => Boolean(entry));

    const intentionalResourceEntries = buildResourceKnowledgeEntries(
      intentionalResources,
      'The Intentional Path Resource Area',
    );
    const alignmentResourceEntries = buildResourceKnowledgeEntries(
      alignmentResources,
      'The Alignment Path Resource Area',
    );
    const blogKnowledgeEntries = buildBlogKnowledgeEntries(publishedBlogs);

    knowledgeCache = [
      ...(doctrineEntries.length > 0 ? doctrineEntries : FOREST_KNOWLEDGE_BASE),
      ...intentionalResourceEntries,
      ...alignmentResourceEntries,
      ...blogKnowledgeEntries,
    ];
    knowledgeCacheFetchedAt = Date.now();

    if (knowledgeCache.length === 0) {
      knowledgeCache = FOREST_KNOWLEDGE_BASE;
      knowledgeCacheFetchedAt = Date.now();
    }

    return knowledgeCache;
  })().finally(() => {
    knowledgeRequest = null;
  });

  return knowledgeRequest;
};

export const getForestStarterPrompts = async (): Promise<ForestStarterPrompt[]> => {
  const knowledgeBase = await getForestKnowledgeBase();
  const prompts = knowledgeBase
    .filter(
      (entry): entry is ForestKnowledgeEntry & { starterLabel: string; starterPrompt: string } =>
        typeof entry.starterLabel === 'string' &&
        entry.starterLabel.length > 0 &&
        typeof entry.starterPrompt === 'string' &&
        entry.starterPrompt.length > 0,
    )
    .map((entry) => ({
      label: entry.starterLabel,
      question: entry.starterPrompt,
    }));

  return prompts.length > 0 ? prompts : FOREST_STARTER_PROMPTS;
};
