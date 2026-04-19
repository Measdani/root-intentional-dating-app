import React from 'react';
import BrandLogo from '@/components/BrandLogo';
import { Compass, LockKeyhole, ShieldCheck } from 'lucide-react';

const launchNotes = [
  {
    icon: Compass,
    title: 'Intentional Rollout',
    description:
      'We are pacing the public launch so the experience opens with the right structure, clarity, and care.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety First',
    description:
      'The final checks are focused on trust, privacy, and making sure the first version feels steady from day one.',
  },
  {
    icon: LockKeyhole,
    title: 'Private Preview',
    description:
      'If you have a private preview link, use it to enter. Otherwise, this page will stay in place until launch.',
  },
];

const LaunchingSoonSection: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#0B0F0C] text-[#F6FFF2]">
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80"
          alt="Forest canopy at sunrise"
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,255,61,0.15),transparent_30%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(126,145,108,0.12),transparent_36%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F0C]/72 via-[#0B0F0C]/88 to-[#0B0F0C]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-8 lg:px-10">
        <div className="max-w-4xl">
          <BrandLogo className="mb-8" imageClassName="w-[118px] sm:w-[142px]" />
          <p className="font-mono-label text-[#D9FF3D]">Private Preview</p>
          <h1 className="mt-5 font-display text-[clamp(3.4rem,8vw,7rem)] leading-[0.9] tracking-[-0.05em] text-[#F6FFF2]">
            Rooted Hearts
            <br />
            is launching soon.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#C7D1C4] sm:text-lg">
            The public site is intentionally paused while the final details are being prepared. We want the
            first live version to feel grounded, safe, and worthy of the people stepping into it.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {launchNotes.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[28px] border border-[#293128] bg-[#111611]/88 p-6 backdrop-blur-sm"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D9FF3D]/20 bg-[#D9FF3D]/10">
                <Icon className="h-5 w-5 text-[#D9FF3D]" />
              </div>
              <h2 className="font-display text-2xl text-[#F6FFF2]">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#A9B5AA]">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-3xl rounded-[32px] border border-[#D9FF3D]/18 bg-[#101510]/88 p-6 sm:p-8">
          <p className="font-mono-label text-[#D9FF3D]">What To Expect</p>
          <p className="mt-4 text-base leading-8 text-[#D4DDD0]">
            When launch is ready, this holding page will be replaced with the full Rooted Hearts experience. Until
            then, only private preview access is open.
          </p>
        </div>

        <p className="mt-12 text-xs uppercase tracking-[0.24em] text-[#6E7A6F]">Rooted Hearts {currentYear}</p>
      </div>
    </main>
  );
};

export default LaunchingSoonSection;
