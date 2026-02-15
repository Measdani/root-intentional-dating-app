import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { X, Check, Mail, Loader2 } from 'lucide-react';

const EmailModal: React.FC = () => {
  const { showEmailModal, setShowEmailModal, hasJoinedList, setHasJoinedList } = useApp();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!showEmailModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSuccess(true);
    setHasJoinedList(true);
    
    // Close after showing success
    setTimeout(() => {
      setShowEmailModal(false);
      setIsSuccess(false);
      setEmail('');
    }, 2000);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setShowEmailModal(false);
      setEmail('');
      setIsSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-md animate-scale-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#D9FF3D]" />
            </div>
            <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">You are on the list</h3>
            <p className="text-[#A9B5AA]">We will be in touch when we launch.</p>
          </div>
        ) : hasJoinedList ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#D9FF3D]" />
            </div>
            <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">Already on the list</h3>
            <p className="text-[#A9B5AA]">We will notify you when we launch.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-5 h-5 text-[#D9FF3D]" />
              </div>
              <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">Join the list</h3>
              <p className="text-[#A9B5AA] text-sm">
                Be the first to know when we launch. No spam, ever.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3.5 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join the list'
                )}
              </button>
            </form>

            <p className="text-center text-[#A9B5AA]/50 text-xs mt-4">
              By joining, you agree to receive updates about Rooted Hearts.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailModal;
