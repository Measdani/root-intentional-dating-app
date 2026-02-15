import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import type { User } from '@/types';
import { ArrowLeft, MessageCircle, Check, Clock, Flag } from 'lucide-react';
import ReportUserModal from '@/components/ReportUserModal';

const InboxSection: React.FC = () => {
  const { setCurrentView, currentUser, interactions, users, setSelectedConversation, reportUser, blockUser, setShowSupportModal, getUnreadNotifications, markNotificationAsRead } = useApp();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUser, setReportingUser] = useState<User | null>(null);

  // Determine sent vs received based on currentUser dynamically
  const allInteractions = [
    ...Object.values(interactions.sentInterests),
    ...Object.values(interactions.receivedInterests),
  ];

  console.log('InboxSection - currentUser:', currentUser.id);
  console.log('InboxSection - interactions.sentInterests:', interactions.sentInterests);
  console.log('InboxSection - interactions.receivedInterests:', interactions.receivedInterests);
  console.log('InboxSection - allInteractions:', allInteractions);

  // Filter unique conversations and classify as sent/received based on currentUser
  const uniqueConversations = Array.from(new Map(
    allInteractions.map(i => [i.conversationId, i])
  ).values());

  console.log('InboxSection - uniqueConversations:', uniqueConversations);

  const sentInterests = uniqueConversations.filter(i => i.fromUserId === currentUser.id);
  const receivedInterests = uniqueConversations.filter(i => i.toUserId === currentUser.id);

  console.log('InboxSection - sentInterests (filtered):', sentInterests);
  console.log('InboxSection - receivedInterests (filtered):', receivedInterests);

  const displayedInterests = activeTab === 'received' ? receivedInterests : sentInterests;

  const getStatusBadge = (status: string, interest: any) => {
    // Check if current user is the one who sent the initial message
    const userSentIt = interest.fromUserId === currentUser.id;

    switch (status) {
      case 'pending_response':
        return {
          label: userSentIt ? 'Waiting for response' : 'Respond',
          color: userSentIt ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white',
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

  const getOtherUser = (interest: any) => {
    if (activeTab === 'received') {
      return users.find(u => u.id === interest.fromUserId);
    } else {
      return users.find(u => u.id === interest.toUserId);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('browse')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-xl text-[#F6FFF2]">Inbox</h1>
          </div>

          <button
            onClick={() => setShowSupportModal(true)}
            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            title="Contact Support"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
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
              activeTab === 'received'
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
              activeTab === 'sent'
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
              {activeTab === 'received'
                ? "No interests received yet"
                : "No interests sent yet"}
            </p>
            <p className="text-[#A9B5AA]/60 text-sm mt-2">
              {activeTab === 'received'
                ? "When someone shows interest, they'll appear here"
                : "Visit the browse section to express interest"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedInterests.map((interest) => {
              const otherUser = getOtherUser(interest);
              if (!otherUser) return null;

              const badge = getStatusBadge(interest.status, interest);
              const BadgeIcon = badge.icon;
              const firstMessage = interest.messages[0];

              return (
                <button
                  key={interest.conversationId}
                  onClick={() => {
                    const userId = activeTab === 'received'
                      ? interest.fromUserId
                      : interest.toUserId;
                    handleInterestClick(userId);
                  }}
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
                        {firstMessage ? getMessagePreview(firstMessage.message) : 'No messages'}
                      </p>
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
                </button>
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
          onSubmit={async (reason, details) => {
            await reportUser(reportingUser.id, reason, details);
            if (reason === 'underage' || reason === 'safety-concern') {
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
