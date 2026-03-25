import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import {
  PATH_LABELS,
  readPathResourcesFromStorage,
  writePathResourcesToStorage,
} from '@/lib/pathways';
import { resourceService } from '@/services/resourceService';
import { hasPartnerJourneyBadge } from '@/services/partnerJourneyBadgeService';
import AlignmentKeyButton from '@/components/AlignmentKeyButton';
import type { GrowthResource } from '@/types';
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle,
  Clock,
  Heart,
  Shield,
  Target,
  Zap,
} from 'lucide-react';

type ResourceProgressMap = Record<
  string,
  {
    viewedModuleIds: string[];
    totalModules: number;
    updatedAt: number;
  }
>;

const growthModeTabStorageKey = 'rooted_growth_mode_active_tab';
const growthDetailOriginViewKey = 'rooted_growth_detail_origin_view';
const growthDetailStartResourceKey = 'rooted_growth_detail_start_resource_id';

const loadStoredGrowthResources = (): GrowthResource[] => {
  return readPathResourcesFromStorage('intentional', growthResources);
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Emotional Regulation':
      return <Brain className="w-5 h-5" />;
    case 'Accountability':
      return <Target className="w-5 h-5" />;
    case 'Autonomy':
      return <Heart className="w-5 h-5" />;
    case 'Boundaries':
      return <Shield className="w-5 h-5" />;
    case 'Conflict & Repair':
      return <Zap className="w-5 h-5" />;
    case 'Integrity Check':
      return <CheckCircle className="w-5 h-5" />;
    default:
      return <BookOpen className="w-5 h-5" />;
  }
};

const getPathStatus = (progress: number) => {
  if (progress === 100) return 'completed';
  if (progress > 0) return 'in-progress';
  return 'not-started';
};

