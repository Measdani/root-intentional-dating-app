import type { AppView } from '@/types';

const exclusiveModeSettingsFocusKey = 'rooted_exclusive_mode_settings_focus';
const exclusiveModeSettingsFocusEvent = 'focus-exclusive-mode-settings';

export const requestExclusiveModeSettingsFocus = (): void => {
  localStorage.setItem(exclusiveModeSettingsFocusKey, 'true');
  window.dispatchEvent(new Event(exclusiveModeSettingsFocusEvent));
};

export const consumeExclusiveModeSettingsFocus = (): boolean => {
  const shouldFocus = localStorage.getItem(exclusiveModeSettingsFocusKey) === 'true';
  if (shouldFocus) {
    localStorage.removeItem(exclusiveModeSettingsFocusKey);
  }
  return shouldFocus;
};

export const getExclusiveModeSettingsFocusEvent = (): string => exclusiveModeSettingsFocusEvent;

export const openExclusiveModeSettings = (setCurrentView: (view: AppView) => void): void => {
  requestExclusiveModeSettingsFocus();
  setCurrentView('user-settings');
};
