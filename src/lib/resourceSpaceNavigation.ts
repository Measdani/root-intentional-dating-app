import type { AppView } from '@/types';

export type ResourceSpaceView = Extract<AppView, 'growth-mode' | 'paid-growth-mode'>;

const growthModeTabStorageKey = 'rooted_growth_mode_active_tab';
const resourceSpaceOriginViewKey = 'rooted_resource_space_origin_view';

export const rememberResourceSpaceOrigin = (view: ResourceSpaceView): void => {
  localStorage.setItem(resourceSpaceOriginViewKey, view);
};

export const getResourceSpaceOrigin = (): ResourceSpaceView =>
  localStorage.getItem(resourceSpaceOriginViewKey) === 'paid-growth-mode'
    ? 'paid-growth-mode'
    : 'growth-mode';

export const returnToResourceSpace = (setCurrentView: (view: AppView) => void): void => {
  localStorage.setItem(growthModeTabStorageKey, 'resources');
  setCurrentView(getResourceSpaceOrigin());
};
