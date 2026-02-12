import React, { useState } from 'react';
import { toast } from 'sonner';
import type { User } from '@/types';
import { X, Check, MessageCircle, Loader2 } from 'lucide-react';

interface ExpressInterestModalProps {
  isOpen: boolean;
  targetUser: User | null;
  onClose: () => void;
  onSubmit: (message: string) => void;
}

const ExpressInterestModal: React.FC<ExpressInterestModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !targetUser) return null;

  const messageLength = message.length;
  const minLength = 20;
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
    toast.success(`Your message was sent to ${targetUser.name}! Their photos are now visible.`);

    // Close after showing success
    setTimeout(() => {
      onClose();
      setMessage('');
      setIsSuccess(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      // Could add confirmation dialog here if message has content
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
            <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">Photos Unlocked!</h3>
            <p className="text-[#A9B5AA] text-sm">
              Your message was sent to {targetUser.name}
            </p>
          </div>
        ) : (
          <>
            {/* User Info */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0B0F0C] font-display text-2xl">
                    {targetUser.name[0]}
                  </span>
                </div>
              </div>
              <h3 className="font-display text-2xl text-[#F6FFF2] mb-1">
                Express Interest to {targetUser.name}
              </h3>
              <p className="text-[#A9B5AA] text-sm">
                {targetUser.age} • {targetUser.city}
              </p>
              {targetUser.alignmentScore && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                  <span className="text-[#D9FF3D] font-medium">{targetUser.alignmentScore}% Alignment</span>
                </div>
              )}
            </div>

            {/* Message Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#F6FFF2] mb-2">
                  Write a thoughtful message to unlock their photos
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                  placeholder="Tell them what caught your attention..."
                  className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors resize-none"
                  rows={5}
                />
              </div>

              {/* Character Count */}
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  {messageLength < minLength ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-red-400">
                        Minimum {minLength} characters
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
                    Send Message & Unlock Photos
                  </>
                )}
              </button>
            </form>

            {/* Helper Text */}
            <p className="text-center text-[#A9B5AA]/50 text-xs mt-4">
              Be genuine and authentic. Good messages increase your chances of connecting.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpressInterestModal;
