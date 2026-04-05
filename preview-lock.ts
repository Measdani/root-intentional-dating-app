const PREVIEW_LOCK_COOKIE_NAME = 'rh_preview_access';
const PREVIEW_LOCK_PATH = '/unlock';

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const encoder = new TextEncoder();

const getEnv = (name: string): string => {
  if (typeof process === 'undefined' || !process.env) {
    return '';
  }

  return process.env[name]?.trim() ?? '';
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

const getPreviewPassword = (): string => getEnv('SITE_PREVIEW_PASSWORD');

const getPreviewSecret = (): string => getEnv('SITE_PREVIEW_SECRET') || getPreviewPassword();

export const isPreviewLockEnabled = (): boolean =>
  truthyValues.has(getEnv('SITE_PREVIEW_ENABLED').toLowerCase()) && getPreviewPassword().length > 0;

export const getPreviewLockPath = (): string => PREVIEW_LOCK_PATH;

export const getPreviewLockCookieName = (): string => PREVIEW_LOCK_COOKIE_NAME;

export const isPreviewLockBypassPath = (pathname: string): boolean => {
  if (
    pathname === PREVIEW_LOCK_PATH ||
    pathname === '/api/unlock' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return true;
  }

  return pathname.startsWith('/.well-known/') || pathname.startsWith('/_vercel/');
};

export const normalizeNextPath = (value: string | null | undefined): string => {
  if (!value) return '/';

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }

  if (
    trimmed === PREVIEW_LOCK_PATH ||
    trimmed.startsWith(`${PREVIEW_LOCK_PATH}?`) ||
    trimmed.startsWith('/api/unlock')
  ) {
    return '/';
  }

  return trimmed;
};

export const getPreviewCookieValue = async (): Promise<string> => {
  const secret = getPreviewSecret();
  if (!secret) return '';

  return sha256(`rooted-hearts-preview:${secret}`);
};

const readCookie = (cookieHeader: string | null, cookieName: string): string | null => {
  if (!cookieHeader) return null;

  const cookiePrefix = `${cookieName}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(cookiePrefix)) {
      return trimmed.slice(cookiePrefix.length);
    }
  }

  return null;
};

export const hasValidPreviewCookie = async (request: Request): Promise<boolean> => {
  if (!isPreviewLockEnabled()) {
    return true;
  }

  const expectedValue = await getPreviewCookieValue();
  if (!expectedValue) {
    return false;
  }

  const actualValue = readCookie(request.headers.get('cookie'), PREVIEW_LOCK_COOKIE_NAME);
  return actualValue === expectedValue;
};

export const isSubmittedPasswordValid = async (submittedPassword: string): Promise<boolean> => {
  const expectedPassword = getPreviewPassword();
  if (!expectedPassword) {
    return false;
  }

  const submittedHash = await sha256(submittedPassword);
  const expectedHash = await sha256(expectedPassword);
  return submittedHash === expectedHash;
};

export const createPreviewCookieHeader = async (): Promise<string> => {
  const cookieValue = await getPreviewCookieValue();
  return [
    `${PREVIEW_LOCK_COOKIE_NAME}=${cookieValue}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=604800',
  ].join('; ');
};

export const createPreviewCookieClearHeader = (): string =>
  [
    `${PREVIEW_LOCK_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
