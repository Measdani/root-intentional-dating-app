import React, { useState, useEffect, useMemo } from 'react';
import {
  formatModeDuration,
  getRelationshipModeSnapshot,
  useCommunity,
  canUsersMatch,
  communityIdToPoolId,
  getUserPoolId,
  isUserAvailableForNewMatches,
  isUserInPool,
  poolIdToCommunityId,
} from '@/modules';
import { useApp } from '@/store/AppContext';
import { signOutAndClearLocalUser } from '@/services/authService';
import { MapPin, Heart, Eye, SlidersHorizontal, Lock, Mail, LogOut, HelpCircle, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateAlignmentScore } from '@/data/users';
import type { User } from '@/types';
import { getUserSettingsForUser } from '@/services/userSettingsService';
import { PATH_LABELS } from '@/lib/pathways';

const EXCLUSIVE_LETTERS_STORAGE_KEY = 'rooted_exclusive_letters_v1';

type ExclusiveLetterMessageType = 'text' | 'audio' | 'video';

interface ExclusiveLetter {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: ExclusiveLetterMessageType;
  condition: string;
  textContent?: string;
  mediaUrl?: string;
  createdAt: number;
  openedAtByRecipient?: number;
}

const readExclusiveLetters = (): ExclusiveLetter[] => {
  try {
    const raw = localStorage.getItem(EXCLUSIVE_LETTERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load exclusive letters:', error);
    return [];
  }
};

const writeExclusiveLetters = (letters: ExclusiveLetter[]) => {
  try {
    localStorage.setItem(EXCLUSIVE_LETTERS_STORAGE_KEY, JSON.stringify(letters));
    window.dispatchEvent(new CustomEvent('exclusive-letters-updated'));
  } catch (error) {
    console.warn('Failed to save exclusive letters:', error);
  }
};

const BrowseSection: React.FC = () => {
  const { activeCommunity } = useCommunity();
  const { users, currentUser, setSelectedUser, setCurrentView, arePhotosUnlocked, getUnreadCount, hasExpressedInterest, getConversation, getReceivedInterests, getSentInterests, setSelectedConversation, startRelationshipRoom, isUserBlocked, isBlockedByUser, setShowSupportModal, getUnreadNotifications, markNotificationAsRead, reloadNotifications } = useApp();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [exclusiveLetters, setExclusiveLetters] = useState<ExclusiveLetter[]>([]);
  const [letterType, setLetterType] = useState<ExclusiveLetterMessageType>('text');
  const [letterCondition, setLetterCondition] = useState('');
  const [letterTextContent, setLetterTextContent] = useState('');
  const [letterMediaUrl, setLetterMediaUrl] = useState('');

  const filters = [
    { id: 'all', label: 'All Matches' },
    { id: 'high', label: '90%+ Alignment' },
    { id: 'wants-children', label: 'Wants Children' },
    { id: 'no-children', label: 'No Children' },
  ];

  const viewerSettings = useMemo(
    () => getUserSettingsForUser(currentUser.id, currentUser),
    [currentUser.id]
  );
  const relationshipModeSnapshot = useMemo(
    () => getRelationshipModeSnapshot(currentUser.id),
    [currentUser.id, currentUser.mode]
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

  // Reload notifications when browse section loads
  useEffect(() => {
    reloadNotifications();
  }, [reloadNotifications]);

  // Recalculate alignment scores based on current user
  const usersWithUpdatedScores = users.map(user => ({
    ...user,
    alignmentScore: user.id === currentUser.id ? user.alignmentScore :
      calculateAlignmentScore(currentUser, user)
  })).sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0));

  const activePool = communityIdToPoolId(activeCommunity.id);
  const viewerPool = getUserPoolId(currentUser, activePool);
  const viewerCommunityMatches = poolIdToCommunityId(viewerPool) === activeCommunity.id;
  const exclusivePartnerId = relationshipModeSnapshot.exclusivePartnerId;
  const exclusivePartner = useMemo(
    () => users.find((user) => user.id === exclusivePartnerId) || null,
    [users, exclusivePartnerId]
  );

  const allKnownConversations = useMemo(() => {
    const allConversations = [...getSentInterests(), ...getReceivedInterests()];
    return Array.from(new Map(allConversations.map((conversation) => [conversation.conversationId, conversation])).values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [getReceivedInterests, getSentInterests]);

  const milestoneReadyConversations = useMemo(
    () => allKnownConversations.filter((conversation) =>
      ['both_messaged', 'awaiting_consent', 'photos_unlocked'].includes(conversation.status)
    ),
    [allKnownConversations]
  );

  const featuredGameConversation = useMemo(() => {
    if (exclusivePartnerId) {
      const partnerConversation = allKnownConversations.find((conversation) =>
        conversation.fromUserId === exclusivePartnerId || conversation.toUserId === exclusivePartnerId
      );
      if (partnerConversation) return partnerConversation;
    }
    return milestoneReadyConversations[0] ?? null;
  }, [exclusivePartnerId, allKnownConversations, milestoneReadyConversations]);

  const featuredGamePartner = useMemo(() => {
    if (featuredGameConversation) {
      const partnerId = featuredGameConversation.fromUserId === currentUser.id
        ? featuredGameConversation.toUserId
        : featuredGameConversation.fromUserId;
      return users.find((user) => user.id === partnerId) ?? null;
    }
    return exclusivePartner ?? null;
  }, [featuredGameConversation, currentUser.id, users, exclusivePartner]);

  const launchRelationshipGames = () => {
    if (!featuredGameConversation) {
      if (!featuredGamePartner) {
        setCurrentView('inbox');
        return;
      }
      const room = startRelationshipRoom(featuredGamePartner.id);
      if (!room) return;
      localStorage.setItem(`consent_choice_${currentUser.id}_${room.conversationId}`, 'true');
      localStorage.setItem(`congrats_shown_${currentUser.id}_${room.conversationId}`, 'true');
      setCurrentView('conversation');
      return;
    }
    localStorage.setItem(`consent_choice_${currentUser.id}_${featuredGameConversation.conversationId}`, 'true');
    localStorage.setItem(`congrats_shown_${currentUser.id}_${featuredGameConversation.conversationId}`, 'true');
    setSelectedConversation(featuredGameConversation);
    setCurrentView('conversation');
  };

  useEffect(() => {
    const loadLetters = () => setExclusiveLetters(readExclusiveLetters());

    loadLetters();
    window.addEventListener('storage', loadLetters);
    window.addEventListener('exclusive-letters-updated', loadLetters as EventListener);
    return () => {
      window.removeEventListener('storage', loadLetters);
      window.removeEventListener('exclusive-letters-updated', loadLetters as EventListener);
    };
  }, []);

  const exclusiveLettersForPartner = useMemo(() => {
    if (!exclusivePartnerId) return [];
    return exclusiveLetters
      .filter((letter) =>
        (letter.fromUserId === currentUser.id && letter.toUserId === exclusivePartnerId) ||
        (letter.fromUserId === exclusivePartnerId && letter.toUserId === currentUser.id)
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [exclusiveLetters, currentUser.id, exclusivePartnerId]);

  const receivedExclusiveLetters = useMemo(
    () => exclusiveLettersForPartner.filter((letter) => letter.toUserId === currentUser.id),
    [exclusiveLettersForPartner, currentUser.id]
  );

  const sentExclusiveLetters = useMemo(
    () => exclusiveLettersForPartner.filter((letter) => letter.fromUserId === currentUser.id),
    [exclusiveLettersForPartner, currentUser.id]
  );

  const submitExclusiveLetter = () => {
    if (!exclusivePartnerId) return;

    const trimmedCondition = letterCondition.trim();
    if (!trimmedCondition) return;

    if (letterType === 'text') {
      const trimmedText = letterTextContent.trim();
      if (!trimmedText) return;
    } else {
      const trimmedUrl = letterMediaUrl.trim();
      if (!trimmedUrl) return;
    }

    const newLetter: ExclusiveLetter = {
      id: `letter_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      fromUserId: currentUser.id,
      toUserId: exclusivePartnerId,
      type: letterType,
      condition: trimmedCondition,
      textContent: letterType === 'text' ? letterTextContent.trim() : undefined,
      mediaUrl: letterType !== 'text' ? letterMediaUrl.trim() : undefined,
      createdAt: Date.now(),
    };

    const nextLetters = [newLetter, ...exclusiveLetters];
    setExclusiveLetters(nextLetters);
    writeExclusiveLetters(nextLetters);
    setLetterCondition('');
    setLetterTextContent('');
    setLetterMediaUrl('');
  };

  const unlockExclusiveLetter = (letterId: string) => {
    const nextLetters = exclusiveLetters.map((letter) =>
      letter.id === letterId && letter.toUserId === currentUser.id
        ? { ...letter, openedAtByRecipient: Date.now() }
        : letter
    );
    setExclusiveLetters(nextLetters);
    writeExclusiveLetters(nextLetters);
  };

  const filteredUsers = usersWithUpdatedScores.filter(user => {
    if (!canReceiveNewMatches) return false;

    // Keep users scoped to the viewer's exact lane within the active community.
    if (!viewerCommunityMatches) return false;
    if (!isUserInPool(user, viewerPool)) return false;
    if (!isUserAvailableForNewMatches(user.id)) return false;

    // Exclude current user from browse list
    if (user.id === currentUser.id) return false;
    // Exclude users that current user blocked
    if (isUserBlocked(user.id)) return false;
    // Exclude users that have blocked the current user
    if (isBlockedByUser(user.id)) return false;
    if (!canUsersMatch(currentUser, user, activeCommunity.matchingMode)) return false;
    const candidateSettings = getUserSettingsForUser(user.id, user);
    if (candidateSettings.visibility.profileVisibility === 'paused') return false;
    if (candidateSettings.visibility.profileVisibility === 'private') {
      const existingConversation = getConversation(user.id);
      if (!existingConversation || existingConversation.fromUserId !== user.id) return false;
    }
    if (viewerSettings.safety.onlyMatchWithVerifiedAccounts && !user.backgroundCheckVerified) return false;
    if (selectedFilter === 'high') return (user.alignmentScore || 0) >= 90;
    if (selectedFilter === 'wants-children') return user.familyAlignment.wantsChildren === 'wants';
    if (selectedFilter === 'no-children') return !user.familyAlignment.hasChildren;
    return true;
  });

  const handleBrowseAction = (user: User, conversation: any) => {
    const shouldOpenConversationDirectly = conversation && conversation.status !== 'pending_response';

    if (shouldOpenConversationDirectly) {
      // Show conversation view for any active conversation
      setSelectedConversation(conversation);
      setCurrentView('conversation');
    } else {
      // Show profile detail for "View Profile"
      setSelectedUser(user);
      setCurrentView('profile');
    }
  };

  const handleLogout = async () => {
    await signOutAndClearLocalUser();
    setCurrentView('landing');
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
            <span>{currentUser.assessmentPassed ? PATH_LABELS.alignment : PATH_LABELS.intentional}</span>
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {featuredGamePartner && (
          <div className="mb-6 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-sky-200">Relationship Room</p>
            <h3 className="mt-1 text-lg font-semibold text-[#F6FFF2]">Couple Milestones Ready with {featuredGamePartner.name}</h3>
            <p className="mt-1 text-sm text-sky-100">
              {featuredGameConversation
                ? 'Launch Shared Vibe, Truth or Dare, Temp Check, and Date Offer directly from here.'
                : 'Open your couple thread first, then milestones will start immediately.'}
            </p>
            <button
              onClick={launchRelationshipGames}
              className="mt-4 rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm font-medium text-[#0B0F0C] hover:scale-[1.02] transition-transform"
            >
              {featuredGameConversation ? 'Start Couple Milestones' : 'Open Couple Thread'}
            </button>
          </div>
        )}

        {modeStatusMessage && (
          <div className="mb-6 rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 px-4 py-3 text-sm text-[#F6FFF2]">
            {modeStatusMessage}
          </div>
        )}

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

        {relationshipModeSnapshot.mode === 'exclusive' ? (
          <div className="py-10 space-y-8">
            <div className="text-center">
              <p className="text-[#A9B5AA] text-lg">
                New matching is paused while your current mode is active.
              </p>
              <button
                onClick={() => setSelectedFilter(null)}
                className="mt-4 text-[#D9FF3D] text-sm hover:underline"
              >
                Clear filters
              </button>
            </div>

            <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
              <div className="bg-[#111611] rounded-2xl border border-[#1A211A] p-5 space-y-4">
                <h3 className="text-[#F6FFF2] font-semibold">Create a Conditional Letter</h3>
                <p className="text-sm text-[#A9B5AA]">
                  Write a letter your partner can open when they meet the condition.
                </p>

                <div className="space-y-2">
                  <p className="text-xs text-[#A9B5AA]">Message type</p>
                  <div className="flex gap-2">
                    {(['text', 'audio', 'video'] as ExclusiveLetterMessageType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setLetterType(type)}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          letterType === type
                            ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                            : 'border-[#1A211A] text-[#A9B5AA]'
                        }`}
                      >
                        {type[0].toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-[#A9B5AA]">Open when…</label>
                  <input
                    value={letterCondition}
                    onChange={(e) => setLetterCondition(e.target.value)}
                    placeholder='e.g., "Open when you miss me."'
                    className="w-full px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-sm text-[#F6FFF2] placeholder-[#6E776E] focus:border-[#D9FF3D] focus:outline-none"
                  />
                </div>

                {letterType === 'text' ? (
                  <div className="space-y-2">
                    <label className="text-xs text-[#A9B5AA]">Letter</label>
                    <textarea
                      value={letterTextContent}
                      onChange={(e) => setLetterTextContent(e.target.value)}
                      placeholder="Write your message..."
                      className="w-full h-28 px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-sm text-[#F6FFF2] placeholder-[#6E776E] focus:border-[#D9FF3D] focus:outline-none resize-none"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs text-[#A9B5AA]">
                      {letterType === 'audio' ? 'Audio URL' : 'Video URL'}
                    </label>
                    <input
                      value={letterMediaUrl}
                      onChange={(e) => setLetterMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-sm text-[#F6FFF2] placeholder-[#6E776E] focus:border-[#D9FF3D] focus:outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={submitExclusiveLetter}
                  disabled={
                    !exclusivePartnerId ||
                    !letterCondition.trim() ||
                    (letterType === 'text' ? !letterTextContent.trim() : !letterMediaUrl.trim())
                  }
                  className={`w-full py-2.5 rounded-lg text-sm font-medium ${
                    !exclusivePartnerId ||
                    !letterCondition.trim() ||
                    (letterType === 'text' ? !letterTextContent.trim() : !letterMediaUrl.trim())
                      ? 'bg-[#1A211A] text-[#6E776E] cursor-not-allowed'
                      : 'bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#E8FF66]'
                  }`}
                >
                  Send to {exclusivePartner?.name || 'Partner'}
                </button>
              </div>

              <div className="bg-[#111611] rounded-2xl border border-[#1A211A] p-5 space-y-4">
                <h3 className="text-[#F6FFF2] font-semibold">
                  Letters from {exclusivePartner?.name || 'your partner'}
                </h3>
                {receivedExclusiveLetters.length === 0 ? (
                  <p className="text-sm text-[#A9B5AA]">No letters received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {receivedExclusiveLetters.map((letter) => {
                      const isUnlocked = Boolean(letter.openedAtByRecipient);
                      return (
                        <div key={letter.id} className="rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-[#F6FFF2] font-medium">Open when: {letter.condition}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2A312A] text-[#A9B5AA] uppercase">
                              {letter.type}
                            </span>
                          </div>

                          {!isUnlocked ? (
                            <button
                              onClick={() => unlockExclusiveLetter(letter.id)}
                              className="text-sm text-[#D9FF3D] hover:underline"
                            >
                              Open now
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {letter.type === 'text' && (
                                <p className="text-sm text-[#F6FFF2] whitespace-pre-wrap">{letter.textContent}</p>
                              )}
                              {letter.type === 'audio' && letter.mediaUrl && (
                                <>
                                  <audio controls src={letter.mediaUrl} className="w-full" />
                                  <a href={letter.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-[#D9FF3D] hover:underline">
                                    Open audio in new tab
                                  </a>
                                </>
                              )}
                              {letter.type === 'video' && letter.mediaUrl && (
                                <>
                                  <video controls src={letter.mediaUrl} className="w-full rounded-lg max-h-56" />
                                  <a href={letter.mediaUrl} target="_blank" rel="noreferrer" className="text-xs text-[#D9FF3D] hover:underline">
                                    Open video in new tab
                                  </a>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-4xl mx-auto bg-[#111611] rounded-2xl border border-[#1A211A] p-5 space-y-4">
              <h3 className="text-[#F6FFF2] font-semibold">Letters you sent</h3>
              {sentExclusiveLetters.length === 0 ? (
                <p className="text-sm text-[#A9B5AA]">You have not sent any letters yet.</p>
              ) : (
                <div className="space-y-2">
                  {sentExclusiveLetters.map((letter) => (
                    <div key={letter.id} className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[#F6FFF2] truncate">Open when: {letter.condition}</p>
                        <p className="text-xs text-[#A9B5AA] uppercase">{letter.type}</p>
                      </div>
                      <span className={`text-xs ${letter.openedAtByRecipient ? 'text-emerald-300' : 'text-[#A9B5AA]'}`}>
                        {letter.openedAtByRecipient ? 'Opened' : 'Locked'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Profiles Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user, idx) => {
                const conversation = getConversation(user.id);
                const candidateSettings = getUserSettingsForUser(user.id, user);
                const firstPhoto = (user.photoUrl || '').split('|').filter(Boolean)[0];
                const canShowPhoto =
                  candidateSettings.visibility.photoVisibility === 'first-photo-only'
                    ? Boolean(firstPhoto)
                    : candidateSettings.visibility.photoVisibility === 'blur-until-mutual'
                      ? arePhotosUnlocked(user.id) && Boolean(firstPhoto)
                      : false;
                const showLockOverlay =
                  candidateSettings.visibility.photoVisibility === 'blur-until-mutual' &&
                  !arePhotosUnlocked(user.id);
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
                          {canShowPhoto ? (
                            <img
                              src={firstPhoto}
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
                              {showLockOverlay && (
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
                            ? 'View Profile'
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
                <p className="text-[#A9B5AA] text-lg">
                  {canReceiveNewMatches
                    ? 'No matches found with current filters.'
                    : 'New matching is paused while your current mode is active.'}
                </p>
                <button
                  onClick={() => setSelectedFilter(null)}
                  className="mt-4 text-[#D9FF3D] text-sm hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default BrowseSection;
