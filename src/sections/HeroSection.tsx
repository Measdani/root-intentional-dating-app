import React, { useEffect, useRef, useState } from 'react';
import CommunitySwitcher from '@/components/CommunitySwitcher';
import BrandLogo from '@/components/BrandLogo';
import { useCommunity } from '@/modules';
import { lgbtqWaitlistService } from '@/services/lgbtqWaitlistService';
import { toast } from 'sonner';
import { ChevronDown, X } from 'lucide-react';

type WaitlistSurveyStatus = 'form' | 'verification-sent' | 'verified';

const emptyWaitlistForm = {
  name: '',
  email: '',
  safetyFeature: '',
  identityPreferences: '',
  personalWork: '',
};

const HeroSection: React.FC = () => {
  const { activeCommunity } = useCommunity();
  const [isVisible, setIsVisible] = useState(false);
  const [showWaitlistSurvey, setShowWaitlistSurvey] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState<WaitlistSurveyStatus>('form');
  const [waitlistStatusMessage, setWaitlistStatusMessage] = useState('');
  const [waitlistForm, setWaitlistForm] = useState(emptyWaitlistForm);
  const [waitlistErrors, setWaitlistErrors] = useState<Record<string, string>>({});
  const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollToNext = () => {
    const nextSection = document.getElementById('section-problem');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWaitlistSurvey = () => {
    setWaitlistForm(emptyWaitlistForm);
    setWaitlistErrors({});
    setWaitlistStatus('form');
    setWaitlistStatusMessage('');
    setShowWaitlistSurvey(true);
  };

  const closeWaitlistSurvey = () => {
    setShowWaitlistSurvey(false);
  };

  const updateWaitlistField = (
    field: keyof typeof emptyWaitlistForm,
    value: string
  ) => {
    setWaitlistForm((prev) => ({ ...prev, [field]: value }));
    if (waitlistErrors[field]) {
      setWaitlistErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const getWaitlistRedirectUrl = () => {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  };

  const submitWaitlistSurvey = async () => {
    const nextErrors: Record<string, string> = {};

    if (!waitlistForm.name.trim()) {
      nextErrors.name = 'Name is required.';
    }

    const trimmedEmail = waitlistForm.email.trim();
    if (!trimmedEmail) {
      nextErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email.';
    }

    if (!waitlistForm.safetyFeature.trim()) {
      nextErrors.safetyFeature = 'Please answer the safety question.';
    }
    if (!waitlistForm.identityPreferences.trim()) {
      nextErrors.identityPreferences = 'Please answer the identity question.';
    }
    if (!waitlistForm.personalWork.trim()) {
      nextErrors.personalWork = 'Please answer the personal work question.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setWaitlistErrors(nextErrors);
      return;
    }

    try {
      setIsSubmittingWaitlist(true);
      setWaitlistErrors({});
      const result = await lgbtqWaitlistService.requestVerification({
        name: waitlistForm.name.trim(),
        email: trimmedEmail,
        safetyFeature: waitlistForm.safetyFeature.trim(),
        identityPreferences: waitlistForm.identityPreferences.trim(),
        personalWork: waitlistForm.personalWork.trim(),
        redirectUrl: getWaitlistRedirectUrl(),
      });

      setWaitlistStatus(result.status === 'verification_sent' ? 'verification-sent' : 'verified');
      setWaitlistStatusMessage(result.message);

      if (result.status === 'verification_sent') {
        toast.success('Verification email sent. Check your inbox.');
      } else {
        toast.success('This waitlist email is already verified.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to submit the waitlist survey right now.';
      setWaitlistErrors({ submit: message });
      toast.error(message);
    } finally {
      setIsSubmittingWaitlist(false);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-hero"
      className="section-pinned bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background Image with Vignette */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80"
          alt="Forest path"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F0C]/40 via-transparent to-[#0B0F0C]/60" />
      </div>

      {/* Center Circle Frame */}
      <div
        className={`relative z-10 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        <div className="w-[85vw] h-[85vw] max-w-[720px] max-h-[720px] circle-frame relative">
          {/* Inner Circle Content */}
          <div className="absolute inset-4 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80"
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/80 via-transparent to-[#0B0F0C]/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-8">
            <h1
              className={`font-display text-[clamp(48px,10vw,120px)] text-[#F6FFF2] mb-4 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              {activeCommunity.heroTitle}
            </h1>
            <p
              className={`text-[clamp(16px,2vw,24px)] text-[#A9B5AA] max-w-md mx-auto mb-10 transition-all duration-700 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {activeCommunity.heroTagline}
            </p>
            <button
              onClick={openWaitlistSurvey}
              className={`inline-flex items-center justify-center rounded-xl border border-[#D9FF3D]/60 bg-[#D9FF3D]/10 px-5 py-2.5 text-sm font-medium text-[#D9FF3D] transition-all hover:bg-[#D9FF3D]/20 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              LGBTQ+ Waitlist + Survey
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Left Label */}
      <div
        className={`absolute bottom-8 left-8 z-20 transition-all duration-700 delay-900 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="font-mono-label text-[#A9B5AA] mb-2">Intentional Dating</div>
        <div className="w-12 h-0.5 bg-[#D9FF3D]" />
      </div>

      {/* Bottom Center Scroll Indicator */}
      <button
        onClick={scrollToNext}
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 transition-all duration-700 delay-1000 hover:opacity-80 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="font-mono-label text-[#A9B5AA]">Scroll</span>
        <ChevronDown className="w-5 h-5 text-[#A9B5AA] scroll-indicator" />
      </button>

      {/* Top Right Community Switcher */}
      <div
        className={`absolute top-[5.5rem] right-8 z-20 transition-all duration-700 delay-600 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <CommunitySwitcher className="text-right" />
      </div>

      {/* Logo Top Left */}
      <div
        className={`absolute top-8 left-8 z-20 transition-all duration-700 delay-400 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <BrandLogo imageClassName="w-[90px] sm:w-[108px]" />
      </div>

      {showWaitlistSurvey && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-[#0B0F0C]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#1A211A] bg-[#111611] p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-[#F6FFF2]">LGBTQ+ Waitlist Survey</h2>
                <p className="mt-2 text-sm text-[#A9B5AA]">
                  I want to make sure I'm building this the right way from the start, so I'm holding off on the official launch until I've gathered more community feedback. If you have a moment, I'd love your help with a quick survey to ensure the space truly meets your needs.
                </p>
              </div>
              <button
                onClick={closeWaitlistSurvey}
                className="rounded-full border border-[#2A312A] p-2 text-[#A9B5AA] transition-colors hover:text-[#F6FFF2]"
                aria-label="Close waitlist survey"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {waitlistStatus === 'verified' ? (
              <div className="rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-5 text-center">
                <p className="text-lg font-medium text-[#F6FFF2]">
                  {waitlistStatusMessage ||
                    'Thank you for your survey. Your email has been verified. We will contact you when we launch.'}
                </p>
                <button
                  onClick={closeWaitlistSurvey}
                  className="mt-4 rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm font-medium text-[#0B0F0C] transition-transform hover:scale-[1.02]"
                >
                  Close
                </button>
              </div>
            ) : waitlistStatus === 'verification-sent' ? (
              <div className="rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-5 text-center">
                <p className="text-lg font-medium text-[#F6FFF2]">Check your email</p>
                <p className="mt-2 text-sm text-[#A9B5AA]">
                  {waitlistStatusMessage ||
                    'We sent a verification link to your email. We will not contact you until the address is confirmed.'}
                </p>
                <button
                  onClick={closeWaitlistSurvey}
                  className="mt-4 rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm font-medium text-[#0B0F0C] transition-transform hover:scale-[1.02]"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {waitlistErrors.submit && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {waitlistErrors.submit}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#F6FFF2]">Name *</label>
                  <input
                    type="text"
                    value={waitlistForm.name}
                    onChange={(event) => updateWaitlistField('name', event.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] placeholder-[#6E7A6F] focus:border-[#D9FF3D] focus:outline-none"
                  />
                  {waitlistErrors.name && <p className="mt-1 text-xs text-red-300">{waitlistErrors.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#F6FFF2]">Email *</label>
                  <input
                    type="email"
                    value={waitlistForm.email}
                    onChange={(event) => updateWaitlistField('email', event.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] placeholder-[#6E7A6F] focus:border-[#D9FF3D] focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-[#6E7A6F]">
                    We will send a verification link first. Your waitlist confirmation happens after you verify.
                  </p>
                  {waitlistErrors.email && <p className="mt-1 text-xs text-red-300">{waitlistErrors.email}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#F6FFF2]">
                    Safety: What is the #1 safety feature you feel is missing from current dating apps?
                  </label>
                  <textarea
                    value={waitlistForm.safetyFeature}
                    onChange={(event) => updateWaitlistField('safetyFeature', event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] placeholder-[#6E7A6F] focus:border-[#D9FF3D] focus:outline-none"
                  />
                  {waitlistErrors.safetyFeature && (
                    <p className="mt-1 text-xs text-red-300">{waitlistErrors.safetyFeature}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#F6FFF2]">
                    Identity: How do you prefer to see gender and orientation categorized to ensure you feel seen but safe?
                  </label>
                  <textarea
                    value={waitlistForm.identityPreferences}
                    onChange={(event) => updateWaitlistField('identityPreferences', event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] placeholder-[#6E7A6F] focus:border-[#D9FF3D] focus:outline-none"
                  />
                  {waitlistErrors.identityPreferences && (
                    <p className="mt-1 text-xs text-red-300">{waitlistErrors.identityPreferences}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#F6FFF2]">
                    The Work: What does "doing the personal work" look like in our community? (e.g., healing from religious trauma, body positivity, boundary setting).
                  </label>
                  <textarea
                    value={waitlistForm.personalWork}
                    onChange={(event) => updateWaitlistField('personalWork', event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] placeholder-[#6E7A6F] focus:border-[#D9FF3D] focus:outline-none"
                  />
                  {waitlistErrors.personalWork && (
                    <p className="mt-1 text-xs text-red-300">{waitlistErrors.personalWork}</p>
                  )}
                </div>

                <button
                  onClick={submitWaitlistSurvey}
                  disabled={isSubmittingWaitlist}
                  className="w-full rounded-xl bg-[#D9FF3D] px-4 py-3 font-medium text-[#0B0F0C] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingWaitlist ? 'Sending verification email...' : 'Submit Survey & Verify Email'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;

