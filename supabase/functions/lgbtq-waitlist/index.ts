import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type RequestVerificationPayload = {
  action: "request_verification";
  name: string;
  email: string;
  safety_feature: string;
  identity_preferences: string;
  personal_work: string;
  redirect_url: string;
};

type VerifyEmailPayload = {
  action: "verify_email";
  token: string;
};

type WaitlistRequest = RequestVerificationPayload | VerifyEmailPayload;

type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  email_normalized: string;
  safety_feature: string;
  identity_preferences: string;
  personal_work: string;
  verification_token_hash: string | null;
  verification_requested_at: string | null;
  verification_expires_at: string | null;
  verification_email_sent_at: string | null;
  verified_at: string | null;
  thank_you_email_sent_at: string | null;
};

const TABLE_NAME = "rh_lgbtq_waitlist_submissions";
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const VERIFIED_MESSAGE =
  "Thank you for your survey. Your email has been verified. We will contact you when we launch.";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isRequestVerificationPayload = (value: unknown): value is RequestVerificationPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<RequestVerificationPayload>;
  return (
    payload.action === "request_verification" &&
    typeof payload.name === "string" &&
    typeof payload.email === "string" &&
    typeof payload.safety_feature === "string" &&
    typeof payload.identity_preferences === "string" &&
    typeof payload.personal_work === "string" &&
    typeof payload.redirect_url === "string"
  );
};

const isVerifyEmailPayload = (value: unknown): value is VerifyEmailPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<VerifyEmailPayload>;
  return payload.action === "verify_email" && typeof payload.token === "string";
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const trimTo = (value: string, maxLength: number) => value.trim().slice(0, maxLength);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const createVerificationToken = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const sha256Hex = async (value: string): Promise<string> => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const buildVerificationUrl = (baseUrl: string, token: string): string => {
  const url = new URL(baseUrl);
  url.hash = "";
  url.searchParams.set("waitlistToken", token);
  return url.toString();
};

