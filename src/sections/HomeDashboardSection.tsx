import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Settings } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { resourceService } from '@/services/resourceService';
import type { GrowthResource } from '@/types';

const PROGRESS_KEY_PREFIX = 'rooted_growth_module_progress_';
const START_RESOURCE_KEY = 'rooted_growth_detail_start_resource_id';

interface ResourceProgress {
  viewedModuleIds: string[];
  totalModules: number;
  updatedAt: number;
}

interface LastResourceInfo {
  resourceId: string;
  title: string;
  completedCount: number;
  totalModules: number;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const HomeDashboardSection: React.FC = () => {
  const { currentUser, setCurrentView } = useApp();
  const [lastResource, setLastResource] = useState<LastResourceInfo | null>(null);

  useEffect(() => {
    const loadLastResource = async () => {
      if (!currentUser?.id) return;
      try {
        const raw = localStorage.getItem(`${PROGRESS_KEY_PREFIX}${currentUser.id}`);
        const progressMap = raw ? JSON.parse(raw) as Record<string, ResourceProgress> : {};
        const entries = Object.entries(progressMap);
        if (entries.length === 0) return;
        const [resourceId, progress] = entries.reduce((latest, entry) =>
          entry[1].updatedAt > latest[1].updatedAt ? entry : latest
        );
        const bucket = currentUser.assessmentPassed ? 'alignment' : 'intentional';
        const resources: GrowthResource[] = await resourceService.getResources(bucket);
        const resource = resources.find((candidate) =>
          candidate.id === resourceId || candidate.id.replace(/^(intentional|alignment)-/, '') === resourceId
        );
        if (!resource) return;
        setLastResource({
          resourceId,
          title: resource.title,
          completedCount: progress.viewedModuleIds.length,
          totalModules: Array.isArray(resource.modules) ? resource.modules.length : progress.totalModules,
        });
      } catch {
        setLastResource(null);
      }
    };
    void loadLastResource();
  }, [currentUser?.assessmentPassed, currentUser?.id]);

  const openResource = () => {
    if (lastResource) localStorage.setItem(START_RESOURCE_KEY, lastResource.resourceId);
    setCurrentView(lastResource ? 'growth-detail' : currentUser?.assessmentPassed ? 'paid-growth-mode' : 'growth-mode');
  };

  const firstName = currentUser?.name?.split(' ')[0] ?? 'there';
  return (
    <main className="min-h-screen bg-[#0B0F0C] px-4 py-10 text-[#E8F2E8] sm:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{getGreeting()}, {firstName}</h1>
          <p className="text-sm text-[#A9B5AA]">Continue your personal growth journey.</p>
        </header>
        <section className="rounded-2xl border border-[#2A312A] bg-[#111611] p-6">
          <BookOpen className="mb-4 h-6 w-6 text-[#D9FF3D]" />
          <h2 className="font-display text-xl">{lastResource ? 'Continue where you left off' : 'Explore your resources'}</h2>
          <p className="mt-2 text-sm text-[#A9B5AA]">{lastResource ? lastResource.title : 'Open guided lessons and reflections created for your path.'}</p>
          {lastResource && <p className="mt-2 text-xs text-[#6E776E]">{lastResource.completedCount} of {Math.max(lastResource.totalModules, 1)} modules viewed</p>}
          <button onClick={openResource} className="btn-primary mt-5 inline-flex items-center gap-2">Open resources <ArrowRight className="h-4 w-4" /></button>
        </section>
        <button onClick={() => setCurrentView('user-settings')} className="flex w-full items-center justify-between rounded-xl border border-[#2A312A] bg-[#111611] px-5 py-4 text-left hover:border-[#3A4A3A]">
          <span className="flex items-center gap-3 text-sm"><Settings className="h-4 w-4 text-[#A9B5AA]" />Account settings</span>
          <ArrowRight className="h-4 w-4 text-[#6E776E]" />
        </button>
      </div>
    </main>
  );
};

export default HomeDashboardSection;
