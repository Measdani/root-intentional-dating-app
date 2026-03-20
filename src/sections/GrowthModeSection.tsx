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
import { toast } from 'sonner';
import { BookOpen, Clock, Sparkles, Brain, Target, Heart, Users, MessageCircle, Send, X } from 'lucide-react';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import ReportUserModal from '@/components/ReportUserModal';
import { getUserSettingsForUser } from '@/services/userSettingsService';
import { blogService } from '@/services/blogService';
import { ASSESSMENT_CORE_STYLES, ASSESSMENT_STYLE_META } from '@/services/assessmentStyleService';
import {
  getPartnerJourneyBadgeLabel,
  hasPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';
import type { AppView, User, AssessmentCoreStyle, PartnerJourneyBadge, BlogArticle } from '@/types';

type ResourceProgressMap = Record<
  string,
  {
    viewedModuleIds: string[];
    totalModules: number;
    updatedAt: number;
  }
>;

type CompatibilityInsight = {
  howYouConnect: string;
  rootedRule: string;
};

type PartnerJourneySection = {
  title: string;
  badge: PartnerJourneyBadge;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  view?: AppView;
  isPlaceholder?: boolean;
};

const STYLE_PAIR_INSIGHTS: Record<AssessmentCoreStyle, Record<AssessmentCoreStyle, CompatibilityInsight>> = {
  oak: {
    oak: {
      howYouConnect:
        'Two Oaks value honesty and direct communication. Both may want to address issues immediately, which can lead to powerful conversations but also stubborn stand-offs.',
      rootedRule:
        'Take turns speaking and focus on solving the issue rather than proving who is right.',
    },
    willow: {
      howYouConnect:
        'The Oak speaks directly while the Willow prioritizes emotional harmony. The Oak may push for clarity while the Willow tries to soften the conversation.',
      rootedRule:
        'The Oak slows the conversation slightly, and the Willow shares their needs clearly instead of avoiding tension.',
    },
    fern: {
      howYouConnect:
        'The Oak addresses issues quickly while the Fern prefers time to process emotions before responding.',
      rootedRule:
        'Give the Fern space to reflect before the Oak begins the conversation.',
    },
    gardener: {
      howYouConnect:
        'The Oak brings honesty and courage while the Gardener focuses on collaboration and growth.',
      rootedRule:
        'Let the Gardener guide the conversation toward solutions while the Oak keeps communication clear and direct.',
    },
    wildflower: {
      howYouConnect:
        'The Oak brings stability while the Wildflower brings optimism and emotional warmth.',
      rootedRule:
        'Balance serious conversations with moments of appreciation and shared joy.',
    },
  },
  willow: {
    oak: {
      howYouConnect:
        'The Willow focuses on emotional harmony while the Oak values direct communication.',
      rootedRule:
        'The Oak softens the delivery while the Willow communicates needs clearly instead of avoiding the issue.',
    },
    willow: {
      howYouConnect:
        'Two Willows value empathy and harmony. Difficult topics may sometimes be avoided to maintain peace.',
      rootedRule:
        'Create regular check-in conversations where both partners can speak honestly.',
    },
    fern: {
      howYouConnect:
        'Both partners are emotionally aware and thoughtful. However, discussions may be delayed because neither wants to create tension.',
      rootedRule:
        'Gently bring up concerns early before they grow silently.',
    },
    gardener: {
      howYouConnect:
        'The Willow provides emotional understanding while the Gardener focuses on growth and collaboration.',
      rootedRule:
        'Balance empathy with action by turning understanding into shared solutions.',
    },
    wildflower: {
      howYouConnect:
        'The Willow brings emotional depth while the Wildflower brings playfulness and optimism.',
      rootedRule:
        'Maintain emotional connection while still addressing important conversations honestly.',
    },
  },
  fern: {
    oak: {
      howYouConnect:
        'The Fern may need space while the Oak prefers immediate discussion.',
      rootedRule:
        'The Fern communicates when they will return to the conversation, and the Oak respects the reflection period.',
    },
    willow: {
      howYouConnect:
        'Both partners are emotionally aware but may hesitate to bring up conflict.',
      rootedRule:
        'Create gentle, intentional moments to talk through concerns openly.',
    },
    fern: {
      howYouConnect:
        'Both partners process emotions internally and may need time before discussing conflict.',
      rootedRule:
        'Agree to revisit important conversations after reflection instead of letting them fade away.',
    },
    gardener: {
      howYouConnect:
        'The Fern reflects deeply while the Gardener seeks collaborative solutions.',
      rootedRule:
        'Allow reflection time first, then let the Gardener guide the conversation toward understanding.',
    },
    wildflower: {
      howYouConnect:
        'The Fern brings introspection while the Wildflower brings curiosity and lightness.',
      rootedRule:
        'Respect quiet reflection while still nurturing shared experiences together.',
    },
  },
  gardener: {
    oak: {
      howYouConnect:
        'The Gardener encourages growth while the Oak brings honesty and clarity.',
      rootedRule:
        'Combine honesty with curiosity to focus conversations on growth instead of blame.',
    },
    willow: {
      howYouConnect:
        'The Gardener works toward solutions while the Willow ensures emotional understanding.',
      rootedRule:
        'Balance empathy with action to turn understanding into meaningful change.',
    },
    fern: {
      howYouConnect:
        'The Gardener seeks discussion while the Fern prefers reflection first.',
      rootedRule:
        'Allow reflection time before returning together to work through the issue.',
    },
    gardener: {
      howYouConnect:
        'Both partners believe relationships grow through effort and communication.',
      rootedRule:
        'Remember to enjoy the relationship, not just improve it.',
    },
    wildflower: {
      howYouConnect:
        'The Gardener builds stability while the Wildflower keeps the relationship vibrant.',
      rootedRule:
        'Let the Gardener nurture the foundation while the Wildflower keeps curiosity alive.',
    },
  },
  wildflower: {
    oak: {
      howYouConnect:
        'The Wildflower brings joy while the Oak provides structure and stability.',
      rootedRule:
        'Balance seriousness with playfulness so the relationship stays both strong and joyful.',
    },
    willow: {
      howYouConnect:
        'The Wildflower adds energy while the Willow adds emotional understanding.',
      rootedRule:
        'Let curiosity and empathy work together to keep communication open.',
    },
    fern: {
      howYouConnect:
        'The Wildflower encourages connection while the Fern values reflection.',
      rootedRule:
        'Balance adventure with moments of quiet connection.',
    },
    gardener: {
      howYouConnect:
        'The Wildflower brings excitement while the Gardener builds lasting foundations.',
      rootedRule:
        'Allow growth and fun to coexist so the relationship remains both stable and vibrant.',
    },
    wildflower: {
      howYouConnect:
        'Two Wildflowers bring excitement, adventure, and emotional warmth.',
      rootedRule:
        'Create shared routines that help the relationship stay grounded.',
    },
  },
};

const getDefaultPartnerStyle = (yourStyle: AssessmentCoreStyle): AssessmentCoreStyle =>
  ASSESSMENT_CORE_STYLES.find((style) => style !== yourStyle) ?? yourStyle;

const PARTNER_JOURNEY_SECTIONS: PartnerJourneySection[] = [
  {
    title: 'The Aware Partner',
    badge: 'aware-partner-badge',
    description: 'This first section is in place and anchors the full relationship-growth journey.',
    icon: Brain,
    view: 'aware-partner',
  },
  {
    title: 'The Intentional Partner',
    badge: 'intentional-partner-badge',
    description: 'Awareness without action keeps you stuck.',
    icon: Target,
    view: 'intentional-partner',
  },
  {
    title: 'The Healthy Partner',
    badge: 'healthy-partner-badge',
    description: 'This is where growth becomes consistency.',
    icon: Heart,
    view: 'healthy-partner',
  },
];

const GrowthModeSection: React.FC = () => {
  const growthModeTabStorageKey = 'rooted_growth_mode_active_tab';
  const resolveInitialGrowthModeTab = (): 'browse' | 'inbox' | 'resources' | 'blog' => {
    const saved = localStorage.getItem(growthModeTabStorageKey);
    return saved === 'browse' || saved === 'inbox' || saved === 'resources' || saved === 'blog'
      ? saved
      : 'browse';
  };
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
    reportUser,
    blockUser,
    isUserBlocked,
    isBlockedByUser,
    getUnreadNotifications,
    markNotificationAsRead,
    reloadNotifications,
    reloadInteractions,
  } = useApp();
  const [activeTab, setActiveTab] =
    useState<'browse' | 'inbox' | 'resources' | 'blog'>(resolveInitialGrowthModeTab);
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageFeedback, setMessageFeedback] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [modeRefreshTick, setModeRefreshTick] = useState(0);
  const defaultYourStyle = currentUser.primaryStyle ?? assessmentResult?.primaryStyle ?? 'oak';
  const defaultPartnerStyle =
    currentUser.secondaryStyle ??
    assessmentResult?.secondaryStyle ??
    getDefaultPartnerStyle(defaultYourStyle);
  const [showCompatibilityMapModal, setShowCompatibilityMapModal] = useState(false);
  const [compatibilityYourStyle, setCompatibilityYourStyle] =
    useState<AssessmentCoreStyle>(defaultYourStyle);
  const [compatibilityPartnerStyle, setCompatibilityPartnerStyle] =
    useState<AssessmentCoreStyle>(defaultPartnerStyle);
  const selectedCompatibilityInsight = useMemo(
    () => STYLE_PAIR_INSIGHTS[compatibilityYourStyle][compatibilityPartnerStyle],
    [compatibilityYourStyle, compatibilityPartnerStyle]
  );

  useEffect(() => {
    setCompatibilityYourStyle(defaultYourStyle);
    setCompatibilityPartnerStyle(defaultPartnerStyle);
  }, [defaultPartnerStyle, defaultYourStyle, currentUser.id]);

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
    console.log('🔄 showReportModal state changed to:', showReportModal);
  }, [showReportModal]);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
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

  useEffect(() => {
    const loadBlogs = async () => {
      const publicBlogFeed = await blogService.getPublicBlogsWithFallback();
      setBlogs(publicBlogFeed);
    };

    void loadBlogs();
  }, []);
  const progressStorageKey = useMemo(
    () => `rooted_growth_module_progress_${currentUser.id}`,
    [currentUser.id]
  );
  const [resourceProgress, setResourceProgress] = useState<ResourceProgressMap>({});
  useEffect(() => {
    localStorage.setItem(growthModeTabStorageKey, activeTab);
  }, [activeTab, growthModeTabStorageKey]);

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
            onClick={() => window.dispatchEvent(new Event('open-forest-assistant'))}
            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            title="Open Forest"
            aria-label="Open Forest"
          >
            <Sparkles className="w-5 h-5" />
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
              Explore Connections
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
              The Garden
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
          <button
            onClick={() => setShowCompatibilityMapModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D9FF3D]/40 text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition"
          >
            <Users className="w-4 h-4" />
            Compatibility Map
          </button>
        </div>

        <div className="mb-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Partner Journey</p>
            <h3 className="mt-2 font-display text-2xl text-[#F6FFF2]">Resource Area Sections</h3>
            <p className="mt-2 max-w-3xl text-sm text-[#A9B5AA]">
              Choose a section below. The Aware Partner now opens its own page so the path navigation has a dedicated space.
            </p>
          </div>

          <div className="space-y-4">
            {PARTNER_JOURNEY_SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const isInteractive = Boolean(section.view);
              const cardActionCopy =
                section.view === 'aware-partner'
                  ? 'Open this section to enter Path Navigation.'
                  : section.view === 'intentional-partner'
                    ? 'Open this section to enter The Conflict Sandbox.'
                    : 'Open this section to enter The Pace Meter.';
              const sectionBadgeEarned = hasPartnerJourneyBadge(
                currentUser.partnerJourneyBadges,
                section.badge
              );
              const baseCardClassName = `rounded-2xl border p-5 ${
                section.isPlaceholder
                  ? 'border-[#2A312A] bg-[#111611]'
                  : 'border-[#D9FF3D]/30 bg-[#D9FF3D]/10'
              }`;

              const cardBody = (
                <>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                          section.isPlaceholder
                            ? 'bg-[#1A211A] text-[#A9B5AA]'
                            : 'bg-[#D9FF3D]/20 text-[#D9FF3D]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Section {index + 1}</p>
                        <h4 className="mt-1 text-xl font-semibold text-[#F6FFF2]">{section.title}</h4>
                        <p className="mt-2 text-sm text-[#A9B5AA]">{section.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sectionBadgeEarned && (
                        <span className="rounded-full border border-[#D9FF3D]/30 px-3 py-1 text-xs font-medium text-[#D9FF3D]">
                          {getPartnerJourneyBadgeLabel(section.badge)}
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          section.isPlaceholder
                            ? 'border-[#2A312A] text-[#A9B5AA]'
                            : 'border-emerald-400/30 text-emerald-200'
                        }`}
                      >
                        {section.isPlaceholder
                          ? 'Frame ready'
                          : sectionBadgeEarned
                            ? 'Badge earned'
                            : 'Ready to open'}
                      </span>
                    </div>
                  </div>

                  {isInteractive ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#D9FF3D]/20 bg-[#0B0F0C]/50 px-4 py-4">
                      <p className="text-sm text-[#A9B5AA]">{cardActionCopy}</p>
                      <span className="text-sm font-medium text-[#D9FF3D]">Open</span>
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-[96px] items-center rounded-xl border border-dashed border-[#2E372E] bg-[#0B0F0C] px-4 py-5">
                      <p className="text-sm text-[#A9B5AA]">
                        Section frame added. Share the lesson structure and content for this section and I can build it next.
                      </p>
                    </div>
                  )}
                </>
              );

              if (section.view) {
                return (
                  <button
                    key={section.title}
                    type="button"
                    onClick={() => {
                      localStorage.setItem(growthModeTabStorageKey, 'resources');
                      setCurrentView(section.view as AppView);
                    }}
                    className={`${baseCardClassName} w-full text-left transition hover:border-[#D9FF3D]/50 hover:bg-[#D9FF3D]/12`}
                  >
                    {cardBody}
                  </button>
                );
              }

              return (
                <div key={section.title} className={baseCardClassName}>
                  {cardBody}
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

      {showCompatibilityMapModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm"
            onClick={() => setShowCompatibilityMapModal(false)}
          />
          <div className="relative w-full max-w-3xl rounded-2xl border border-[#1A211A] bg-[#111611] p-5 md:p-6">
            <button
              onClick={() => setShowCompatibilityMapModal(false)}
              className="absolute right-3 top-3 rounded-full bg-[#1A211A] p-2 text-[#A9B5AA] hover:text-[#F6FFF2]"
              aria-label="Close compatibility map"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-2xl text-[#F6FFF2]">Compatibility Map</h3>
            <p className="mt-2 text-sm text-[#A9B5AA]">
              Select your style and a prospective partner&apos;s style to view one focused compatibility insight.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#A9B5AA]">
                  Your Style
                </label>
                <select
                  value={compatibilityYourStyle}
                  onChange={(e) => setCompatibilityYourStyle(e.target.value as AssessmentCoreStyle)}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                >
                  {ASSESSMENT_CORE_STYLES.map((style) => {
                    const meta = ASSESSMENT_STYLE_META[style];
                    return (
                      <option key={`compatibility-your-${style}`} value={style}>
                        {meta.label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#A9B5AA]">
                  Prospective Partner Style
                </label>
                <select
                  value={compatibilityPartnerStyle}
                  onChange={(e) => setCompatibilityPartnerStyle(e.target.value as AssessmentCoreStyle)}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] focus:border-[#D9FF3D] focus:outline-none"
                >
                  {ASSESSMENT_CORE_STYLES.map((style) => {
                    const meta = ASSESSMENT_STYLE_META[style];
                    return (
                      <option key={`compatibility-partner-${style}`} value={style}>
                        {meta.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Compatibility Insight</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#A9B5AA]">
                <span>
                  {ASSESSMENT_STYLE_META[compatibilityYourStyle].emoji} {ASSESSMENT_STYLE_META[compatibilityYourStyle].label}
                </span>
                <span>+</span>
                <span>
                  {ASSESSMENT_STYLE_META[compatibilityPartnerStyle].emoji} {ASSESSMENT_STYLE_META[compatibilityPartnerStyle].label}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">How You Connect</p>
                <p className="mt-1.5 text-sm text-[#F6FFF2]">{selectedCompatibilityInsight.howYouConnect}</p>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Rooted Rule</p>
                <p className="mt-1.5 text-sm text-[#D9FF3D]">{selectedCompatibilityInsight.rootedRule}</p>
              </div>
            </div>
          </div>
        </div>
      )}


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






