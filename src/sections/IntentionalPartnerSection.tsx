import React from 'react';
import ConflictSandbox from '@/components/ConflictSandbox';
import PartnerSectionIntroPage from '@/components/PartnerSectionIntroPage';
import { useApp } from '@/store/AppContext';
import { hasPartnerJourneyBadge } from '@/services/partnerJourneyBadgeService';

const IntentionalPartnerSection: React.FC = () => {
  const { currentUser } = useApp();
  const badgeEarned = hasPartnerJourneyBadge(
    currentUser.partnerJourneyBadges,
    'intentional-partner-badge'
  );

  return (
    <PartnerSectionIntroPage
      sectionNumber={2}
      title="The Intentional Partner"
      afterHero={<ConflictSandbox />}
    >
      <p>Awareness without action keeps you stuck.</p>
      <p>Intention is what changes how you show up when it matters most.</p>
      <p>
        The Intentional Partner is about applying what you&apos;ve learned: making conscious choices in
        how you communicate, set boundaries, and show up for others.
      </p>
      <p>This is where you move with purpose instead of reacting from habit.</p>
      <p>This is where you stop reacting... and start choosing.</p>
      <p>You begin to:</p>
      <ul className="space-y-1 pl-5 list-disc">
        <li>Communicate clearly</li>
        <li>Set and respect boundaries</li>
        <li>Choose alignment over convenience</li>
      </ul>
      <p>
        Intentional dating means you&apos;re no longer just hoping for a good relationship...
        <br />
        you&apos;re actively building one through your decisions.
      </p>
      <div
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
          badgeEarned
            ? 'border-emerald-400/30 text-emerald-200'
            : 'border-[#D9FF3D]/30 text-[#D9FF3D]'
        }`}
      >
        {badgeEarned
          ? 'The Intentional Partner Badge earned'
          : 'Complete The Conflict Sandbox to unlock The Intentional Partner Badge'}
      </div>
    </PartnerSectionIntroPage>
  );
};

export default IntentionalPartnerSection;
