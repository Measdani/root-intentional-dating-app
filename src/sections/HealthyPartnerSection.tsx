import React from 'react';
import PartnerSectionIntroPage from '@/components/PartnerSectionIntroPage';

const HealthyPartnerSection: React.FC = () => (
  <PartnerSectionIntroPage sectionNumber={3} title="The Healthy Partner">
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
  </PartnerSectionIntroPage>
);

export default HealthyPartnerSection;