const AwarePartnerSection: React.FC = () => {
  const { currentUser, setCurrentView } = useApp();
  const [resources, setResources] = useState<GrowthResource[]>(loadStoredGrowthResources);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [showSelectedResourceLearnMore, setShowSelectedResourceLearnMore] = useState(false);
  const [resourceProgress, setResourceProgress] = useState<ResourceProgressMap>({});
  const progressStorageKey = useMemo(
    () => `rooted_growth_module_progress_${currentUser.id}`,
    [currentUser.id]
  );
  const awareBadgeEarned = hasPartnerJourneyBadge(
    currentUser.partnerJourneyBadges,
    'aware-partner-badge'
  );

  const combinedModeResources = useMemo(() => resources, [resources]);

  useEffect(() => {
    if (combinedModeResources.length === 0) {
      setSelectedResourceId(null);
      setShowSelectedResourceLearnMore(false);
      return;
    }

    const hasSelected = selectedResourceId
      ? combinedModeResources.some((resource) => String(resource.id) === selectedResourceId)
      : false;

    if (!hasSelected) {
      const firstResource = combinedModeResources[0];
      setSelectedResourceId(firstResource?.id ? String(firstResource.id) : null);
      setShowSelectedResourceLearnMore(false);
    }
  }, [combinedModeResources, selectedResourceId]);

  useEffect(() => {
    setShowSelectedResourceLearnMore(false);
  }, [selectedResourceId]);

  const refreshGrowthResources = useCallback(async () => {
    try {
      const supabaseResources = await resourceService.getResources('intentional');
      if (Array.isArray(supabaseResources) && supabaseResources.length > 0) {
        setResources(supabaseResources);
        writePathResourcesToStorage('intentional', supabaseResources);
        return;
      }
    } catch (error) {
      console.error('Failed to load growth resources from Supabase:', error);
    }

    setResources(loadStoredGrowthResources());
  }, []);

  useEffect(() => {
    refreshGrowthResources();
  }, [refreshGrowthResources]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(progressStorageKey);
      if (!saved) {
        setResourceProgress({});
        return;
      }

      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') {
        setResourceProgress({});
        return;
      }

      const normalized: ResourceProgressMap = {};
      Object.entries(parsed as Record<string, unknown>).forEach(([resourceId, value]) => {
        if (!value || typeof value !== 'object') return;

        const progressValue = value as {
          viewedModuleIds?: unknown[];
          totalModules?: unknown;
          updatedAt?: unknown;
        };

        const rawViewedModuleIds = Array.isArray(progressValue.viewedModuleIds)
          ? progressValue.viewedModuleIds
          : [];

        const viewedModuleIds = Array.from(
          new Set(
            rawViewedModuleIds.filter(
              (moduleId): moduleId is string =>
                typeof moduleId === 'string' && moduleId.trim().length > 0
            )
          )
        );

        const totalModulesRaw = Number(progressValue.totalModules);
        const totalModules =
          Number.isFinite(totalModulesRaw) && totalModulesRaw > 0
            ? Math.round(totalModulesRaw)
            : viewedModuleIds.length;

        normalized[resourceId] = {
          viewedModuleIds,
          totalModules,
          updatedAt: Number.isFinite(Number(progressValue.updatedAt))
            ? Number(progressValue.updatedAt)
            : Date.now(),
        };
      });

      setResourceProgress(normalized);
    } catch (error) {
      console.warn('Failed to load growth resource progress:', error);
      setResourceProgress({});
    }
  }, [progressStorageKey]);

  const getResourceProgress = (resource: GrowthResource): number => {
    if (!resource?.id) return 0;
    const resourceId = String(resource.id);

    const saved = resourceProgress[resourceId];
    const moduleIds = Array.isArray(resource.modules)
      ? resource.modules.map((module, index) =>
          typeof module?.id === 'string' && module.id.trim().length > 0
            ? module.id
            : `${resourceId}-module-${index + 1}`
        )
      : [];

    const totalModules = moduleIds.length > 0 ? moduleIds.length : saved?.totalModules || 0;
    if (totalModules <= 0) return 0;

    const viewedSet = new Set<string>(saved?.viewedModuleIds || []);
    const viewedCount =
      moduleIds.length > 0
        ? moduleIds.filter((moduleId) => viewedSet.has(moduleId)).length
        : viewedSet.size;

    const percentage = Math.round((Math.min(viewedCount, totalModules) / totalModules) * 100);
    return Math.max(0, Math.min(100, percentage));
  };

  const selectedResource = useMemo(
    () => combinedModeResources.find((resource) => String(resource.id) === selectedResourceId) ?? null,
    [combinedModeResources, selectedResourceId]
  );

  const handleBack = () => {
    localStorage.setItem(growthModeTabStorageKey, 'resources');
    setCurrentView('growth-mode');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-white">
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Resource Space</span>
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Partner Journey</p>
            <h1 className="font-display text-xl text-[#F6FFF2]">The Aware Partner</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 rounded-2xl border border-[#D9FF3D]/30 bg-[#111611] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Section 1</p>
          <h2 className="mt-2 font-display text-[clamp(30px,4vw,44px)] text-[#F6FFF2]">
            The Aware Partner
          </h2>
          <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-[#A9B5AA]">
            <p>This is where it begins.</p>
            <p>
              The Aware Partner focuses on understanding yourself: your patterns, your communication style,
              your emotional responses, and the experiences that shaped how you show up in relationships.
            </p>
            <p>Before love can grow in a healthy way, awareness has to come first.</p>
            <p>
              Here, you&apos;ll learn to recognize what you need, how you react, and where growth is needed,
              not with judgment, but with honesty.
            </p>
            <p>
              Because you can&apos;t change what you don&apos;t understand...
              <br />
              and awareness is the first step toward becoming a better partner.
            </p>
          </div>
          <div
            className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                awareBadgeEarned
                  ? 'border-emerald-400/30 text-emerald-200'
                  : 'border-[#D9FF3D]/30 text-[#D9FF3D]'
              }`}
            >
              {awareBadgeEarned
                ? 'The Aware Partner Badge earned'
                : 'Complete 1 of the 5 paths to unlock The Aware Partner Badge'}
            </div>

            <AlignmentKeyButton
              title="The Standard & The Shield"
              prompt="Covenant Territory"
              forestMessage={[
                'Before you start, we need to define the destination.',
                "You're not just looking for a date - you're preparing for a Covenant.",
                'In this space, "good enough" is a trap.',
                "Your Shield is not a wall to keep people out. It's a filter - one that allows only those who are aligned and led with intention to come close to what you're building.",
                'Because access is not something you give lightly.',
                'A soul tie is easy to create... but painful to break.',
                "So we set the standard now - so you don't give a permanent place in your life to a temporary feeling.",
                'Hold your line.',
                "Alignment is not just about who you meet... it's about who you allow access to your life.",
              ]}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Forest&apos;s Rule</p>
              <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
                Do not rush past yourself.
                <br />
                Forest is looking for honest reflection, not filler.
                <br />
                Your insight has to connect to what you actually learned.
              </p>
            </div>

            <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">How You Pass This Stage</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#A9B5AA]">
                <li>- Work through a full path until the final module</li>
                <li>- Submit a reflection with real insight, not one-line filler</li>
                <li>- Keep your response tied to the lesson and your relationship patterns</li>
                <li>- Let Forest approve the reflection before moving on</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Badge Unlock</p>
              <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
                Finish one path and get Forest&apos;s approval on the final reflection to unlock that
                path badge. The same approval also unlocks The Aware Partner Badge for your profile.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-[#D9FF3D]/20 bg-[#D9FF3D]/5 px-4 py-3 text-sm text-[#F6FFF2]">
          {PATH_LABELS.intentional} resources stay tied to the assessment-fail path.
        </div>

        <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
          <div className="rounded-2xl border border-[#1A211A] bg-[#111611] p-3 h-fit">
            <p className="text-xs uppercase tracking-wide text-[#A9B5AA] px-2 pb-2">Path Navigation</p>
            <div className="space-y-2">
              {combinedModeResources.map((resource) => {
                const progress = getResourceProgress(resource);
                const status = getPathStatus(progress);
                const resourceId = String(resource.id);
                const isSelected = selectedResourceId === resourceId;
                const isCompleted = progress === 100;

                return (
                  <button
                    key={resource.id}
                    onClick={() => setSelectedResourceId(resourceId)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                      isSelected
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10'
                        : 'border-[#1A211A] bg-[#0B0F0C] hover:border-[#2E372E]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          status === 'completed'
                            ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]'
                            : status === 'in-progress'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-[#1A211A] text-[#A9B5AA]'
                        }`}
                      >
                        {getCategoryIcon(resource.category)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#F6FFF2] truncate">{resource.title}</p>
                        <p className="text-xs text-[#A9B5AA] mt-1">
                          {isCompleted ? 'Completed' : progress > 0 ? `${progress}% complete` : 'Not started'}
                        </p>
                      </div>
                      {isCompleted && (
                        <CheckCircle className="w-4 h-4 text-[#D9FF3D] flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1A211A] bg-[#111611] p-5 md:p-6">
            {selectedResource ? (
              (() => {
                const progress = getResourceProgress(selectedResource);
                const status = getPathStatus(progress);
                const isCompleted = progress === 100;
                const totalModules = Array.isArray(selectedResource.modules)
                  ? selectedResource.modules.length
                  : 0;

                return (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            status === 'completed'
                              ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]'
                              : status === 'in-progress'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-[#1A211A] text-[#A9B5AA]'
                          }`}
                        >
                          {getCategoryIcon(selectedResource.category)}
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-[#F6FFF2]">{selectedResource.title}</h4>
                          {!showSelectedResourceLearnMore ? (
                            <p className="text-sm text-[#A9B5AA] mt-1">{selectedResource.description}</p>
                          ) : (
                            <div className="mt-2 space-y-3">
                              {Array.isArray(selectedResource.learningOutcomes) &&
                                selectedResource.learningOutcomes.length > 0 && (
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1.5">
                                      Strengths
                                    </p>
                                    <ul className="space-y-1.5">
                                      {selectedResource.learningOutcomes.map((outcome: string, index: number) => (
                                        <li
                                          key={`${selectedResource.id}-strength-${index}`}
                                          className="text-sm text-[#F6FFF2]"
                                        >
                                          - {outcome}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              {selectedResource.areasToBeMindfulOf && (
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1.5">
                                    Areas to Be Mindful Of
                                  </p>
                                  <p className="text-sm text-[#F6FFF2] whitespace-pre-wrap">
                                    {selectedResource.areasToBeMindfulOf}
                                  </p>
                                </div>
                              )}
                              {(!selectedResource.learningOutcomes ||
                                selectedResource.learningOutcomes.length === 0) &&
                                !selectedResource.areasToBeMindfulOf && (
                                  <p className="text-sm text-[#A9B5AA]">
                                    No additional path details added yet.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                      {!showSelectedResourceLearnMore && (
                        <span className="px-2.5 py-1 rounded-full text-xs border border-[#2A312A] text-[#A9B5AA]">
                          {selectedResource.category}
                        </span>
                      )}
                    </div>

                    {!showSelectedResourceLearnMore && (
                      <>
                        <div>
                          <div className="h-2 bg-[#0B0F0C] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                status === 'completed'
                                  ? 'bg-[#D9FF3D]'
                                  : status === 'in-progress'
                                    ? 'bg-amber-500'
                                    : 'bg-[#A9B5AA]'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-[#A9B5AA] mt-2">
                            {isCompleted ? 'Completed' : progress > 0 ? `${progress}% complete` : 'Not started'}
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 text-xs text-[#A9B5AA]">
                          <p className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            Estimated time: {selectedResource.estimatedTime}
                          </p>
                          <p>{totalModules} modules in this path</p>
                        </div>
                      </>
                    )}

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => {
                          localStorage.setItem(growthDetailOriginViewKey, 'aware-partner');
                          localStorage.setItem(
                            growthDetailStartResourceKey,
                            String(selectedResource.id)
                          );
                          setCurrentView('growth-detail');
                        }}
                        className="px-4 py-2 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-medium hover:brightness-95 transition"
                      >
                        Start
                      </button>
                      <button
                        onClick={() => setShowSelectedResourceLearnMore((previous) => !previous)}
                        className="px-4 py-2 rounded-lg border border-[#1A211A] text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition"
                      >
                        {showSelectedResourceLearnMore ? 'Show Less' : 'Learn More'}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-[#A9B5AA]">No growth resources are available right now.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AwarePartnerSection;
