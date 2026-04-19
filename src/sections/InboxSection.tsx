import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { formatModeDuration, getRelationshipModeSnapshot } from '@/modules';
import type { User, UserInteraction } from '@/types';
import { ArrowLeft, MessageCircle, Check, Clock, Flag, HelpCircle, BookOpen } from 'lucide-react';
import ReportUserModal from '@/components/ReportUserModal';
import { getLatestUniqueInteractions } from '@/lib/interactions';
import { openExclusiveModeSettings } from '@/lib/exclusiveModeNavigation';

const InboxSection: React.FC = () => {
  const { setCurrentView, currentUser, interactions, users, setSelectedConversation, startRelationshipRoom, reportUser, blockUser, setShowSupportModal, getUnreadNotifications, markNotificationAsRead, reloadNotifications } = useApp();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUser, setReportingUser] = useState<User | null>(null);

  // Reload and mark all unread notifications as read when inbox is opened
  useEffect(() => {
    // Reload notifications from localStorage first (in case they were added while logged in)
    reloadNotifications();

    // Then mark them as read
    setTimeout(() => {
      const unreadNotifications = getUnreadNotifications();
      unreadNotifications.forEach(notification => {
        markNotificationAsRead(notification.id);
      });
    }, 0);
  }, [reloadNotifications, getUnreadNotifications, markNotificationAsRead]);

  // Determine sent vs received based on currentUser dynamically
  const allInteractions = getLatestUniqueInteractions(interactions);

  console.log('InboxSection - currentUser:', currentUser.id);
  console.log('InboxSection - interactions.sentInterests:', interactions.sentInterests);
  console.log('InboxSection - interactions.receivedInterests:', interactions.receivedInterests);
  console.log('InboxSection - allInteractions:', allInteractions);

  // Filter unique conversations and classify as sent/received based on currentUser
  const uniqueConversations = allInteractions;
  const getOtherUserId = (interest: UserInteraction) =>
    interest.fromUserId === currentUser.id ? interest.toUserId : interest.fromUserId;
  const getLatestMessage = (interest: UserInteraction) =>
    interest.messages.reduce<UserInteraction['messages'][number] | null>((latest, message) => {
      if (!latest) return message;
      return message.timestamp > latest.timestamp ? message : latest;
    }, null);
  const hasUnreadIncoming = (interest: UserInteraction) =>
    interest.messages.some((message) => message.fromUserId !== currentUser.id && !message.read);

  const relationshipModeSnapshot = getRelationshipModeSnapshot(currentUser.id);
  const exclusivePartner = relationshipModeSnapshot.exclusivePartnerId
    ? users.find((user) => user.id === relationshipModeSnapshot.exclusivePartnerId) ?? null
    : null;
  const incomingExclusiveRequester = relationshipModeSnapshot.incomingExclusiveRequestFrom
    ? users.find((user) => user.id === relationshipModeSnapshot.incomingExclusiveRequestFrom) ?? null
    : null;
  const modeStatusMessage = relationshipModeSnapshot.mode === 'break'
    ? "You're now in Break Mode. You can exit anytime from Settings."
    : relationshipModeSnapshot.mode === 'exclusive'
      ? 'Exclusive Mode is active. Messaging is limited to your exclusive partner.'
      : relationshipModeSnapshot.remainingCooldownMs > 0
        ? `Re-entry cooldown is active for ${formatModeDuration(relationshipModeSnapshot.remainingCooldownMs)}.`
        : null;
  const modeFilteredConversations = relationshipModeSnapshot.mode === 'exclusive' && relationshipModeSnapshot.exclusivePartnerId
    ? uniqueConversations.filter(
        (conversation) =>
          conversation.fromUserId === relationshipModeSnapshot.exclusivePartnerId ||
          conversation.toUserId === relationshipModeSnapshot.exclusivePartnerId
      )
    : uniqueConversations;
  const visibleConversations = modeFilteredConversations.filter((interest) =>
    users.some((user) => user.id === getOtherUserId(interest))
  );

  console.log('InboxSection - uniqueConversations:', uniqueConversations);

  const receivedInterests = visibleConversations.filter((interest) => {
    const latestMessage = getLatestMessage(interest);
    if (hasUnreadIncoming(interest)) return true;
    return latestMessage ? latestMessage.fromUserId !== currentUser.id : interest.toUserId === currentUser.id;
  });
  const sentInterests = visibleConversations.filter((interest) => !receivedInterests.includes(interest));
  const hasUnreadReceivedMessage = receivedInterests.some((interest) => hasUnreadIncoming(interest));

  console.log('InboxSection - sentInterests (filtered):', sentInterests);
  console.log('InboxSection - receivedInterests (filtered):', receivedInterests);

  const resolvedActiveTab = activeTab === 'sent' && hasUnreadReceivedMessage
    ? 'received'
    : activeTab;
  const displayedInterests = resolvedActiveTab === 'received' ? receivedInterests : sentInterests;

  const getStatusBadge = (status: string, interest: UserInteraction) => {
    const latestMessage = getLatestMessage(interest);
    const latestFromCurrentUser = latestMessage?.fromUserId === currentUser.id;

    switch (status) {
      case 'pending_response':
        return {
          label: latestFromCurrentUser ? 'Waiting for response' : 'Respond',
          color: latestFromCurrentUser ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white',
          icon: MessageCircle,
        };
      case 'both_messaged':
      case 'awaiting_consent':
        return {
          label: 'Photos Ready',
          color: 'bg-yellow-600 text-white',
          icon: Clock,
        };
      case 'photos_unlocked':
        return {
          label: 'Connected',
          color: 'bg-green-600 text-white',
          icon: Check,
        };
      default:
        return {
          label: 'Message Sent',
          color: 'bg-[#D9FF3D] text-[#0B0F0C]',
          icon: MessageCircle,
        };
    }
  };

  const handleInterestClick = (userId: string) => {
    const interest = displayedInterests.find(i =>
      i.fromUserId === userId || i.toUserId === userId
    );
    if (interest) {
      setSelectedConversation(interest);
      setCurrentView('conversation');
    }
  };

  const getMessagePreview = (message: string) => {
    return message.length > 80 ? `${message.substring(0, 80)}...` : message;
  };

  const getOtherUser = (interest: UserInteraction) => users.find(u => u.id === getOtherUserId(interest));
  const handleReviewExclusiveRequest = () => {
    openExclusiveModeSettings(setCurrentView);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView(currentUser.assessmentPassed ? 'browse' : 'growth-mode')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-display text-xl text-[#F6FFF2]">Inbox</h1>
              {getUnreadNotifications().length > 0 && (
                <div className="relative flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-pulse opacity-75" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('clarity-room')}
              className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
              title="Clarity Room"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSupportModal(true)}
              className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
              title="Contact Support"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {modeStatusMessage && (
          <div className="mb-6 rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 px-4 py-3 text-sm text-[#F6FFF2]">
            {modeStatusMessage}
          </div>
        )}

        {incomingExclusiveRequester && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#D9FF3D]/40 bg-[#D9FF3D]/10 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#D9FF3D]">Exclusive Request</p>
              <p className="mt-2 text-sm text-[#F6FFF2]">
                {incomingExclusiveRequester.name} sent you an exclusive request. Review it in Settings to accept or decline.
              </p>
            </div>
            <button
              onClick={handleReviewExclusiveRequest}
              className="rounded-full bg-[#D9FF3D] px-5 py-2 text-sm font-medium text-[#0B0F0C] hover:scale-[1.02] transition-transform"
            >
              Review Request
            </button>
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

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#1A211A]">
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-4 font-medium transition-colors ${
              resolvedActiveTab === 'received'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            Received
            {receivedInterests.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-[#D9FF3D] text-[#0B0F0C] rounded-full text-xs font-medium">
                {receivedInterests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-4 font-medium transition-colors ${
              resolvedActiveTab === 'sent'
                ? 'text-[#D9FF3D] border-b-2 border-[#D9FF3D]'
                : 'text-[#A9B5AA] hover:text-[#F6FFF2]'
            }`}
          >
            Sent
            {sentInterests.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-[#D9FF3D] text-[#0B0F0C] rounded-full text-xs font-medium">
                {sentInterests.length}
              </span>
            )}
          </button>
        </div>

        {/* Empty State */}
        {displayedInterests.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
            <p className="text-[#A9B5AA] text-lg">
              {resolvedActiveTab === 'received'
                ? "No interests received yet"
                : "No interests sent yet"}
            </p>
            <p className="text-[#A9B5AA]/60 text-sm mt-2">
              {resolvedActiveTab === 'received'
                ? "When someone shows interest, they'll appear here"
                : "Visit the browse section to express interest"}
            </p>
            {relationshipModeSnapshot.mode === 'exclusive' && exclusivePartner && (
              <button
                onClick={() => {
                  const room = startRelationshipRoom(exclusivePartner.id);
                  if (!room) return;
                  localStorage.setItem(`consent_choice_${currentUser.id}_${room.conversationId}`, 'true');
                  localStorage.setItem(`congrats_shown_${currentUser.id}_${room.conversationId}`, 'true');
                  setCurrentView('conversation');
                }}
                className="mt-6 rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm font-medium text-[#0B0F0C] hover:scale-[1.02] transition-transform"
              >
                Start Relationship Room with {exclusivePartner.name}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedInterests.map((interest) => {
              const otherUser = getOtherUser(interest);
              if (!otherUser) return null;

              const badge = getStatusBadge(interest.status, interest);
              const BadgeIcon = badge.icon;
              const latestMessage = getLatestMessage(interest);
              const isIncomingExclusiveRequester = relationshipModeSnapshot.incomingExclusiveRequestFrom === otherUser.id;

              return (
                <div
                  key={interest.conversationId}
                  onClick={() => {
                    handleInterestClick(getOtherUserId(interest));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleInterestClick(getOtherUserId(interest));
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="w-full text-left bg-[#111611] rounded-2xl border border-[#1A211A] p-6 hover:border-[#D9FF3D]/50 hover:bg-[#1A211A] transition-all"
                >
                  <div className="flex items-start gap-4 w-full">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full flex-shrink-0 relative">
                      {interest.photosUnlocked && otherUser.photoUrl ? (
                        <img
                          src={otherUser.photoUrl}
                          alt={otherUser.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                          <span className="text-[#0B0F0C] font-display text-xl">
                            {otherUser.name[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-[#F6FFF2]">
                          {otherUser.name}, {otherUser.age}
                        </h3>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </div>
                      </div>

                      <p className="text-xs text-[#A9B5AA] mb-2 flex items-center gap-1">
                        <span>{otherUser.city}</span>
                        <span>•</span>
                        <span>{otherUser.alignmentScore}% Alignment</span>
                      </p>

                      <p className="text-[#F6FFF2] text-sm line-clamp-2">
                        {latestMessage ? getMessagePreview(latestMessage.message) : 'No messages'}
                      </p>

                      {isIncomingExclusiveRequester && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#D9FF3D] px-2.5 py-1 text-xs font-medium text-[#0B0F0C]">
                            Exclusive request
                          </span>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleReviewExclusiveRequest();
                            }}
                            className="text-xs font-medium text-[#D9FF3D] hover:underline"
                          >
                            Review in Settings
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Report Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportingUser(otherUser);
                        setShowReportModal(true);
                      }}
                      className="flex-shrink-0 text-[#A9B5AA] hover:text-red-400 transition-colors"
                      title="Report User"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Report User Modal */}
      {reportingUser && (
        <ReportUserModal
          isOpen={showReportModal}
          reportedUser={reportingUser}
          onClose={() => {
            setShowReportModal(false);
            setReportingUser(null);
          }}
          onSubmit={async (reason, details, shouldBlock) => {
            await reportUser(reportingUser.id, reason, details);
            if (shouldBlock || reason === 'underage' || reason === 'safety-concern') {
              blockUser(reportingUser.id, reason);
            }
            setShowReportModal(false);
            setReportingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default InboxSection;
