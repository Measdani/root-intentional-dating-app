import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/store/AppContext';
import { toast } from 'sonner';
import {
  Users,
  MessageCircle,
  BookOpen,
  ChevronRight,
  Leaf,
  Heart,
  Coffee,
  ArrowRight,
  Clock,
} from 'lucide-react';
import {
  enterBreakMode,
  exitBreakMode,
  formatModeDuration,
  getRelationshipModeSnapshot,
} from '@/modules';
import type { RelationshipModeSnapshot } from '@/modules/relationshipMode';
import { supabase } from '@/lib/supabase';
import { resourceService } from '@/services/resourceService';
import type { GrowthResource } from '@/types';

// Storage keys mirrored from GrowthDetailSection
const PROGRESS_KEY_PREFIX = 'rooted_growth_module_progress_';
const START_RESOURCE_KEY = 'rooted_growth_detail_start_resource_id';

interface ResourceProgress {
  viewedModuleIds: string[];
  lastViewedModuleId: string | null;
  totalModules: number;
  updatedAt: number;
}

interface LastResourceInfo {
  resourceId: string;
  title: string;
  category: string;
  completedCount: number;
  totalModules: number;
  updatedAt: number;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getModeConfig = (mode: string) => {
  if (mode === 'break') {
    return {
      label: 'Break Mode',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30',
      icon: Coffee,
    };
  }
  if (mode === 'exclusive') {
    return {
      label: 'Exclusive Mode',
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
      border: 'border-rose-400/30',
      icon: Heart,
    };
  }
  return {
    label: 'Active',
    color: 'text-[#D9FF3D]',
    bg: 'bg-[#D9FF3D]/10',
    border: 'border-[#D9FF3D]/30',
    icon: Leaf,
  };
};

const HomeDashboardSection: React.FC = () => {
  const { currentUser, setCurrentView, getUnreadCount } = useApp();

  const [newMembersCount, setNewMembersCount] = useState<number | null>(null);
  const [modeSnapshot, setModeSnapshot] = useState<RelationshipModeSnapshot>(() =>
    getRelationshipModeSnapshot(currentUser?.id ?? '')
  );
  const [lastResource, setLastResource] = useState<LastResourceInfo | null>(null);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);

  const unreadCount = getUnreadCount();

  const refreshSnapshot = useCallback(() => {
    if (currentUser?.id) {
      setModeSnapshot(getRelationshipModeSnapshot(currentUser.id));
    }
  }, [currentUser?.id]);

  // Listen for mode changes dispatched from other components
  useEffect(() => {
    const handler = () => refreshSnapshot();
    window.addEventListener('relationship-mode-updated', handler);
    return () => window.removeEventListener('relationship-mode-updated', handler);
  }, [refreshSnapshot]);

