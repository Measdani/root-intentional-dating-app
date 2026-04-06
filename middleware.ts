const PREVIEW_LOCK_COOKIE_NAME = 'rh_preview_access';
const PREVIEW_LOCK_PATH = '/unlock';
const truthyValues = new Set(['1', 'true', 'yes', 'on']);
const encoder = new TextEncoder();
const previewEnabledFlag =
  typeof process !== 'undefined' && process.env ? process.env.SITE_PREVIEW_ENABLED?.trim() ?? '' : '';
const previewPassword =
  typeof process !== 'undefined' && process.env ? process.env.SITE_PREVIEW_PASSWORD?.trim() ?? '' : '';
const previewSecret =
  typeof process !== 'undefined' && process.env
    ? process.env.SITE_PREVIEW_SECRET?.trim() ?? previewPassword
    : previewPassword;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
};

const isPreviewLockEnabled = (): boolean =>
  truthyValues.has(previewEnabledFlag.toLowerCase()) && previewPassword.length > 0;

const getPreviewCookieValue = async (): Promise<string> => {
  if (!previewSecret) return '';
  return sha256(`rooted-hearts-preview:${previewSecret}`);
};

const isPreviewLockBypassPath = (pathname: string): boolean => {
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

const normalizeNextPath = (value: string | null | undefined): string => {
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

const hasValidPreviewCookie = async (request: Request): Promise<boolean> => {
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

export default async function middleware(request: Request): Promise<Response | undefined> {
  if (!isPreviewLockEnabled()) {
    return undefined;
  }

  const url = new URL(request.url);
  if (isPreviewLockBypassPath(url.pathname)) {
    return undefined;
  }

  if (await hasValidPreviewCookie(request)) {
    return undefined;
  }

  const redirectUrl = new URL(PREVIEW_LOCK_PATH, request.url);
  redirectUrl.searchParams.set('next', normalizeNextPath(`${url.pathname}${url.search}`));

  return Response.redirect(redirectUrl, 307);
}

export const config = {
  matcher: '/:path*',
};
