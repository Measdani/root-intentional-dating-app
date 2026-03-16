import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import {
  canUsersExchangeMessages,
  canUsersMatch,
  communityIdToPoolId,
  formatModeDuration,
  getRelationshipModeSnapshot,
  getUserPoolId,
  isUserAvailableForNewMatches,
  isUserInPool,
  poolIdToCommunityId,
  useCommunity,
} from '@/modules';
import { growthResources, paidGrowthResources } from '@/data/assessment';
import { toast } from 'sonner';
import { BookOpen, Clock, CheckCircle, Sparkles, Brain, Target, Heart, Shield, Zap, Users, HelpCircle, MessageCircle, Send, X } from 'lucide-react';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import ReportUserModal from '@/components/ReportUserModal';
import { getUserSettingsForUser } from '@/services/userSettingsService';
import { getGrowthModeCoachGuidance, type GrowthModeCoachResult } from '@/services/growthModeCoachService';
import { SUPPORT_EMAIL } from '@/constants/support';
import type { User, AssessmentResult } from '@/types';

type ResourceProgressMap = Record<
  string,
  {
    viewedModuleIds: string[];
    totalModules: number;
    updatedAt: number;
  }
>;

const LOW_SCORE_REASON_CODE_MAP: Record<string, string> = {
  'emotional-regulation': 'low_emotional_regulation',
  accountability: 'low_accountability',
  autonomy: 'low_autonomy',
  boundaries: 'low_boundaries',
  'conflict-repair': 'low_conflict_repair',
  'integrity-check': 'low_integrity_alignment',
};

