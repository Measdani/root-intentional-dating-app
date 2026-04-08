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
      <p>This is where growth becomes lived consistency.</p>
      <p>
        The Healthy Partner focuses on sustaining strong, balanced, and respectful relationships.
        It&apos;s not about perfection &mdash; it&apos;s about consistency, accountability, and
        mutual effort over time.
      </p>
      <p>At this stage, you&apos;re not just prepared for love, you&apos;re able to maintain it.</p>
      <p>
        You understand that a healthy relationship isn&apos;t built in big moments...
        <br />
        it&apos;s built in how you show up repeatedly.
      </p>
      <p>In a healthy relationship, you:</p>
      <ul className="space-y-1 pl-5 list-disc">
        <li>Navigate conflict without breaking safety</li>
        <li>Take accountability without becoming defensive</li>
        <li>Support your partner while staying grounded in yourself</li>
        <li>Maintain emotional stability, not emotional control</li>
      </ul>
      <p>
        Because a healthy relationship isn&apos;t built in one moment...
        <br />
        it&apos;s built in consistent, intentional choices &mdash; every day.
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
          title="Self-Awareness (The Alignment Check)"
          prompt="Staying Aligned Within the Relationship"
          forestMessage={[
            "You've done the work.",
            'Now comes what matters most - staying aligned in real time.',
            "Because alignment is not proven in who you choose... it's revealed in how you show up once you've chosen.",
            'Not every feeling means something is wrong.',
            'And not every moment of discomfort means something is misaligned.',
            "Sometimes, it's simply the moment asking you to respond differently.",
            'Your Spirit remains steady.',
            'Your instincts may still try to move fast.',
            'The urge to react.',
            'The urge to withdraw.',
            'The urge to protect yourself before seeking clarity.',
            'But this is where alignment holds.',
            'So pause and ask yourself:',
            'Am I responding from clarity...',
            'or from habit?',
            'Am I protecting the connection...',
            'or protecting my reaction?',
            'Alignment does not feel chaotic.',
            'It does not require urgency.',
            'It feels steady - even when it is uncomfortable.',
            'You do not need to rush to fix the moment.',
            'You need to stay grounded within it.',
            'Because alignment is not just about who you chose... it\'s about how you continue choosing - in every moment that follows.',
          ]}
          scrollableMessage
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Forest&apos;s Rule</p>
          <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
            Stay grounded in what is real &mdash; not just what feels good.
            <br />
            Consistency reveals truth over time.
            <br />
            If alignment requires pressure, it is not alignment.
            <br />
            If someone cannot meet you in consistency, they cannot meet you in partnership.
          </p>
        </div>

        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">How You Pass This Stage</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#A9B5AA]">
            <li>Demonstrate consistency across all scenarios &mdash; not just awareness</li>
            <li>Respond with clarity, not assumption</li>
            <li>Maintain boundaries without withdrawing connection</li>
            <li>Show that you can protect both yourself and the relationship</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-[#1A211A] bg-[#0B0F0C] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#A9B5AA]">Badge Unlock</p>
          <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
            Complete all 8 Pace Meter cards and pass the final boundary check.
            <br />
            <br />
            Forest will confirm your ability to maintain a healthy, aligned relationship &mdash;
            and attach The Healthy Partner Badge to your profile.
          </p>
        </div>
      </div>
    </PartnerSectionIntroPage>
  );
};

export default HealthyPartnerSection;
