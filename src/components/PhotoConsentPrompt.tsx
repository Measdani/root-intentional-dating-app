import React, { useState } from 'react';
import { Check, Clock, Sparkles, MessageSquare } from 'lucide-react';
import type { UserInteraction } from '@/types';

interface PhotoConsentPromptProps {
  conversation: UserInteraction;
  currentUserId: string;
  otherUserName: string;
  onConsent: () => void;
}

const PhotoConsentPrompt: React.FC<PhotoConsentPromptProps> = ({
  conversation,
  currentUserId,
  otherUserName,
  onConsent,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const currentUserConsented = conversation.photoConsent.fromUser.userId === currentUserId
    ? conversation.photoConsent.fromUser.hasConsented
    : conversation.photoConsent.toUser.hasConsented;

  const otherUserConsented = conversation.photoConsent.fromUser.userId === currentUserId
    ? conversation.photoConsent.toUser.hasConsented
    : conversation.photoConsent.fromUser.hasConsented;

  const bothConsented = currentUserConsented && otherUserConsented;

  if (bothConsented) {
    return (
      <div className="bg-[#111611] rounded-2xl border border-[#D9FF3D]/30 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#D9FF3D]" />
        </div>
        <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">
          Connected! 🎉
        </h3>
        <p className="text-[#A9B5AA] text-sm">
          You can now see each other's photos. Continue building something meaningful together.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111611] rounded-2xl border border-[#1A211A] p-8">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <MessageSquare className="w-8 h-8 text-[#D9FF3D]" />
        </div>
        <h3 className="font-display text-xl text-[#F6FFF2] mb-3">
          Show Your True Self
        </h3>
        <p className="text-[#A9B5AA] text-sm mb-4">
          {conversation.fromUserId === currentUserId
            ? `${otherUserName} has engaged thoughtfully with you. You've both shown you're serious about connecting. Ready to see each other?`
            : `You've both shared meaningful messages and real intentions. ${otherUserName} is ready to see who you are. Ready to show them?`
          }
        </p>
        <p className="text-xs text-[#D9FF3D] bg-[#D9FF3D]/10 rounded-lg px-3 py-2 inline-block">
          ⚠️ Photos only unlock when BOTH of you click "Yes"
        </p>
      </div>

      {/* Buttons */}
      {!currentUserConsented && !deferred ? (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={() => {
              setIsLoading(true);
              onConsent();
            }}
            disabled={isLoading}
            className="flex-1 py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            Yes, let's connect
          </button>
          <button
            onClick={() => setDeferred(true)}
            className="flex-1 py-3.5 bg-[#1A211A] text-[#F6FFF2] rounded-xl font-medium hover:bg-[#2A312A] transition-colors"
          >
            Not yet
          </button>
        </div>
      ) : null}

      {deferred && !currentUserConsented && (
        <div className="mb-6 p-4 bg-[#0B0F0C] rounded-xl border border-[#1A211A] text-center">
          <p className="text-[#A9B5AA] text-sm mb-2">No problem! You can change your mind anytime.</p>
          <button
            onClick={() => setDeferred(false)}
            className="text-[#D9FF3D] text-sm hover:underline transition-colors"
          >
            Ready now?
          </button>
        </div>
      )}

      {/* Consent Status - Clear visual representation */}
      <div className="space-y-2 bg-[#0B0F0C]/50 rounded-xl p-4">
        <div className="text-xs text-[#A9B5AA] mb-3 uppercase tracking-wider font-medium">
          Mutual Consent Status
        </div>

        {/* Your Status */}
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${currentUserConsented || deferred ? 'bg-[#D9FF3D]' : 'bg-[#1A211A]'}`}>
            {currentUserConsented && <Check className="w-3 h-3 text-[#0B0F0C]" />}
            {deferred && !currentUserConsented && <Check className="w-3 h-3 text-[#0B0F0C]" />}
          </div>
          <span className="text-[#F6FFF2] text-sm font-medium">
            You: {currentUserConsented ? '✓ Ready to reveal' : deferred ? '✓ Thinking it over' : 'Not yet ready'}
          </span>
        </div>

        {/* Other User Status */}
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${otherUserConsented ? 'bg-[#D9FF3D]' : 'bg-[#1A211A]'}`}>
            {otherUserConsented && <Check className="w-3 h-3 text-[#0B0F0C]" />}
            {!otherUserConsented && currentUserConsented && <Clock className="w-3 h-3 text-[#A9B5AA]" />}
          </div>
          <span className="text-[#F6FFF2] text-sm font-medium">
            {otherUserName}: {otherUserConsented ? '✓ Ready to reveal' : currentUserConsented ? '⏳ Waiting...' : 'Waiting for response'}
          </span>
        </div>

        {/* Unlock Status */}
        <div className="mt-3 pt-3 border-t border-[#1A211A]">
          <div className="text-xs font-medium">
            {bothConsented ? (
              <span className="text-[#D9FF3D]">✓ Photos will unlock when both agree</span>
            ) : currentUserConsented ? (
              <span className="text-[#D9FF3D]">⏳ Waiting for {otherUserName} to agree...</span>
            ) : (
              <span className="text-[#A9B5AA]">Click "Yes" above to proceed with photo reveal</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoConsentPrompt;
