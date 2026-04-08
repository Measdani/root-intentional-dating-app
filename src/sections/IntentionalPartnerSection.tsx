import React from 'react';
import ConflictSandbox from '@/components/ConflictSandbox';
import AlignmentKeyButton from '@/components/AlignmentKeyButton';
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
          title="The Detox & Aligned Mastery"
          prompt="Identifying the Counterfeit"
          forestMessage={[
            'As you grow, you will attract attention.',
            'And this is often when the Counterfeit appears.',
            'Not as a villain - but as someone who feels almost right.',
            'They may speak like your vision. They may move like your dream.',
            'But watch closely.',
            'Are they trying to secure your loyalty too quickly? With gifts, money, intense emotions, or "deep" conversations before time has revealed their consistency?',
            "That's not alignment. That's acceleration.",
            "It's an attempt to create an emotional agreement before you've had the space to choose clearly.",
            'A Counterfeit can mimic the walk - but it cannot sustain the consistency.',
            'And when the mask starts to slip...',
            "Don't fix it. Don't explain it away.",
            'Let it fall.',
            "Alignment is not just about who you meet... it's about who you allow access to your life.",
          ]}
        />
      </div>
    </PartnerSectionIntroPage>
  );
};

export default IntentionalPartnerSection;
