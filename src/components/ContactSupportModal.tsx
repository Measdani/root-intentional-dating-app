import React, { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import type { SupportCategory } from '@/types';
import { X, Check, MessageSquare, Loader2, Zap } from 'lucide-react';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORT_CATEGORIES: { value: SupportCategory; label: string; description: string }[] = [
  {
    value: 'technical',
    label: 'Technical Issue',
    description: 'App crashes, bugs, or technical problems',
  },
  {
    value: 'account',
    label: 'Account Question',
    description: 'Login, verification, or account settings',
  },
  {
    value: 'billing',
    label: 'Billing & Subscription',
    description: 'Payment, subscription, or refund questions',
  },
  {
    value: 'feature-request',
    label: 'Feature Request',
    description: 'Suggest a new feature or improvement',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else',
  },
];

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, submitSupportRequest } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const hasPriority = currentUser.membershipTier === 'quarterly' || currentUser.membershipTier === 'annual';
  const subjectLength = subject.length;
  const messageLength = message.length;
  const maxSubjectLength = 100;
  const minMessageLength = 50;
  const maxMessageLength = 1000;

  const isSubjectValid = subjectLength > 0 && subjectLength <= maxSubjectLength;
  const isMessageValid = messageLength >= minMessageLength && messageLength <= maxMessageLength;
  const isReady = selectedCategory && isSubjectValid && isMessageValid && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady || !selectedCategory) return;

    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await submitSupportRequest(selectedCategory, subject, message);

    setIsSubmitting(false);
    setIsSuccess(true);

    // Close after showing success
    setTimeout(() => {
      onClose();
      setSelectedCategory(null);
      setSubject('');
      setMessage('');
      setIsSuccess(false);
    }, 2500);
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      onClose();
      setSelectedCategory(null);
      setSubject('');
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
            <p className="text-[#A9B5AA] text-sm mb-4">
              {hasPriority
                ? 'Our priority support team will respond within 24 hours.'
                : "We'll get back to you within 3-5 business days."}
            </p>
            <div className="p-3 bg-[#0B0F0C]/50 rounded-lg text-xs text-[#A9B5AA]">
              ✓ Check your email for updates
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#D9FF3D]/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-[#D9FF3D]" />
                </div>
                <h2 className="font-display text-2xl text-[#F6FFF2]">Contact Support</h2>
              </div>

              {/* Priority Badge */}
              {hasPriority && (
                <div className="flex items-center gap-2 p-2 bg-[#D9FF3D]/10 rounded-lg border border-[#D9FF3D]/30 w-fit">
                  <Zap className="w-3 h-3 text-[#D9FF3D]" />
                  <span className="text-xs font-medium text-[#D9FF3D]">PRIORITY SUPPORT</span>
                </div>
              )}
            </div>

            {/* Support Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selection */}
              <div>
                <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                  What can we help with?
                </label>
                <div className="space-y-2">
                  {SUPPORT_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setSelectedCategory(category.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedCategory === category.value
                          ? 'bg-[#D9FF3D]/10 border-[#D9FF3D] text-[#F6FFF2]'
                          : 'bg-[#0B0F0C] border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{category.label}</div>
                      <div className="text-xs opacity-75 mt-0.5">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value.slice(0, maxSubjectLength))}
                    placeholder="Brief summary of your issue..."
                    className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors"
                  />
                  <div className="flex justify-between items-center text-xs mt-2">
                    <span className={subjectLength === 0 ? 'text-red-400' : 'text-[#A9B5AA]'}>
                      {subjectLength === 0 ? 'Required' : 'Required'}
                    </span>
                    <span className="text-[#A9B5AA]">
                      {subjectLength}/{maxSubjectLength}
                    </span>
                  </div>
                </div>
              )}

              {/* Message Textarea */}
              {selectedCategory && (
                <div>
                  <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                    Tell us more
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, maxMessageLength))}
                    placeholder="Please provide details to help us understand your issue better..."
                    className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors resize-none"
                    rows={4}
                  />

                  {/* Character Count */}
                  <div className="flex justify-between items-center text-xs mt-2">
                    <div className="flex items-center gap-2">
                      {messageLength < minMessageLength ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-400">
                            Minimum 50 characters
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                          <span className="text-[#D9FF3D]">Good to go!</span>
                        </>
                      )}
                    </div>
                    <span className={messageLength > maxMessageLength * 0.9 ? 'text-yellow-400' : 'text-[#A9B5AA]'}>
                      {messageLength}/{maxMessageLength}
                    </span>
                  </div>
                </div>
              )}

              {/* What to Expect */}
              {selectedCategory && (
                <div className="p-4 bg-[#0B0F0C] rounded-lg border border-[#1A211A]">
                  <h4 className="text-sm font-medium text-[#F6FFF2] mb-2">What to Expect</h4>
                  <ul className="text-xs text-[#A9B5AA] space-y-1.5">
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>
                        {hasPriority
                          ? 'Priority support will respond within 24 hours'
                          : 'We will respond within 3-5 business days'}
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>You'll receive updates via email</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>Be as detailed as possible to help us assist you faster</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Submit Button */}
              {selectedCategory && (
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
                      <MessageSquare className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactSupportModal;
