import React from 'react';
import { Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type MeetingSafetyButtonProps = {
  variant?: 'floating' | 'icon';
};

const MeetingSafetyButton: React.FC<MeetingSafetyButtonProps> = ({ variant = 'floating' }) => {
  const isIconOnly = variant === 'icon';

  return (
    <Dialog>
      <DialogTrigger asChild>
        {isIconOnly ? (
          <button
            type="button"
            className="text-[#A9B5AA] hover:text-[#D9FF3D] transition-colors"
            title="Meeting Safety Tips"
            aria-label="Open meeting safety tips"
          >
            <Shield className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-2 rounded-full border border-[#D9FF3D]/35 bg-[#0B0F0C] px-4 py-2 text-[#F6FFF2] shadow-lg shadow-black/30 transition-colors hover:bg-[#121A12]"
            title="Meeting Safety Tips"
            aria-label="Open meeting safety tips"
          >
            <Shield className="h-4 w-4 text-[#D9FF3D]" />
            <span className="text-sm font-semibold">Safety</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        overlayClassName="bg-[#0B0F0C]/75 backdrop-blur-sm"
        className="max-w-xl border border-[#D9FF3D]/20 bg-[#111611] p-0 text-[#F6FFF2]"
      >
        <DialogHeader className="border-b border-[#1A211A] px-6 py-5 pr-12">
          <div className="flex items-center gap-3 text-[#D9FF3D]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D9FF3D]/15">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]">Safety Reminder</p>
              <DialogTitle className="font-display text-2xl text-[#F6FFF2]">Meet With Care</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-3 text-sm leading-relaxed text-[#A9B5AA]">
            Rooted Hearts can encourage safer connections, but we cannot provide complete protection.
            Your awareness, preparation, and discernment still matter every time you meet someone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6 text-sm">
          <div className="rounded-2xl border border-[#D9FF3D]/15 bg-[#0B0F0C] p-5">
            <p className="mb-3 font-medium text-[#D9FF3D]">Before or during an in-person date:</p>
            <ul className="space-y-2 text-[#A9B5AA]">
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Meet in a public place.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Use your own transportation.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Do not share your home address too early.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Trust discomfort. You do not owe anyone continued access.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-5">
            <p className="mb-3 font-medium text-[#D9FF3D]">If you do not have someone to update:</p>
            <ul className="space-y-2 text-[#A9B5AA]">
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Email yourself the date details.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Leave yourself a voicemail with the location and time.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#D9FF3D]">-</span>
                <span>Keep screenshots of your conversation and plans.</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingSafetyButton;
