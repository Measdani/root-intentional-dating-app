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
  is_first_message?: boolean;
  conversation_id?: string;
  sender_email?: string | null;
  recipient_email?: string | null;
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

type RhUserRow = {
  id: string;
};

type RhAgentEventRow = {
  created_at: string;
  applied_action: string;
  output_snapshot_json: unknown;
};

type LockScope = "first_message" | "all_messages" | null;

type SafetyDecision = {
  labels: string[];
  confidence: number;
  recommended_action:
    | "approve"
    | "approve_with_nudge"
    | "block_and_rewrite"
    | "block_and_warn"
    | "temporary_send_lock"
    | "escalate_to_review";
  message_status: "approved" | "blocked" | "flagged";
  blocked_reason: string | null;
  rewrite_prompt: string | null;
  user_feedback: string | null;
  escalate: boolean;
  severity_for_case: "low" | "medium" | "high" | "critical" | null;
};

type ParsedEnforcementEvent = {
  createdAtMs: number;
  appliedAction: string;
  labels: string[];
  accountabilityLevel: number;
  lockScope: LockScope;
  lockUntilMs: number | null;
  behaviorPointsAdded: number;
  violationEvent: boolean;
};

type AccountabilityResult = {
  decision: SafetyDecision;
  accountabilityLevel: number;
  lockScope: LockScope;
  lockUntil: string | null;
  behaviorScore: number;
  behaviorPointsAdded: number;
  blockedEvents24h: number;
  blockedEvents48h: number;
  resetMessage: string | null;
  violationEvent: boolean;
};

const AGENT_NAME = "first_message_safety";
const RULE_VERSION = "fms-rules-2026-03-09-accountability";
const MODEL_VERSION = "deterministic-rule-engine-v2";
const SUPPORT_EMAIL = "support@rootedhearts.net";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const DECAY_WINDOW_MS = 48 * HOUR_MS;
const RESET_WINDOW_MS = 30 * DAY_MS;
const LOOKBACK_WINDOW_MS = 120 * DAY_MS;

const LEVEL_1_FEEDBACK =
  "This message can't be sent as written. Please remove sexual, harmful, or pressuring language and try again.";
const LEVEL_2_FEEDBACK =
  "We've noticed several messages that did not meet our communication standards. Rooted Hearts is designed for respectful connection. Please slow down and communicate thoughtfully.";
const LEVEL_3_FEEDBACK =
  "We've temporarily paused your ability to start new conversations so you can reset and return with more thoughtful communication.";
const LEVEL_4_FEEDBACK =
  "Your account has been temporarily restricted due to repeated communication guideline violations. This pause helps keep the community respectful.";
const LEVEL_5_FEEDBACK =
  "Your account is under review due to repeated communication guideline violations.";
const RESET_MESSAGE =
  "Your communication record has been reset. Thank you for contributing to respectful conversations.";

