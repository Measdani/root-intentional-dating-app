import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeaders,
  getUserProfile,
  isIgnorableSchemaError,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  purgeUserById,
  resolveCallerContext,
  upsertBlockedEmail,
} from "../_shared/accountModeration.ts";

type CheckSignupEmailPayload = {
  action: "check_signup_email";
  email: string;
};

type SignupEmailLookupResult = {
  blocked: boolean;
  existing_account: boolean;
  reason: string | null;
};

type AdminBanUserPayload = {
  action: "admin_ban_user";
  target_user_id: string;
  reason: string;
  source_report_id?: string;
};

const isCheckSignupEmailPayload = (value: unknown): value is CheckSignupEmailPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<CheckSignupEmailPayload>;
  return payload.action === "check_signup_email" && typeof payload.email === "string";
};

const isAdminBanUserPayload = (value: unknown): value is AdminBanUserPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AdminBanUserPayload>;
  return (
    payload.action === "admin_ban_user" &&
    typeof payload.target_user_id === "string" &&
    typeof payload.reason === "string"
  );
};

const doesAuthUserExist = async (
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<boolean> => {
  let page = 1;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw new Error(`Unable to validate this email right now: ${error.message}`);
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    if (users.some((user) => normalizeEmail(user.email ?? "") === email)) {
      return true;
    }

    const lastPage = typeof data?.lastPage === "number" ? data.lastPage : page;
    if (page >= lastPage || users.length === 0) {
      return false;
    }

    page += 1;
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

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!isCheckSignupEmailPayload(rawPayload) && !isAdminBanUserPayload(rawPayload)) {
    return jsonResponse(400, { error: "Invalid account enforcement payload" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  if (isCheckSignupEmailPayload(rawPayload)) {
    const email = normalizeEmail(rawPayload.email);
    if (!email || !isValidEmail(email)) {
      return jsonResponse(400, { error: "A valid email is required" });
    }

    const { data, error } = await adminClient
      .from("rh_blocked_emails")
      .select("email_normalized")
      .eq("email_normalized", email)
      .maybeSingle();

    if (error) {
      if (isIgnorableSchemaError(error.message)) {
        return jsonResponse(503, { error: "Account enforcement is not configured yet" });
      }
      return jsonResponse(500, { error: "Unable to validate this email right now" });
    }

    let existingAccount = false;
    try {
      existingAccount = await doesAuthUserExist(adminClient, email);
    } catch (error) {
      return jsonResponse(500, {
        error: error instanceof Error ? error.message : "Unable to validate this email right now",
      });
    }

    const response: SignupEmailLookupResult = {
      blocked: Boolean(data),
      existing_account: existingAccount,
      reason: null,
    };

    if (response.blocked) {
      response.reason = "This email is blocked from creating a new account.";
    } else if (response.existing_account) {
      response.reason =
        "This email already has an account. Sign in instead, or use Forgot Password if you need to reset it.";
    }

    return jsonResponse(200, response);
  }

  try {
    const { callerUser, callerIsAdmin } = await resolveCallerContext(adminClient, request);
    if (!callerIsAdmin) {
      return jsonResponse(403, { error: "Admin access is required to ban a user" });
    }

    const targetUserId = rawPayload.target_user_id.trim();
    if (!targetUserId) {
      return jsonResponse(400, { error: "Target user is required" });
    }
    if (targetUserId === callerUser.id) {
      return jsonResponse(400, { error: "Admin accounts cannot ban themselves" });
    }

    const targetProfile = await getUserProfile(adminClient, targetUserId);
    if (!targetProfile?.email) {
      return jsonResponse(404, { error: "The target account does not have a bannable email" });
    }
    if (targetProfile.is_admin) {
      return jsonResponse(403, { error: "Admin accounts cannot be banned from the moderation panel" });
    }

    const blockedEmail = await upsertBlockedEmail(adminClient, {
      email: targetProfile.email,
      reason: rawPayload.reason,
      sourceReportId: rawPayload.source_report_id ?? null,
      blockedBy: callerUser.id,
    });

    await purgeUserById(adminClient, targetUserId);

    return jsonResponse(200, {
      status: "banned",
      deleted_user_id: targetUserId,
      blocked_email: blockedEmail,
    });
  } catch (error) {
    console.error("Account enforcement failed", error);
    const message = error instanceof Error ? error.message : "Account enforcement failed";
    const status =
      message === "Missing authentication token" || message === "Authentication required"
        ? 401
        : 500;
    return jsonResponse(status, { error: message });
  }
});
