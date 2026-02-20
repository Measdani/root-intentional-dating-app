import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { paidGrowthResources } from '@/data/assessment';
import { BookOpen, Clock, CheckCircle, Heart, Sparkles, TrendingUp, Zap, Users, Lock } from 'lucide-react';
import type { BlogArticle } from '@/types';

const PaidGrowthModeSection: React.FC = () => {
  const { setCurrentView, currentUser } = useApp();
  const [activeResource, setActiveResource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'blog'>('resources');
  const [resources] = useState(() => {
    const saved = localStorage.getItem('paid-growth-resources');
    return saved ? JSON.parse(saved) : paidGrowthResources;
  });
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);

  // Load blogs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('community-blogs');
    if (saved) {
      setBlogs(JSON.parse(saved));
    }
  }, []);
  const [pathProgress] = useState<Record<string, number>>({
    pg1: 60,
    pg2: 30,
    pg3: 0,
    pg4: 45,
    pg5: 25,
  });

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

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('storage'));
    setCurrentView('landing');
  };

  const handleBrowseProfiles = () => {
    setCurrentView('browse');
  };

  // Check if user has paid membership
  const isPaidMember = currentUser.membershipTier === 'quarterly' || currentUser.membershipTier === 'annual';

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-emerald-500/30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBrowseProfiles}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
          >
            <span>Browse Profiles</span>
          </button>
          <h1 className="font-display text-xl text-[#F6FFF2]">Partnership Growth Path</h1>
          <div className="w-24" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
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
            <span className="text-emerald-400 font-medium">As a paid member,</span> you have access to advanced growth paths that will help you navigate partnership, intimacy, shared vision, and resilience. Your investment in growth today becomes the foundation of exceptional relationships.
          </p>
        </div>

        {/* Welcome Badge */}
        <div className="bg-emerald-500/10 rounded-[24px] border border-emerald-500/30 p-6 md:p-8 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-emerald-300 mb-2">Assessment Passed ✓</h3>
              <p className="text-[#A9B5AA] text-sm mb-3">
                You've shown the emotional stability, accountability, and self-awareness needed to build healthy relationships. Now it's time to go deeper.
              </p>
              <p className="text-xs text-[#D9FF3D]">
                💚 Unlock the full potential of partnership with our premium growth resources
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-10 flex gap-4 border-b border-emerald-500/20">
          <button
            onClick={() => setActiveTab('resources')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'resources'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Advanced Resources
            </div>
          </button>
          <button
            onClick={() => setActiveTab('blog')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'blog'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Blog
            </div>
          </button>
        </div>

        {/* Growth Resources */}
        {activeTab === 'resources' && (
        <div className="mb-12">
          <h3 className="font-mono-label text-[#F6FFF2] mb-2">Deepen Your Partnership Skills</h3>
          <p className="text-[#A9B5AA] text-sm mb-6">These advanced resources help you become the best partner you can be. Work through them at your own pace as you navigate relationship building.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {resources.map((resource: any) => {
              const status = getPathStatus(resource.id);
              const progress = pathProgress[resource.id] || 0;
              const isCompleted = progress === 100;

              return (
                <div
                  key={resource.id}
                  onClick={() => setActiveResource(activeResource === resource.id ? null : resource.id)}
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
        )}

        {/* Blog View */}
        {activeTab === 'blog' && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-[#F6FFF2] mb-6">Community Blog</h3>
            {blogs.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-emerald-500/30 mx-auto mb-4" />
                <p className="text-[#A9B5AA]">No articles available yet</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {blogs.map((blog) => (
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

        {/* Membership Check */}
        {!isPaidMember && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-[20px] p-6 mb-12 text-center">
            <Lock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
            <p className="text-amber-300 font-medium mb-2">Premium Content</p>
            <p className="text-[#A9B5AA] text-sm mb-4">
              These resources are available to quarterly and annual members. Upgrade to unlock your full potential.
            </p>
            <button
              onClick={() => setCurrentView('membership')}
              className="px-6 py-2 bg-amber-500/20 text-amber-400 rounded-lg font-medium hover:bg-amber-500/30 transition-colors"
            >
              View Membership Options
            </button>
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
    </div>
  );
};

export default PaidGrowthModeSection;
