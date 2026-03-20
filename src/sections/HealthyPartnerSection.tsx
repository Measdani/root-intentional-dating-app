import React from 'react';
import PaceMeter from '@/components/PaceMeter';
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
    </PartnerSectionIntroPage>
  );
};

export default HealthyPartnerSection;
