import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminClient = ReturnType<typeof createClient>;

export type AppUserRow = {
  id: string;
  email?: string | null;
  is_admin?: boolean | null;
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

export const readBearerToken = (request: Request): string | null => {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
};

export const isIgnorableSchemaError = (message?: string | null) =>
  Boolean(message) &&
  (
    message!.includes("does not exist") ||
    message!.includes("Could not find the table") ||
    message!.includes("schema cache")
  );

export const getUserProfile = async (
  adminClient: AdminClient,
  userId: string,
): Promise<AppUserRow | null> => {
  const { data, error } = await adminClient
    .from("users")
    .select("id, email, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isIgnorableSchemaError(error.message)) {
      return null;
    }
    throw new Error(`Failed to load user profile: ${error.message}`);
  }

  return (data as AppUserRow | null) ?? null;
};

export const resolveCallerContext = async (
  adminClient: AdminClient,
  request: Request,
): Promise<{
  callerUser: Awaited<ReturnType<AdminClient["auth"]["getUser"]>>["data"]["user"];
  callerProfile: AppUserRow | null;
  callerIsAdmin: boolean;
}> => {
  const accessToken = readBearerToken(request);
  if (!accessToken) {
    throw new Error("Missing authentication token");
  }

  const { data: callerUserData, error: callerAuthError } = await adminClient.auth.getUser(accessToken);
  if (callerAuthError || !callerUserData.user) {
    throw new Error("Authentication required");
  }

  const callerProfile = await getUserProfile(adminClient, callerUserData.user.id);
  const callerIsAdmin = Boolean(callerProfile?.is_admin || callerUserData.user.app_metadata?.is_admin);

  return {
    callerUser: callerUserData.user,
    callerProfile,
    callerIsAdmin,
  };
};

export const deleteRowsByColumn = async (
  adminClient: AdminClient,
  table: string,
  column: string,
  value: string,
) => {
  const { error } = await adminClient
    .from(table)
    .delete()
    .eq(column, value);

  if (error && !isIgnorableSchemaError(error.message)) {
    throw new Error(`Failed to delete ${table}.${column} rows: ${error.message}`);
  }
};

export const clearJournalLinks = async (
  adminClient: AdminClient,
  userId: string,
) => {
  const { error } = await adminClient
    .from("journal_entries")
    .update({ related_user_id: null })
    .eq("related_user_id", userId);

  if (error && !isIgnorableSchemaError(error.message)) {
    throw new Error(`Failed to clear journal links: ${error.message}`);
  }
};

export const markRhUserRemoved = async (
  adminClient: AdminClient,
  userId: string,
) => {
  const { error } = await adminClient
    .from("rh_users")
    .update({
      app_user_id: null,
      app_user_email: null,
      status: "removed",
    })
    .eq("app_user_id", userId);

  if (error && !isIgnorableSchemaError(error.message)) {
    throw new Error(`Failed to archive AI ops user mapping: ${error.message}`);
  }
};

export const purgeUserById = async (
  adminClient: AdminClient,
  userId: string,
) => {
  await deleteRowsByColumn(adminClient, "assessment_results", "user_id", userId);
  await deleteRowsByColumn(adminClient, "journal_entries", "user_id", userId);
  await clearJournalLinks(adminClient, userId);
  await deleteRowsByColumn(adminClient, "support_messages", "user_id", userId);
  await deleteRowsByColumn(adminClient, "reports", "reporter_id", userId);
  await deleteRowsByColumn(adminClient, "reports", "reported_user_id", userId);
  await deleteRowsByColumn(adminClient, "users", "id", userId);
  await markRhUserRemoved(adminClient, userId);

  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    const message = deleteAuthError.message?.toLowerCase?.() ?? "";
    if (!message.includes("user not found")) {
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
    }
  }
};

export const upsertBlockedEmail = async (
  adminClient: AdminClient,
  {
    email,
    reason,
    sourceReportId,
    blockedBy,
  }: {
    email: string;
    reason: string;
    sourceReportId?: string | null;
    blockedBy?: string | null;
  },
) => {
  const normalizedEmail = normalizeEmail(email);
  const { error } = await adminClient
    .from("rh_blocked_emails")
    .upsert({
      email_normalized: normalizedEmail,
      reason: reason.trim(),
      source_report_id: sourceReportId ?? null,
      blocked_by: blockedBy ?? null,
      blocked_at: new Date().toISOString(),
    }, { onConflict: "email_normalized" });

  if (error) {
    throw new Error(`Failed to save blocked email: ${error.message}`);
  }

  return normalizedEmail;
};
