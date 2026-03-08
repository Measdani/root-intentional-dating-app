import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type MessageIdRequest = {
  message_id: string;
  force?: boolean;
  dry_run?: boolean;
};

type InlineMessageRequest = {
  sender_app_user_id: string;
  recipient_app_user_id: string;
  content: string;
  conversation_id?: string;
  sender_email?: string | null;
  recipient_email?: string | null;
  dry_run?: boolean;
};

type FirstMessageSafetyRequest = MessageIdRequest | InlineMessageRequest;

type RhMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_first_message: boolean;
  status: "pending_review" | "approved" | "blocked" | "flagged";
};

type RhUserRow = {
  id: string;
};

type SafetyDecision = {
  labels: string[];
  confidence: number;
  recommended_action:
    | "approve"
    | "approve_with_nudge"
    | "block_and_rewrite"
    | "block_and_warn"
    | "escalate_to_review";
  message_status: "approved" | "blocked" | "flagged";
  blocked_reason: string | null;
  rewrite_prompt: string | null;
  user_feedback: string | null;
  escalate: boolean;
  severity_for_case: "low" | "medium" | "high" | "critical" | null;
};

const AGENT_NAME = "first_message_safety";
const RULE_VERSION = "fms-rules-2026-03-08";
const MODEL_VERSION = "deterministic-rule-engine-v1";
const SUPPORT_EMAIL = "support@rootedhearts.net";

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

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isBooleanOrUndefined = (value: unknown): boolean =>
  value === undefined || typeof value === "boolean";

const isMessageIdRequest = (value: unknown): value is MessageIdRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<MessageIdRequest>;
  return (
    isNonEmptyString(payload.message_id) &&
    isBooleanOrUndefined(payload.force) &&
    isBooleanOrUndefined(payload.dry_run)
  );
};

const isInlineMessageRequest = (value: unknown): value is InlineMessageRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<InlineMessageRequest>;
  const validSenderEmail = payload.sender_email === undefined || payload.sender_email === null || typeof payload.sender_email === "string";
  const validRecipientEmail = payload.recipient_email === undefined || payload.recipient_email === null || typeof payload.recipient_email === "string";
  const validConversationId = payload.conversation_id === undefined || typeof payload.conversation_id === "string";

  return (
    isNonEmptyString(payload.sender_app_user_id) &&
    isNonEmptyString(payload.recipient_app_user_id) &&
    isNonEmptyString(payload.content) &&
    isBooleanOrUndefined(payload.dry_run) &&
    validConversationId &&
    validSenderEmail &&
    validRecipientEmail
  );
};

const normalizeOptionalEmail = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const LOW_EFFORT_MESSAGES = new Set([
  "hi",
  "hey",
  "sup",
  "yo",
  "hello",
  "wyd",
  "wassup",
]);

const SEXUAL_PATTERNS = [
  /\bnude(s)?\b/i,
  /\bsex(y|ual)?\b/i,
  /\bhorny\b/i,
  /\bhook[\s-]?up\b/i,
  /\bfwb\b/i,
  /\b(send|show)\s+(me\s+)?(more\s+)?pics\b/i,
  /\bnetflix and chill\b/i,
];

const HARASSMENT_PATTERNS = [
  /\bidiot\b/i,
  /\bstupid\b/i,
  /\bdumbass\b/i,
  /\bbitch\b/i,
  /\bslut\b/i,
  /\bwhore\b/i,
  /\bfuck you\b/i,
  /\btrash\b/i,
  /\bugly\b/i,
];

const MANIPULATION_PATTERNS = [
  /\bif you cared\b/i,
  /\byou owe me\b/i,
  /\bprove you like me\b/i,
  /\bdon't make me wait\b/i,
];

