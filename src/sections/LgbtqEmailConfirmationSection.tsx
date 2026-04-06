import React from 'react';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import {
  lgbtqWaitlistService,
  type LgbtqIdentityResponse,
} from '@/services/lgbtqWaitlistService';

const WAITLIST_TOKEN_PARAM = 'waitlistToken';
const WAITLIST_TOKEN_STORAGE_KEY = 'rooted:lgbtq-waitlist-token';
const FINAL_MESSAGE =
  "Thank you for your response. You'll be notified when this experience becomes available.";

const IDENTITY_OPTIONS: Array<{
  value: LgbtqIdentityResponse;
  label: string;
}> = [
  { value: 'heterosexual', label: 'Heterosexual' },
  { value: 'lgbtq', label: 'LGBTQ+' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

type ConfirmationStep = 'verifying' | 'ready' | 'submitting' | 'complete' | 'error';

const LgbtqEmailConfirmationSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [step, setStep] = React.useState<ConfirmationStep>('verifying');
  const [token, setToken] = React.useState('');
  const [selectedIdentity, setSelectedIdentity] = React.useState<LgbtqIdentityResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState(FINAL_MESSAGE);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const tokenFromUrl = url.searchParams.get(WAITLIST_TOKEN_PARAM)?.trim() ?? '';
    const tokenFromStorage = window.sessionStorage.getItem(WAITLIST_TOKEN_STORAGE_KEY)?.trim() ?? '';
    const resolvedToken = tokenFromUrl || tokenFromStorage;

    if (!resolvedToken) {
      setStep('error');
      setErrorMessage('This confirmation link is invalid or has expired.');
      return;
    }

    window.sessionStorage.setItem(WAITLIST_TOKEN_STORAGE_KEY, resolvedToken);
    setToken(resolvedToken);

    if (tokenFromUrl) {
      url.searchParams.delete(WAITLIST_TOKEN_PARAM);
      url.searchParams.set('view', 'lgbtq-email-confirmation');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

    let isCancelled = false;

    void lgbtqWaitlistService
      .verifyEmail(resolvedToken)
      .then((result) => {
        if (isCancelled) return;

        if (result.identityResponse) {
          setSelectedIdentity(result.identityResponse);
          setStep('complete');
          setSuccessMessage(FINAL_MESSAGE);
          return;
        }

        setStep('ready');
      })
      .catch((error) => {
        if (isCancelled) return;
        const message =
          error instanceof Error ? error.message : 'This confirmation link could not be completed.';
        setStep('error');
        setErrorMessage(message);
        window.sessionStorage.removeItem(WAITLIST_TOKEN_STORAGE_KEY);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleContinue = async () => {
    if (!token) {
      setStep('error');
      setErrorMessage('This confirmation link is invalid or has expired.');
      return;
    }

    if (!selectedIdentity) {
      setErrorMessage('Please select an option to continue.');
      return;
    }

    try {
      setErrorMessage('');
      setStep('submitting');
      const result = await lgbtqWaitlistService.submitIdentityResponse(token, selectedIdentity);
      setSuccessMessage(result.message || FINAL_MESSAGE);
      setStep('complete');
      toast.success('Thank you for sharing that.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your response right now.';
      setStep('ready');
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0B0F0C] px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=80"
          alt=""
          className="h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-[#0B0F0C]/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(217,255,61,0.12),_transparent_45%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full max-w-xl rounded-[28px] border border-[#253025] bg-[#111611]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-8">
          {step === 'verifying' && (
            <div className="space-y-3 text-center">
              <p className="text-sm uppercase tracking-[0.22em] text-[#D9FF3D]">Rooted Hearts</p>
              <h1 className="font-display text-4xl text-[#F6FFF2]">Verifying...</h1>
              <p className="text-base text-[#A9B5AA]">Hold on while I confirm your email.</p>
            </div>
          )}

          {step === 'ready' && (
            <div className="space-y-6">
              <div className="space-y-3 text-center">
                <p className="text-sm uppercase tracking-[0.22em] text-[#D9FF3D]">Rooted Hearts</p>
                <h1 className="font-display text-4xl text-[#F6FFF2]">You're Confirmed.</h1>
                <p className="text-lg text-[#E8F2E8]">Your email has been verified successfully.</p>
              </div>

              <div className="space-y-4 rounded-2xl border border-[#253025] bg-[#0B0F0C]/80 p-5">
                <p className="text-base leading-7 text-[#E8F2E8]">
                  Before you continue, we have one final optional question to help us better understand our community.
                </p>
                <p className="text-sm leading-6 text-[#A9B5AA]">
                  Your responses are private and used only to improve platform design and inclusivity.
                </p>
              </div>

              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#D9FF3D]">
                  How do you identify?
                </p>
                <div className="space-y-3">
                  {IDENTITY_OPTIONS.map((option) => {
                    const isSelected = selectedIdentity === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedIdentity(option.value);
                          setErrorMessage('');
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
                          isSelected
                            ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#F6FFF2]'
                            : 'border-[#253025] bg-[#0B0F0C]/75 text-[#D7E0D7] hover:border-[#6D7B63]'
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            isSelected ? 'border-[#D9FF3D]' : 'border-[#6E7A6F]'
                          }`}
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              isSelected ? 'bg-[#D9FF3D]' : 'bg-transparent'
                            }`}
                          />
                        </span>
                        <span className="text-base">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleContinue}
                className="w-full rounded-2xl bg-[#D9FF3D] px-4 py-3 text-base font-semibold text-[#0B0F0C] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'submitting' && (
            <div className="space-y-3 text-center">
              <p className="text-sm uppercase tracking-[0.22em] text-[#D9FF3D]">Rooted Hearts</p>
              <h1 className="font-display text-4xl text-[#F6FFF2]">One moment...</h1>
              <p className="text-base text-[#A9B5AA]">Saving your response now.</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="space-y-5 text-center">
              <p className="text-sm uppercase tracking-[0.22em] text-[#D9FF3D]">Rooted Hearts</p>
              <h1 className="font-display text-4xl text-[#F6FFF2]">Thank you.</h1>
              <p className="mx-auto max-w-md text-lg leading-8 text-[#E8F2E8]">{successMessage}</p>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-5 text-center">
              <p className="text-sm uppercase tracking-[0.22em] text-[#D9FF3D]">Rooted Hearts</p>
              <h1 className="font-display text-4xl text-[#F6FFF2]">We couldn't complete that.</h1>
              <p className="mx-auto max-w-md text-base leading-7 text-[#A9B5AA]">
                {errorMessage || 'This confirmation link is invalid or has expired.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('landing')}
                className="rounded-2xl border border-[#D9FF3D]/40 px-5 py-3 text-sm font-medium text-[#D9FF3D] transition-colors hover:bg-[#D9FF3D]/10"
              >
                Back to home
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LgbtqEmailConfirmationSection;
