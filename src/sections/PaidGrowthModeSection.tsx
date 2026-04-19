import React, { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { signOutAndClearLocalUser } from '@/services/authService';
import { PATH_LABELS } from '@/lib/pathways';
import { BookOpen, Brain, Clock, Heart, Target, Users } from 'lucide-react';
import type { AppView, BlogArticle, PartnerJourneyBadge } from '@/types';
import { blogService } from '@/services/blogService';
import {
  getPartnerJourneyBadgeLabel,
  hasRecoveredPartnerJourneyBadge,
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
    title: 'The Aligned Partner',
    badge: 'intentional-partner-badge',
    description: 'Awareness got you here. Alignment is what keeps you here.',
    icon: Target,
    view: 'intentional-partner',
  },
  {
    title: 'The Healthy Partner',
    badge: 'healthy-partner-badge',
    description: 'This is where growth becomes lived consistency.',
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
  const [activeTab, setActiveTab] = useState<'resources' | 'blog'>('resources');
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);

  const isModuleOnly = (blog: BlogArticle | Record<string, unknown>): boolean => {
    const raw = (blog as any)?.moduleOnly ?? (blog as any)?.module_only;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw === 1;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 't' || normalized === 'yes';
    }
    return false;
  };

  const publicBlogs = blogs.filter((blog) => !isModuleOnly(blog) && blog.published !== false);

  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  useEffect(() => {
    const loadBlogs = async () => {
      const publicBlogFeed = await blogService.getPublicBlogsWithFallback();
      setBlogs(publicBlogFeed);
    };

    void loadBlogs();
  }, []);

  const handleLogout = async () => {
    await signOutAndClearLocalUser();
    setCurrentView('landing');
  };

  const handleBrowseProfiles = () => {
    setCurrentView('browse');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
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

      <main className="max-w-4xl mx-auto px-6 py-10">
        {getUnreadNotifications().map((notification) => (
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

        {activeTab === 'resources' && (
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
                      ? 'Open this section to practice maintaining alignment.'
                      : 'Open this section to enter The Pace Meter.';
                const sectionBadgeEarned = hasRecoveredPartnerJourneyBadge(
                  currentUser.id,
                  currentUser.partnerJourneyBadges,
                  currentUser.growthStyleBadges,
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
        )}

        {activeTab === 'blog' && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-[#F6FFF2] mb-6">Rooted Insights Blog</h3>
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

        <div className="mt-12 text-center">
          <p className="text-[#A9B5AA]/60 text-sm max-w-md mx-auto">
            "Great partnerships aren't built on perfection-they're built on two people committed to growing together. Your work here matters."
          </p>
        </div>
      </main>
    </div>
  );
};

export default PaidGrowthModeSection;
