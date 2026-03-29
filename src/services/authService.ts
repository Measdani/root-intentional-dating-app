import { supabase } from '@/lib/supabase';

const PASSWORD_RESET_VIEW = 'password-reset';

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

export const clearPasswordResetUrlState = (): void => {
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
