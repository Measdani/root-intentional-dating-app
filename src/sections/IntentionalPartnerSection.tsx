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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
