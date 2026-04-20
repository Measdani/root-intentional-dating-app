import React from 'react';
import { Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type MeetingSafetyButtonProps = {
  variant?: 'floating' | 'icon';
};

const MeetingSafetyButton: React.FC<MeetingSafetyButtonProps> = ({ variant = 'floating' }) => {
  const isIconOnly = variant === 'icon';
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {isIconOnly ? (
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
          title={isOpen ? 'Close Rooted Hearts Trust Protocol' : 'Open Rooted Hearts Trust Protocol'}
          aria-label={isOpen ? 'Close Rooted Hearts Trust Protocol' : 'Open Rooted Hearts Trust Protocol'}
        >
          <Shield className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D9FF3D]/35 bg-[#0B0F0C] text-[#F6FFF2] shadow-lg shadow-black/30 transition-colors hover:bg-[#121A12]"
          title={isOpen ? 'Close Rooted Hearts Trust Protocol' : 'Open Rooted Hearts Trust Protocol'}
          aria-label={isOpen ? 'Close Rooted Hearts Trust Protocol' : 'Open Rooted Hearts Trust Protocol'}
        >
          <Shield className="h-4 w-4 text-[#D9FF3D]" />
        </button>
      )}

      <DialogContent
        overlayClassName="bg-[#0B0F0C]/75 backdrop-blur-sm"
        className="w-[calc(100vw-1.5rem)] max-w-md overflow-hidden border border-[#D9FF3D]/20 bg-[#111611] p-0 text-[#F6FFF2] sm:max-w-lg"
      >
        <DialogHeader className="border-b border-[#1A211A] px-5 py-4 pr-12">
          <div className="flex items-center gap-3 text-[#D9FF3D]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9FF3D]/15">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Trust Protocol</p>
              <DialogTitle className="font-display text-xl text-[#F6FFF2] sm:text-2xl">The Rooted Hearts Trust Protocol</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-3 text-sm leading-relaxed text-[#A9B5AA]">
            Our community is built on the principle of Sovereignty. We provide the gate; you provide
            the wisdom.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-4 text-sm sm:max-h-[65vh]">
          <div className="rounded-2xl border border-[#D9FF3D]/15 bg-[#0B0F0C] p-4">
            <p className="mb-2 font-medium text-[#D9FF3D]">1. Verified Identity (Included for All Members)</p>
            <p className="leading-relaxed text-[#A9B5AA]">
              Every member must pass a real-time Identity Match. We use AI to pair a live selfie
              with a government-issued ID to ensure every "Tribe Member" is exactly who they claim
              to be. No bots, no fakes.
            </p>
          </div>

          <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-4">
            <p className="mb-2 font-medium text-[#D9FF3D]">2. National Safety Screening (Available Option)</p>
            <p className="leading-relaxed text-[#A9B5AA]">
              For those seeking the highest level of transparency, we offer a National Criminal &
              Sex Offender screening.
            </p>
            <div className="mt-4 space-y-3 text-[#A9B5AA]">
              <div>
                <p className="font-medium text-[#F6FFF2]">Annual Members</p>
                <p>This comprehensive check is included in your membership.</p>
              </div>
              <div>
                <p className="font-medium text-[#F6FFF2]">Monthly Members</p>
                <p>
                  You can choose to add this "Trust Badge" to your profile at any time for a one-time
                  verification fee.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9FF3D]/15 bg-[#0B0F0C] p-4">
            <p className="mb-2 font-medium text-[#D9FF3D]">3. Sovereign Safety (Your Responsibility)</p>
            <p className="leading-relaxed text-[#A9B5AA]">
              A background check is a snapshot of the past, not a guarantee of the future. We provide
              the tools, but you stay the protector of your own journey. Always follow our Safe-Meet
              Protocols:
            </p>
            <div className="mt-4 space-y-3 text-[#A9B5AA]">
              <div>
                <p className="font-medium text-[#F6FFF2]">Public Only</p>
                <p>Always host your first three meetings in well-lit, public spaces.</p>
              </div>
              <div>
                <p className="font-medium text-[#F6FFF2]">Own the Road</p>
                <p>Arrange your own transportation to and from every meeting.</p>
              </div>
              <div>
                <p className="font-medium text-[#F6FFF2]">The Voice Memo</p>
                <p>
                  Always leave a voicemail for yourself or a friend with the time, location, and
                  name of the person you are meeting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSafetyButton;
