import React, { useState } from 'react';
import { toast } from 'sonner';
import type { User, ReportReason } from '@/types';
import { X, Check, Flag, Loader2, Lock } from 'lucide-react';

interface ReportUserModalProps {
  isOpen: boolean;
  reportedUser: User | null;
  conversationId?: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string, shouldBlock: boolean) => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'harassment',
    label: 'Harassment or Bullying',
    description: 'Threatening, intimidating, or abusive behavior',
  },
  {
    value: 'inappropriate-content',
    label: 'Inappropriate Content',
    description: 'Sexual, violent, or offensive messages/photos',
  },
  {
    value: 'fake-profile',
    label: 'Fake or Misleading Profile',
    description: 'Profile appears to be fake or misrepresenting someone',
  },
  {
    value: 'spam',
    label: 'Spam or Scam',
    description: 'Promotional content, links, or suspicious activity',
  },
  {
    value: 'safety-concern',
    label: 'Safety Concern',
    description: 'Threats of harm, stalking, coercion, or behavior that makes you feel unsafe',
  },
  {
    value: 'hateful-conduct',
    label: 'Hateful Conduct',
    description: 'Discriminatory or hateful language/behavior',
  },
  {
    value: 'underage',
    label: 'Age Misrepresentation',
    description: 'This user may be misrepresenting their age or appears under platform requirements',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else that violates community guidelines',
  },
];

const ReportUserModal: React.FC<ReportUserModalProps> = ({
  isOpen,
  reportedUser,
  onClose,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !reportedUser) return null;

  const detailsLength = details.length;
  const minLength = 50;
  const maxLength = 1000;
  const isValidLength = detailsLength >= minLength && detailsLength <= maxLength;
  const hasReason = selectedReason !== null;
  const isReady = isValidLength && hasReason && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReady || !selectedReason) {
      console.warn('Report form not ready. isReady:', isReady, 'selectedReason:', selectedReason);
      return;
    }

    console.log('🚀 Submitting report form. Reason:', selectedReason, 'Details length:', detailsLength, 'Should block:', shouldBlock);
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSuccess(true);
    onSubmit(selectedReason, details, shouldBlock);

    // Show success toast
    toast.success('Thank you for your report. We\'ll review this promptly.');

    // Close after showing success
    setTimeout(() => {
      onClose();
      setSelectedReason(null);
      setDetails('');
      setShouldBlock(false);
      setIsSuccess(false);
    }, 2000);
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      onClose();
      setSelectedReason(null);
      setDetails('');
      setShouldBlock(false);
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
            <h3 className="font-display text-2xl text-[#F6FFF2] mb-2">Report Submitted</h3>
            <p className="text-[#A9B5AA] text-sm mb-3">
              Thank you for helping keep our community safe. We'll review your report.
            </p>
            {shouldBlock && (
              <div className="p-3 bg-[#0B0F0C]/50 rounded-lg border border-[#1A211A] text-xs text-[#A9B5AA]">
                ✓ {reportedUser.name} has been blocked. You won't receive messages from them.
              </div>
            )}
          </div>
        ) : (
          <>
            {/* User Info */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D9FF3D] to-[#a8cc2d] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0B0F0C] font-display text-2xl">
                      {reportedUser.name[0]}
                    </span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                    <Flag className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
              <h3 className="font-display text-2xl text-[#F6FFF2] mb-1">
                Report {reportedUser.name}
              </h3>
              <p className="text-[#A9B5AA] text-sm">
                {reportedUser.age} • {reportedUser.city}
              </p>

              {/* Privacy Notice */}
              <div className="mt-4 p-3 bg-[#0B0F0C]/50 rounded-lg flex items-start gap-2">
                <Lock className="w-4 h-4 text-[#D9FF3D] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#A9B5AA]">
                  Your report is anonymous. The reported user will not know who submitted this report.
                </p>
              </div>
            </div>

            {/* Report Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Reason Dropdown */}
              <div>
                <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                  What's the issue?
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map(reason => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setSelectedReason(reason.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedReason === reason.value
                          ? 'bg-[#D9FF3D]/10 border-[#D9FF3D] text-[#F6FFF2]'
                          : 'bg-[#0B0F0C] border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{reason.label}</div>
                      <div className="text-xs opacity-75 mt-0.5">{reason.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Details Textarea */}
              {selectedReason && (
                <div>
                  <label className="block text-sm text-[#F6FFF2] mb-2 font-medium">
                    Tell us what happened
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value.slice(0, maxLength))}
                    placeholder="Please provide specific details to help us understand the issue..."
                    className="w-full px-4 py-3 bg-[#0B0F0C] border border-[#1A211A] rounded-xl text-[#F6FFF2] placeholder:text-[#A9B5AA]/50 focus:outline-none focus:border-[#D9FF3D] transition-colors resize-none"
                    rows={4}
                  />

                  {/* Character Count */}
                  <div className="flex justify-between items-center text-xs mt-2">
                    <div className="flex items-center gap-2">
                      {detailsLength < minLength ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-400">
                            Minimum 50 characters for clarity
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-[#D9FF3D]" />
                          <span className="text-[#D9FF3D]">Good to go!</span>
                        </>
                      )}
                    </div>
                    <span className={detailsLength > maxLength * 0.9 ? 'text-yellow-400' : 'text-[#A9B5AA]'}>
                      {detailsLength}/{maxLength}
                    </span>
                  </div>
                </div>
              )}

              {/* Block User Checkbox */}
              {selectedReason && (
                <div className="flex items-center gap-3 p-3 bg-[#0B0F0C]/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="block-user"
                    checked={shouldBlock}
                    onChange={(e) => setShouldBlock(e.target.checked)}
                    className="w-4 h-4 rounded border-[#1A211A] accent-[#D9FF3D]"
                  />
                  <label htmlFor="block-user" className="text-sm text-[#A9B5AA] cursor-pointer flex-1">
                    Block this user so they can't contact me
                  </label>
                </div>
              )}

              {/* What Happens Next */}
              {selectedReason && (
                <div className="p-4 bg-[#0B0F0C] rounded-lg border border-[#1A211A]">
                  <h4 className="text-sm font-medium text-[#F6FFF2] mb-2">What Happens Next</h4>
                  <ul className="text-xs text-[#A9B5AA] space-y-1.5">
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>Our team will review your report within 24-48 hours</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>You will not receive any personal update about this user</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-[#D9FF3D]">•</span>
                      <span>If this is a safety emergency, contact local authorities immediately</span>
                    </li>
                  </ul>
                </div>
              )}

              {/* Submit Button */}
              {selectedReason && (
                <button
                  type="submit"
                  disabled={!isReady}
                  className="w-full py-3.5 bg-[#D9FF3D] text-[#0B0F0C] rounded-xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              )}
            </form>

            {/* Helper Text */}
            {!selectedReason && (
              <p className="text-center text-[#A9B5AA]/50 text-xs mt-4">
                Choose a report category to continue
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportUserModal;
