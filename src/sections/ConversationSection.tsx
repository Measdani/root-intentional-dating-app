import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, MessageCircle, Lock, Flag, Image } from 'lucide-react';
import PhotoConsentPrompt from '@/components/PhotoConsentPrompt';
import ResponseModal from '@/components/ResponseModal';
import ReportUserModal from '@/components/ReportUserModal';

const ConversationSection: React.FC = () => {
  const { selectedConversation, setCurrentView, respondToInterest, grantPhotoConsent, withdrawPhotoConsent, users, currentUser, reportUser, blockUser } = useApp();
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConsentPrompt, setShowConsentPrompt] = useState(true);

  // Check localStorage for persisted choice state for this conversation (per user)
  const [hasUserMadeChoice, setHasUserMadeChoiceLocal] = useState(() => {
    if (!selectedConversation) return false;
    const storedChoice = localStorage.getItem(`consent_choice_${currentUser.id}_${selectedConversation.conversationId}`);
    return storedChoice === 'true';
  });

  // Track if congrats message has been shown (only show once per user per conversation)
  const [showCongrats, setShowCongrats] = useState(() => {
    if (!selectedConversation) return true;
    const hasShown = localStorage.getItem(`congrats_shown_${currentUser.id}_${selectedConversation.conversationId}`);
    return hasShown !== 'true';
  });

  // Wrapper to also save to localStorage (per user)
  const setHasUserMadeChoice = (value: boolean | ((prev: boolean) => boolean)) => {
    setHasUserMadeChoiceLocal(prevValue => {
      const newValue = typeof value === 'function' ? value(prevValue) : value;
      if (selectedConversation) {
        localStorage.setItem(`consent_choice_${currentUser.id}_${selectedConversation.conversationId}`, newValue.toString());
      }
      return newValue;
    });
  };

  if (!selectedConversation) {
    return (
      <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A9B5AA]">Conversation not found</p>
        </div>
      </div>
    );
  }

  // Determine the other user
  const otherUserId = selectedConversation.fromUserId === currentUser.id
    ? selectedConversation.toUserId
    : selectedConversation.fromUserId;

  const otherUser = users.find(u => u.id === otherUserId);

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#A9B5AA]">User not found</p>
        </div>
      </div>
    );
  }

  const handleResponseSubmit = (message: string) => {
    respondToInterest(otherUserId, message);
    setShowResponseModal(false);
  };

  const handleConsentClick = () => {
    grantPhotoConsent(selectedConversation.conversationId);
  };

  const handleWithdrawConsent = () => {
    withdrawPhotoConsent(selectedConversation.conversationId);
    setHasUserMadeChoice(true);
  };

  // Get the first (initial) message
  const initialMessage = selectedConversation.messages[0];

  // Show prompt if showConsentPrompt is true AND they haven't made a choice
  // (Clicking Photo Consent resets hasUserMadeChoice to false, which reopens the prompt)
  const shouldShowPrompt = showConsentPrompt && !hasUserMadeChoice;

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('inbox')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="text-center">
            <h1 className="font-display text-lg text-[#F6FFF2]">
              {otherUser.name}
            </h1>
            <p className="text-xs text-[#A9B5AA]">
              {otherUser.age} • {otherUser.city} • {otherUser.alignmentScore}% Alignment
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!shouldShowPrompt && (selectedConversation.status === 'both_messaged' || selectedConversation.status === 'awaiting_consent' || selectedConversation.status === 'photos_unlocked') && (
              <button
                onClick={() => {
                  setShowConsentPrompt(true);
                  setHasUserMadeChoice(false);
                }}
                className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
                title="Photo Consent"
              >
                <Image className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowReportModal(true)}
              className="text-[#A9B5AA] hover:text-red-400 transition-colors"
              title="Report User"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* User Avatar & Profile */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 relative">
            {selectedConversation.photosUnlocked && otherUser.photoUrl ? (
              <img
                src={otherUser.photoUrl}
                alt={otherUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <>
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center">
                  <span className="text-[#0B0F0C] font-display text-4xl">
                    {otherUser.name[0]}
                  </span>
                </div>
                {!selectedConversation.photosUnlocked && (
                  <div className="absolute inset-0 bg-[#0B0F0C]/30 rounded-full flex items-center justify-center">
                    <Lock className="w-6 h-6 text-[#F6FFF2]" />
                  </div>
                )}
              </>
            )}
          </div>
          <h2 className="font-display text-2xl text-[#F6FFF2]">
            {otherUser.name}, {otherUser.age}
          </h2>
        </div>

        {/* Messages */}
        <div className="space-y-4 mb-10">
          {selectedConversation.messages.map((msg) => {
            const isCurrentUser = msg.fromUserId === currentUser.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-3 rounded-2xl ${
                    isCurrentUser
                      ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                      : 'bg-[#1A211A] text-[#F6FFF2]'
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  <p className={`text-xs mt-2 opacity-70 ${isCurrentUser ? 'text-[#0B0F0C]' : 'text-[#A9B5AA]'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status-based rendering */}
        {selectedConversation.status === 'pending_response' && selectedConversation.fromUserId === currentUser.id && (
          <div className="bg-[#111611] rounded-2xl border border-[#1A211A] p-8 text-center">
            <p className="text-[#A9B5AA] mb-6">Waiting for their response...</p>
            <div className="inline-flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#D9FF3D] animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-[#D9FF3D] animate-pulse delay-100" />
              <div className="w-2 h-2 rounded-full bg-[#D9FF3D] animate-pulse delay-200" />
            </div>
          </div>
        )}

        {shouldShowPrompt && (selectedConversation.status === 'both_messaged' || selectedConversation.status === 'awaiting_consent' || (selectedConversation.status === 'photos_unlocked' && !showCongrats)) && (
          <div className="mb-8">
            <PhotoConsentPrompt
              conversation={selectedConversation}
              currentUserId={currentUser.id}
              otherUserName={otherUser.name}
              onConsent={handleConsentClick}
              onChoiceMade={() => {
                setShowConsentPrompt(false);
                setHasUserMadeChoice(true);
              }}
              onWithdraw={handleWithdrawConsent}
            />
          </div>
        )}

        {selectedConversation.status === 'photos_unlocked' && showCongrats && (
          <div className="bg-[#111611] rounded-2xl border border-[#D9FF3D]/30 p-8 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="font-display text-xl text-[#F6FFF2] mb-2">
              Photos unlocked!
            </h3>
            <p className="text-[#A9B5AA] text-sm mb-4">
              You can now see each other's photos. Continue the conversation!
            </p>
            <button
              onClick={() => {
                setShowCongrats(false);
                if (selectedConversation) {
                  localStorage.setItem(`congrats_shown_${currentUser.id}_${selectedConversation.conversationId}`, 'true');
                }
              }}
              className="text-[#D9FF3D] text-sm hover:underline transition-colors"
            >
              Got it
            </button>
          </div>
        )}

        {/* Action Button - Only show Respond if current user didn't initiate */}
        {selectedConversation.status === 'pending_response' && selectedConversation.fromUserId !== currentUser.id && (
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setShowResponseModal(true)}
              className="flex-1 py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-2xl font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Respond
            </button>
          </div>
        )}

        {/* Continue Message Button - Show after user makes photo consent choice or after photos unlocked */}
        {((selectedConversation.status === 'both_messaged' || selectedConversation.status === 'awaiting_consent') && hasUserMadeChoice) || selectedConversation.status === 'photos_unlocked' ? (
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setShowResponseModal(true)}
              className="flex-1 py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-2xl font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Continue Message
            </button>
          </div>
        ) : null}
      </main>

      {/* Response Modal */}
      <ResponseModal
        isOpen={showResponseModal}
        senderUser={otherUser}
        originalMessage={initialMessage}
        onClose={() => setShowResponseModal(false)}
        onSubmit={handleResponseSubmit}
      />

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={showReportModal}
        reportedUser={otherUser}
        conversationId={selectedConversation.conversationId}
        onClose={() => setShowReportModal(false)}
        onSubmit={async (reason, details) => {
          await reportUser(otherUser.id, reason, details, selectedConversation.conversationId);
          if (reason === 'underage' || reason === 'safety-concern') {
            blockUser(otherUser.id, reason);
          }
          setShowReportModal(false);
        }}
      />
    </div>
  );
};

export default ConversationSection;
