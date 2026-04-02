import { Brain, Heart, Target, type LucideIcon } from 'lucide-react';

import type { AppView, PartnerJourneyBadge } from '@/types';

export type PartnerJourneyOriginView = 'growth-mode' | 'paid-growth-mode';

export type PartnerJourneySection = {
  title: string;
  badge: PartnerJourneyBadge;
  description: string;
  icon: LucideIcon;
  view: Extract<AppView, 'aware-partner' | 'intentional-partner' | 'healthy-partner'>;
};

export const GROWTH_MODE_TAB_STORAGE_KEY = 'rooted_growth_mode_active_tab';
export const PARTNER_JOURNEY_ORIGIN_VIEW_KEY = 'rooted_partner_journey_origin_view';

export const PARTNER_JOURNEY_SECTIONS: PartnerJourneySection[] = [
  {
    title: 'The Aware Partner',
    badge: 'aware-partner-badge',
    description: 'This first section is in place and anchors the full relationship-growth journey.',
    icon: Brain,
    view: 'aware-partner',
  },
  {
    title: 'The Intentional Partner',
    badge: 'intentional-partner-badge',
    description: 'Awareness without action keeps you stuck.',
    icon: Target,
    view: 'intentional-partner',
  },
  {
    title: 'The Healthy Partner',
    badge: 'healthy-partner-badge',
    description: 'This is where growth becomes consistency.',
    icon: Heart,
    view: 'healthy-partner',
  },
];

export const getPartnerJourneyActionCopy = (
  view: PartnerJourneySection['view']
): string => {
  switch (view) {
    case 'aware-partner':
      return 'Open this section to enter Path Navigation.';
    case 'intentional-partner':
      return 'Open this section to enter The Conflict Sandbox.';
    case 'healthy-partner':
      return 'Open this section to enter The Pace Meter.';
  }
};

export const rememberPartnerJourneyOrigin = (
  originView: PartnerJourneyOriginView
): void => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(PARTNER_JOURNEY_ORIGIN_VIEW_KEY, originView);
  localStorage.setItem(GROWTH_MODE_TAB_STORAGE_KEY, 'resources');
};

export const getPartnerJourneyOrigin = (): PartnerJourneyOriginView => {
  if (typeof window === 'undefined') return 'growth-mode';

  return localStorage.getItem(PARTNER_JOURNEY_ORIGIN_VIEW_KEY) === 'paid-growth-mode'
    ? 'paid-growth-mode'
    : 'growth-mode';
};

export const returnToPartnerJourneyHub = (
  setCurrentView: (view: AppView) => void
): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GROWTH_MODE_TAB_STORAGE_KEY, 'resources');
  }

  setCurrentView(getPartnerJourneyOrigin());
};