const MONEY_PATTERNS = [
  /\bsend\b.{0,20}\b(money|cash)\b/i,
  /\bcashapp\b/i,
  /\bvenmo\b/i,
  /\bzelle\b/i,
  /\bpaypal\b/i,
  /\bgift card\b/i,
  /\bwire transfer\b/i,
  /\bbitcoin\b/i,
  /\bcrypto\b/i,
  /\bloan me\b/i,
  /\bcan you (help|spot) me\b/i,
];

const SCAM_PATTERNS = [
  /\burgent\b.{0,30}\b(money|help)\b/i,
  /\bstuck\b.{0,20}\bairport\b/i,
  /\bverify your account\b/i,
  /\binvestment opportunity\b/i,
  /\bdouble your money\b/i,
];

const OFF_PLATFORM_PATTERNS = [
  /\bwhat'?s your number\b/i,
  /\bgive me your number\b/i,
  /\btext me\b/i,
  /\bwhatsapp\b/i,
  /\btelegram\b/i,
  /\bsnap(chat)?\b/i,
  /\binstagram\b/i,
  /\big\b/i,
];

const HATE_PATTERNS = [
  /\bi hate (black|white|latino|asian|gay|lesbian|trans)\b/i,
  /\bno (black|white|latino|asian|gay|lesbian|trans) people\b/i,
];

