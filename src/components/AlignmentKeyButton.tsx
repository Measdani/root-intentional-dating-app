import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type AlignmentKeyButtonProps = {
  title: string;
  prompt: string;
  forestMessage: string[];
};

const AlignmentKeyButton: React.FC<AlignmentKeyButtonProps> = ({
  title,
  prompt,
  forestMessage,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full rounded-2xl border border-[#D9FF3D]/30 bg-[#0B0F0C] px-4 py-3 text-left transition hover:border-[#D9FF3D] hover:bg-[#D9FF3D]/10 md:max-w-[320px]"
        >
          <p className="text-sm font-semibold text-[#F6FFF2]">🔑 The Alignment Key (Optional)</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A9B5AA]">
            For those seeking a deeper, spiritual perspective on their journey.
          </p>
        </button>
      </DialogTrigger>

      <DialogContent
        overlayClassName="bg-black/55 backdrop-blur-md"
        className="border border-[#D9FF3D]/30 bg-[#111611] text-[#F6FFF2] sm:max-w-2xl"
      >
        <DialogHeader className="text-left">
          <p className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">The Alignment Key</p>
          <DialogTitle className="font-display text-3xl text-[#F6FFF2]">{title}</DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#A9B5AA]">
            Prompt: {prompt}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Forest</p>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-[#F6FFF2]">
            {forestMessage.map((paragraph, index) => (
              <p key={`${title}-forest-line-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlignmentKeyButton;
