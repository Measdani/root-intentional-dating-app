import { supabase } from '@/lib/supabase';

const PASSWORD_RESET_VIEW = 'password-reset';
const EMAIL_CONFIRMATION_NOTICE_KEY = 'rooted_email_confirmation_notice';
const PLACEHOLDER_ERROR_VALUES = new Set(['{}', '[]', 'null', 'undefined']);

type AuthErrorContext = 'general' | 'sign-up' | 'password-reset' | 'password-update';

const sanitizeErrorText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_ERROR_VALUES.has(trimmed)) return null;
  return trimmed;
};

const parseErrorJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const collectErrorMessages = (value: unknown, depth = 0): string[] => {
  if (depth > 2 || value == null) return [];

  const direct = sanitizeErrorText(value);
  if (direct) {
    const parsed = parseErrorJson(direct);
    if (parsed && parsed !== value) {
      const nested = collectErrorMessages(parsed, depth + 1);
      if (nested.length > 0) return nested;
    }
    return [direct];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectErrorMessages(entry, depth + 1));
  }

  if (typeof value === 'object') {
    const candidateKeys = [
      'message',
      'msg',
      'error',
      'error_description',
      'description',
      'details',
      'detail',
      'hint',
      'code',
      'statusText',
    ] as const;

    const collected = candidateKeys.flatMap((key) =>
      collectErrorMessages((value as Record<string, unknown>)[key], depth + 1)
    );

    if (collected.length > 0) return collected;
  }

  return [];
};

const getAuthFallbackMessage = (context: AuthErrorContext): string => {
  switch (context) {
    case 'sign-up':
      return "We couldn't create the account or send the confirmation email. Check your Supabase SMTP sender address, Zoho app password, and verified From email, then try again.";
    case 'password-reset':
      return "We couldn't send the password reset email. Check your Supabase SMTP sender address, Zoho app password, and verified From email, then try again.";
    case 'password-update':
      return "We couldn't update your password right now. Please try again.";
    default:
      return 'Something went wrong. Please try again.';
  }
};

export const getAuthErrorMessage = (
  error: unknown,
  context: AuthErrorContext = 'general'
): string => {
  const parts = Array.from(new Set(collectErrorMessages(error)));
  const combined = parts.join(' ').trim();

  if (!combined) return getAuthFallbackMessage(context);

  const normalized = combined.toLowerCase();
  const looksLikeEmailDeliveryError =
    normalized.includes('smtp') ||
    normalized.includes('mail') ||
    normalized.includes('email') ||
    normalized.includes('sender') ||
    normalized.includes('from address') ||
    normalized.includes('invalid login') ||
    normalized.includes('authentication failed') ||
    normalized.includes('535') ||
    normalized.includes('550');

  if (
    (context === 'sign-up' || context === 'password-reset') &&
    looksLikeEmailDeliveryError &&
    !normalized.includes('check your supabase smtp')
  ) {
    return `${combined} Check your Supabase SMTP sender address, Zoho app password, and verified From email.`;
  }

  return combined;
};

const getHashParams = (): URLSearchParams => {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
};

export const getPasswordResetRedirectUrl = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;

  const url = new URL(window.location.origin);
  url.searchParams.set('view', PASSWORD_RESET_VIEW);
  return url.toString();
};

export const isRecoveryRedirect = (): boolean => {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  const hashParams = getHashParams();
  return (
    url.searchParams.get('view') === PASSWORD_RESET_VIEW ||
    url.searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery'
  );
};

export const isEmailConfirmationRedirect = (): boolean => {
  if (typeof window === 'undefined' || isRecoveryRedirect()) return false;

  const url = new URL(window.location.href);
  const hashParams = getHashParams();

  return (
    url.searchParams.has('code') ||
    url.searchParams.has('token_hash') ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token')
  );
};

export const clearAuthRedirectUrlState = (): void => {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.delete('view');
  url.searchParams.delete('type');
  url.searchParams.delete('code');
  url.searchParams.delete('token_hash');
  url.hash = '';
  const nextUrl = `${url.pathname}${url.search}`;
  window.history.replaceState({}, '', nextUrl);
};

export const clearPasswordResetUrlState = (): void => {
  clearAuthRedirectUrlState();
};

export const primeEmailConfirmationNotice = (): boolean => {
  if (typeof window === 'undefined' || !isEmailConfirmationRedirect()) return false;

  sessionStorage.setItem(EMAIL_CONFIRMATION_NOTICE_KEY, '1');
  clearAuthRedirectUrlState();
  return true;
};

export const consumeEmailConfirmationNotice = (): boolean => {
  if (typeof window === 'undefined') return false;

  const queued = sessionStorage.getItem(EMAIL_CONFIRMATION_NOTICE_KEY) === '1';
  if (queued) {
    sessionStorage.removeItem(EMAIL_CONFIRMATION_NOTICE_KEY);
  }
  return queued;
};

export const clearLocalCurrentUser = (): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('currentUser');
  window.dispatchEvent(new CustomEvent('user-login', { detail: null }));
};

export const signOutSupabaseSession = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Supabase sign out failed:', error.message);
  }
};

export const signOutAndClearLocalUser = async (): Promise<void> => {
  await signOutSupabaseSession();
  clearLocalCurrentUser();
};

export const authService = {
  async getSession() {
    return supabase.auth.getSession();
  },

  async signUpWithPassword(email: string, password: string) {
    return supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
  },

  async signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
  },

  async sendPasswordResetEmail(email: string) {
    return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });
  },

  async listMfaFactors() {
    return supabase.auth.mfa.listFactors();
  },

  async getAuthenticatorAssuranceLevel() {
    return supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  },

  async enrollTotpFactor(friendlyName?: string) {
    return supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Rooted Hearts',
      friendlyName,
    });
  },

  async challengeAndVerifyMfaFactor(factorId: string, code: string) {
    return supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });
  },

  async unenrollMfaFactor(factorId: string) {
    return supabase.auth.mfa.unenroll({ factorId });
  },

  async preparePasswordRecovery() {
    const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
    const code = url?.searchParams.get('code');

    if (code) {
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error) {
        return {
          session: null,
          error: exchange.error.message,
          isRecoveryFlow: true,
        };
      }
    }

    const { data, error } = await supabase.auth.getSession();
    return {
      session: data.session,
      error: error?.message ?? null,
      isRecoveryFlow: isRecoveryRedirect(),
    };
  },

  async updatePassword(password: string) {
    return supabase.auth.updateUser({ password });
  },
};
