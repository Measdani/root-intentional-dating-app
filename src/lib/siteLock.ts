const SITE_PREVIEW_STORAGE_KEY = 'rooted-site-preview-access';

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const normalizeFlag = (value?: string): boolean =>
  truthyValues.has(value?.trim().toLowerCase() ?? '');

export const isSiteLockEnabled = (): boolean =>
  normalizeFlag(import.meta.env.VITE_SITE_LOCKED);

const getSitePreviewKey = (): string =>
  import.meta.env.VITE_SITE_PREVIEW_KEY?.trim() ?? '';

export const getStoredSitePreviewAccess = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    return sessionStorage.getItem(SITE_PREVIEW_STORAGE_KEY) === 'true';
  } catch (error) {
    console.warn('Failed to read site preview access:', error);
    return false;
  }
};

const setStoredSitePreviewAccess = (): void => {
  try {
    sessionStorage.setItem(SITE_PREVIEW_STORAGE_KEY, 'true');
  } catch (error) {
    console.warn('Failed to persist site preview access:', error);
  }
};

export const resolveSitePreviewStateFromUrl = (): {
  hasPreviewAccess: boolean;
  requestedAdminAccess: boolean;
} => {
  if (typeof window === 'undefined') {
    return {
      hasPreviewAccess: false,
      requestedAdminAccess: false,
    };
  }

  let hasPreviewAccess = getStoredSitePreviewAccess();
  let requestedAdminAccess = false;

  try {
    const url = new URL(window.location.href);
    const previewParam = url.searchParams.get('preview')?.trim() ?? '';
    requestedAdminAccess = url.searchParams.get('admin') === '1';
    const previewKey = getSitePreviewKey();
    let shouldCleanUrl = false;

    if (requestedAdminAccess) {
      url.searchParams.delete('admin');
      shouldCleanUrl = true;
    }

    if (previewParam) {
      if (previewKey && previewParam === previewKey) {
        setStoredSitePreviewAccess();
        hasPreviewAccess = true;
      }

      url.searchParams.delete('preview');
      shouldCleanUrl = true;
    }

    if (shouldCleanUrl) {
      const nextSearch = url.searchParams.toString();
      const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  } catch (error) {
    console.warn('Failed to resolve site preview state:', error);
  }

  return {
    hasPreviewAccess,
    requestedAdminAccess,
  };
};
