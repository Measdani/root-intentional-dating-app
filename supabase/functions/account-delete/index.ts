import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeaders,
  getUserProfile,
  jsonResponse,
  purgeUserById,
  resolveCallerContext,
} from "../_shared/accountModeration.ts";

type SelfDeletePayload = {
  action: "self_delete";
};

type AdminDeletePayload = {
  action: "admin_delete";
  target_user_id: string;
};

type DeleteAccountPayload = SelfDeletePayload | AdminDeletePayload;

const isSelfDeletePayload = (value: unknown): value is SelfDeletePayload =>
  Boolean(value) && typeof value === "object" && (value as SelfDeletePayload).action === "self_delete";

const isAdminDeletePayload = (value: unknown): value is AdminDeletePayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<AdminDeletePayload>;
  return payload.action === "admin_delete" && typeof payload.target_user_id === "string";
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

  if (!isSelfDeletePayload(rawPayload) && !isAdminDeletePayload(rawPayload)) {
    return jsonResponse(400, { error: "Invalid account deletion payload" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let callerContext;
  try {
    callerContext = await resolveCallerContext(adminClient, request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    const status =
      message === "Missing authentication token" || message === "Authentication required"
        ? 401
        : 500;
    return jsonResponse(status, { error: message });
  }

  const { callerUser, callerIsAdmin } = callerContext;
  const targetUserId = isAdminDeletePayload(rawPayload) ? rawPayload.target_user_id.trim() : callerUser.id;

  if (!targetUserId) {
    return jsonResponse(400, { error: "Target user is required" });
  }

  if (isAdminDeletePayload(rawPayload)) {
    if (!callerIsAdmin) {
      return jsonResponse(403, { error: "Admin access is required to delete another account" });
    }

    if (targetUserId === callerUser.id) {
      return jsonResponse(400, { error: "Use the self-delete flow to delete your own account" });
    }
  }

  const targetProfile = await getUserProfile(adminClient, targetUserId);
  if (isAdminDeletePayload(rawPayload) && targetProfile?.is_admin) {
    return jsonResponse(403, { error: "Admin accounts cannot be deleted from the moderation panel" });
  }

  try {
    await purgeUserById(adminClient, targetUserId);
  } catch (error) {
    console.error("Account deletion failed", error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Account deletion failed",
    });
  }

  return jsonResponse(200, {
    status: "deleted",
    deleted_user_id: targetUserId,
    mode: isAdminDeletePayload(rawPayload) ? "admin" : "self",
  });
});
