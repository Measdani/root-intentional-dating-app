import React from 'react';

import { useApp } from '@/store/AppContext';
import {
  getPartnerJourneyActionCopy,
  PARTNER_JOURNEY_SECTIONS,
  rememberPartnerJourneyOrigin,
  type PartnerJourneyOriginView,
} from '@/lib/partnerJourney';
import {
  getPartnerJourneyBadgeLabel,
  hasPartnerJourneyBadge,
} from '@/services/partnerJourneyBadgeService';

type PartnerJourneyCardsProps = {
  originView: PartnerJourneyOriginView;
};

const PartnerJourneyCards: React.FC<PartnerJourneyCardsProps> = ({ originView }) => {
  const { currentUser, setCurrentView } = useApp();

  return (
    <div className="space-y-4">
      {PARTNER_JOURNEY_SECTIONS.map((section, index) => {
        const Icon = section.icon;
        const sectionBadgeEarned = hasPartnerJourneyBadge(
          currentUser.partnerJourneyBadges,
          section.badge
        );

        return (
          <button
            key={section.title}
            type="button"
            onClick={() => {
              rememberPartnerJourneyOrigin(originView);
              setCurrentView(section.view);
            }}
            className="w-full rounded-2xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-5 text-left transition hover:border-[#D9FF3D]/50 hover:bg-[#D9FF3D]/12"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#D9FF3D]/20 text-[#D9FF3D]">
                  <Icon className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Section {index + 1}</p>
                  <h4 className="mt-1 text-xl font-semibold text-[#F6FFF2]">{section.title}</h4>
                  <p className="mt-2 text-sm text-[#A9B5AA]">{section.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {sectionBadgeEarned && (
                  <span className="rounded-full border border-[#D9FF3D]/30 px-3 py-1 text-xs font-medium text-[#D9FF3D]">
                    {getPartnerJourneyBadgeLabel(section.badge)}
                  </span>
                )}
                <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs font-medium text-emerald-200">
                  {sectionBadgeEarned ? 'Badge earned' : 'Ready to open'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#D9FF3D]/20 bg-[#0B0F0C]/50 px-4 py-4">
              <p className="text-sm text-[#A9B5AA]">{getPartnerJourneyActionCopy(section.view)}</p>
              <span className="text-sm font-medium text-[#D9FF3D]">Open</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default PartnerJourneyCards;
