import React, { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import { BookOpen, Clock, CheckCircle, Calendar, Sparkles, TrendingUp, AlertCircle, X, Brain, Target, Heart, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import ModulesCarouselModal from '@/components/ModulesCarouselModal';

const GrowthModeSection: React.FC = () => {
  const { assessmentResult, setCurrentView, resetAssessment, currentUser, users, setSelectedUser } = useApp();
  const [dismissNotification, setDismissNotification] = useState(false);
  const [selectedResourceForModal, setSelectedResourceForModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'resources'>('browse');
  const [resources] = useState(() => {
    const saved = localStorage.getItem('growth-resources');
    return saved ? JSON.parse(saved) : growthResources;
  });
  const [pathProgress] = useState<Record<string, number>>({
    g1: 75,
    g2: 100,
    g3: 0,
    g4: 50,
    g5: 25,
    g6: 40,
  });

  // Filter users who haven't passed assessment (growth-mode pool)
  const growthModeUsers = useMemo(() => {
    return users.filter(u => !u.assessmentPassed && u.id !== currentUser.id);
  }, [users, currentUser.id]);

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
        return 'bg-[#D9FF3D]/10 border-[#D9FF3D]';
      case 'in-progress':
        return 'bg-amber-500/10 border-amber-500';
      case 'not-started':
        return 'bg-[#111611] border-[#1A211A]';
      default:
        return 'bg-[#111611] border-[#1A211A]';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    // Dispatch custom event to trigger AppContext update (StorageEvent doesn't work for same-tab)
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('landing');
  };

  const handleRetake = () => {
    resetAssessment();
    setCurrentView('landing');
    setTimeout(() => {
      const section = document.getElementById('section-assessment');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-center">
          <h1 className="font-display text-xl text-[#F6FFF2]">Growth Mode</h1>
        </div>
      </header>

      {/* Account Status Notification */}
      {(currentUser.userStatus === 'suspended' || currentUser.userStatus === 'needs-growth') && !dismissNotification && (
        <div className={currentUser.userStatus === 'suspended' ? 'bg-red-600/20 border-t border-red-500/30' : 'bg-orange-600/20 border-t border-orange-500/30'}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-start gap-4">
            <AlertCircle className={currentUser.userStatus === 'suspended' ? 'w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' : 'w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5'} />
            <div className="flex-1">
              {currentUser.userStatus === 'suspended' ? (
                <>
                  <h3 className="text-red-300 font-semibold mb-1">Account Suspended</h3>
                  <p className="text-red-200/80 text-sm mb-3">
                    Your account has been temporarily suspended due to violations of our community guidelines. You have been placed in Growth Mode to focus on strengthening your relationship foundation.
                  </p>
                  {currentUser.suspensionEndDate && (
                    <p className="text-red-200/80 text-sm">
                      <strong>Reactivation Date:</strong> {new Date(currentUser.suspensionEndDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-orange-300 font-semibold mb-1">Account Status: Growth Mode</h3>
                  <p className="text-orange-200/80 text-sm">
                    Your account has transitioned to Growth Mode. You must complete one of the learning paths below before you can resume browsing and matching. This is an opportunity to strengthen your relationship foundation.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setDismissNotification(true)}
              className={currentUser.userStatus === 'suspended' ? 'flex-shrink-0 text-red-300 hover:text-red-200 transition-colors' : 'flex-shrink-0 text-orange-300 hover:text-orange-200 transition-colors'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
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
        </div>

        {/* Browse View */}
        {activeTab === 'browse' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl text-[#F6FFF2] mb-2">Dating Pool</h2>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto">
                Connect with others on the same growth journey. This is a safe space to meet people who are also building their relationship foundation. After 6 months or once you pass the assessment, you'll unlock the full dating pool.
              </p>
            </div>

            {growthModeUsers.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {growthModeUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="bg-[#111611] rounded-[20px] border border-[#1A211A] p-6 cursor-pointer hover:border-[#D9FF3D] transition-colors group"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-[#F6FFF2] font-medium text-lg">{user.name}, {user.age}</h3>
                        <p className="text-[#A9B5AA] text-sm">{user.city}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                            Growth Mode
                          </span>
                        </div>
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
                        setSelectedUser(user);
                        setCurrentView('profile');
                      }}
                      className="w-full py-2 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg font-medium hover:bg-[#D9FF3D]/20 transition-colors flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      View Profile
                      <ArrowRight className="w-4 h-4 transition-transform" />
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
            Why Growth Mode?
          </h2>
          <p className="text-[#A9B5AA] text-base max-w-2xl mx-auto mb-4 leading-relaxed">
            In Growth Mode, we focus on helping you develop <span className="text-[#D9FF3D]">key emotional, relational, and self-awareness skills.</span> These tools prepare you for deep, meaningful connections with others.
          </p>
          <p className="text-[#A9B5AA] text-sm max-w-2xl mx-auto leading-relaxed">
            By completing one of the Growth Mode paths, you'll build a stronger sense of self and align with your ideal partner's values, creating the foundation for a lasting and healthy relationship.
          </p>
        </div>

        {/* Score Card */}
        {assessmentResult && (
          <div className="bg-[#111611] rounded-[24px] border border-[#1A211A] p-6 md:p-8 mb-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
              <div className="text-center md:text-left">
                <p className="font-mono-label text-[#A9B5AA] mb-2">Your Assessment Score</p>
                <div className="flex items-baseline gap-2 justify-center md:justify-start">
                  <span className="text-5xl font-display text-[#F6FFF2]">{assessmentResult.percentage}%</span>
                  <span className="text-[#A9B5AA]">/ 78% threshold</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center px-6 py-3 bg-[#1A211A] rounded-xl">
                  <Calendar className="w-5 h-5 text-[#D9FF3D] mx-auto mb-1" />
                  <p className="text-xs text-[#A9B5AA]">Retake in</p>
                  <p className="text-[#F6FFF2] font-medium">6 months</p>
                </div>
              </div>
            </div>

            {/* Assessment Areas Section */}
            {assessmentResult.categoryScores && (
              <div className="mb-6 pt-6 border-t border-[#1A211A]">
                <p className="font-mono-label text-[#A9B5AA] mb-4">Assessment Areas</p>
                <div className="space-y-3">
                  {Object.entries(assessmentResult.categoryScores).map(([category, score]) => (
                    <div key={category} className="flex items-center gap-4">
                      <span className="text-[#F6FFF2] text-sm capitalize flex-1">
                        {category.replace(/-/g, ' ')}
                      </span>
                      <div className="flex-1 max-w-[150px]">
                        <div className="h-1.5 bg-[#1A211A] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              score >= 70 ? 'bg-[#D9FF3D]' : score >= 50 ? 'bg-amber-500' : 'bg-[#A9B5AA]'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[#F6FFF2] text-sm w-10 text-right">{score}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#A9B5AA] mt-4 opacity-75">
                  These areas can be strengthened through guided practice.
                </p>
              </div>
            )}

            {/* Why 6 Months Matters */}
            <div className="pt-6 border-t border-[#1A211A]">
              <p className="font-mono-label text-[#A9B5AA] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Why 6 Months Matters
              </p>
              <div className="space-y-2">
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  <span className="font-medium">Six months allows for measurable behavioral change,</span> not temporary motivation.
                </p>
                <p className="text-[#F6FFF2] text-sm leading-relaxed">
                  <span className="font-medium">Lasting growth requires repetition, reflection, and practice over time.</span>
                </p>
              </div>
              <p className="text-xs text-[#A9B5AA] mt-3 opacity-75">
                This protects you from rushing into dynamics you are still learning to navigate — and protects your future partner from avoidable harm. Healthy relationships deserve readiness, not urgency.
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
              const status = getPathStatus(resource.id);
              const progress = pathProgress[resource.id] || 0;
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
                <div className="flex items-center gap-4 text-xs text-[#A9B5AA] pt-3 border-t border-[#1A211A]">
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

              </div>
            );
            })}
          </div>
        </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {currentUser.userStatus === 'needs-growth' && (
            <button
              onClick={handleRetake}
              className="btn-primary"
            >
              Retake Assessment
            </button>
          )}
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
        resourceTitle={selectedResourceForModal?.title || ''}
        modules={selectedResourceForModal?.modules || []}
        onClose={() => setSelectedResourceForModal(null)}
      />
    </div>
  );
};

export default GrowthModeSection;
