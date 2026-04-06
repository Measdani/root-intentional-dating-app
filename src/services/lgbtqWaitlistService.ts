import { supabase } from '@/lib/supabase';

export type LgbtqIdentityResponse = 'heterosexual' | 'lgbtq' | 'prefer_not_to_say';

export interface LgbtqWaitlistSurveyInput {
  name: string;
  email: string;
  safetyFeature: string;
  identityPreferences: string;
  personalWork: string;
  redirectUrl: string;
}

export interface LgbtqWaitlistServiceResult {
  status: 'verification_sent' | 'verified' | 'already_verified';
  message: string;
  identityResponse?: LgbtqIdentityResponse | null;
}

const toMessage = async (fallback: string, error: unknown): Promise<string> => {
  if (!error || typeof error !== 'object') return fallback;

  const candidate = error as { message?: unknown; context?: unknown };
  if (candidate.context instanceof Response) {
    try {
      const body = await candidate.context.clone().json() as {
        error?: unknown;
        details?: unknown;
      };
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error;
      }
      if (typeof body.details === 'string' && body.details.trim()) {
        return body.details;
      }
    } catch {
      // Ignore parse issues and fall back to the generic message.
    }
  }

  return typeof candidate.message === 'string' && candidate.message.trim()
    ? candidate.message
    : fallback;
};

export const lgbtqWaitlistService = {
  async requestVerification(
    input: LgbtqWaitlistSurveyInput
  ): Promise<LgbtqWaitlistServiceResult> {
    const { data, error } = await supabase.functions.invoke('lgbtq-waitlist', {
      body: {
        action: 'request_verification',
        name: input.name,
        email: input.email,
        safety_feature: input.safetyFeature,
        identity_preferences: input.identityPreferences,
        personal_work: input.personalWork,
        redirect_url: input.redirectUrl,
      },
    });

    if (error) {
      throw new Error(await toMessage('Unable to send verification email right now.', error));
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Waitlist verification response was invalid.');
    }

    const response = data as Partial<LgbtqWaitlistServiceResult>;
    if (
      (response.status !== 'verification_sent' &&
        response.status !== 'verified' &&
        response.status !== 'already_verified') ||
      typeof response.message !== 'string'
    ) {
      throw new Error('Waitlist verification response was invalid.');
    }

    return {
      status: response.status,
      message: response.message,
      identityResponse:
        response.identityResponse === 'heterosexual' ||
        response.identityResponse === 'lgbtq' ||
        response.identityResponse === 'prefer_not_to_say'
          ? response.identityResponse
          : null,
    };
  },

  async verifyEmail(token: string): Promise<LgbtqWaitlistServiceResult> {
    const { data, error } = await supabase.functions.invoke('lgbtq-waitlist', {
      body: {
        action: 'verify_email',
        token,
      },
    });

    if (error) {
      throw new Error(await toMessage('Unable to verify this email right now.', error));
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Waitlist verification response was invalid.');
    }

    const response = data as Partial<LgbtqWaitlistServiceResult>;
    if (
      (response.status !== 'verified' && response.status !== 'already_verified') ||
      typeof response.message !== 'string'
    ) {
      throw new Error('Waitlist verification response was invalid.');
    }

    return {
      status: response.status,
      message: response.message,
      identityResponse:
        response.identityResponse === 'heterosexual' ||
        response.identityResponse === 'lgbtq' ||
        response.identityResponse === 'prefer_not_to_say'
          ? response.identityResponse
          : null,
    };
  },

  async submitIdentityResponse(
    token: string,
    identityResponse: LgbtqIdentityResponse
  ): Promise<LgbtqWaitlistServiceResult> {
    const { data, error } = await supabase.functions.invoke('lgbtq-waitlist', {
      body: {
        action: 'submit_identity_response',
        token,
        identity_response: identityResponse,
      },
    });

    if (error) {
      throw new Error(await toMessage('Unable to save your response right now.', error));
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Waitlist verification response was invalid.');
    }

    const response = data as Partial<LgbtqWaitlistServiceResult>;
    if (
      (response.status !== 'verified' && response.status !== 'already_verified') ||
      typeof response.message !== 'string'
    ) {
      throw new Error('Waitlist verification response was invalid.');
    }

    return {
      status: response.status,
      message: response.message,
      identityResponse:
        response.identityResponse === 'heterosexual' ||
        response.identityResponse === 'lgbtq' ||
        response.identityResponse === 'prefer_not_to_say'
          ? response.identityResponse
          : null,
    };
  },
};
