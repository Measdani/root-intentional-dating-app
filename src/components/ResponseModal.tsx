import React, { useState } from 'react';
import { toast } from 'sonner';
import type { User, ConversationMessage } from '@/types';
import { X, Check, MessageCircle, Loader2 } from 'lucide-react';

interface ResponseModalProps {
  isOpen: boolean;
  senderUser: User | null;
  originalMessage: ConversationMessage | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

const ResponseModal: React.FC<ResponseModalProps> = ({
  isOpen,
  senderUser,
  originalMessage,
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Conversation starters based on user alignment and interests
  const conversationStarters = [
    `What drew you to ${senderUser?.name}? I'm curious about what resonated with you.`,
    `I love your focus on ${senderUser?.growthFocus}. How did you develop that mindset?`,
    `Your values really align with mine. What's one experience that shaped those for you?`,
    `I'm intrigued by your vision for partnership. Can you tell me more about what that looks like for you?`,
    `What's something about ${senderUser?.city} that you love? I'm always interested in what home means to people.`,
  ];

  if (!isOpen || !senderUser || !originalMessage) return null;

  const messageLength = message.length;
  const minLength = 120;
  const maxLength = 500;
  const isValidLength = messageLength >= minLength && messageLength <= maxLength;
  const isReady = isValidLength && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSuccess(true);
    onSubmit(message);

    // Show success toast
    toast.success(`Your response was sent to ${senderUser.name}!`);

    // Close after showing success
    setTimeout(() => {
      onClose();
      setMessage('');
      setIsSuccess(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      onClose();
      setMessage('');
      setIsSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting || isSuccess}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#D9FF3D]" />
            </div>
            <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">Message Sent!</h3>
            <p className="text-[#A9B5AA] text-sm">
              Your response was sent to {senderUser.name}
            </p>
          </div>
        ) : (
          <>
            {/* User Info */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0B0F0C] font-display text-2xl">
                    {senderUser.name[0]}
                  </span>
                </div>
              </div>
              <h3 className="font-display text-2xl text-[#F6FFF2] mb-1">
                Reply to {senderUser.name}
              </h3>
              <p className="text-[#A9B5AA] text-sm">
                {senderUser.age} • {senderUser.city}
              </p>
              {senderUser.alignmentScore && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                  <span className="text-[#D9FF3D] font-medium">{senderUser.alignmentScore}% Alignment</span>
                </div>
              )}
            </div>

            {/* Original Message */}
            <div className="mb-6 p-4 bg-[#0B0F0C]/50 rounded-xl border border-[#1A211A]">
              <p className="text-xs text-[#A9B5AA] mb-2 uppercase tracking-wider">Their Message</p>
              <p className="text-[#F6FFF2] text-sm leading-relaxed">
                {originalMessage.message}
              </p>
            </div>

            {/* Message Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#F6FFF2] mb-3 font-medium">
                  Share a thoughtful response to continue the conversation.
                </label>
                <div className="bg-[#0B0F0C]/50 rounded-lg px-3 py-2 mb-3 border border-[#D9FF3D]/20">
                  <p className="text-xs text-[#D9FF3D] flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D9FF3D] mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Minimum 120 characters required.</strong> This ensures meaningful conversations and intentional connections.
                    </span>
                  </p>
                </div>
                {senderUser.alignmentScore && (
                  <p className="text-xs text-[#D9FF3D] mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                    You share {senderUser.alignmentScore}% alignment — lean into that.
                  </p>
                )}

                {/* Conversation Starters */}
                <div className="mb-4 space-y-2">
                  <p className="text-xs text-[#A9B5AA] font-medium mb-2">💡 Conversation starters:</p>
                  <div className="space-y-2">
                    {conversationStarters.map((starter, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMessage(starter)}
                        className="w-full text-left p-2 rounded-lg bg-[#0B0F0C]/70 border border-[#1A211A]/50 hover:border-[#D9FF3D]/50 text-[#A9B5AA] hover:text-[#F6FFF2] text-xs leading-relaxed transition-all hover:bg-[#1A211A]"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-[#A9B5AA]/50 mt-2">Feel free to personalize any starter above</p>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                  placeholder="What would you like to say in response..."
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors resize-none"
                  rows={6}
                />
              </div>

              {/* Character Count */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {messageLength < minLength ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-400">
                        Minimum 120 characters — meaningful responses only.
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                      <span className="text-[#D9FF3D]">Good to go!</span>
                    </>
                  )}
                </div>
                <span className={messageLength > maxLength * 0.9 ? 'text-yellow-400' : 'text-[#A9B5AA]'}>
                  {messageLength}/{maxLength}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isReady}
                className="w-full py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    Send Response
                  </>
                )}
              </button>
            </form>

            {/* Helper Text */}
            <p className="text-center text-[#A9B5AA]/50 text-xs mt-4">
              Be genuine and authentic. Good conversations build real connections.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ResponseModal;
