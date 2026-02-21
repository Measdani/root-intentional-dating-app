import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { MapPin, Heart, Eye, SlidersHorizontal, Lock, Mail, LogOut, HelpCircle, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateAlignmentScore } from '@/data/users';
import type { User } from '@/types';

const BrowseSection: React.FC = () => {
  const { users, currentUser, setSelectedUser, setCurrentView, arePhotosUnlocked, getUnreadCount, hasExpressedInterest, getConversation, setSelectedConversation, isUserBlocked, isBlockedByUser, setShowSupportModal, getUnreadNotifications } = useApp();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const filters = [
    { id: 'all', label: 'All Matches' },
    { id: 'high', label: '90%+ Alignment' },
    { id: 'wants-children', label: 'Wants Children' },
    { id: 'no-children', label: 'No Children' },
  ];

  // Recalculate alignment scores based on current user
  const usersWithUpdatedScores = users.map(user => ({
    ...user,
    alignmentScore: user.id === currentUser.id ? user.alignmentScore :
      calculateAlignmentScore(currentUser, user)
  })).sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0));

  const filteredUsers = usersWithUpdatedScores.filter(user => {
    // Exclude current user from browse list
    if (user.id === currentUser.id) return false;
    // Exclude users that current user blocked
    if (isUserBlocked(user.id)) return false;
    // Exclude users that have blocked the current user
    if (isBlockedByUser(user.id)) return false;
    // Show only opposite gender
    const oppositeGender = currentUser.gender === 'male' ? 'female' : 'male';
    if (user.gender !== oppositeGender) return false;
    if (selectedFilter === 'high') return (user.alignmentScore || 0) >= 90;
    if (selectedFilter === 'wants-children') return user.familyAlignment.wantsChildren === 'wants';
    if (selectedFilter === 'no-children') return !user.familyAlignment.hasChildren;
    return true;
  });

  const handleBrowseAction = (user: User, conversation: any) => {
    if (conversation) {
      // Show conversation view for any active conversation
      setSelectedConversation(conversation);
      setCurrentView('conversation');
    } else {
      // Show profile detail for "View Profile"
      setSelectedUser(user);
      setCurrentView('profile');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    // Dispatch custom event to trigger AppContext to revert to default user
    window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
    setCurrentView('user-login');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              const view = currentUser.assessmentPassed ? 'paid-growth-mode' : 'growth-mode';
              setCurrentView(view as any);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A211A] text-[#D9FF3D] hover:bg-[#2A3A2A] transition-colors text-sm font-medium"
          >
            <span>Alignment Space</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl text-[#F6FFF2]">Browse Profiles</h1>
            <p className="text-[#A9B5AA] text-xs">
              {filteredUsers.length} curated matches
            </p>
            {/* Current User Display */}
            <p className="text-[10px] text-[#D9FF3D] mt-1">Logged in as: <span className="font-semibold">{currentUser.name}</span></p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('clarity-room')}
              className="flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
              title="Clarity Room"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentView('inbox')}
              className="relative flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
            >
              <Mail className="w-4 h-4" />
              {getUnreadNotifications().length > 0 && (
                <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
              )}
              {getUnreadNotifications().length === 0 && getUnreadCount() > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#D9FF3D] text-[#0B0F0C] text-xs rounded-full flex items-center justify-center font-medium">
                  {getUnreadCount()}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSupportModal(true)}
              className="relative text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
              title="Contact Support"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-2 text-sm ${filterOpen ? 'text-[#D9FF3D]' : 'text-[#A9B5AA]'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filter
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {filterOpen && (
          <div className="border-t border-[#1A211A] bg-[#111611]/50">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(selectedFilter === filter.id ? null : filter.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                        : 'bg-[#1A211A] text-[#A9B5AA] hover:bg-[#2A312A]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Profiles Grid */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, idx) => {
            const conversation = getConversation(user.id);
            console.log(`Browse-${user.name}(${user.id}):`, conversation ? '✅ FOUND' : '❌ NULL');

            return (
            <div
              key={user.id}
              className="bg-[#111611] rounded-[24px] border border-[#1A211A] overflow-hidden hover:border-[#D9FF3D]/30 transition-all duration-300 group"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Card Header */}
              <div className="p-5 relative">
                {/* Interest Sent Badge */}
                {hasExpressedInterest(user.id) && !conversation && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-green-600 text-white">Interest Sent</Badge>
                  </div>
                )}

                {/* Waiting for Response Badge */}
                {conversation && conversation.status === 'pending_response' && (
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-amber-600 text-white">Waiting for response</Badge>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {arePhotosUnlocked(user.id) && user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <>
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                            <span className="text-[#0B0F0C] font-display text-lg">
                              {user.name[0]}
                            </span>
                          </div>
                          {!arePhotosUnlocked(user.id) && (
                            <div className="absolute inset-0 bg-[#0B0F0C]/30 rounded-full flex items-center justify-center">
                              <Lock className="w-4 h-4 text-[#F6FFF2]" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[#F6FFF2] font-semibold">{user.name}, {user.age}</h3>
                      <div className="flex items-center gap-1 text-[#A9B5AA] text-xs">
                        <MapPin className="w-3 h-3" />
                        {user.city}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-display text-[#D9FF3D]">
                      {user.alignmentScore}%
                    </div>
                    <div className="text-[10px] text-[#A9B5AA] font-mono-label">ALIGNMENT</div>
                  </div>
                </div>

                {/* Values */}
                <div className="mb-4">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-2">VALUES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.values.slice(0, 3).map((value, vidx) => (
                      <span
                        key={vidx}
                        className="px-2 py-0.5 bg-[#1A211A] text-[#F6FFF2] text-xs rounded-full"
                      >
                        {value}
                      </span>
                    ))}
                    {user.values.length > 3 && (
                      <span className="px-2 py-0.5 text-[#A9B5AA] text-xs">
                        +{user.values.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Family Intent */}
                <div className="mb-4">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-1">FAMILY INTENT</p>
                  <p className="text-[#F6FFF2] text-sm capitalize">
                    {user.familyAlignment.wantsChildren.replace(/-/g, ' ')}
                  </p>
                </div>

                {/* Growth Focus */}
                <div className="mb-5">
                  <p className="text-[10px] text-[#A9B5AA] font-mono-label mb-1">GROWTH FOCUS</p>
                  <p className="text-[#F6FFF2] text-sm">{user.growthFocus}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBrowseAction(user, conversation)}
                    className="flex-1 py-2.5 bg-[#F6FFF2] text-[#0B0F0C] rounded-full text-sm font-medium hover:bg-[#D9FF3D] transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {conversation
                      ? conversation.status === 'pending_response'
                        ? (conversation.fromUserId === currentUser.id ? 'Waiting...' : 'Respond')
                        : 'Continue Conversation'
                      : 'View Profile'}
                  </button>
                  <button className="w-10 h-10 rounded-full border border-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:border-[#D9FF3D] hover:text-[#D9FF3D] transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#A9B5AA] text-lg">No matches found with current filters.</p>
            <button
              onClick={() => setSelectedFilter(null)}
              className="mt-4 text-[#D9FF3D] text-sm hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default BrowseSection;
