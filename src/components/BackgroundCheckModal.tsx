import React, { useState } from 'react';
import { X, Shield, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface BackgroundCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

const BackgroundCheckModal: React.FC<BackgroundCheckModalProps> = ({
  isOpen,
  onClose,
  onVerified,
}) => {
  const [step, setStep] = useState<'intro' | 'processing' | 'complete'>('intro');

  if (!isOpen) return null;

  const handleStartCheck = async () => {
    setStep('processing');

    // Simulate background check processing with external provider
    // In production, this would redirect to Checkr, Clarity, or similar service
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock verification - 95% success rate
    const isVerified = Math.random() < 0.95;

    if (isVerified) {
      setStep('complete');
      setTimeout(() => {
        onVerified();
      }, 2000);
    } else {
      toast.error('Background check could not be completed. Please try again.');
      setStep('intro');
    }
  };

  const handleExternalRedirect = () => {
    // In production, redirect to external background check service
    // Example: https://www.checkr.com/api/redirect?...
    // For now, we'll simulate it
    toast.success('Redirecting to background check service...');
    setTimeout(() => {
      handleStartCheck();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-md animate-scale-in">
        {/* Close Button */}
        {step === 'intro' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Intro Step */}
        {step === 'intro' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>

            <h2 className="font-display text-2xl text-[#F6FFF2] mb-4">Background Verified</h2>

            <div className="space-y-4 mb-6">
              <p className="text-[#A9B5AA] text-sm leading-relaxed">
                Build trust and confidence on Rooted Hearts. A background check helps you and your matches feel safer connecting.
              </p>

              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                <h3 className="text-emerald-300 font-medium text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  What's included:
                </h3>
                <ul className="text-xs text-[#A9B5AA] space-y-1.5">
                  <li>✓ Sex Offender Registry</li>
                  <li>✓ National and Global Criminal Database Search</li>
                  <li>✓ Unlimited County Criminal Search</li>
                  <li>✓ SSN Trace & Global Watchlist</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-xs text-[#A9B5AA]">
                  <strong className="text-blue-300">Privacy Protected:</strong> Your detailed results are private. Only the Verification Badge will appear on your profile, giving others confidence in your background.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExternalRedirect}
                className="w-full py-3.5 bg-emerald-500 text-[#0B0F0C] rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Get Verified Now
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 bg-[#1A211A] text-[#A9B5AA] rounded-xl font-medium hover:text-[#F6FFF2] transition-colors"
              >
                Skip for Now
              </button>
            </div>

            <div className="bg-[#0B0F0C] rounded-lg p-4 space-y-2 mt-4">
              <p className="text-xs font-medium text-[#F6FFF2] mb-2">Important Information:</p>
              <ul className="text-xs text-[#A9B5AA] space-y-1.5">
                <li>• By clicking "Get Verified Now", you'll be redirected to a secure third-party payment page to complete the background check.</li>
                <li>• This premium check includes not just criminal background screening but also identity verification, which helps ensure your profile is genuine.</li>
                <li>• Once completed, you'll receive a Verification Badge that will be visible to others on your profile.</li>
              </ul>
            </div>

            <p className="text-xs text-[#A9B5AA]/60 text-center mt-4">
              One-time fee: $54.99 per report pricing with Checkr. You can complete this anytime.
            </p>
          </>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
            <h3 className="font-display text-xl text-[#F6FFF2] mb-2">Verifying Your Background</h3>
            <p className="text-[#A9B5AA] text-sm mb-6">
              This typically takes 1-2 minutes. Please don't close this window.
            </p>
            <div className="space-y-2 text-xs text-[#A9B5AA]">
              <p>• Confirming identity...</p>
              <p>• Running database checks...</p>
              <p>• Generating verification badge...</p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="font-display text-xl text-[#F6FFF2] mb-2">Background Verified! ✓</h3>
            <p className="text-[#A9B5AA] text-sm">
              Your verification badge is now active on your profile. Matches will see that you're verified and trustworthy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundCheckModal;
