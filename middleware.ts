import {
  getPreviewLockPath,
  hasValidPreviewCookie,
  isPreviewLockBypassPath,
  isPreviewLockEnabled,
  normalizeNextPath,
} from './preview-lock';

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

  const redirectUrl = new URL(getPreviewLockPath(), request.url);
  redirectUrl.searchParams.set('next', normalizeNextPath(`${url.pathname}${url.search}`));

  return Response.redirect(redirectUrl, 307);
}

export const config = {
  matcher: '/:path*',
};