  // Fetch new members added to the pool in the last 7 days
  useEffect(() => {
    const fetchNewMembers = async () => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const { count, error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo)
        .neq('id', currentUser?.id ?? '')
        .eq('user_status', 'active');

      if (!error && count !== null) {
        setNewMembersCount(count);
      }
    };

    fetchNewMembers();
  }, [currentUser?.id]);

  // Load "where you left off" from growth resource progress
  useEffect(() => {
    const loadLastResource = async () => {
      if (!currentUser?.id) return;

      const progressKey = `${PROGRESS_KEY_PREFIX}${currentUser.id}`;
      let progressMap: Record<string, ResourceProgress> = {};
      try {
        const raw = localStorage.getItem(progressKey);
        if (raw) progressMap = JSON.parse(raw);
      } catch {
        return;
      }

      const entries = Object.entries(progressMap);
      if (entries.length === 0) return;

      // Find the most recently touched resource
      const [latestResourceId, latestProgress] = entries.reduce((best, curr) =>
        curr[1].updatedAt > best[1].updatedAt ? curr : best
      );

      if (!latestProgress || latestProgress.viewedModuleIds.length === 0) return;

      // Load resource title from Supabase
      const bucket = currentUser?.assessmentPassed ? 'alignment' : 'intentional';
      const resources: GrowthResource[] = await resourceService.getResources(bucket);
      const match = resources.find((r) => {
        const normalizedId = r.id.replace(/^(intentional|alignment)-/, '');
        return normalizedId === latestResourceId || r.id === latestResourceId;
      });

      if (!match) return;

      const totalModules = Array.isArray(match.modules) ? match.modules.length : latestProgress.totalModules;

      setLastResource({
        resourceId: latestResourceId,
        title: match.title,
        category: match.category,
        completedCount: latestProgress.viewedModuleIds.length,
        totalModules: totalModules || 1,
        updatedAt: latestProgress.updatedAt,
      });
    };

    loadLastResource();
  }, [currentUser?.id, currentUser?.assessmentPassed]);

  const handleContinueResource = () => {
    if (!lastResource) return;
    try {
      localStorage.setItem(START_RESOURCE_KEY, lastResource.resourceId);
    } catch {
      // ignore
    }
    setCurrentView('growth-detail');
  };

  const handleEnterBreak = async () => {
    if (!currentUser?.id) return;
    setModeLoading(true);
    const result = enterBreakMode(currentUser.id);
    setModeLoading(false);
    setShowBreakConfirm(false);
    if (result.ok) {
      refreshSnapshot();
      toast.success("You're now in Break Mode. Your spot is held.");
    } else {
      toast.error(result.reason);
    }
  };

  const handleExitBreak = async () => {
    if (!currentUser?.id) return;
    setModeLoading(true);
    const result = exitBreakMode(currentUser.id);
    setModeLoading(false);
    if (result.ok) {
      refreshSnapshot();
      const snapshot = getRelationshipModeSnapshot(currentUser.id);
      const cooldownMsg = snapshot.remainingCooldownMs > 0
        ? ` A ${formatModeDuration(snapshot.remainingCooldownMs)} cooldown applies before new connections.`
        : '';
      toast.success(`You're back to Active Mode.${cooldownMsg}`);
    } else {
      toast.error(result.reason);
    }
  };

  const modeConfig = getModeConfig(modeSnapshot.mode);
  const ModeIcon = modeConfig.icon;

  const firstName = currentUser?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-[#0B0F0C] text-[#E8F2E8] px-4 py-10 sm:px-8 max-w-2xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-[#A9B5AA]">Here's what's happening in your Rooted Hearts space.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* New people in pool */}
        <button
          onClick={() => setCurrentView('browse')}
          className="flex flex-col gap-2 rounded-xl border border-[#2A312A] bg-[#111611] p-4 text-left hover:border-[#3A4A3A] hover:bg-[#141A14] transition-colors"
        >
          <div className="flex items-center gap-2 text-[#A9B5AA]">
            <Users className="h-4 w-4 shrink-0" />
            <span className="text-xs">New this week</span>
          </div>
          <p className="text-2xl font-semibold text-[#E8F2E8]">
            {newMembersCount === null ? '—' : newMembersCount}
          </p>
          <p className="text-xs text-[#6E776E]">new members</p>
        </button>

        {/* Unread messages */}
        <button
          onClick={() => setCurrentView('inbox')}
          className="flex flex-col gap-2 rounded-xl border border-[#2A312A] bg-[#111611] p-4 text-left hover:border-[#3A4A3A] hover:bg-[#141A14] transition-colors"
        >
          <div className="flex items-center gap-2 text-[#A9B5AA]">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs">Inbox</span>
          </div>
          <p className="text-2xl font-semibold text-[#E8F2E8]">{unreadCount}</p>
          <p className="text-xs text-[#6E776E]">unread {unreadCount === 1 ? 'message' : 'messages'}</p>
        </button>

        {/* Current mode */}
        <div
          className={`col-span-2 sm:col-span-1 flex flex-col gap-2 rounded-xl border p-4 ${modeConfig.bg} ${modeConfig.border}`}
        >
          <div className="flex items-center gap-2 text-[#A9B5AA]">
            <ModeIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs">Current mode</span>
          </div>
          <p className={`text-lg font-semibold ${modeConfig.color}`}>{modeConfig.label}</p>
          {modeSnapshot.mode === 'active' && modeSnapshot.cooldownEndsAt && (
            <p className="text-xs text-[#A9B5AA]">
              Cooldown: {formatModeDuration(modeSnapshot.remainingCooldownMs)} left
            </p>
          )}
          {modeSnapshot.mode === 'exclusive' && modeSnapshot.exclusivePartnerId && (
            <p className="text-xs text-[#A9B5AA]">Exclusive partnership active</p>
          )}
        </div>
      </div>

      {/* Relationship Mode Card */}
      <div className="rounded-xl border border-[#2A312A] bg-[#111611] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#E8F2E8]">Relationship Mode</h2>
          <button
            onClick={() => setCurrentView('user-settings')}
            className="text-xs text-[#A9B5AA] hover:text-[#E8F2E8] flex items-center gap-1 transition-colors"
          >
            Full settings <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Break Mode */}
          <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-[#F6FFF2]">Break Mode</p>
            </div>
            <p className="text-xs text-[#A9B5AA]">
              Step back from browsing. A 24-hour cooldown applies when you return.
            </p>
            {modeSnapshot.mode === 'break' ? (
              <button
                onClick={handleExitBreak}
                disabled={modeLoading}
                className="w-full px-3 py-2 rounded-lg border border-amber-400/50 bg-amber-400/10 text-amber-400 text-xs hover:bg-amber-400/20 transition-colors disabled:opacity-50"
              >
                Return to Active Mode
              </button>
            ) : (
              <button
                onClick={() => setShowBreakConfirm(true)}
                disabled={modeSnapshot.mode === 'exclusive' || modeLoading}
                className={`w-full px-3 py-2 rounded-lg border text-xs transition-colors ${
                  modeSnapshot.mode === 'exclusive'
                    ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                    : 'border-[#2A312A] text-[#A9B5AA] hover:border-amber-400/40 hover:text-amber-400 hover:bg-amber-400/5'
                }`}
              >
                Enter Break Mode
              </button>
            )}
          </div>

          {/* Exclusive Mode */}
          <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              <p className="text-sm font-medium text-[#F6FFF2]">Exclusive Mode</p>
            </div>
            <p className="text-xs text-[#A9B5AA]">
              Mutual agreement to pause search and focus on one partner.
            </p>
            {modeSnapshot.mode === 'exclusive' ? (
              <button
                onClick={() => setCurrentView('user-settings')}
                className="w-full px-3 py-2 rounded-lg border border-rose-400/40 bg-rose-400/10 text-rose-400 text-xs hover:bg-rose-400/20 transition-colors"
              >
                Manage in Settings
              </button>
            ) : modeSnapshot.incomingExclusiveRequestFrom ? (
              <button
                onClick={() => setCurrentView('user-settings')}
                className="w-full px-3 py-2 rounded-lg border border-[#D9FF3D]/40 bg-[#D9FF3D]/10 text-[#D9FF3D] text-xs hover:bg-[#D9FF3D]/20 transition-colors"
              >
                Respond to Request
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('user-settings')}
                disabled={modeSnapshot.mode === 'break'}
                className={`w-full px-3 py-2 rounded-lg border text-xs transition-colors ${
                  modeSnapshot.mode === 'break'
                    ? 'border-[#1A211A] text-[#6E776E] cursor-not-allowed'
                    : 'border-[#2A312A] text-[#A9B5AA] hover:border-rose-400/40 hover:text-rose-400 hover:bg-rose-400/5'
                }`}
              >
                Request via Settings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Where you left off */}
      {lastResource && (
        <div className="rounded-xl border border-[#2A312A] bg-[#111611] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#D9FF3D]" />
            <h2 className="text-sm font-medium text-[#E8F2E8]">Continue where you left off</h2>
          </div>

          <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-xs text-[#A9B5AA] uppercase tracking-wide">{lastResource.category}</p>
                <p className="text-sm font-medium text-[#E8F2E8] leading-snug">{lastResource.title}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-[#A9B5AA] shrink-0">
                <Clock className="h-3 w-3" />
                <span>{lastResource.completedCount}/{lastResource.totalModules} modules</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-[#1A211A] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D9FF3D] transition-all"
                style={{
                  width: `${Math.min(100, Math.round((lastResource.completedCount / lastResource.totalModules) * 100))}%`,
                }}
              />
            </div>

            <button
              onClick={handleContinueResource}
              className="flex items-center gap-1.5 text-xs text-[#D9FF3D] hover:text-[#E8F2E8] transition-colors font-medium"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick navigation */}
      <div className="space-y-2">
        <p className="text-xs text-[#6E776E] uppercase tracking-wide font-medium">Quick access</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            onClick={() => setCurrentView('browse')}
            className="flex items-center justify-between rounded-xl border border-[#2A312A] bg-[#111611] px-4 py-3 hover:border-[#3A4A3A] hover:bg-[#141A14] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-[#A9B5AA]" />
              <span className="text-sm text-[#E8F2E8]">Browse</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#6E776E]" />
          </button>

          <button
            onClick={() => setCurrentView('inbox')}
            className="flex items-center justify-between rounded-xl border border-[#2A312A] bg-[#111611] px-4 py-3 hover:border-[#3A4A3A] hover:bg-[#141A14] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-[#A9B5AA]" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#E8F2E8]">Inbox</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#D9FF3D] px-1.5 py-0.5 text-[10px] font-semibold text-[#0B0F0C]">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#6E776E]" />
          </button>

          <button
            onClick={() => setCurrentView(currentUser?.assessmentPassed ? 'paid-growth-mode' : 'growth-mode')}
            className="flex items-center justify-between rounded-xl border border-[#2A312A] bg-[#111611] px-4 py-3 hover:border-[#3A4A3A] hover:bg-[#141A14] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-[#A9B5AA]" />
              <span className="text-sm text-[#E8F2E8]">Growth Mode</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#6E776E]" />
          </button>
        </div>
      </div>

      {/* Break Mode Confirmation */}
      {showBreakConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#2A312A] bg-[#111611] p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#D9FF3D]">Enter Break Mode?</p>
              <p className="text-sm text-[#A9B5AA]">
                You'll be removed from search and new matches will be paused. A 24-hour cooldown applies when you return.
              </p>
            </div>
            <ul className="space-y-1 text-xs text-[#A9B5AA]">
              <li className="flex items-center gap-2"><span className="text-[#D9FF3D]">✓</span> Your existing conversations stay open</li>
              <li className="flex items-center gap-2"><span className="text-[#D9FF3D]">✓</span> Growth resources remain unlocked</li>
              <li className="flex items-center gap-2"><span className="text-[#D9FF3D]">✓</span> You can exit Break Mode at any time</li>
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-[#2A312A] text-sm text-[#A9B5AA] hover:text-[#E8F2E8] hover:border-[#3A4A3A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnterBreak}
                disabled={modeLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] text-sm hover:bg-[#D9FF3D]/20 transition-colors disabled:opacity-50"
              >
                Enter Break Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboardSection;
