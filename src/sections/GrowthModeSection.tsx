import React, { useState, useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import { toast } from 'sonner';
import { BookOpen, Clock, CheckCircle, Calendar, Sparkles, TrendingUp, AlertCircle, X, Brain, Target, Heart, Shield, Zap, Users, HelpCircle, MessageCircle, Send } from 'lucide-react';
import ModulesCarouselModal from '@/components/ModulesCarouselModal';
import BackgroundCheckModal from '@/components/BackgroundCheckModal';
import ReportUserModal from '@/components/ReportUserModal';

const GrowthModeSection: React.FC = () => {
  const {
    assessmentResult,
    setCurrentView,
    resetAssessment,
    currentUser,
    users,
    setSelectedUser,
    expressInterest,
    respondToInterest,
    getReceivedInterests,
    getConversation,
    setShowSupportModal,
    reportUser
  } = useApp();
  const [dismissNotification, setDismissNotification] = useState(false);
  const [selectedResourceForModal, setSelectedResourceForModal] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'inbox' | 'resources'>('browse');
  const [selectedProfileUser, setSelectedProfileUser] = useState<any>(null);
  const [showBackgroundCheckModal, setShowBackgroundCheckModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
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

  // Filter users who haven't passed assessment (growth-mode pool) and are opposite gender
  const growthModeUsers = useMemo(() => {
    return users.filter(
      u => !u.assessmentPassed && u.id !== currentUser.id && u.gender !== currentUser.gender
    );
  }, [users, currentUser.id, currentUser.gender]);

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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl text-[#F6FFF2]">Growth Mode</h1>
          <button
            onClick={() => setShowSupportModal(true)}
            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            title="Contact Support"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
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
            onClick={() => setActiveTab('inbox')}
            className={`pb-3 px-4 font-medium transition-all ${
              activeTab === 'inbox'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Inbox
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
              <h2 className="font-display text-3xl text-[#F6FFF2] mb-2">Growth Mode Community</h2>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto">
                Build your foundation with others on a similar journey. This space is dedicated to those who are working on their relationship skills and emotional growth. You'll connect with others focused on self-awareness, emotional regulation, and healthy partnership dynamics.
              </p>
              <p className="text-[#A9B5AA] max-w-2xl mx-auto mt-4">
                Once you've completed the Growth Mode resources or after 6 months, you'll unlock full access to the dating pool, where you can connect with individuals who are ready for deeper relationships.
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
                        expressInterest(user.id, '');
                        setSelectedProfileUser(user);
                      }}
                      className="w-full py-2 bg-[#D9FF3D]/10 text-[#D9FF3D] rounded-lg font-medium hover:bg-[#D9FF3D]/20 transition-colors flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      Express Interest
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
              // Filter to only growth-mode matches (opposite gender)
              const growthModeMatches = receivedInterests
                .map(interest => users.find(u => u.id === interest.fromUserId))
                .filter((u) => u && !u.assessmentPassed && u.id !== currentUser.id && u.gender !== currentUser.gender);

              return growthModeMatches.length > 0 ? (
                <div className="space-y-4">
                  {growthModeMatches.map((user) => {
                    if (!user) return null;
                    const conversation = getConversation(user.id);
                    const lastMessage = conversation?.messages?.[conversation.messages.length - 1];

                    return (
                      <div
                        key={user.id}
                        className="bg-[#111611] rounded-[16px] border border-[#1A211A] p-6 hover:border-[#D9FF3D] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[#F6FFF2] font-medium text-lg">{user.name}, {user.age}</h3>
                            <p className="text-[#A9B5AA] text-sm">{user.city}</p>
                            {lastMessage && (
                              <p className="text-[#A9B5AA] text-sm mt-2 line-clamp-2">
                                {lastMessage.fromUserId === currentUser.id ? 'You: ' : ''}{lastMessage.message}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
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
        onSubmit={async (reason, details) => {
          try {
            await reportUser(selectedProfileUser.id, reason, details);
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
                  // Express interest if not already done
                  expressInterest(selectedProfileUser.id, messageText);

                  // Send the message
                  if (messageText.trim()) {
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
