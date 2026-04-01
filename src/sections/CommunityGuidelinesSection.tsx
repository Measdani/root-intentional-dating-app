import React from 'react';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { userService } from '@/services/userService';

const CommunityGuidelinesSection: React.FC = () => {
  const { currentUser, isUserAuthenticated, setCurrentView } = useApp();
  const [isAcknowledging, setIsAcknowledging] = React.useState(false);

  const handleAcknowledge = async () => {
    if (!currentUser.id) return;
    setIsAcknowledging(true);
    try {
      const acknowledgedAt = Date.now();
      const success = await userService.updateUser(currentUser.id, {
        guidelinesAckRequired: false,
        guidelinesAcknowledgedAt: acknowledgedAt,
      });

      if (!success) {
        toast.error('Unable to save your acknowledgement right now.');
        return;
      }

      const nextUser = {
        ...currentUser,
        guidelinesAckRequired: false,
        guidelinesAcknowledgedAt: acknowledgedAt,
      };
      localStorage.setItem('currentUser', JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent('user-login', { detail: nextUser }));
      toast.success('Guidelines acknowledged.');
      setCurrentView(
        nextUser.userStatus === 'needs-growth' || nextUser.assessmentPassed === false
          ? 'growth-mode'
          : 'browse'
      );
    } catch (error) {
      console.error('Failed to acknowledge guidelines:', error);
      toast.error('Unable to save your acknowledgement right now.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C]">
      <header className="sticky top-0 z-50 bg-[#0B0F0C]/90 backdrop-blur-md border-b border-[#1A211A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <h1 className="font-display text-xl text-[#F6FFF2]">Community Guidelines</h1>

          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-[#111611] rounded-[32px] border border-[#1A211A] p-8 md:p-10">
          <p className="text-[#A9B5AA] mb-8">
            Our community guidelines are designed to create a safe, respectful, and authentic
            environment for all members seeking intentional relationships.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Be Respectful & Authentic</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                Treat all members with kindness and respect. Be honest in your profile and
                communications. Pretending to be someone you&apos;re not or mocking others violates our
                guidelines. Authenticity is the foundation of meaningful connections.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">No Harassment or Abuse</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                Do not engage in harassment, bullying, threats, or abusive behavior. This includes
                unwanted sexual content or advances. All members deserve to feel safe and respected.
                If someone makes you uncomfortable, use the report feature immediately.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Protect Privacy</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                Don&apos;t share other members&apos; personal information, photos, or screenshots without
                consent. Respect boundaries and private conversations. This includes not
                screenshotting profiles or messages to share with others outside the platform.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">No Illegal Content or Activities</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                Don&apos;t promote or engage in illegal activities, including fraud, exploitation, or
                attempts to bypass safety systems. We work with law enforcement when necessary.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Appropriate Content Only</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                Keep conversations and content appropriate for an intentional dating platform.
                Explicit sexual content, hate speech, or discriminatory language is not permitted.
                This applies to profile descriptions, photos, and messages.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Report Violations</h2>
              <p className="text-[#A9B5AA] leading-relaxed">
                If you witness behavior that violates these guidelines, use the report feature. We
                review all reports and take action to maintain a safe community. Your reports are
                confidential and help us protect all members.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Enforcement & Consequences</h2>
              <div className="text-[#A9B5AA] leading-relaxed space-y-4">
                <p>
                  Violations of community guidelines may result in enforcement actions. We use a
                  tiered approach to give people a chance to improve while maintaining community
                  safety:
                </p>

                <div className="space-y-3 ml-4 border-l-2 border-[#D9FF3D]/30 pl-4">
                  <div>
                    <h3 className="text-[#F6FFF2] font-medium mb-1">Tier 1: Warning</h3>
                    <p className="text-sm">
                      Your account is flagged and you receive a warning message. You have an
                      opportunity to adjust your behavior.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[#F6FFF2] font-medium mb-1">Tier 2: Temporary Suspension</h3>
                    <p className="text-sm">
                      Repeated or moderate violations may result in a 7-day, 14-day, or 30-day
                      suspension, followed by guideline acknowledgement and return through The
                      Intentional Path.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[#F6FFF2] font-medium mb-1">Tier 3: Soft Reset</h3>
                    <p className="text-sm">
                      If someone is not harmful but clearly not ready, we may pause the account and
                      require a return through The Intentional Path after a structured cooldown.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[#F6FFF2] font-medium mb-1">Tier 4: Permanent Ban</h3>
                    <p className="text-sm">
                      Safety or integrity violations may result in permanent ban and a blocked
                      email that cannot be used to create a new account.
                    </p>
                  </div>
                </div>

                <p className="pt-2">
                  We believe in giving people a chance to improve their behavior while maintaining a
                  safe, welcoming community for all members.
                </p>
              </div>
            </section>

            <section className="mt-12 pt-8 border-t border-[#1A211A]">
              <h2 className="font-display text-2xl text-[#D9FF3D] mb-3">Need Help?</h2>
              <p className="text-[#A9B5AA] leading-relaxed mb-4">
                If you have questions about these guidelines or need clarification on any policy,
                our support team is here to help. Contact us through the support feature in the
                app.
              </p>
              <p className="text-sm text-[#A9B5AA]">Last updated: March 2026</p>
            </section>

            {isUserAuthenticated && currentUser.guidelinesAckRequired && (
              <section className="mt-8 pt-8 border-t border-[#1A211A] space-y-4">
                <h2 className="font-display text-2xl text-[#D9FF3D]">Acknowledge Before Returning</h2>
                <p className="text-[#A9B5AA] leading-relaxed">
                  Your account requires a fresh acknowledgement of these guidelines before access
                  resumes.
                </p>
                <button
                  onClick={handleAcknowledge}
                  disabled={isAcknowledging}
                  className="px-5 py-3 rounded-lg border border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20 transition-colors disabled:opacity-60"
                >
                  {isAcknowledging ? 'Saving Acknowledgement...' : 'I Acknowledge These Guidelines'}
                </button>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CommunityGuidelinesSection;
