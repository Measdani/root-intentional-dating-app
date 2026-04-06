import {
  createPreviewCookieClearHeader,
  createPreviewCookieHeader,
  getPreviewLockPath,
  hasValidPreviewCookie,
  isPreviewLockEnabled,
  isSubmittedPasswordValid,
  normalizeNextPath,
} from '../preview-lock.ts';

const pageHeaders = (setCookie?: string): Headers => {
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  if (setCookie) {
    headers.set('Set-Cookie', setCookie);
  }

  return headers;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderUnlockPage = (nextPath: string, errorMessage?: string, noticeMessage?: string): string => {
  const errorMarkup = errorMessage
    ? `<p class="status status-error">${escapeHtml(errorMessage)}</p>`
    : '';
  const noticeMarkup = noticeMessage
    ? `<p class="status status-notice">${escapeHtml(noticeMessage)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rooted Hearts Private Preview</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b0f0c;
        --panel: rgba(17, 22, 17, 0.92);
        --panel-border: rgba(217, 255, 61, 0.16);
        --text: #f6fff2;
        --muted: #a9b5aa;
        --accent: #d9ff3d;
        --accent-soft: rgba(217, 255, 61, 0.12);
        --danger: #ffb4b4;
        --danger-bg: rgba(196, 58, 58, 0.14);
        --notice: #d9ff3d;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(217, 255, 61, 0.12), transparent 30%),
          radial-gradient(circle at bottom right, rgba(96, 113, 90, 0.2), transparent 36%),
          linear-gradient(180deg, rgba(11, 15, 12, 0.84), rgba(11, 15, 12, 0.96)),
          #0b0f0c;
        color: var(--text);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 18px;
      }

      main {
        width: min(100%, 1060px);
        display: grid;
        gap: 24px;
        grid-template-columns: minmax(0, 1.15fr) minmax(320px, 420px);
      }

      .hero,
      .panel {
        border: 1px solid var(--panel-border);
        background: var(--panel);
        backdrop-filter: blur(16px);
        border-radius: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
      }

      .hero {
        padding: 40px;
      }

      .eyebrow {
        margin: 0 0 18px;
        font-size: 0.78rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1 {
        margin: 0;
        font-size: clamp(2.9rem, 8vw, 5.6rem);
        line-height: 0.92;
        letter-spacing: -0.06em;
        font-family: "Cormorant Garamond", Georgia, serif;
      }

      .lead {
        margin: 24px 0 0;
        max-width: 34rem;
        font-size: 1.02rem;
        line-height: 1.8;
        color: #ced8ca;
      }

      .notes {
        margin-top: 28px;
        display: grid;
        gap: 14px;
      }

      .note {
        border-radius: 20px;
        border: 1px solid rgba(217, 255, 61, 0.1);
        background: rgba(10, 13, 10, 0.56);
        padding: 16px 18px;
      }

      .note h2 {
        margin: 0 0 6px;
        font-size: 1rem;
      }

      .note p {
        margin: 0;
        color: var(--muted);
        line-height: 1.65;
        font-size: 0.94rem;
      }

      .panel {
        padding: 32px 28px;
        align-self: center;
      }

      .panel h2 {
        margin: 0;
        font-size: 1.8rem;
        font-family: "Cormorant Garamond", Georgia, serif;
      }

      .panel p {
        color: var(--muted);
        line-height: 1.7;
      }

      label {
        display: block;
        margin: 18px 0 10px;
        font-size: 0.92rem;
        color: var(--text);
      }

      input[type="password"] {
        width: 100%;
        border: 1px solid rgba(169, 181, 170, 0.28);
        background: rgba(8, 11, 8, 0.9);
        color: var(--text);
        border-radius: 16px;
        padding: 15px 16px;
        font-size: 1rem;
      }

      input[type="password"]:focus {
        outline: none;
        border-color: rgba(217, 255, 61, 0.8);
        box-shadow: 0 0 0 3px rgba(217, 255, 61, 0.16);
      }

      button {
        width: 100%;
        margin-top: 18px;
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #0b0f0c;
        font-weight: 700;
        font-size: 0.98rem;
        padding: 15px 18px;
        cursor: pointer;
      }

      button:hover {
        filter: brightness(0.97);
      }

      .status {
        border-radius: 16px;
        padding: 12px 14px;
        font-size: 0.92rem;
      }

      .status-error {
        background: var(--danger-bg);
        color: var(--danger);
        border: 1px solid rgba(255, 180, 180, 0.16);
      }

      .status-notice {
        background: rgba(217, 255, 61, 0.09);
        color: var(--notice);
        border: 1px solid rgba(217, 255, 61, 0.16);
      }

      .helper {
        margin-top: 14px;
        font-size: 0.85rem;
        color: #8f9c91;
      }

      .helper a {
        color: var(--accent);
      }

      .footer {
        margin-top: 26px;
        font-size: 0.76rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #6e7a6f;
      }

      @media (max-width: 900px) {
        main {
          grid-template-columns: 1fr;
        }

        .hero,
        .panel {
          padding: 28px 22px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">Private Production Preview</p>
        <h1>Rooted Hearts<br />is in final review.</h1>
        <p class="lead">
          This environment is locked while launch testing is underway. Enter the shared preview password to
          continue into the current production build.
        </p>
        <div class="notes">
          <article class="note">
            <h2>Why it is locked</h2>
            <p>The live domain is being tested before public rollout, so only approved reviewers should be inside right now.</p>
          </article>
          <article class="note">
            <h2>What happens after unlock</h2>
            <p>Your browser receives a secure preview cookie and can move through the site normally until the cookie expires or is cleared.</p>
          </article>
          <article class="note">
            <h2>Need to step out again?</h2>
            <p>Visit <strong>${escapeHtml(getPreviewLockPath())}?logout=1</strong> any time to clear the preview cookie and test the lock again.</p>
          </article>
        </div>
        <p class="footer">Rooted Hearts Private Preview</p>
      </section>
      <section class="panel">
        <h2>Enter Preview Password</h2>
        <p>Use the internal password for this release window. Once it is accepted, you will be sent back to the page you originally requested.</p>
        ${errorMarkup}
        ${noticeMarkup}
        <form method="post" action="${escapeHtml(getPreviewLockPath())}">
          <input type="hidden" name="next" value="${escapeHtml(nextPath)}" />
          <label for="password">Preview password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
          <button type="submit">Unlock Production Preview</button>
        </form>
        <p class="helper">
          If the password changes, old preview sessions stop working automatically. Keep this page private and share it only with approved testers.
        </p>
      </section>
    </main>
  </body>
</html>`;
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const nextPath = normalizeNextPath(url.searchParams.get('next'));

  if (!isPreviewLockEnabled()) {
    return Response.redirect(new URL(nextPath, request.url), 302);
  }

  if (url.searchParams.get('logout') === '1') {
    return new Response(renderUnlockPage(nextPath, undefined, 'Preview access cleared for this browser.'), {
      headers: pageHeaders(createPreviewCookieClearHeader()),
    });
  }

  if (await hasValidPreviewCookie(request)) {
    return Response.redirect(new URL(nextPath, request.url), 303);
  }

  return new Response(renderUnlockPage(nextPath), {
    headers: pageHeaders(),
  });
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (!isPreviewLockEnabled()) {
    return Response.redirect(new URL('/', request.url), 303);
  }

  const formData = await request.formData();
  const submittedPassword = String(formData.get('password') ?? '');
  const nextPath = normalizeNextPath(String(formData.get('next') ?? '/'));

  if (!(await isSubmittedPasswordValid(submittedPassword))) {
    return new Response(renderUnlockPage(nextPath, 'That password did not match this preview environment.'), {
      status: 401,
      headers: pageHeaders(),
    });
  }

  const redirectUrl = new URL(nextPath, request.url);
  const headers = new Headers({
    Location: redirectUrl.toString(),
    'Cache-Control': 'no-store',
    'Set-Cookie': await createPreviewCookieHeader(),
  });

  return new Response(null, {
    status: 303,
    headers,
  });
}
