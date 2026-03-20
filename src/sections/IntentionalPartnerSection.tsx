import React from 'react';
import PartnerSectionIntroPage from '@/components/PartnerSectionIntroPage';

const IntentionalPartnerSection: React.FC = () => (
  <PartnerSectionIntroPage sectionNumber={2} title="The Intentional Partner">
    <p>Awareness without action keeps you stuck.</p>
    <p>
      The Intentional Partner is about applying what you&apos;ve learned: making conscious choices in
      how you communicate, set boundaries, and show up for others.
    </p>
    <p>This is where you move with purpose instead of reacting from habit.</p>
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
  </PartnerSectionIntroPage>
);

export default IntentionalPartnerSection;