const COMMUNICATION_MODULE_CONTENT = {
  title: "Respectful Communication mini-guide",
  description:
    "Want help improving your introductions? Try the Respectful Communication mini-guide.",
  cta: "Open communication module",
};

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
  const validIsFirstMessage = payload.is_first_message === undefined || typeof payload.is_first_message === "boolean";
  const validConversationId = payload.conversation_id === undefined || typeof payload.conversation_id === "string";

  return (
    isNonEmptyString(payload.sender_app_user_id) &&
    isNonEmptyString(payload.recipient_app_user_id) &&
    isNonEmptyString(payload.content) &&
    validIsFirstMessage &&
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const toDateMsOrNull = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toLockScope = (value: unknown): LockScope => {
  if (value === "first_message" || value === "all_messages") return value;
  return null;
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
  /\bcome to my place tonight\b/i,
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
      user_feedback: LEVEL_1_FEEDBACK,
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
      user_feedback: LEVEL_1_FEEDBACK,
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
      rewrite_prompt: "A better first message includes a greeting, one specific profile reference, and a thoughtful question.",
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

const isViolationAction = (action: string): boolean =>
  action === "block_and_rewrite" ||
  action === "block_and_warn" ||
  action === "escalate_to_review";

const behaviorPointsFromLabels = (labels: string[]): number => {
  const labelSet = new Set(labels);
  let points = 0;

  if (labelSet.has("money_solicitation") || labelSet.has("scam_indicator")) points += 4;
  if (labelSet.has("sexual_content")) points += 2;
  if (labelSet.has("harassment_insult") || labelSet.has("hate_discrimination")) points += 2;
  if (
    labelSet.has("manipulation_pressure") ||
    labelSet.has("off_platform_pressure_early")
  ) {
    points += 1;
  }
  if (
    labelSet.has("threat_intimidation") ||
    labelSet.has("self_harm_or_violence_mention") ||
    labelSet.has("ambiguous_needs_review")
  ) {
    points += 4;
  }

  return points;
};

const applyDecay = (score: number, fromMs: number, toMs: number): number => {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) return score;
  const decaySteps = Math.floor((toMs - fromMs) / DECAY_WINDOW_MS);
  if (decaySteps <= 0) return score;
  return Math.max(0, score - decaySteps);
};

const parseEnforcementEvent = (row: RhAgentEventRow): ParsedEnforcementEvent | null => {
  const createdAtMs = Date.parse(row.created_at);
  if (!Number.isFinite(createdAtMs)) return null;

  const output = asRecord(row.output_snapshot_json);
  const labels = toStringArray(output.labels);
  const lockScope = toLockScope(output.lock_scope);
  const lockUntilMs = toDateMsOrNull(output.lock_until);
  const storedAction =
    typeof row.applied_action === "string" ? row.applied_action : "";
  const outputAction =
    typeof output.recommended_action === "string"
      ? output.recommended_action
      : storedAction;
  const behaviorPointsFromOutput = toNumberOrNull(output.behavior_points_added);
  const behaviorPointsAdded =
    behaviorPointsFromOutput !== null
      ? Math.max(0, Math.round(behaviorPointsFromOutput))
      : Math.max(
        0,
        behaviorPointsFromLabels(labels) || (isViolationAction(outputAction) ? 1 : 0),
      );
  const outputViolationEvent = output.violation_event;
  const violationEvent =
    typeof outputViolationEvent === "boolean"
      ? outputViolationEvent
      : isViolationAction(outputAction);

  const accountabilityLevelFromOutput = toNumberOrNull(output.accountability_level);
  const accountabilityLevel =
    accountabilityLevelFromOutput !== null
      ? Math.max(0, Math.round(accountabilityLevelFromOutput))
      : lockScope === "all_messages"
      ? 4
      : lockScope === "first_message"
      ? 3
      : violationEvent
      ? 1
      : 0;

  return {
    createdAtMs,
    appliedAction: outputAction,
    labels,
    accountabilityLevel,
    lockScope,
    lockUntilMs,
    behaviorPointsAdded,
    violationEvent,
  };
};

const replayBehaviorScore = (
  events: ParsedEnforcementEvent[],
  nowMs: number,
): { score: number; lastViolationAtMs: number | null; hadViolationHistory: boolean } => {
  const violations = events
    .filter((event) => event.violationEvent)
    .sort((a, b) => a.createdAtMs - b.createdAtMs);

  if (violations.length === 0) {
    return { score: 0, lastViolationAtMs: null, hadViolationHistory: false };
  }

  let score = 0;
  let cursorMs: number | null = null;
  let lastViolationAtMs: number | null = null;

  for (const violation of violations) {
    if (cursorMs !== null) {
      score = applyDecay(score, cursorMs, violation.createdAtMs);
    }
    score += Math.max(0, violation.behaviorPointsAdded);
    cursorMs = violation.createdAtMs;
    lastViolationAtMs = violation.createdAtMs;
  }

  if (cursorMs !== null) {
    score = applyDecay(score, cursorMs, nowMs);
  }

  if (lastViolationAtMs !== null && nowMs - lastViolationAtMs >= RESET_WINDOW_MS) {
    score = 0;
  }

  return {
    score,
    lastViolationAtMs,
    hadViolationHistory: true,
  };
};

const countViolationsWithinWindow = (
  events: ParsedEnforcementEvent[],
  nowMs: number,
  windowMs: number,
): number =>
  events.filter(
    (event) => event.violationEvent && nowMs - event.createdAtMs <= windowMs,
  ).length;

const getActiveLock = (
  events: ParsedEnforcementEvent[],
  nowMs: number,
): { lockScope: Exclude<LockScope, null>; lockUntilMs: number; level: number } | null => {
  let active: { lockScope: Exclude<LockScope, null>; lockUntilMs: number; level: number } | null =
    null;

  for (const event of events) {
    if (!event.lockScope || !event.lockUntilMs || event.lockUntilMs <= nowMs) continue;
    const lockLevel =
      event.accountabilityLevel > 0
        ? event.accountabilityLevel
        : event.lockScope === "all_messages"
        ? 4
        : 3;
    if (!active || event.lockUntilMs > active.lockUntilMs) {
      active = {
        lockScope: event.lockScope,
        lockUntilMs: event.lockUntilMs,
        level: lockLevel,
      };
    }
  }

  return active;
};

const hadRecentEndedAllMessageSuspension = (
  events: ParsedEnforcementEvent[],
  nowMs: number,
): boolean =>
  events.some(
    (event) =>
      event.lockScope === "all_messages" &&
      event.lockUntilMs !== null &&
      event.lockUntilMs <= nowMs &&
      nowMs - event.lockUntilMs <= 14 * DAY_MS,
  );

const buildAccountabilityDecision = (
  baseDecision: SafetyDecision,
  priorEvents: ParsedEnforcementEvent[],
  nowMs: number,
  isFirstMessage: boolean,
): AccountabilityResult => {
  const behaviorReplay = replayBehaviorScore(priorEvents, nowMs);
  const blockedEvents24hBefore = countViolationsWithinWindow(
    priorEvents,
    nowMs,
    24 * HOUR_MS,
  );
  const blockedEvents48hBefore = countViolationsWithinWindow(
    priorEvents,
    nowMs,
    48 * HOUR_MS,
  );
  const activeLock = getActiveLock(priorEvents, nowMs);
  const lockAppliesToMessage =
    activeLock !== null &&
    (activeLock.lockScope === "all_messages" ||
      (activeLock.lockScope === "first_message" && isFirstMessage));

  if (lockAppliesToMessage && activeLock) {
    return {
      decision: {
        labels: ["temporary_send_lock"],
        confidence: 0.99,
        recommended_action: "temporary_send_lock",
        message_status: "blocked",
        blocked_reason:
          activeLock.lockScope === "first_message"
            ? "Temporary lock on new first messages due to repeated communication violations."
            : "Temporary lock on messaging due to repeated communication violations.",
        rewrite_prompt: null,
        user_feedback:
          activeLock.lockScope === "first_message"
            ? LEVEL_3_FEEDBACK
            : LEVEL_4_FEEDBACK,
        escalate: false,
        severity_for_case: null,
      },
      accountabilityLevel: activeLock.level,
      lockScope: activeLock.lockScope,
      lockUntil: new Date(activeLock.lockUntilMs).toISOString(),
      behaviorScore: behaviorReplay.score,
      behaviorPointsAdded: 0,
      blockedEvents24h: blockedEvents24hBefore,
      blockedEvents48h: blockedEvents48hBefore,
      resetMessage: null,
      violationEvent: false,
    };
  }

  const currentViolation = isViolationAction(baseDecision.recommended_action);
  const behaviorPointsAdded = currentViolation
    ? Math.max(
      1,
      behaviorPointsFromLabels(baseDecision.labels) || 0,
    )
    : 0;
  const behaviorScore = currentViolation
    ? behaviorReplay.score + behaviorPointsAdded
    : behaviorReplay.score;
  const blockedEvents24h = blockedEvents24hBefore + (currentViolation ? 1 : 0);
  const blockedEvents48h = blockedEvents48hBefore + (currentViolation ? 1 : 0);

  let accountabilityLevel = 0;
  let lockScope: LockScope = null;
  let lockUntil: string | null = null;
  let resetMessage: string | null = null;
  let decision: SafetyDecision = { ...baseDecision };

  const severeEscalation =
    baseDecision.recommended_action === "escalate_to_review" &&
    baseDecision.severity_for_case === "critical";

  if (currentViolation) {
    accountabilityLevel = 1;
    if (blockedEvents24h >= 3) accountabilityLevel = 2;
    if (blockedEvents24h >= 5) accountabilityLevel = 3;
    if (blockedEvents48h >= 8) accountabilityLevel = 4;
    if (hadRecentEndedAllMessageSuspension(priorEvents, nowMs)) {
      accountabilityLevel = Math.max(accountabilityLevel, 5);
    }

    if (accountabilityLevel >= 3) {
      const lockHours = accountabilityLevel >= 4 ? 48 : 12;
      lockScope = accountabilityLevel >= 4 ? "all_messages" : "first_message";
      lockUntil = new Date(nowMs + lockHours * HOUR_MS).toISOString();
    }

    if (accountabilityLevel >= 5) {
      decision = {
        ...decision,
        recommended_action: "escalate_to_review",
        message_status: "flagged",
        blocked_reason:
          "Account under behavior review after repeated communication violations.",
        rewrite_prompt: null,
        user_feedback: LEVEL_5_FEEDBACK,
        escalate: true,
        severity_for_case: decision.severity_for_case ?? "high",
      };
    } else if (!severeEscalation) {
      if (accountabilityLevel >= 4) {
        decision = {
          ...decision,
          recommended_action: "temporary_send_lock",
          message_status: "blocked",
          blocked_reason:
            "Temporary messaging suspension due to repeated communication violations.",
          rewrite_prompt: null,
          user_feedback: LEVEL_4_FEEDBACK,
          escalate: false,
          severity_for_case: null,
        };
      } else if (accountabilityLevel >= 3) {
        decision = {
          ...decision,
          recommended_action: "temporary_send_lock",
          message_status: "blocked",
          blocked_reason:
            "Temporary first-message cooldown due to repeated communication violations.",
          rewrite_prompt: null,
          user_feedback: LEVEL_3_FEEDBACK,
          escalate: false,
          severity_for_case: null,
        };
      } else if (accountabilityLevel === 2) {
        decision = {
          ...decision,
          user_feedback: LEVEL_2_FEEDBACK,
        };
      } else {
        decision = {
          ...decision,
          user_feedback: LEVEL_1_FEEDBACK,
        };
      }
    }
  } else if (
    behaviorReplay.hadViolationHistory &&
    behaviorReplay.lastViolationAtMs !== null &&
    nowMs - behaviorReplay.lastViolationAtMs >= RESET_WINDOW_MS
  ) {
    resetMessage = RESET_MESSAGE;
  }

  return {
    decision,
    accountabilityLevel,
    lockScope,
    lockUntil,
    behaviorScore,
    behaviorPointsAdded,
    blockedEvents24h,
    blockedEvents48h,
    resetMessage,
    violationEvent: currentViolation,
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
    case "temporary_send_lock":
      return { strikeDelta: 1, riskDelta: 12 };
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

const fetchPriorEnforcementEvents = async (
  adminClient: ReturnType<typeof createClient>,
  senderRhUserId: string,
  nowMs: number,
): Promise<ParsedEnforcementEvent[]> => {
  const sinceIso = new Date(nowMs - LOOKBACK_WINDOW_MS).toISOString();
  const { data, error } = await adminClient
    .from("rh_agent_events")
    .select("created_at, applied_action, output_snapshot_json")
    .eq("agent_name", AGENT_NAME)
    .eq("actor_user_id", senderRhUserId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load prior enforcement events: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => parseEnforcementEvent(row as RhAgentEventRow))
    .filter((event): event is ParsedEnforcementEvent => event !== null);
};

const maybeDeliverCommunicationModule = async (
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  accountabilityLevel: number,
): Promise<boolean> => {
  if (accountabilityLevel < 3) return false;

  const sinceIso = new Date(Date.now() - 7 * DAY_MS).toISOString();
  const { data: existing, error: existingError } = await adminClient
    .from("rh_coaching_recommendations")
    .select("id")
    .eq("user_id", userId)
    .eq("theme", "communication_habits")
    .eq("recommendation_type", "module")
    .gte("delivered_at", sinceIso)
    .limit(1);

  if (existingError) {
    console.warn("Failed to check existing communication module recommendation", existingError);
    return false;
  }

  if (Array.isArray(existing) && existing.length > 0) {
    return false;
  }

  const { error: insertError } = await adminClient
    .from("rh_coaching_recommendations")
    .insert({
      user_id: userId,
      trigger_source: `first_message_safety_level_${accountabilityLevel}`,
      theme: "communication_habits",
      recommendation_type: "module",
      content_json: COMMUNICATION_MODULE_CONTENT,
      delivered_at: new Date().toISOString(),
    });

  if (insertError) {
    console.warn("Failed to insert communication module recommendation", insertError);
    return false;
  }

  return true;
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
        "or { sender_app_user_id, recipient_app_user_id, content, is_first_message?, conversation_id?, sender_email?, recipient_email?, dry_run? }",
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
    const inlineIsFirstMessage = payload.is_first_message !== false;

    if (dryRun) {
      const decision = evaluateFirstMessage(payload.content, inlineIsFirstMessage);
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
        is_first_message: inlineIsFirstMessage,
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
      is_first_message: inlineIsFirstMessage,
    };
  }

  if (!message) {
    return jsonResponse(500, { error: "Moderation pipeline did not resolve a message" });
  }

  const nowMs = Date.now();
  let priorEnforcementEvents: ParsedEnforcementEvent[] = [];
  try {
    priorEnforcementEvents = await fetchPriorEnforcementEvents(
      adminClient,
      message.sender_id,
      nowMs,
    );
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to load sender accountability history",
      details: error instanceof Error ? error.message : "unknown error",
    });
  }

  const baseDecision = evaluateFirstMessage(message.content, message.is_first_message);
  const accountability = buildAccountabilityDecision(
    baseDecision,
    priorEnforcementEvents,
    nowMs,
    message.is_first_message,
  );
  const finalDecision = accountability.decision;

  if (dryRun) {
    return jsonResponse(200, {
      message_id: message.id,
      dry_run: true,
      labels: finalDecision.labels,
      confidence: finalDecision.confidence,
      recommended_action: finalDecision.recommended_action,
      message_status: finalDecision.message_status,
      blocked_reason: finalDecision.blocked_reason,
      rewrite_prompt: finalDecision.rewrite_prompt,
      user_feedback: finalDecision.user_feedback,
      escalate: finalDecision.escalate,
      accountability_level: accountability.accountabilityLevel,
      lock_scope: accountability.lockScope,
      lock_until: accountability.lockUntil,
      behavior_score: accountability.behaviorScore,
      behavior_points_added: accountability.behaviorPointsAdded,
      reset_message: accountability.resetMessage,
    });
  }

  const { error: updateMessageError } = await adminClient
    .from("rh_messages")
    .update({ status: finalDecision.message_status })
    .eq("id", message.id);

  if (updateMessageError) {
    return jsonResponse(500, {
      error: "Failed to update message status",
      details: updateMessageError.message,
    });
  }

  if (accountability.violationEvent) {
    const { strikeDelta, riskDelta } = riskAdjustments(finalDecision.recommended_action);
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
  }

  const coachingRecommendationDelivered = await maybeDeliverCommunicationModule(
    adminClient,
    message.sender_id,
    accountability.accountabilityLevel,
  );

  const outputSnapshot = {
    labels: finalDecision.labels,
    confidence: finalDecision.confidence,
    recommended_action: finalDecision.recommended_action,
    message_status: finalDecision.message_status,
    blocked_reason: finalDecision.blocked_reason,
    rewrite_prompt: finalDecision.rewrite_prompt,
    user_feedback: finalDecision.user_feedback,
    escalate: finalDecision.escalate,
    accountability_level: accountability.accountabilityLevel,
    lock_scope: accountability.lockScope,
    lock_until: accountability.lockUntil,
    behavior_score: accountability.behaviorScore,
    behavior_points_added: accountability.behaviorPointsAdded,
    blocked_events_24h: accountability.blockedEvents24h,
    blocked_events_48h: accountability.blockedEvents48h,
    reset_message: accountability.resetMessage,
    coaching_recommendation_delivered: coachingRecommendationDelivered,
    violation_event: accountability.violationEvent,
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
      confidence: finalDecision.confidence,
      applied_action: finalDecision.recommended_action,
      escalated: finalDecision.escalate,
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
  if (finalDecision.escalate && finalDecision.severity_for_case) {
    const { data: caseRow, error: caseError } = await adminClient
      .from("rh_moderation_cases")
      .insert({
        source: "message",
        source_id: message.id,
        severity: finalDecision.severity_for_case,
        summary: `First-message escalation triggered. Labels: ${finalDecision.labels.join(", ")}`,
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
    support_email: SUPPORT_EMAIL,
  });
});