const sendResendEmail = async ({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const waitlistFromEmail = Deno.env.get("WAITLIST_FROM_EMAIL");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  if (!resendApiKey || !waitlistFromEmail) {
    return jsonResponse(503, { error: "RESEND_API_KEY or WAITLIST_FROM_EMAIL is not configured" });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!isRequestVerificationPayload(rawPayload) && !isVerifyEmailPayload(rawPayload)) {
    return jsonResponse(400, { error: "Invalid waitlist payload" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (isRequestVerificationPayload(rawPayload)) {
    const name = trimTo(rawPayload.name, 120);
    const email = normalizeEmail(rawPayload.email);
    const safetyFeature = trimTo(rawPayload.safety_feature, 2000);
    const identityPreferences = trimTo(rawPayload.identity_preferences, 2000);
    const personalWork = trimTo(rawPayload.personal_work, 2000);
    const redirectUrl = rawPayload.redirect_url.trim();

    if (!name) {
      return jsonResponse(400, { error: "Name is required" });
    }
    if (!email || !isValidEmail(email)) {
      return jsonResponse(400, { error: "A valid email is required" });
    }
    if (!safetyFeature || !identityPreferences || !personalWork) {
      return jsonResponse(400, { error: "All survey answers are required" });
    }

    let parsedRedirectUrl: URL;
    try {
      parsedRedirectUrl = new URL(redirectUrl);
    } catch {
      return jsonResponse(400, { error: "A valid redirect URL is required" });
    }

    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && parsedRedirectUrl.origin !== requestOrigin) {
      return jsonResponse(400, {
        error: "Redirect URL must match the requesting app origin",
      });
    }

    const { data: existingRow, error: lookupError } = await adminClient
      .from(TABLE_NAME)
      .select(`
        id,
        name,
        email,
        email_normalized,
        safety_feature,
        identity_preferences,
        personal_work,
        verification_token_hash,
        verification_requested_at,
        verification_expires_at,
        verification_email_sent_at,
        verified_at,
        thank_you_email_sent_at
      `)
      .eq("email_normalized", email)
      .maybeSingle<WaitlistRow>();

    if (lookupError) {
      return jsonResponse(500, { error: "Failed to look up existing waitlist record", details: lookupError.message });
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    if (existingRow?.verified_at) {
      const { error: updateVerifiedError } = await adminClient
        .from(TABLE_NAME)
        .update({
          name,
          email,
          safety_feature: safetyFeature,
          identity_preferences: identityPreferences,
          personal_work: personalWork,
          updated_at: nowIso,
        })
        .eq("id", existingRow.id);

      if (updateVerifiedError) {
        return jsonResponse(500, {
          error: "Failed to update verified waitlist record",
          details: updateVerifiedError.message,
        });
      }

      return jsonResponse(200, {
        status: "already_verified",
        message: VERIFIED_MESSAGE,
      });
    }

    const verificationRecentlySent = Boolean(
      existingRow?.verification_email_sent_at &&
      Date.parse(existingRow.verification_email_sent_at) + VERIFICATION_RESEND_COOLDOWN_MS > nowMs
    );

    if (verificationRecentlySent && existingRow) {
      const { error: recentUpdateError } = await adminClient
        .from(TABLE_NAME)
        .update({
          name,
          email,
          safety_feature: safetyFeature,
          identity_preferences: identityPreferences,
          personal_work: personalWork,
          verification_requested_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", existingRow.id);

      if (recentUpdateError) {
        return jsonResponse(500, {
          error: "Failed to update waitlist record",
          details: recentUpdateError.message,
        });
      }

      return jsonResponse(200, {
        status: "verification_sent",
        message:
          "A verification email was already sent recently. Please use that link or wait a few minutes before requesting another one.",
      });
    }

    const verificationToken = createVerificationToken();
    const verificationTokenHash = await sha256Hex(verificationToken);
    const verificationExpiresAt = new Date(nowMs + TOKEN_TTL_MS).toISOString();
    const verificationEmailSentAt = nowIso;

    const upsertPayload = {
      name,
      email,
      email_normalized: email,
      safety_feature: safetyFeature,
      identity_preferences: identityPreferences,
      personal_work: personalWork,
      verification_token_hash: verificationTokenHash,
      verification_requested_at: nowIso,
      verification_expires_at: verificationExpiresAt,
      updated_at: nowIso,
    };

    if (existingRow) {
      const { error: updateError } = await adminClient
        .from(TABLE_NAME)
        .update(upsertPayload)
        .eq("id", existingRow.id);

      if (updateError) {
        return jsonResponse(500, { error: "Failed to update waitlist record", details: updateError.message });
      }
    } else {
      const { error: insertError } = await adminClient
        .from(TABLE_NAME)
        .insert(upsertPayload);

      if (insertError) {
        return jsonResponse(500, { error: "Failed to create waitlist record", details: insertError.message });
      }
    }

    const verificationUrl = buildVerificationUrl(parsedRedirectUrl.toString(), verificationToken);
    const safeName = escapeHtml(name);

    try {
      await sendResendEmail({
        apiKey: resendApiKey,
        from: waitlistFromEmail,
        to: email,
        subject: "Verify your Rooted Hearts LGBTQ+ waitlist email",
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
            <p>Hi ${safeName},</p>
            <p>Thank you for sharing your LGBTQ+ waitlist survey with Rooted Hearts.</p>
            <p>Please verify your email before we add you to the waitlist:</p>
            <p><a href="${verificationUrl}" style="display: inline-block; background: #D9FF3D; color: #0B0F0C; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 600;">Verify My Email</a></p>
            <p>If the button does not work, copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This verification link expires in 24 hours.</p>
          </div>
        `,
        text: [
          `Hi ${name},`,
          "",
          "Thank you for sharing your LGBTQ+ waitlist survey with Rooted Hearts.",
          "Please verify your email before we add you to the waitlist:",
          verificationUrl,
          "",
          "This verification link expires in 24 hours.",
        ].join("\n"),
      });
    } catch (error) {
      return jsonResponse(502, {
        error: "Failed to send verification email",
        details: error instanceof Error ? error.message : "unknown error",
      });
    }

    const { error: sentStampError } = await adminClient
      .from(TABLE_NAME)
      .update({
        verification_email_sent_at: verificationEmailSentAt,
        updated_at: verificationEmailSentAt,
      })
      .eq("email_normalized", email);

    if (sentStampError) {
      console.warn("Failed to stamp verification email send time:", sentStampError.message);
    }

    return jsonResponse(200, {
      status: "verification_sent",
      message:
        "Check your email to verify your address. We will only contact you after your email is confirmed.",
    });
  }

  const token = rawPayload.token.trim();
  if (!token) {
    return jsonResponse(400, { error: "Verification token is required" });
  }

  const tokenHash = await sha256Hex(token);
  const { data: waitlistRow, error: waitlistLookupError } = await adminClient
    .from(TABLE_NAME)
    .select(`
      id,
      name,
      email,
      email_normalized,
      safety_feature,
      identity_preferences,
      personal_work,
      verification_token_hash,
      verification_requested_at,
      verification_expires_at,
      verification_email_sent_at,
      verified_at,
      thank_you_email_sent_at
    `)
    .eq("verification_token_hash", tokenHash)
    .maybeSingle<WaitlistRow>();

  if (waitlistLookupError) {
    return jsonResponse(500, { error: "Failed to verify waitlist token", details: waitlistLookupError.message });
  }

  if (!waitlistRow) {
    return jsonResponse(400, { error: "This verification link is invalid or has already been used." });
  }

  if (waitlistRow.verified_at) {
    return jsonResponse(200, {
      status: "already_verified",
      message: VERIFIED_MESSAGE,
    });
  }

  if (!waitlistRow.verification_expires_at || Date.parse(waitlistRow.verification_expires_at) <= Date.now()) {
    return jsonResponse(400, { error: "This verification link has expired. Please request a new one." });
  }

  const verifiedAt = new Date().toISOString();
  const { error: verifyUpdateError } = await adminClient
    .from(TABLE_NAME)
    .update({
      verified_at: verifiedAt,
      updated_at: verifiedAt,
    })
    .eq("id", waitlistRow.id);

  if (verifyUpdateError) {
    return jsonResponse(500, { error: "Failed to mark waitlist email as verified", details: verifyUpdateError.message });
  }

  const safeName = escapeHtml(waitlistRow.name);
  try {
    await sendResendEmail({
      apiKey: resendApiKey,
      from: waitlistFromEmail,
      to: waitlistRow.email,
      subject: "Your Rooted Hearts LGBTQ+ waitlist email is verified",
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
          <p>Hi ${safeName},</p>
          <p>${escapeHtml(VERIFIED_MESSAGE)}</p>
        </div>
      `,
      text: `Hi ${waitlistRow.name},\n\n${VERIFIED_MESSAGE}`,
    });

    const { error: thankYouUpdateError } = await adminClient
      .from(TABLE_NAME)
      .update({
        thank_you_email_sent_at: verifiedAt,
        updated_at: verifiedAt,
      })
      .eq("id", waitlistRow.id);

    if (thankYouUpdateError) {
      console.warn("Failed to stamp thank-you email send time:", thankYouUpdateError.message);
    }
  } catch (error) {
    console.warn("Failed to send LGBTQ+ waitlist thank-you email:", error);
  }

  return jsonResponse(200, {
    status: "verified",
    message: VERIFIED_MESSAGE,
  });
});
