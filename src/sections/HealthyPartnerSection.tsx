import React from 'react';
import PaceMeter from '@/components/PaceMeter';
import AlignmentKeyButton from '@/components/AlignmentKeyButton';
import PartnerSectionIntroPage from '@/components/PartnerSectionIntroPage';
import { useApp } from '@/store/AppContext';
import { hasPartnerJourneyBadge } from '@/services/partnerJourneyBadgeService';

const HealthyPartnerSection: React.FC = () => {
  const { currentUser } = useApp();
  const badgeEarned = hasPartnerJourneyBadge(
    currentUser.partnerJourneyBadges,
    'healthy-partner-badge'
  );

  return (
    <PartnerSectionIntroPage
      sectionNumber={3}
      title="The Healthy Partner"
      afterHero={<PaceMeter />}
    >
      <p>This is where growth becomes consistency.</p>
      <p>
        The Healthy Partner focuses on sustaining strong, balanced, and respectful relationships.
        It&apos;s not about perfection, it&apos;s about accountability, emotional stability, and mutual effort.
      </p>
      <p>At this stage, you&apos;re not just prepared for love, you&apos;re able to maintain it.</p>
      <p>You understand how to:</p>
      <ul className="space-y-1 pl-5 list-disc">
        <li>Navigate conflict with respect</li>
        <li>Take accountability without defensiveness</li>
        <li>Support your partner while staying true to yourself</li>
        <li>Create emotional safety and stability</li>
      </ul>
      <p>
        Because a healthy relationship isn&apos;t built in one moment...
        <br />
        it&apos;s built in how you show up every day.
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
            badgeEarned
              ? 'border-emerald-400/30 text-emerald-200'
              : 'border-[#D9FF3D]/30 text-[#D9FF3D]'
          }`}
        >
          {badgeEarned
            ? 'The Healthy Partner Badge earned'
            : 'Complete The Pace Meter to unlock The Healthy Partner Badge'}
        </div>

        <AlignmentKeyButton
          title="Self-Awareness (The Final Check)"
          prompt="The Spirit vs. The Flesh"
          forestMessage={[
            "You've done the work.",
            'Now comes the moment that matters most - discernment.',
            'Because not everything that feels strong is aligned.',
            'What many people call "chemistry" is often just familiarity meeting emotion.',
            'Your Spirit is quiet. Your Flesh is loud.',
            "The rush. The urgency. The pull to move faster than clarity allows - that's not always connection. Sometimes, it's habit.",
            'So pause and ask yourself:',
            'Who is leading right now?',
            "If it's your Flesh, it will feel urgent, fast, and consuming. If it's your Spirit, it will feel steady, clear, and at peace.",
            "Alignment doesn't feel chaotic. It feels grounded.",
            "Don't confuse a racing heart with a divine sign.",
            "Alignment is not just about who you meet... it's about who you allow access to your life.",
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Forest&apos;s Rule</p>
          <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
            Slow the fantasy down until the facts can speak.
            <br />
            Pace is not punishment.
            <br />
            If someone cannot respect your timeline, they cannot respect your standards.
          </p>
        </div>

        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">How You Pass This Stage</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#A9B5AA]">
            <li>- Reveal both the healthy and unhealthy side of all 4 stages</li>
            <li>- Review all 8 cards before the graduation prompt unlocks</li>
            <li>- Answer Forest&apos;s final prompt with pace, boundaries, and respect in view</li>
            <li>- Show that you can protect standards without confusing pressure for love</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Badge Unlock</p>
          <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
            Review all 8 Pace Meter cards, pass the final boundary check, and Forest will attach
            The Healthy Partner Badge to your profile.
          </p>
        </div>
      </div>
    </PartnerSectionIntroPage>
  );
};

export default HealthyPartnerSection;