const buildGrowthReasonCodes = (result: AssessmentResult | null): string[] => {
  if (!result) return [];

  const codes = new Set<string>();
  Object.entries(result.categoryScores || {}).forEach(([category, score]) => {
    if (typeof score === 'number' && Number.isFinite(score) && score < 70) {
      const mapped = LOW_SCORE_REASON_CODE_MAP[category] ?? `low_${category.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
      codes.add(mapped);
    }
  });

  (result.growthAreas || []).forEach((area) => {
    if (!area || typeof area !== 'string') return;
    const normalized = area.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (normalized) codes.add(normalized);
  });

  return Array.from(codes);
};

const GrowthModeSection: React.FC = () => {
  const { activeCommunity } = useCommunity();
  const {
    assessmentResult,
    setCurrentView,
    setSelectedUser,
    currentUser,
    users,
    interactions,
    setSelectedConversation,
    expressInterest,
    respondToInterest,
    getReceivedInterests,
    getSentInterests,
    getConversation,
    setShowSupportModal,
    reportUser,
    blockUser,
    isUserBlocked,
    isBlockedByUser,
    getUnreadNotifications,
    markNotificationAsRead,
    reloadNotifications,
    reloadInteractions,
    getNextRetakeDate,
  } = useApp();
  const [activeTab, setActiveTab] = useState<'browse' | 'inbox' | 'resources' | 'blog'>('browse');
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modeRefreshTick, setModeRefreshTick] = useState(0);
  const [coachGuidance, setCoachGuidance] = useState<GrowthModeCoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [isCoachMinimized, setIsCoachMinimized] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [showSelectedResourceLearnMore, setShowSelectedResourceLearnMore] = useState(false);

  useEffect(() => {
    const handleModeUpdated = () => setModeRefreshTick((previous) => previous + 1);
    window.addEventListener('relationship-mode-updated', handleModeUpdated as EventListener);
    const interval = window.setInterval(() => {
      setModeRefreshTick((previous) => previous + 1);
    }, 60000);

    return () => {
      window.removeEventListener('relationship-mode-updated', handleModeUpdated as EventListener);
      window.clearInterval(interval);
    };
  }, []);

  const relationshipModeSnapshot = useMemo(
    () => getRelationshipModeSnapshot(currentUser.id),
    [currentUser.id, modeRefreshTick]
  );
  const modeResourceAccessActive = relationshipModeSnapshot.mode !== 'active';
  const canReceiveNewMatches = isUserAvailableForNewMatches(currentUser.id);

  const modeStatusMessage = useMemo(() => {
    if (relationshipModeSnapshot.mode === 'break') {
      return "You're now in Break Mode. You can exit anytime from Settings.";
    }

    if (relationshipModeSnapshot.mode === 'exclusive') {
      return 'Exclusive Mode is active. Search is paused and messaging is limited to your exclusive partner.';
    }

    if (relationshipModeSnapshot.remainingCooldownMs > 0) {
      return `Re-entry cooldown is active for ${formatModeDuration(relationshipModeSnapshot.remainingCooldownMs)}.`;
    }

    return null;
  }, [relationshipModeSnapshot]);

  // Log state changes
  useEffect(() => {
    console.log('ðŸ”„ showReportModal state changed to:', showReportModal);
  }, [showReportModal]);
  const [resources, setResources] = useState(() => {
    const saved = localStorage.getItem('growth-resources');
    return saved ? JSON.parse(saved) : growthResources;
  });
  const [blogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('community-blogs');
    return saved ? JSON.parse(saved) : [];
  });
  const isModuleOnly = (blog: any): boolean => {
    const raw = blog?.moduleOnly ?? blog?.module_only;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 't' || normalized === 'yes';
    }
    return false;
  };
  const publicBlogs = useMemo(
    () => blogs.filter((blog) => !isModuleOnly(blog) && blog.published !== false),
    [blogs]
  );
  const progressStorageKey = useMemo(
    () => `rooted_growth_module_progress_${currentUser.id}`,
    [currentUser.id]
  );
  const [resourceProgress, setResourceProgress] = useState<ResourceProgressMap>({});
  const combinedModeResources = useMemo(() => {
    if (!modeResourceAccessActive) return resources;

    const savedPaidResources = localStorage.getItem('paid-growth-resources');
    const paidResources = savedPaidResources ? JSON.parse(savedPaidResources) : paidGrowthResources;
    const paidList = Array.isArray(paidResources) ? paidResources : [];

    const seen = new Set<string>();
    return [...resources, ...paidList].filter((resource: any) => {
      const key = typeof resource?.id === 'string' && resource.id.length > 0
        ? resource.id
        : JSON.stringify(resource);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [modeResourceAccessActive, resources]);

  const moduleProgressSummary = useMemo(() => {
    const progressRows = Object.values(resourceProgress);
    const startedPaths = progressRows.filter((entry) => entry.viewedModuleIds.length > 0).length;
    const completedPaths = progressRows.filter(
      (entry) => entry.totalModules > 0 && entry.viewedModuleIds.length >= entry.totalModules
    ).length;

    return {
      total_paths: combinedModeResources.length,
      started_paths: startedPaths,
      completed_paths: completedPaths,
    };
  }, [resourceProgress, combinedModeResources.length]);

  useEffect(() => {
    if (combinedModeResources.length === 0) {
      setSelectedResourceId(null);
      setShowSelectedResourceLearnMore(false);
      return;
    }

    const hasSelected = selectedResourceId
      ? combinedModeResources.some((resource: any) => resource.id === selectedResourceId)
      : false;

    if (!hasSelected) {
      const firstResource = combinedModeResources[0];
      setSelectedResourceId(typeof firstResource?.id === 'string' ? firstResource.id : null);
      setShowSelectedResourceLearnMore(false);
    }
  }, [combinedModeResources, selectedResourceId]);

  useEffect(() => {
    setShowSelectedResourceLearnMore(false);
  }, [selectedResourceId]);

  // Load fresh interactions on component mount and when entering browse/inbox tabs
  useEffect(() => {
    reloadInteractions();
    reloadNotifications();
  }, []);

  // Reload interactions when returning to browse or inbox tabs to ensure fresh state
  useEffect(() => {
    if (activeTab === 'browse' || activeTab === 'inbox') {
      reloadInteractions();
      reloadNotifications();
    }
  }, [activeTab, reloadInteractions, reloadNotifications]);

  // Reload resources when returning to resources tab
  useEffect(() => {
    if (activeTab === 'resources') {
      const saved = localStorage.getItem('growth-resources');
      if (saved) {
        setResources(JSON.parse(saved));
      }
    }
  }, [activeTab]);

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
      Object.entries(parsed as Record<string, any>).forEach(([resourceId, value]) => {
        if (!value || typeof value !== 'object') return;

        const rawViewedModuleIds: unknown[] = Array.isArray(value.viewedModuleIds)
          ? value.viewedModuleIds
          : [];

        const viewedModuleIds: string[] = Array.from(
          new Set(
            rawViewedModuleIds.filter(
              (moduleId: unknown): moduleId is string =>
                typeof moduleId === 'string' && moduleId.trim().length > 0
            )
          )
        );

        const totalModulesRaw = Number(value.totalModules);
        const totalModules = Number.isFinite(totalModulesRaw) && totalModulesRaw > 0
          ? Math.round(totalModulesRaw)
          : viewedModuleIds.length;

        normalized[resourceId] = {
          viewedModuleIds,
          totalModules,
          updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now(),
        };
      });

      setResourceProgress(normalized);
    } catch (error) {
      console.warn('Failed to load growth resource progress:', error);
      setResourceProgress({});
    }
  }, [progressStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(progressStorageKey, JSON.stringify(resourceProgress));
    } catch (error) {
      console.warn('Failed to save growth resource progress:', error);
    }
  }, [progressStorageKey, resourceProgress]);

  useEffect(() => {
    let active = true;

    const loadCoachGuidance = async () => {
      const cacheKey = `rooted_growth_coach_cache_${currentUser.id}`;
      const lastRunKey = `rooted_growth_coach_last_run_${currentUser.id}`;
      const lastRunRaw = localStorage.getItem(lastRunKey);
      const lastRun = lastRunRaw ? Number(lastRunRaw) : 0;
      const throttleWindowMs = 6 * 60 * 60 * 1000;

      if (Number.isFinite(lastRun) && lastRun > 0 && Date.now() - lastRun < throttleWindowMs) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as GrowthModeCoachResult;
            if (active) setCoachGuidance(parsed);
            return;
          } catch (error) {
            console.warn('Failed to parse cached growth coach guidance:', error);
          }
        }
      }

      setCoachLoading(true);

      const reassessmentDate = getNextRetakeDate();
      const result = await getGrowthModeCoachGuidance({
        appUserId: currentUser.id,
        appUserEmail: currentUser.email,
        triggerSource: 'enters_growth_mode',
        assessmentSummary: assessmentResult
          ? `Assessment: ${assessmentResult.percentage}% score, ${assessmentResult.passed ? 'alignment-ready' : 'growth-mode'}.`
          : undefined,
        reasonCodes: buildGrowthReasonCodes(assessmentResult),
        moduleProgress: moduleProgressSummary,
        cooldownReassessmentDate: reassessmentDate ? reassessmentDate.toISOString() : null,
      });

      if (!active) return;
      setCoachLoading(false);

      if (!result) return;

      setCoachGuidance(result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(lastRunKey, String(Date.now()));
      } catch (error) {
        console.warn('Failed to cache growth coach guidance:', error);
      }
    };

    void loadCoachGuidance();

    return () => {
      active = false;
    };
  }, [
    currentUser.id,
    currentUser.email,
    assessmentResult,
    moduleProgressSummary,
    getNextRetakeDate,
  ]);

  // Calculate unread message count for growth mode inbox
  const unreadMessageCount = useMemo(() => {
    const allInterests = [
      ...Object.values(interactions.sentInterests),
      ...Object.values(interactions.receivedInterests),
    ];

    // Remove duplicates by conversationId
    const uniqueConversations = Array.from(new Map(
      allInterests.map(i => [i.conversationId, i])
    ).values());

    // Count unread messages from other users
    let count = 0;
    uniqueConversations.forEach(conversation => {
      const otherUserId = conversation.fromUserId === currentUser.id
        ? conversation.toUserId
        : conversation.fromUserId;
      if (!canUsersExchangeMessages(currentUser.id, otherUserId)) return;

      if (conversation.messages) {
        conversation.messages.forEach(message => {
          // Count unread messages from the other user
          if (message.fromUserId !== currentUser.id && !message.read) {
            count++;
          }
        });
      }
    });

    return count;
  }, [interactions, currentUser.id]);

  // Filter users who haven't passed assessment (growth-mode pool)
  // Exclude users the current user has blocked AND users who have blocked the current user (mutual blocking)
  const growthModeUsers = useMemo(() => {
    const viewerSettings = getUserSettingsForUser(currentUser.id, currentUser);
    const activePool = communityIdToPoolId(activeCommunity.id);
    const viewerPool = getUserPoolId(currentUser, activePool);
    const viewerCommunityMatches = poolIdToCommunityId(viewerPool) === activeCommunity.id;

    if (!viewerCommunityMatches) return [];
    if (!isUserAvailableForNewMatches(currentUser.id)) return [];

    return users.filter(
      u => {
        if (u.assessmentPassed) return false;
        if (u.id === currentUser.id) return false;
        if (!isUserInPool(u, viewerPool)) return false;
        if (!isUserAvailableForNewMatches(u.id)) return false;
        if (!canUsersMatch(currentUser, u, activeCommunity.matchingMode)) return false;
        if (isUserBlocked(u.id) || isBlockedByUser(u.id)) return false;

        const candidateSettings = getUserSettingsForUser(u.id, u);
        if (candidateSettings.visibility.profileVisibility === 'paused') return false;
        if (candidateSettings.visibility.profileVisibility === 'private') {
          const existingConversation = getConversation(u.id);
          if (!existingConversation || existingConversation.fromUserId !== u.id) return false;
        }
        if (viewerSettings.safety.onlyMatchWithVerifiedAccounts && !u.backgroundCheckVerified) return false;

        return true;
      }
    );
  }, [
    users,
    currentUser.id,
    currentUser,
    activeCommunity.matchingMode,
    isUserBlocked,
    isBlockedByUser,
    getConversation,
    modeRefreshTick,
  ]);

  const handleBrowseAction = (user: User) => {
    const existingConversation = getConversation(user.id);
    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setCurrentView('conversation');
      return;
    }

    setSelectedUser(user);
    setCurrentView('profile');
  };

  // Map categories to icons
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

  // Get status based on progress
  const getPathStatus = (progress: number) => {
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'not-started';
  };

  const getResourceProgress = (resource: any): number => {
    if (!resource?.id) return 0;

    const saved = resourceProgress[resource.id];
    const moduleIds: string[] = Array.isArray(resource.modules)
      ? resource.modules.map((module: any, index: number) => (
          typeof module?.id === 'string' && module.id.trim().length > 0
            ? module.id
            : `${resource.id}-module-${index + 1}`
        ))
      : [];

    const totalModules = moduleIds.length > 0 ? moduleIds.length : (saved?.totalModules || 0);
    if (totalModules <= 0) return 0;

    const viewedSet = new Set<string>(saved?.viewedModuleIds || []);
    const viewedCount = moduleIds.length > 0
      ? moduleIds.filter((moduleId: string) => viewedSet.has(moduleId)).length
      : viewedSet.size;

    const percentage = Math.round((Math.min(viewedCount, totalModules) / totalModules) * 100);
    return Math.max(0, Math.min(100, percentage));
  };

  const selectedResource = useMemo(
    () => combinedModeResources.find((resource: any) => resource.id === selectedResourceId) ?? null,
    [combinedModeResources, selectedResourceId]
  );

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl text-[#F6FFF2]">Inner Work Space</h1>
          <button
            onClick={() => setShowSupportModal(true)}
            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            title="Contact Support"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Admin Notifications */}
        {getUnreadNotifications().map(notification => (
          <div
            key={notification.id}
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              notification.type === 'warning'
                ? 'bg-blue-600/10 border-blue-500 text-blue-100'
                : notification.type === 'suspension'
                ? 'bg-orange-600/10 border-orange-500 text-orange-100'
                : 'bg-red-600/10 border-red-500 text-red-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium mb-1">{notification.title}</h3>
                <p className="text-sm opacity-90">{notification.message}</p>
              </div>
              <button
                onClick={() => markNotificationAsRead(notification.id)}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity ml-4 whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}

        {(coachLoading || coachGuidance) && (
          <>
            {!isCoachMinimized && (
              <div className="mb-8 rounded-2xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D9FF3D]" />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#D9FF3D]">
                      Forest, Your Inner Work Coach
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsCoachMinimized(true)}
                    className="text-xs font-medium text-[#D9FF3D] hover:text-[#F6FFF2] transition-colors"
                    aria-label="Minimize Forest coach message"
                    title="Minimize Forest"
                  >
                    Minimize
                  </button>
                </div>

                {coachLoading && (
                  <p className="text-sm text-[#A9B5AA]">Forest is preparing your next growth steps...</p>
                )}

                {!coachLoading && coachGuidance && (
                  <div className="space-y-4">
                    <p className="text-sm text-[#F6FFF2] leading-relaxed">
                      {coachGuidance.explanationCopy}
                    </p>

                    {coachGuidance.recommendedModules.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-2">
                          Recommended Modules
                        </p>
                        <ul className="space-y-1">
                          {coachGuidance.recommendedModules.slice(0, 2).map((module) => (
                            <li key={module} className="text-sm text-[#F6FFF2]">
                              - {module}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1">Reflection Prompt</p>
                        <p className="text-sm text-[#F6FFF2]">{coachGuidance.reflectionPrompt}</p>
                      </div>
                      <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1">Journaling Prompt</p>
                        <p className="text-sm text-[#F6FFF2]">{coachGuidance.journalingPrompt}</p>
                      </div>
                    </div>

                    <p className="text-sm text-[#A9B5AA]">{coachGuidance.accountabilityNudge}</p>

                    {coachGuidance.reassessmentNotice && (
                      <p className="text-sm text-[#D9FF3D]">{coachGuidance.reassessmentNotice}</p>
                    )}

                    {coachGuidance.escalateToSupport && (
                      <p className="text-sm text-amber-300">
                        Forest flagged this for human support review. Contact {coachGuidance.supportEmail || SUPPORT_EMAIL}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {isCoachMinimized && (
              <button
                onClick={() => setIsCoachMinimized(false)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-[#D9FF3D]/50 bg-[#0B0F0C] px-4 py-2 text-[#D9FF3D] shadow-lg shadow-black/30 hover:bg-[#121A12] transition-colors"
                aria-label="Open Forest coach message"
                title="Open Forest"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Forest</span>
              </button>
            )}
          </>
        )}

        {/* Tab Navigation */}
        <div className="mb-10 flex gap-4 border-b border-[#1A211A]">
          <button
            onClick={() => setActiveTab('browse')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'browse'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Browse Members
            </div>
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 px-4 font-medium transition-all relative ${
              activeTab === 'inbox'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Inbox
              {unreadMessageCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-medium">
                  {unreadMessageCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'resources'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Growth Resources
            </div>
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'blog'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Blog
            </div>
          </button>
          <button
            onClick={() => setCurrentView('clarity-room')}
            className="pb-3 px-4 font-medium transition-all text-[#A9B5AA] hover:text-[#D9FF3D]"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Clarity Room
            </div>
          </button>
        </div>

        {/* Browse View */}
        {activeTab === 'browse' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-[#F6FFF2] mb-2">Inner Work Space Community</h2>
            </div>

            {modeStatusMessage && (
              <div className="mb-6 rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 px-4 py-3 text-sm text-[#F6FFF2]">
                {modeStatusMessage}
              </div>
            )}

            {growthModeUsers.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {growthModeUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleBrowseAction(user)}
                    className="bg-[#111611] rounded-[20px] border border-[#1A211A] p-6 hover:border-[#D9FF3D] transition-colors group cursor-pointer"
                  >
                    <div className="mb-4">
                      <h3 className="text-[#F6FFF2] font-medium text-lg">{user.name}, {user.age}</h3>
                      <p className="text-[#A9B5AA] text-sm">{user.city}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                          Growth Mode
                        </span>
                      </div>
                    </div>

                    <p className="text-[#A9B5AA] text-sm mb-4 line-clamp-2">{user.bio}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {user.values?.slice(0, 3).map((value, idx) => (
                        <span key={idx} className="text-xs bg-[#1A211A] text-[#A9B5AA] px-2 py-1 rounded">
                          {value}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBrowseAction(user);
                      }}
                      className="w-full py-2 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg font-medium hover:bg-[#D9FF3D]/20 transition-colors flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      {getConversation(user.id) ? 'Continue Conversation' : 'View Profile'}
                      <Send className="w-4 h-4 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
                <p className="text-[#A9B5AA]">
                  {canReceiveNewMatches
                    ? 'No members in growth mode yet. Check back soon!'
                    : 'New matching is paused while your mode is active.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Inbox View */}
        {activeTab === 'inbox' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-[#F6FFF2] mb-2">Your Matches</h2>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto">
                View profiles and message with people who have mutual interest with you.
              </p>
            </div>

            {(() => {
              const receivedInterests = getReceivedInterests();
              const sentInterests = getSentInterests();
              const activePool = communityIdToPoolId(activeCommunity.id);
              const viewerPool = getUserPoolId(currentUser, activePool);
              const viewerCommunityMatches = poolIdToCommunityId(viewerPool) === activeCommunity.id;

              // Combine both received and sent interests
              const allInterests = [...receivedInterests, ...sentInterests];

              // Remove duplicates by conversationId (keep one per conversation)
              const uniqueConversations = Array.from(new Map(
                allInterests.map(i => [i.conversationId, i])
              ).values());

              // Map to user profiles and filter to growth-mode matches
              const growthModeMatches = viewerCommunityMatches
                ? uniqueConversations
                    .map((interest) => {
                      // Get the other user in the conversation
                      const otherUserId = interest.fromUserId === currentUser.id
                        ? interest.toUserId
                        : interest.fromUserId;
                      return users.find((u) => u.id === otherUserId);
                    })
                    .filter((u): u is User => Boolean(u))
                    .filter(
                      (u) =>
                        u.id !== currentUser.id &&
                        isUserInPool(u, viewerPool) &&
                        canUsersMatch(currentUser, u, activeCommunity.matchingMode)
                    )
                : [];

              return growthModeMatches.length > 0 ? (
                <div className="space-y-4">
                  {growthModeMatches.map((user) => {
                    if (!user) return null;
                    const conversation = getConversation(user.id);
                    const lastMessage = conversation?.messages?.[conversation.messages.length - 1];

                    return (
                      <div
                        key={user.id}
                        className="bg-[#111611] rounded-[16px] border border-[#1A211A] p-6 hover:border-[#D9FF3D] transition-colors relative"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-[#F6FFF2] font-medium text-lg">{user.name}, {user.age}</h3>
                              {conversation?.messages && conversation.messages.length > 0 && (
                                <span className="inline-block px-2 py-0.5 bg-[#D9FF3D]/20 text-[#D9FF3D] text-xs font-medium rounded-full">
                                  {conversation.messages.length}
                                </span>
                              )}
                            </div>
                            <p className="text-[#A9B5AA] text-sm">{user.city}</p>
                            {lastMessage && (
                              <p className="text-[#A9B5AA] text-sm mt-2 line-clamp-2">
                                {lastMessage.fromUserId === currentUser.id ? 'You: ' : ''}{lastMessage.message}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedConversation(conversation);
                              setCurrentView('conversation');
                            }}
                            className="flex-shrink-0 py-2 px-4 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg font-medium hover:bg-[#D9FF3D]/20 transition-colors whitespace-nowrap"
                          >
                            Message
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
                  <p className="text-[#A9B5AA]">No matches yet. Express interest in members to start connecting!</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Resources View */}
        {activeTab === 'resources' && (
          <div>
        <div className="text-center mb-12 pb-12 border-b border-[#1A211A]">
          <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-3">
            Strengthening the Roots of Connection
          </h2>
          <div className="inline-flex items-center gap-2 text-[#D9FF3D] text-base font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Welcome to Your Resource Space</span>
          </div>
          <ul className="max-w-3xl mx-auto space-y-3 text-[#A9B5AA] leading-relaxed text-left">
            <li className="flex items-start gap-2">
              <span className="text-[#D9FF3D] mt-1">-</span>
              <span>&quot;This is your dedicated space to grow the healthy relationship you deserve.&quot;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D9FF3D] mt-1">-</span>
              <span>&quot;Based on your assessment, we&apos;ve identified your primary and secondary Growth Milestones to help guide your journey.&quot;</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#D9FF3D] mt-1">-</span>
              <span>&quot;Use your Journal Space below to reflect on your progress and capture new insights.&quot;</span>
            </li>
          </ul>
        </div>

        {/* Growth Resources */}
        <div className="mb-12">
          {modeResourceAccessActive && (
            <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Break/Exclusive Mode is active, so Inner and Advanced growth resources are temporarily unlocked here.
            </div>
          )}
          <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
            <div className="rounded-2xl border border-[#1A211A] bg-[#111611] p-3 h-fit">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA] px-2 pb-2">Path Navigation</p>
              <div className="space-y-2">
                {combinedModeResources.map((resource: any) => {
                  const progress = getResourceProgress(resource);
                  const status = getPathStatus(progress);
                  const isSelected = selectedResourceId === resource.id;
                  const isCompleted = progress === 100;

                  return (
                    <button
                      key={resource.id}
                      onClick={() => setSelectedResourceId(resource.id)}
                      className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                        isSelected
                          ? 'border-[#D9FF3D] bg-[#D9FF3D]/10'
                          : 'border-[#1A211A] bg-[#0B0F0C] hover:border-[#2E372E]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          status === 'completed' ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]' :
                          status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-[#1A211A] text-[#A9B5AA]'
                        }`}>
                          {getCategoryIcon(resource.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#F6FFF2] truncate">{resource.title}</p>
                          <p className="text-xs text-[#A9B5AA] mt-1">
                            {isCompleted ? 'Completed' : progress > 0 ? `${progress}% complete` : 'Not started'}
                          </p>
                        </div>
                        {isCompleted && <CheckCircle className="w-4 h-4 text-[#D9FF3D] flex-shrink-0 mt-0.5" />}
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
                  const previewModules = Array.isArray(selectedResource.modules)
                    ? selectedResource.modules.slice(0, 4)
                    : [];

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            status === 'completed' ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]' :
                            status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-[#1A211A] text-[#A9B5AA]'
                          }`}>
                            {getCategoryIcon(selectedResource.category)}
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold text-[#F6FFF2]">{selectedResource.title}</h4>
                            {!showSelectedResourceLearnMore ? (
                              <p className="text-sm text-[#A9B5AA] mt-1">{selectedResource.description}</p>
                            ) : (
                              <div className="mt-2 space-y-3">
                                {Array.isArray(selectedResource.learningOutcomes) && selectedResource.learningOutcomes.length > 0 && (
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1.5">Strengths</p>
                                    <ul className="space-y-1.5">
                                      {selectedResource.learningOutcomes.map((outcome: string, index: number) => (
                                        <li key={`${selectedResource.id}-strength-${index}`} className="text-sm text-[#F6FFF2]">
                                          - {outcome}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedResource.areasToBeMindfulOf && (
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-1.5">Areas to Be Mindful Of</p>
                                    <p className="text-sm text-[#F6FFF2] whitespace-pre-wrap">{selectedResource.areasToBeMindfulOf}</p>
                                  </div>
                                )}
                                {(!selectedResource.learningOutcomes || selectedResource.learningOutcomes.length === 0) && !selectedResource.areasToBeMindfulOf && (
                                  <p className="text-sm text-[#A9B5AA]">No additional path details added yet.</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs border border-[#2A312A] text-[#A9B5AA]">
                          {selectedResource.category}
                        </span>
                      </div>

                      <div>
                        <div className="h-2 bg-[#0B0F0C] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              status === 'completed' ? 'bg-[#D9FF3D]' :
                              status === 'in-progress' ? 'bg-amber-500' :
                              'bg-[#A9B5AA]'
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

                      {previewModules.length > 0 && (
                        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/50 p-4">
                          <p className="text-xs uppercase tracking-wide text-[#A9B5AA] mb-2">Module Preview</p>
                          <ul className="space-y-1.5">
                            {previewModules.map((module: any, index: number) => (
                              <li key={module.id ?? `${selectedResource.id}-module-${index}`} className="text-sm text-[#F6FFF2]">
                                {index + 1}. {module.title}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          onClick={() => {
                            localStorage.setItem('rooted_growth_detail_start_resource_id', selectedResource.id);
                            setCurrentView('growth-detail');
                          }}
                          className="px-4 py-2 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-medium hover:brightness-95 transition"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => setShowSelectedResourceLearnMore(true)}
                          className="px-4 py-2 rounded-lg border border-[#1A211A] text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition"
                        >
                          Learn More
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
        </div>
          </div>
        )}

        {/* Blog View */}
        {activeTab === 'blog' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-[#F6FFF2] mb-4">Community Blog</h2>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto">
                Read articles from our community about growth, relationships, and intentional living.
              </p>
            </div>

            {publicBlogs.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
                <p className="text-[#A9B5AA]">No articles available yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {publicBlogs.map((blog: any) => (
                  <div
                    key={blog.id}
                    onClick={() => setCurrentView('community-blog')}
                    className="bg-[#111611] border border-[#1A211A] rounded-lg p-6 cursor-pointer hover:border-[#D9FF3D] transition group"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-3 py-1 rounded-full">
                        {blog.category}
                      </span>
                      {blog.readTime && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {blog.readTime}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-[#D9FF3D] transition">
                      {blog.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">{blog.excerpt}</p>
                    <div className="text-xs text-gray-500">
                      {blog.author && <span>{blog.author}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleLogout}
            className="btn-outline"
          >
            Logout
          </button>
        </div>

        {/* Encouragement */}
        <div className="mt-12 text-center">
          <p className="text-[#A9B5AA]/60 text-sm max-w-md mx-auto">
            "The work you do now will be the foundation of the relationship you want later.
            This is not a delayâ€”it is an investment."
          </p>
        </div>
      </main>


      {/* Background Check Modal */}
      <BackgroundCheckModal
        isOpen={showBackgroundCheckModal}
        onClose={() => {
          setShowBackgroundCheckModal(false);
          // Close the profile modal and show confirmation
          setSelectedProfileUser(null);
        }}
        onVerified={() => {
          setShowBackgroundCheckModal(false);
          // Close the profile modal after verification
          setSelectedProfileUser(null);
        }}
      />

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        reportedUser={selectedProfileUser}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason, details, shouldBlock) => {
          try {
            console.log('ðŸ“ Submitting report for user:', selectedProfileUser.id, 'reason:', reason);
            await reportUser(selectedProfileUser.id, reason, details);
            if (shouldBlock) {
              console.log('ðŸš« Blocking user:', selectedProfileUser.id);
              blockUser(selectedProfileUser.id);
            }
            console.log('âœ… Report submitted successfully');
            toast.success('Report submitted successfully. Admin team will review.');
            setShowReportModal(false);
            setSelectedProfileUser(null);
          } catch (error) {
            console.error('Failed to submit report:', error);
            toast.error('Failed to submit report. Please try again.');
          }
        }}
      />

      {/* Profile Modal */}
      {selectedProfileUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm"
            onClick={() => {
              setSelectedProfileUser(null);
              setMessageFeedback(null);
            }}
          />

          {/* Profile Card */}
          <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedProfileUser(null);
                setMessageFeedback(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-display text-[#F6FFF2] mb-2">
                {selectedProfileUser.name}, {selectedProfileUser.age}
              </h2>
              <p className="text-[#A9B5AA] text-sm mb-3">{selectedProfileUser.city}</p>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded inline-block">
                Growth Mode
              </span>
            </div>

            {/* Bio */}
            <div className="mb-6">
              <p className="text-sm text-[#F6FFF2] font-medium mb-2">About</p>
              <p className="text-[#A9B5AA] text-sm leading-relaxed">{selectedProfileUser.bio}</p>
            </div>

            {/* Values */}
            <div className="mb-6">
              <p className="text-sm text-[#F6FFF2] font-medium mb-3">Values</p>
              <div className="flex flex-wrap gap-2">
                {selectedProfileUser.values?.map((value: string, idx: number) => (
                  <span key={idx} className="text-xs bg-[#1A211A] text-[#A9B5AA] px-3 py-1 rounded">
                    {value}
                  </span>
                ))}
              </div>
            </div>

            {/* Growth Focus */}
            <div className="mb-6">
              <p className="text-sm text-[#F6FFF2] font-medium mb-2">Growth Focus</p>
              <p className="text-[#A9B5AA] text-sm">{selectedProfileUser.growthFocus}</p>
            </div>

            {/* Communication Style */}
            <div className="mb-6">
              <p className="text-sm text-[#F6FFF2] font-medium mb-2">Communication Style</p>
              <p className="text-[#A9B5AA] text-sm">{selectedProfileUser.communicationStyle}</p>
            </div>

            {/* Relationship Vision */}
            <div className="mb-6">
              <p className="text-sm text-[#F6FFF2] font-medium mb-2">Relationship Vision</p>
              <p className="text-[#A9B5AA] text-sm">{selectedProfileUser.relationshipVision}</p>
            </div>

            {/* Message Input */}
            <div className="space-y-3 pt-6 border-t border-[#1A211A]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-[#F6FFF2] font-medium">Send a Message</label>
                  <span className={`text-xs font-medium ${messageText.length >= 120 ? 'text-[#D9FF3D]' : 'text-[#A9B5AA]'}`}>
                    {messageText.length}/120
                  </span>
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    if (messageFeedback) {
                      setMessageFeedback(null);
                    }
                  }}
                  placeholder="Share a bit about yourself or why you're interested..."
                  className="w-full bg-[#0B0F0C] border border-[#1A211A] rounded-lg p-3 text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none resize-none h-24"
                />

                {/* Helper Tips */}
                {messageText.length < 120 && (
                  <div className="mt-2 text-xs text-[#A9B5AA] space-y-1">
                    <p className="font-medium text-[#D9FF3D]">Tips for a great message:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Share what drew you to their profile</li>
                      <li>Ask a thoughtful question</li>
                      <li>Be authentic and genuine</li>
                    </ul>
                  </div>
                )}
              </div>

              {messageFeedback && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {messageFeedback}
                </div>
              )}

              <button
                onClick={async () => {
                  const existingConversation = getConversation(selectedProfileUser.id);
                  let sent = false;
                  setMessageFeedback(null);

                  // Only express interest if there's no existing conversation
                  if (!existingConversation) {
                    const result = await expressInterest(selectedProfileUser.id, messageText);
                    sent = result.sent;
                    if (!sent && result.feedback) {
                      setMessageFeedback(result.feedback);
                    }
                  } else if (messageText.trim()) {
                    // If conversation exists, just respond
                    const result = await respondToInterest(selectedProfileUser.id, messageText);
                    sent = result.sent;
                    if (!sent && result.feedback) {
                      setMessageFeedback(result.feedback);
                    }
                  }
                  if (!sent) return;

                  // Close the modal and show background check if needed
                  setMessageFeedback(null);
                  setMessageText('');

                  if (currentUser.assessmentPassed && !currentUser.backgroundCheckVerified) {
                    setShowBackgroundCheckModal(true);
                  } else {
                    // Show confirmation and close
                    setSelectedProfileUser(null);
                  }
                }}
                disabled={messageText.length < 120}
                className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                  messageText.length >= 120
                    ? 'bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#E8FF66]'
                    : 'bg-[#1A211A] text-[#A9B5AA] cursor-not-allowed'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Send Message
              </button>
              <button
                onClick={() => {
                  console.log('ðŸ“‹ Report User button clicked. Opening modal for user:', selectedProfileUser?.id);
                  setShowReportModal(true);
                }}
                className="w-full py-3 bg-[#1A211A] text-[#A9B5AA] rounded-lg font-medium hover:text-[#F6FFF2] transition-colors"
              >
                Report User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthModeSection;


