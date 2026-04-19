import React from 'react';
import ConflictSandbox from '@/components/ConflictSandbox';
import AlignmentKeyButton from '@/components/AlignmentKeyButton';
import PartnerSectionIntroPage from '@/components/PartnerSectionIntroPage';
import { useApp } from '@/store/AppContext';
import { hasRecoveredPartnerJourneyBadge } from '@/services/partnerJourneyBadgeService';

const IntentionalPartnerSection: React.FC = () => {
  const { currentUser } = useApp();
  const badgeEarned = hasRecoveredPartnerJourneyBadge(
    currentUser.id,
    currentUser.partnerJourneyBadges,
    currentUser.growthStyleBadges,
    'intentional-partner-badge'
  );

  return (
    <PartnerSectionIntroPage
      sectionNumber={2}
      title="The Aligned Partner"
      afterHero={<ConflictSandbox />}
    >
      <p>Awareness got you here. Alignment is what keeps you here.</p>
      <p>
        The Aligned Partner is about consistency &mdash; applying what you&apos;ve learned in real
        time, with another person.
      </p>
      <p>
        This is where communication stays clear, boundaries stay respected, and connection is built
        with intention &mdash; not assumption.
      </p>
      <p>This is no longer about reacting.</p>
      <p>This is about sustaining something real.</p>
      <p>In alignment, you:</p>
      <ul className="space-y-1 pl-5 list-disc">
        <li>Communicate with clarity, not assumption</li>
        <li>Maintain boundaries without creating distance</li>
        <li>Address conflict early, not after it builds</li>
        <li>Choose connection without losing yourself</li>
      </ul>
      <p>
        Alignment means you&apos;re no longer trying to figure love out &mdash; you&apos;re actively
        maintaining it through your actions.
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
            ? 'The Aligned Partner Badge earned'
            : 'Complete all scenarios to unlock The Aligned Partner Badge'}
        </div>

        <AlignmentKeyButton
          title="The Alignment & Sustained Mastery"
          prompt="Maintaining What Is Real"
          forestMessage={[
            'As you build something real, the challenge shifts.',
            'It is no longer about identifying what does not belong - it is about maintaining what does.',
            'In alignment, not every moment will feel perfect.',
            'Not every day will feel effortless.',
            'But consistency is what reveals truth now.',
            'Watch closely - not for red flags, but for patterns.',
            'Do both of you return to clarity after tension?',
            'Do both of you choose honesty when it would be easier to withdraw?',
            'Do both of you maintain respect, even when emotions rise?',
            'Alignment is not proven in ease.',
            'It is revealed in how you both handle disruption.',
            'There will be moments where old instincts try to re-enter - assumptions, silence, control, distance.',
            'But this is where alignment holds.',
            'Not by reacting...',
            'but by choosing again.',
            'You do not need to test the relationship.',
            'You need to stay consistent within it.',
            'And when something feels off...',
            "Don't ignore it.",
            "Don't escalate it.",
            'Bring clarity to it.',
            "Alignment is not just about who you chose - it's about how you continue choosing each other.",
          ]}
          scrollableMessage
        />
      </div>
    </PartnerSectionIntroPage>
  );
};

export default IntentionalPartnerSection;
