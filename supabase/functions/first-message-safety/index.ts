import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type FirstMessageSafetyRequest = {
  message_id: string;
  force?: boolean;
  dry_run?: boolean;
};

type RhMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_first_message: boolean;
  status: "pending_review" | "approved" | "blocked" | "flagged";
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

const isValidRequest = (value: unknown): value is FirstMessageSafetyRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<FirstMessageSafetyRequest>;
  if (typeof payload.message_id !== "string" || payload.message_id.trim().length === 0) return false;
  if (payload.force !== undefined && typeof payload.force !== "boolean") return false;
  if (payload.dry_run !== undefined && typeof payload.dry_run !== "boolean") return false;
  return true;
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

  let payload: FirstMessageSafetyRequest;
  try {
    const parsed = await request.json();
    if (!isValidRequest(parsed)) {
      return jsonResponse(400, { error: "Invalid payload. Expected { message_id, force?, dry_run? }" });
    }
    payload = parsed;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const { data: message, error: messageError } = await adminClient
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

  if (!message) {
    return jsonResponse(404, { error: "Message not found" });
  }

  if (!message.is_first_message) {
    return jsonResponse(400, { error: "Message is not marked as first message" });
  }

  if (!payload.force && message.status !== "pending_review") {
    return jsonResponse(200, {
      message: "Message already processed",
      message_id: message.id,
      current_status: message.status,
      already_processed: true,
    });
  }

  const decision = evaluateFirstMessage(message.content, message.is_first_message);

  if (payload.dry_run) {
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
      input_snapshot_json: {
        message_id: message.id,
        content: message.content,
        is_first_message: message.is_first_message,
      },
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
