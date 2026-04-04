import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { signOutAndClearLocalUser } from '@/services/authService';
import { PATH_LABELS, readPathResourcesFromStorage, writePathResourcesToStorage } from '@/lib/pathways';
import { BookOpen, Clock, CheckCircle, Heart, Sparkles, TrendingUp, Zap, Users, Brain, Target } from 'lucide-react';
import type { AppView, BlogArticle, GrowthResource, PartnerJourneyBadge } from '@/types';
import ModulesCarouselModal from '@/components/ModulesCarouselModal';
import { resourceService } from '@/services/resourceService';
import { blogService } from '@/services/blogService';
import {
  getPartnerJourneyBadgeLabel,
  hasPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';
import { rememberResourceSpaceOrigin } from '@/lib/resourceSpaceNavigation';

type PartnerJourneySection = {
  title: string;
  badge: PartnerJourneyBadge;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  view: Extract<AppView, 'aware-partner' | 'intentional-partner' | 'healthy-partner'>;
};

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

const PaidGrowthModeSection: React.FC = () => {
  const {
    currentUser,
    setCurrentView,
    getUnreadNotifications,
    markNotificationAsRead,
    reloadNotifications,
  } = useApp();
  const [activeResource, setActiveResource] = useState<string | null>(null);
  const [selectedResourceForModal, setSelectedResourceForModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'blog'>('resources');
  const [resources, setResources] = useState<GrowthResource[]>(() =>
    readPathResourcesFromStorage('alignment', [])
  );
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
  const publicBlogs = blogs.filter((blog) => !isModuleOnly(blog) && blog.published !== false);

  // Reload notifications when section loads
  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  // Load public blogs from the shared user feed
  useEffect(() => {
    const loadBlogs = async () => {
      const publicBlogFeed = await blogService.getPublicBlogsWithFallback();
      setBlogs(publicBlogFeed);
    };

    void loadBlogs();
  }, []);

  // Load alignment path resources from Supabase.
  useEffect(() => {
    const loadAlignmentResources = async () => {
      try {
        const supabaseResources = await resourceService.getResources('alignment');
        setResources(supabaseResources);
        writePathResourcesToStorage('alignment', supabaseResources);
      } catch (error) {
        console.error('Failed to load alignment path resources from Supabase:', error);
        setResources(readPathResourcesFromStorage('alignment', []));
      }
    };

    loadAlignmentResources();
  }, []);
  const [pathProgress] = useState<Record<string, number>>({
    pg1: 60,
    pg2: 30,
    pg3: 0,
    pg4: 45,
    pg5: 25,
  });

  const visibleResources = useMemo(() => resources, [resources]);

  // Map categories to icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Partnership':
        return <Users className="w-5 h-5" />;
      case 'Intimacy':
        return <Heart className="w-5 h-5" />;
      case 'Vision':
        return <Sparkles className="w-5 h-5" />;
      case 'Connection':
        return <Zap className="w-5 h-5" />;
      case 'Resilience':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  // Get status based on progress
  const getPathStatus = (resourceId: string) => {
    const progress = pathProgress[resourceId] || 0;
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'not-started';
  };

  // Get color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 border-emerald-500';
      case 'in-progress':
        return 'bg-blue-500/10 border-blue-500';
      case 'not-started':
        return 'bg-[#111611] border-[#1A211A]';
      default:
        return 'bg-[#111611] border-[#1A211A]';
    }
  };

  const handleLogout = async () => {
    await signOutAndClearLocalUser();
    setCurrentView('landing');
  };

  const handleBrowseProfiles = () => {
    setCurrentView('browse');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-emerald-500/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={handleBrowseProfiles}
              className="shrink-0 pb-4 pt-4 px-3 sm:px-4 font-medium text-[#A9B5AA] hover:text-[#F6FFF2] transition-all border-b-2 border-transparent"
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Users className="w-4 h-4" />
                Browse Profiles
              </div>
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`shrink-0 pb-4 pt-4 px-3 sm:px-4 font-medium transition-all border-b-2 ${
                activeTab === 'resources'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-[#A9B5AA] border-transparent hover:text-[#F6FFF2]'
              }`}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <BookOpen className="w-4 h-4" />
                Alignment Resources
              </div>
            </button>
            <button
              onClick={() => setActiveTab('blog')}
              className={`shrink-0 pb-4 pt-4 px-3 sm:px-4 font-medium transition-all border-b-2 ${
                activeTab === 'blog'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-[#A9B5AA] border-transparent hover:text-[#F6FFF2]'
              }`}
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <BookOpen className="w-4 h-4" />
                Blog
              </div>
            </button>
            <button
              onClick={() => setCurrentView('clarity-room')}
              className="shrink-0 pb-4 pt-4 px-3 sm:px-4 font-medium transition-all text-[#A9B5AA] hover:text-emerald-400 border-b-2 border-transparent"
            >
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Brain className="w-4 h-4" />
                Clarity Room
              </div>
            </button>
          </div>
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

        {/* Hero Section */}
        <div className="text-center mb-12 pb-12 border-b border-emerald-500/20">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="font-display text-[clamp(32px,5vw,48px)] text-[#F6FFF2] mb-4">
            You're Ready to Build
          </h2>
          <p className="text-[#F6FFF2] text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
            You've demonstrated the readiness to build intentional, lasting partnerships. These resources are designed to help you deepen your capacity to love and be loved.
          </p>
          <p className="text-[#A9B5AA] text-base max-w-2xl mx-auto leading-relaxed">
            <span className="text-emerald-400 font-medium">{PATH_LABELS.alignment}</span> is for members who passed the assessment and are ready to deepen partnership capacity while building stable, intentional relationships.
          </p>
        </div>

        {/* Growth Resources */}
        {activeTab === 'resources' && (
        <>
        <div className="mb-12">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Partner Journey</p>
            <h3 className="mt-2 font-display text-2xl text-[#F6FFF2]">Resource Area Sections</h3>
            <p className="mt-2 max-w-3xl text-sm text-[#A9B5AA]">Choose a section below.</p>
          </div>

          <div className="space-y-4">
            {PARTNER_JOURNEY_SECTIONS.map((section, index) => {
              const Icon = section.icon;
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

              return (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => {
                    rememberResourceSpaceOrigin('paid-growth-mode');
                    setCurrentView(section.view);
                  }}
                  className="w-full rounded-2xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-5 text-left transition hover:border-[#D9FF3D]/50 hover:bg-[#D9FF3D]/12"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#D9FF3D]/20 text-[#D9FF3D]">
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
                      <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-200">
                        {sectionBadgeEarned ? 'Badge earned' : 'Ready to open'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-[#D9FF3D]/20 bg-[#0B0F0C]/50 px-4 py-4">
                    <p className="text-sm text-[#A9B5AA]">{cardActionCopy}</p>
                    <span className="text-sm font-medium text-[#D9FF3D]">Open</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-12">
          <h3 className="font-mono-label text-[#F6FFF2] mb-2">Deepen Your Alignment</h3>
          <p className="text-[#A9B5AA] text-sm mb-6">These resources belong to {PATH_LABELS.alignment} and support partnership readiness, clarity, intimacy, and resilience.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {visibleResources.map((resource: any) => {
              const status = getPathStatus(resource.id);
              const progress = pathProgress[resource.id] || 0;
              const isCompleted = progress === 100;
              const hasModules = Array.isArray(resource.modules) && resource.modules.length > 0;

              return (
                <div
                  key={resource.id}
                  onClick={() => {
                    if (hasModules) {
                      setSelectedResourceForModal(resource);
                      return;
                    }
                    setActiveResource(activeResource === resource.id ? null : resource.id);
                  }}
                  className={`rounded-[20px] border p-5 cursor-pointer transition-all duration-300 ${
                    getStatusColor(status)
                  } ${activeResource === resource.id ? 'ring-2 ring-emerald-500/50' : ''}`}
                >
                  {/* Completion Badge */}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 bg-emerald-400 text-[#0B0F0C] rounded-full p-1.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-[#1A211A] text-[#A9B5AA]'
                    }`}>
                      {getCategoryIcon(resource.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-[#F6FFF2] font-medium">{resource.title}</h4>
                        {progress > 0 && !isCompleted && (
                          <span className="text-xs font-medium text-blue-400 whitespace-nowrap">{progress}%</span>
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
                          status === 'completed' ? 'bg-emerald-400' :
                          status === 'in-progress' ? 'bg-blue-500' :
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
                  <div className="flex items-center gap-4 text-xs text-[#A9B5AA] pt-3 border-t border-[#1A211A]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {resource.estimatedTime}
                    </span>
                    {hasModules && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                        {resource.modules.length} modules
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full ${
                      status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-[#1A211A] text-[#A9B5AA]'
                    }`}>
                      {resource.category}
                    </span>
                  </div>

                  {/* Expanded View */}
                  {activeResource === resource.id && (
                    <div className="mt-4 pt-4 border-t border-[#1A211A]">
                      <p className="text-[#A9B5AA] text-sm mb-3">
                        This resource will help you develop advanced skills in {resource.category.toLowerCase()}.
                        Work through it at your own pace to enhance your capacity for partnership.
                      </p>
                      <button className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Mark as started
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}

        {/* Blog View */}
        {activeTab === 'blog' && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-[#F6FFF2] mb-6">Community Blog</h3>
            {publicBlogs.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-emerald-500/30 mx-auto mb-4" />
                <p className="text-[#A9B5AA]">No articles available yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {publicBlogs.map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => setCurrentView('community-blog')}
                    className="bg-[#111611] border border-emerald-500/20 rounded-lg p-6 cursor-pointer hover:border-emerald-400 transition group"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">
                        {blog.category}
                      </span>
                      {blog.readTime && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {blog.readTime}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition">
                      {blog.title}
                    </h3>
                    <p className="text-gray-400 text-sm">{blog.excerpt}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleBrowseProfiles}
            className="btn-primary"
          >
            Back to Browse
          </button>
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
            "Great partnerships aren't built on perfection—they're built on two people committed to growing together. Your work here matters."
          </p>
        </div>
      </main>

      <ModulesCarouselModal
        isOpen={!!selectedResourceForModal}
        resourceId={selectedResourceForModal?.id}
        resourceTitle={selectedResourceForModal?.title || ''}
        modules={selectedResourceForModal?.modules || []}
        onClose={() => setSelectedResourceForModal(null)}
      />
    </div>
  );
};

export default PaidGrowthModeSection;
