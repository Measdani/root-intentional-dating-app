import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import {
  canUsersMatch,
  communityIdToPoolId,
  getUserPoolId,
  isUserInPool,
  poolIdToCommunityId,
  useCommunity,
} from '@/modules';
import { growthResources } from '@/data/assessment';
import { toast } from 'sonner';
import { BookOpen, Clock, CheckCircle, Calendar, Sparkles, TrendingUp, Brain, Target, Heart, Shield, Zap, Users, HelpCircle, MessageCircle, Send, X } from 'lucide-react';
import ModulesCarouselModal from '@/components/ModulesCarouselModal';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import ReportUserModal from '@/components/ReportUserModal';
import { getUserSettingsForUser } from '@/services/userSettingsService';
import type { User } from '@/types';

type ResourceProgressMap = Record<
  string,
  {
    viewedModuleIds: string[];
    totalModules: number;
    updatedAt: number;
  }
>;

const GrowthModeSection: React.FC = () => {
  const { activeCommunity } = useCommunity();
  const {
    assessmentResult,
    setCurrentView,
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
  } = useApp();
  const [selectedResourceForModal, setSelectedResourceForModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'inbox' | 'resources' | 'blog'>('browse');
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Log state changes
  useEffect(() => {
    console.log('🔄 showReportModal state changed to:', showReportModal);
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

    return users.filter(
      u => {
        if (u.assessmentPassed) return false;
        if (u.id === currentUser.id) return false;
        if (!isUserInPool(u, viewerPool)) return false;
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
  ]);

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

  const handleModuleViewed = (resourceId: string, moduleId: string, totalModules: number) => {
    if (!resourceId || !moduleId) return;

    setResourceProgress((previous) => {
      const current = previous[resourceId] || {
        viewedModuleIds: [],
        totalModules: 0,
        updatedAt: Date.now(),
      };

      const viewedSet = new Set<string>(current.viewedModuleIds);
      const beforeSize = viewedSet.size;
      viewedSet.add(moduleId);

      const nextTotalModules = Math.max(
        current.totalModules || 0,
        Number.isFinite(totalModules) ? totalModules : 0,
        viewedSet.size
      );

      if (beforeSize === viewedSet.size && nextTotalModules === current.totalModules) {
        return previous;
      }

      return {
        ...previous,
        [resourceId]: {
          viewedModuleIds: Array.from(viewedSet),
          totalModules: nextTotalModules,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // Get color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[#D9FF3D]/10 border-[#D9FF3D]';
      case 'in-progress':
        return 'bg-amber-500/10 border-amber-500';
      case 'not-started':
        return 'bg-[#111611] border-[#1A211A]';
      default:
        return 'bg-[#111611] border-[#1A211A]';
    }
  };

  const formatCategoryLabel = (category: string) => {
    switch (category) {
      case 'emotional-regulation':
        return 'Emotional Regulation';
      case 'accountability':
        return 'Accountability';
      case 'autonomy':
        return 'Autonomy & Wholeness';
      case 'boundaries':
        return 'Boundaries';
      case 'conflict-repair':
        return 'Conflict & Repair';
      default:
        return category
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  };

  const improvementAreas = useMemo(() => {
    if (!assessmentResult) return [];

    const scoreBasedAreas = Object.entries(assessmentResult.categoryScores || {})
      .filter(([, score]) => typeof score === 'number' && Number.isFinite(score) && score < 70)
      .map(([category, score]) => ({
        id: category,
        label: formatCategoryLabel(category),
        score: Math.round(score),
      }))
      .sort((a, b) => a.score - b.score);

    if (scoreBasedAreas.length > 0) return scoreBasedAreas;

    return (assessmentResult.growthAreas || [])
      .filter((area) => typeof area === 'string' && area.trim().length > 0)
      .map((area) => ({
        id: area.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: area,
        score: null as number | null,
      }));
  }, [assessmentResult]);

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
              <p className="text-[#A9B5AA] max-w-2xl mx-auto">
                Build your foundation with others on a similar journey. This space is dedicated to those who are working on their relationship skills and emotional growth. You'll connect with others focused on self-awareness, emotional regulation, and healthy partnership dynamics.
              </p>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto mt-4">
                Once you've completed the Inner Work Space resources or after 6 months, you'll unlock full access to the dating pool, where you can connect with individuals who are ready for deeper relationships.
              </p>
            </div>

            {growthModeUsers.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {growthModeUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedProfileUser(user)}
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
                        setSelectedProfileUser(user);
                      }}
                      className="w-full py-2 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg font-medium hover:bg-[#D9FF3D]/20 transition-colors flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      {getConversation(user.id) ? 'Message' : 'Express Interest'}
                      <Send className="w-4 h-4 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
                <p className="text-[#A9B5AA]">No members in growth mode yet. Check back soon!</p>
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
        {/* Original Hero Message */}
        <div className="text-center mb-12 pb-12 border-b border-[#1A211A]">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-4">
            Alignment Requires Readiness
          </h2>
          <p className="text-[#F6FFF2] text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
            Based on your current assessment, we recommend strengthening a few foundational areas before entering partnership mode.
          </p>
          <p className="text-[#A9B5AA] text-base max-w-2xl mx-auto leading-relaxed">
            This is not exclusion — it is preparation. <span className="text-[#F6FFF2] font-medium">Strong partnerships are built on emotional stability, accountability, and conflict repair skills.</span> Entering intentionally protects both you and your future partner.
          </p>
        </div>

        {/* New Growth Mode Section */}
        <div className="text-center mb-12">
          <h2 className="font-display text-[clamp(28px,4vw,40px)] text-[#F6FFF2] mb-4">
            Why Inner Work Space?
          </h2>
          <p className="text-[#A9B5AA] text-base max-w-2xl mx-auto mb-4 leading-relaxed">
            In Inner Work Space, we focus on helping you develop <span className="text-[#D9FF3D]">key emotional, relational, and self-awareness skills.</span> These tools prepare you for deep, meaningful connections with others.
          </p>
          <p className="text-[#A9B5AA] text-sm max-w-2xl mx-auto leading-relaxed">
            By completing one of the Inner Work Space paths, you'll build a stronger sense of self and align with your ideal partner's values, creating the foundation for a lasting and healthy relationship.
          </p>
        </div>

        {/* Score Card */}
        {assessmentResult && (
          <div className="bg-[#111611] rounded-[24px] border border-[#1A211A] p-6 md:p-8 mb-10">
            <div className="flex justify-center md:justify-end mb-6">
              <div className="text-center px-6 py-3 bg-[#1A211A] rounded-xl">
                <Calendar className="w-5 h-5 text-[#D9FF3D] mx-auto mb-1" />
                <p className="text-xs text-[#A9B5AA]">Next Assessment Window:</p>
                <p className="text-[#F6FFF2] font-medium">6 Months</p>
              </div>
            </div>

            {/* Assessment Areas Section */}
            <div className="mb-6 pt-6 border-t border-[#1A211A]">
              <p className="font-mono-label text-[#A9B5AA] mb-4">Areas of Improvement</p>
              {improvementAreas.length > 0 ? (
                <div className="space-y-3">
                  {improvementAreas.map((area) => (
                    <div key={area.id} className="flex items-center gap-4">
                      <span className="text-[#F6FFF2] text-sm flex-1">{area.label}</span>
                      {typeof area.score === 'number' ? (
                        <>
                          <div className="flex-1 max-w-[150px]">
                            <div className="h-1.5 bg-[#1A211A] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  area.score >= 50 ? 'bg-amber-500' : 'bg-[#A9B5AA]'
                                }`}
                                style={{ width: `${area.score}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-[#F6FFF2] text-sm w-10 text-right">{area.score}%</span>
                        </>
                      ) : (
                        <span className="text-xs text-[#A9B5AA]">Growth Focus</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#A9B5AA]">
                  Detailed improvement categories will appear after your next completed assessment.
                </p>
              )}
              <p className="text-xs text-[#A9B5AA] mt-4 opacity-75">
                These skills can be strengthened through guided practice and reflection.
              </p>
            </div>

            {/* Why 6 Months Matters */}
            <div className="pt-6 border-t border-[#1A211A]">
              <p className="font-mono-label text-[#A9B5AA] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Why 6 Months Matters
              </p>
              <div className="space-y-2">
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  Growth is not a weekend decision.
                </p>
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  It is built through consistent reflection, intentional practice, and real-life application.
                </p>
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  Six months allows new patterns to take root so what changes is not just how you answer questions, but how you show up.
                </p>
              </div>
              <p className="text-xs text-[#A9B5AA] mt-3 opacity-75">
                This protects your future relationship from instability and ensures you enter connection grounded, not rushed. Healthy love requires readiness.
              </p>
            </div>
          </div>
        )}

        {/* Growth Resources */}
        <div className="mb-12">
          <h3 className="font-mono-label text-[#F6FFF2] mb-2">Complete 2 Paths in 6 Months to Re-enter Matchmaking</h3>
          <p className="text-[#A9B5AA] text-sm mb-6">Work through these guided resources at your own pace to develop essential skills for lasting connections.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {resources.map((resource: any) => {
              const progress = getResourceProgress(resource);
              const status = getPathStatus(progress);
              const isCompleted = progress === 100;

              return (
              <div
                key={resource.id}
                onClick={() => setSelectedResourceForModal(resource)}
                className={`rounded-[20px] border p-5 cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-[#D9FF3D]/50 ${
                  getStatusColor(status)
                }`}
              >
                {/* Completion Badge */}
                {isCompleted && (
                  <div className="absolute top-3 right-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-full p-1.5">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === 'completed' ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]' :
                    status === 'in-progress' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-[#1A211A] text-[#A9B5AA]'
                  }`}>
                    {getCategoryIcon(resource.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-[#F6FFF2] font-medium">{resource.title}</h4>
                      {progress > 0 && !isCompleted && (
                        <span className="text-xs font-medium text-amber-400 whitespace-nowrap">{progress}%</span>
                      )}
                    </div>
                    <p className="text-[#A9B5AA] text-sm mb-3">{resource.description}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-1.5 bg-[#0B0F0C] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        status === 'completed' ? 'bg-[#D9FF3D]' :
                        status === 'in-progress' ? 'bg-amber-500' :
                        'bg-[#A9B5AA]'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#A9B5AA] mt-1.5">
                    {isCompleted ? '✓ Completed' : progress > 0 ? `${progress}% complete` : 'Not started'}
                  </p>
                </div>

                {/* Info Row */}
                <div className="flex items-center justify-between gap-4 text-xs text-[#A9B5AA] pt-3 border-t border-[#1A211A]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {resource.estimatedTime}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      status === 'completed' ? 'bg-[#D9FF3D]/20 text-[#D9FF3D]' :
                      status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-[#1A211A] text-[#A9B5AA]'
                    }`}>
                      {resource.category}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('growth-detail');
                    }}
                    className="text-[#D9FF3D] hover:text-white font-medium transition whitespace-nowrap"
                  >
                    Learn More →
                  </button>
                </div>

              </div>
            );
            })}
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
            This is not a delay—it is an investment."
          </p>
        </div>
      </main>

      {/* Modules Carousel Modal */}
      <ModulesCarouselModal
        isOpen={!!selectedResourceForModal}
        resourceId={selectedResourceForModal?.id}
        resourceTitle={selectedResourceForModal?.title || ''}
        modules={selectedResourceForModal?.modules || []}
        onClose={() => setSelectedResourceForModal(null)}
        onModuleViewed={handleModuleViewed}
      />

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
            console.log('📝 Submitting report for user:', selectedProfileUser.id, 'reason:', reason);
            await reportUser(selectedProfileUser.id, reason, details);
            if (shouldBlock) {
              console.log('🚫 Blocking user:', selectedProfileUser.id);
              blockUser(selectedProfileUser.id);
            }
            console.log('✅ Report submitted successfully');
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
            onClick={() => setSelectedProfileUser(null)}
          />

          {/* Profile Card */}
          <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProfileUser(null)}
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
                  onChange={(e) => setMessageText(e.target.value)}
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

              <button
                onClick={() => {
                  const existingConversation = getConversation(selectedProfileUser.id);

                  // Only express interest if there's no existing conversation
                  if (!existingConversation) {
                    expressInterest(selectedProfileUser.id, messageText);
                  } else if (messageText.trim()) {
                    // If conversation exists, just respond
                    respondToInterest(selectedProfileUser.id, messageText);
                  }

                  // Close the modal and show background check if needed
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
                  console.log('📋 Report User button clicked. Opening modal for user:', selectedProfileUser?.id);
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