const THREAT_PATTERNS = [
  /\b(i('| a)?ll|i will)\s+(find|hurt|kill)\s+you\b/i,
  /\bi know where you live\b/i,
  /\byou'll regret this\b/i,
  /\bwatch your back\b/i,
];

const BLACKMAIL_PATTERNS = [
  /\bblackmail\b/i,
  /\bextort\b/i,
  /\bleak (your )?(pics|photos|messages)\b/i,
  /\bsend (it|them) to your family\b/i,
];

const MINOR_PATTERNS = [
  /\bi'?m (1[0-7])\b/i,
  /\bund(er)?age\b/i,
  /\bminor\b/i,
];

const SELF_HARM_OR_VIOLENCE_PATTERNS = [
  /\bsuicide\b/i,
  /\bkill myself\b/i,
  /\bself[- ]harm\b/i,
  /\bshoot\b.{0,20}\b(you|them)\b/i,
];

const matchesAny = (value: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(value));

const evaluateFirstMessage = (content: string, isFirstMessage: boolean): SafetyDecision => {
  const text = content.trim();
  const normalized = text.toLowerCase();
  const labels: string[] = [];

  const hasThreat = matchesAny(text, THREAT_PATTERNS) || matchesAny(text, BLACKMAIL_PATTERNS);
  const hasMinorRisk = matchesAny(text, MINOR_PATTERNS);
  const hasSelfHarmOrViolence = matchesAny(text, SELF_HARM_OR_VIOLENCE_PATTERNS);
  const hasMoney = matchesAny(text, MONEY_PATTERNS);
  const hasScam = matchesAny(text, SCAM_PATTERNS);
  const hasSexual = matchesAny(text, SEXUAL_PATTERNS);
  const hasHarassment = matchesAny(text, HARASSMENT_PATTERNS);
  const hasManipulation = matchesAny(text, MANIPULATION_PATTERNS);
  const hasOffPlatform = isFirstMessage && matchesAny(text, OFF_PLATFORM_PATTERNS);
  const hasHate = matchesAny(text, HATE_PATTERNS);

  const isLowEffort = (
    text.length <= 10 ||
    LOW_EFFORT_MESSAGES.has(normalized) ||
    (/^(hey|hi|hello)[.!?]*$/i.test(text))
  );

  if (hasThreat) labels.push("threat_intimidation");
  if (hasMinorRisk) labels.push("ambiguous_needs_review");
  if (hasSelfHarmOrViolence) labels.push("self_harm_or_violence_mention");
  if (hasMoney) labels.push("money_solicitation");
  if (hasScam) labels.push("scam_indicator");
  if (hasSexual) labels.push("sexual_content");
  if (hasHarassment) labels.push("harassment_insult");
  if (hasManipulation) labels.push("manipulation_pressure");
  if (hasOffPlatform) labels.push("off_platform_pressure_early");
  if (hasHate) labels.push("hate_discrimination");
  if (labels.length === 0 && isLowEffort) labels.push("low_effort");
  if (labels.length === 0) labels.push("respectful_safe");

  const severe = hasThreat || hasMinorRisk || hasSelfHarmOrViolence;
  if (severe) {
    return {
      labels,
      confidence: 0.98,
      recommended_action: "escalate_to_review",
      message_status: "flagged",
      blocked_reason: "Potentially severe safety concern requires human review.",
      rewrite_prompt: null,
      user_feedback: `This message requires additional safety review before it can be delivered. For support, contact ${SUPPORT_EMAIL}.`,
      escalate: true,
      severity_for_case: "critical",
    };
  }

  if (hasMoney || hasScam || hasHate || hasHarassment) {
    return {
      labels,
      confidence: 0.93,
      recommended_action: "block_and_warn",
      message_status: "blocked",
      blocked_reason: "This message includes harmful or policy-violating content.",
      rewrite_prompt: null,
      user_feedback: "That message does not meet our communication standards.",
      escalate: false,
      severity_for_case: null,
    };
  }

  if (hasSexual || hasOffPlatform || hasManipulation) {
    return {
      labels,
      confidence: 0.9,
      recommended_action: "block_and_rewrite",
      message_status: "blocked",
      blocked_reason: "Opening message must stay respectful and non-coercive.",
      rewrite_prompt: "Try a greeting, mention something specific from their profile, and ask one thoughtful question.",
      user_feedback: "That opening message does not meet our standards. Please rewrite it with respect and genuine interest.",
      escalate: false,
      severity_for_case: null,
    };
  }

  if (isLowEffort) {
    return {
      labels,
      confidence: 0.82,
      recommended_action: "approve_with_nudge",
      message_status: "approved",
      blocked_reason: null,
      rewrite_prompt: "A better first message includes a greeting, one specific profile reference, and a question.",
      user_feedback: null,
      escalate: false,
      severity_for_case: null,
    };
  }

  return {
    labels,
    confidence: 0.88,
    recommended_action: "approve",
    message_status: "approved",
    blocked_reason: null,
    rewrite_prompt: null,
    user_feedback: null,
    escalate: false,
    severity_for_case: null,
  };
};

const riskAdjustments = (
  action: SafetyDecision["recommended_action"],
): { strikeDelta: number; riskDelta: number } => {
  switch (action) {
    case "block_and_warn":
      return { strikeDelta: 1, riskDelta: 8 };
    case "block_and_rewrite":
      return { strikeDelta: 1, riskDelta: 5 };
    case "escalate_to_review":
      return { strikeDelta: 1, riskDelta: 15 };
    default:
      return { strikeDelta: 0, riskDelta: 0 };
  }
};

const ensureRhUserByAppId = async (
  adminClient: ReturnType<typeof createClient>,
  appUserId: string,
  email?: string | null,
): Promise<string> => {
  const normalizedEmail = normalizeOptionalEmail(email);
  const { data: existing, error: existingError } = await adminClient
    .from("rh_users")
    .select("id")
    .eq("app_user_id", appUserId)
    .maybeSingle<RhUserRow>();

  if (existingError) {
    throw new Error(`Failed to lookup rh_user for app_user_id ${appUserId}: ${existingError.message}`);
  }

  if (existing?.id) {
    if (normalizedEmail) {
      await adminClient
        .from("rh_users")
        .update({ app_user_email: normalizedEmail })
        .eq("id", existing.id);
    }
    return existing.id;
  }

  const insertPayload: Record<string, unknown> = {
    status: "active",
    mode: "alignment",
    app_user_id: appUserId,
    app_user_email: normalizedEmail,
  };

  const { data: inserted, error: insertError } = await adminClient
    .from("rh_users")
    .insert(insertPayload)
    .select("id")
    .single<RhUserRow>();

  if (!insertError && inserted?.id) {
    return inserted.id;
  }

  // Handle unique race: another request inserted the same app_user_id first.
  if (insertError && insertError.code === "23505") {
    const { data: retried, error: retryError } = await adminClient
      .from("rh_users")
      .select("id")
      .eq("app_user_id", appUserId)
      .maybeSingle<RhUserRow>();
    if (retryError || !retried?.id) {
      throw new Error(`Failed to recover rh_user after unique conflict for ${appUserId}: ${retryError?.message ?? "unknown error"}`);
    }
    return retried.id;
  }

  throw new Error(`Failed to create rh_user for app_user_id ${appUserId}: ${insertError?.message ?? "unknown error"}`);
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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const isByMessageId = isMessageIdRequest(rawPayload);
  const isInline = isInlineMessageRequest(rawPayload);
  if (!isByMessageId && !isInline) {
    return jsonResponse(400, {
      error:
        "Invalid payload. Expected either { message_id, force?, dry_run? } " +
        "or { sender_app_user_id, recipient_app_user_id, content, conversation_id?, sender_email?, recipient_email?, dry_run? }",
    });
  }

  let message: RhMessageRow | null = null;
  let dryRun = false;
  let force = false;
  let inputSnapshot: Record<string, unknown> = {};

  if (isByMessageId) {
    const payload = rawPayload as MessageIdRequest;
    dryRun = Boolean(payload.dry_run);
    force = Boolean(payload.force);

    const { data: loadedMessage, error: messageError } = await adminClient
      .from("rh_messages")
      .select("id, sender_id, recipient_id, content, is_first_message, status")
      .eq("id", payload.message_id)
      .maybeSingle<RhMessageRow>();

    if (messageError) {
      return jsonResponse(500, {
        error: "Failed to load message",
        details: messageError.message,
      });
    }

    if (!loadedMessage) {
      return jsonResponse(404, { error: "Message not found" });
    }

    if (!loadedMessage.is_first_message) {
      return jsonResponse(400, { error: "Message is not marked as first message" });
    }

    if (!force && loadedMessage.status !== "pending_review") {
      return jsonResponse(200, {
        message: "Message already processed",
        message_id: loadedMessage.id,
        current_status: loadedMessage.status,
        already_processed: true,
      });
    }

    message = loadedMessage;
    inputSnapshot = {
      source: "message_id",
      message_id: loadedMessage.id,
      content: loadedMessage.content,
      is_first_message: loadedMessage.is_first_message,
    };
  } else {
    const payload = rawPayload as InlineMessageRequest;
    dryRun = Boolean(payload.dry_run);

    if (dryRun) {
      const decision = evaluateFirstMessage(payload.content, true);
      return jsonResponse(200, {
        dry_run: true,
        message_id: null,
        ...decision,
      });
    }

    const senderRhUserId = await ensureRhUserByAppId(adminClient, payload.sender_app_user_id, payload.sender_email);
    const recipientRhUserId = await ensureRhUserByAppId(adminClient, payload.recipient_app_user_id, payload.recipient_email);

    const fallbackConversationId = `conv_${[payload.sender_app_user_id, payload.recipient_app_user_id].sort().join("_")}`;
    const threadId = (payload.conversation_id?.trim() || fallbackConversationId);

    const { data: insertedMessage, error: insertMessageError } = await adminClient
      .from("rh_messages")
      .insert({
        sender_id: senderRhUserId,
        recipient_id: recipientRhUserId,
        thread_id: threadId,
        content: payload.content,
        is_first_message: true,
        status: "pending_review",
      })
      .select("id, sender_id, recipient_id, content, is_first_message, status")
      .single<RhMessageRow>();

    if (insertMessageError || !insertedMessage) {
      return jsonResponse(500, {
        error: "Failed to create message for moderation",
        details: insertMessageError?.message ?? "unknown error",
      });
    }

    message = insertedMessage;
    inputSnapshot = {
      source: "inline_message_payload",
      sender_app_user_id: payload.sender_app_user_id,
      recipient_app_user_id: payload.recipient_app_user_id,
      sender_email: normalizeOptionalEmail(payload.sender_email),
      recipient_email: normalizeOptionalEmail(payload.recipient_email),
      conversation_id: threadId,
      content: payload.content,
      is_first_message: true,
    };
  }

  if (!message) {
    return jsonResponse(500, { error: "Moderation pipeline did not resolve a message" });
  }

  const decision = evaluateFirstMessage(message.content, message.is_first_message);

  if (dryRun) {
    return jsonResponse(200, {
      message_id: message.id,
      dry_run: true,
      ...decision,
    });
  }

  const { error: updateMessageError } = await adminClient
    .from("rh_messages")
    .update({ status: decision.message_status })
    .eq("id", message.id);

  if (updateMessageError) {
    return jsonResponse(500, {
      error: "Failed to update message status",
      details: updateMessageError.message,
    });
  }

  const { strikeDelta, riskDelta } = riskAdjustments(decision.recommended_action);
  if (strikeDelta > 0 || riskDelta > 0) {
    const { data: sender, error: senderError } = await adminClient
      .from("rh_users")
      .select("id, strike_count, risk_score")
      .eq("id", message.sender_id)
      .maybeSingle<{ id: string; strike_count: number; risk_score: number }>();

    if (!senderError && sender) {
      const nextRisk = Math.min(100, Math.max(0, Number(sender.risk_score) + riskDelta));
      const nextStrikeCount = Math.max(0, Number(sender.strike_count) + strikeDelta);
      await adminClient
        .from("rh_users")
        .update({
          risk_score: nextRisk,
          strike_count: nextStrikeCount,
        })
        .eq("id", sender.id);
    }
  }

  const outputSnapshot = {
    labels: decision.labels,
    confidence: decision.confidence,
    recommended_action: decision.recommended_action,
    message_status: decision.message_status,
    blocked_reason: decision.blocked_reason,
    rewrite_prompt: decision.rewrite_prompt,
    user_feedback: decision.user_feedback,
    escalate: decision.escalate,
  };

  const { data: eventRow, error: eventError } = await adminClient
    .from("rh_agent_events")
    .insert({
      agent_name: AGENT_NAME,
      event_type: "first_message_submitted",
      target_type: "message",
      target_id: message.id,
      actor_user_id: message.sender_id,
      related_user_id: message.recipient_id,
      input_snapshot_json: inputSnapshot,
      output_snapshot_json: outputSnapshot,
      confidence: decision.confidence,
      applied_action: decision.recommended_action,
      escalated: decision.escalate,
      model_version: MODEL_VERSION,
      rule_version: RULE_VERSION,
    })
    .select("id")
    .single<{ id: string }>();

  if (eventError) {
    return jsonResponse(500, {
      error: "Failed to write agent event",
      details: eventError.message,
    });
  }

  let caseId: string | null = null;
  if (decision.escalate && decision.severity_for_case) {
    const { data: caseRow, error: caseError } = await adminClient
      .from("rh_moderation_cases")
      .insert({
        source: "message",
        source_id: message.id,
        severity: decision.severity_for_case,
        summary: `First-message escalation triggered. Labels: ${decision.labels.join(", ")}`,
        status: "open",
      })
      .select("id")
      .single<{ id: string }>();

    if (caseError) {
      return jsonResponse(500, {
        error: "Failed to create moderation case",
        details: caseError.message,
      });
    }
    caseId = caseRow.id;
  }

  return jsonResponse(200, {
    message_id: message.id,
    event_id: eventRow.id,
    case_id: caseId,
    ...outputSnapshot,
  });
});
