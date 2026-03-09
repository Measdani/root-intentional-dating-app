import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ReportTargetType = "message" | "profile" | "photo" | "behavior" | "other";

type ReportIntakeRequest = {
  reporter_app_user_id: string;
  reported_app_user_id: string;
  reason_selected: string;
  free_text: string;
  target_type?: ReportTargetType;
  target_id?: string | null;
  reporter_email?: string | null;
  reported_email?: string | null;
  dry_run?: boolean;
};

type RhUserRow = {
  id: string;
};

type RhReportRow = {
  id: string;
  reason_selected: string;
  free_text: string;
  status: "new" | "triaged" | "urgent_review" | "closed";
  created_at: string;
};

type RhModerationCaseRow = {
  id: string;
};

type IntakeDecision = {
  normalized_category:
    | "harassment"
    | "sexual_misconduct_explicit_behavior"
    | "scam_money_request"
    | "fake_account_impersonation"
    | "hate_discriminatory_conduct"
    | "off_platform_pressure"
    | "threats_intimidation"
    | "stalking_repeated_unwanted_contact"
    | "profile_misrepresentation"
    | "minor_safety"
    | "other_unclear";
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  evidence_excerpts: string[];
  urgency_recommendation: "normal_queue" | "urgent_queue" | "immediate_review";
  recommended_action:
    | "triage_and_queue"
    | "urgent_review"
    | "link_to_existing_case"
    | "auto-request-more-info"
    | "escalate_immediately";
  report_status: "triaged" | "urgent_review";
  duplicate_report_id: string | null;
  duplicate_case_id: string | null;
  escalate: boolean;
  confidence: number;
  labels: string[];
};

const AGENT_NAME = "report_intake";
const RULE_VERSION = "ri-rules-2026-03-09";
const MODEL_VERSION = "deterministic-rule-engine-v1";

const TARGET_TYPES: ReportTargetType[] = ["message", "profile", "photo", "behavior", "other"];
const REASON_CHOICES = new Set([
  "harassment",
  "inappropriate-content",
  "fake-profile",
  "spam",
  "safety-concern",
  "hateful-conduct",
  "underage",
  "other",
]);

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

const isValidTargetType = (value: unknown): boolean =>
  value === undefined || (typeof value === "string" && TARGET_TYPES.includes(value as ReportTargetType));

const isValidTargetId = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string";

const isValidEmailField = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string";

const isReportIntakeRequest = (value: unknown): value is ReportIntakeRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ReportIntakeRequest>;

  return (
    isNonEmptyString(payload.reporter_app_user_id) &&
    isNonEmptyString(payload.reported_app_user_id) &&
    isNonEmptyString(payload.reason_selected) &&
    typeof payload.free_text === "string" &&
    isValidTargetType(payload.target_type) &&
    isValidTargetId(payload.target_id) &&
    isValidEmailField(payload.reporter_email) &&
    isValidEmailField(payload.reported_email) &&
    isBooleanOrUndefined(payload.dry_run)
  );
};

const normalizeOptionalEmail = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const textIncludesAny = (value: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

const THREAT_PATTERNS = [
  /\b(i('| a)?ll|i will)\s+(find|hurt|kill)\s+you\b/i,
  /\bi know where you live\b/i,
  /\bwatch your back\b/i,
  /\byou'll regret this\b/i,
];

const BLACKMAIL_PATTERNS = [
  /\bblackmail\b/i,
  /\bextort\b/i,
  /\bleak\b.{0,20}\b(photo|message|pics)\b/i,
  /\bsend this to your family\b/i,
];

const MINOR_PATTERNS = [
  /\bund(er)?age\b/i,
  /\bminor\b/i,
  /\bi'?m\s+1[0-7]\b/i,
];

const STALKING_PATTERNS = [
  /\bstalk(ing|ed)?\b/i,
  /\bfollow(ing|ed)? me\b/i,
  /\bkeeps contacting me\b/i,
  /\bwon't leave me alone\b/i,
  /\brepeated unwanted\b/i,
];

const VIOLENCE_PATTERNS = [
  /\bviolence\b/i,
  /\bweapon\b/i,
  /\bkill\b/i,
  /\bassault\b/i,
];

const SCAM_MONEY_PATTERNS = [
  /\bcashapp\b/i,
  /\bvenmo\b/i,
  /\bzelle\b/i,
  /\bpaypal\b/i,
  /\bgift card\b/i,
  /\bwire transfer\b/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\basked for money\b/i,
  /\bloan\b/i,
];

const SEXUAL_PATTERNS = [
  /\bnude(s)?\b/i,
  /\bsex(y|ual)?\b/i,
  /\bhorny\b/i,
  /\bexplicit\b/i,
];

const HATE_PATTERNS = [
  /\bhate\b.{0,20}\b(black|white|asian|latino|gay|lesbian|trans)\b/i,
  /\bslur\b/i,
  /\bracist\b/i,
  /\bhomophobic\b/i,
  /\btransphobic\b/i,
];

const OFF_PLATFORM_PATTERNS = [
  /\bwhatsapp\b/i,
  /\btelegram\b/i,
  /\bsnap(chat)?\b/i,
  /\binstagram\b/i,
  /\btext me\b/i,
  /\bgive me your number\b/i,
];

const HARASSMENT_PATTERNS = [
  /\bharass(ment)?\b/i,
  /\binsult\b/i,
  /\bdegrading\b/i,
  /\babusive\b/i,
  /\bbullying\b/i,
];

const reasonToCategory = (reason: string): IntakeDecision["normalized_category"] => {
  switch (reason) {
    case "harassment":
      return "harassment";
    case "inappropriate-content":
      return "sexual_misconduct_explicit_behavior";
    case "fake-profile":
      return "fake_account_impersonation";
    case "spam":
      return "scam_money_request";
    case "safety-concern":
      return "threats_intimidation";
    case "hateful-conduct":
      return "hate_discriminatory_conduct";
    case "underage":
      return "minor_safety";
    default:
      return "other_unclear";
  }
};

const reasonToSeverity = (reason: string): IntakeDecision["severity"] => {
  switch (reason) {
    case "underage":
    case "safety-concern":
      return "critical";
    case "harassment":
    case "hateful-conduct":
      return "high";
    case "inappropriate-content":
    case "fake-profile":
    case "spam":
      return "medium";
    default:
      return "low";
  }
};

const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

const extractEvidenceExcerpts = (freeText: string): string[] => {
  const sentencePool = splitSentences(freeText);
  if (sentencePool.length === 0) return [];

  const keywordPatterns = [
    ...THREAT_PATTERNS,
    ...BLACKMAIL_PATTERNS,
    ...MINOR_PATTERNS,
    ...STALKING_PATTERNS,
    ...VIOLENCE_PATTERNS,
    ...SCAM_MONEY_PATTERNS,
    ...OFF_PLATFORM_PATTERNS,
    ...HARASSMENT_PATTERNS,
    ...HATE_PATTERNS,
    ...SEXUAL_PATTERNS,
  ];

  const evidence: string[] = [];
  for (const sentence of sentencePool) {
    if (textIncludesAny(sentence, keywordPatterns)) {
      evidence.push(sentence.slice(0, 220));
    }
    if (evidence.length >= 3) break;
  }

  if (evidence.length > 0) {
    return evidence;
  }
  return sentencePool.slice(0, 2).map((sentence) => sentence.slice(0, 220));
};

const confidenceFromSeverity = (severity: IntakeDecision["severity"], base = 0.82): number => {
  if (severity === "critical") return 0.97;
  if (severity === "high") return 0.9;
  if (severity === "medium") return Math.max(base, 0.84);
  return base;
};

const classifyReport = (
  reasonSelectedRaw: string,
  freeTextRaw: string,
  recentReports: RhReportRow[],
  duplicateCaseId: string | null,
): IntakeDecision => {
  const reasonSelected = reasonSelectedRaw.trim().toLowerCase();
  const freeText = freeTextRaw.trim();
  const text = freeText.toLowerCase();
  const labels: string[] = [];

  let normalizedCategory = reasonToCategory(reasonSelected);
  let severity = reasonToSeverity(reasonSelected);

  const hasThreat = textIncludesAny(text, THREAT_PATTERNS) || textIncludesAny(text, BLACKMAIL_PATTERNS);
  const hasMinor = textIncludesAny(text, MINOR_PATTERNS) || reasonSelected === "underage";
  const hasStalking = textIncludesAny(text, STALKING_PATTERNS);
  const hasViolence = textIncludesAny(text, VIOLENCE_PATTERNS);
  const hasScamMoney = textIncludesAny(text, SCAM_MONEY_PATTERNS) || reasonSelected === "spam";
  const hasSexual = textIncludesAny(text, SEXUAL_PATTERNS) || reasonSelected === "inappropriate-content";
  const hasHate = textIncludesAny(text, HATE_PATTERNS) || reasonSelected === "hateful-conduct";
  const hasOffPlatform = textIncludesAny(text, OFF_PLATFORM_PATTERNS);
  const hasHarassment = textIncludesAny(text, HARASSMENT_PATTERNS) || reasonSelected === "harassment";
  const shortDetails = freeText.length < 30;

  if (hasThreat) labels.push("threats_intimidation");
  if (hasMinor) labels.push("minor_safety");
  if (hasStalking) labels.push("stalking_repeated_unwanted_contact");
  if (hasViolence) labels.push("violence_concern");
  if (hasScamMoney) labels.push("scam_money_request");
  if (hasSexual) labels.push("sexual_misconduct_explicit_behavior");
  if (hasHate) labels.push("hate_discriminatory_conduct");
  if (hasOffPlatform) labels.push("off_platform_pressure");
  if (hasHarassment) labels.push("harassment");
  if (shortDetails) labels.push("limited_detail");

  if (hasMinor) normalizedCategory = "minor_safety";
  else if (hasThreat || hasViolence) normalizedCategory = "threats_intimidation";
  else if (hasStalking) normalizedCategory = "stalking_repeated_unwanted_contact";
  else if (hasScamMoney) normalizedCategory = "scam_money_request";
  else if (hasSexual) normalizedCategory = "sexual_misconduct_explicit_behavior";
  else if (hasHate) normalizedCategory = "hate_discriminatory_conduct";
  else if (hasOffPlatform) normalizedCategory = "off_platform_pressure";
  else if (hasHarassment) normalizedCategory = "harassment";

  const recentSameCategory = recentReports.filter((report) => {
    const sameReason = report.reason_selected.toLowerCase() === reasonSelected;
    const sameKeywordFamily = normalizedCategory === "scam_money_request" &&
      textIncludesAny(report.free_text.toLowerCase(), SCAM_MONEY_PATTERNS);
    return sameReason || sameKeywordFamily;
  });
  const repeatedScamPattern = normalizedCategory === "scam_money_request" && recentSameCategory.length >= 2;
  const repeatPattern = recentReports.length >= 3;

  if (repeatedScamPattern) labels.push("repeated_scam_pattern");
  if (repeatPattern) labels.push("repeat_report_pattern");

  let recommendedAction: IntakeDecision["recommended_action"] = "triage_and_queue";
  let urgencyRecommendation: IntakeDecision["urgency_recommendation"] = "normal_queue";
  let reportStatus: IntakeDecision["report_status"] = "triaged";
  let escalate = false;

  if (hasMinor || hasThreat || hasStalking || hasViolence || repeatedScamPattern) {
    severity = "critical";
    recommendedAction = "escalate_immediately";
    urgencyRecommendation = "immediate_review";
    reportStatus = "urgent_review";
    escalate = true;
  } else if (hasScamMoney || hasSexual || hasHate || severity === "high") {
    severity = "high";
    recommendedAction = "urgent_review";
    urgencyRecommendation = "urgent_queue";
    reportStatus = "urgent_review";
  } else if (shortDetails) {
    severity = severity === "critical" ? "critical" : "low";
    recommendedAction = "auto-request-more-info";
    urgencyRecommendation = "normal_queue";
    reportStatus = "triaged";
  }

  if (repeatPattern && severity === "medium") {
    severity = "high";
    recommendedAction = "urgent_review";
    urgencyRecommendation = "urgent_queue";
    reportStatus = "urgent_review";
  }

  const duplicateReportId = recentReports[0]?.id ?? null;
  if (
    duplicateCaseId &&
    recommendedAction !== "escalate_immediately" &&
    recommendedAction !== "urgent_review"
  ) {
    recommendedAction = "link_to_existing_case";
  }

  const evidenceExcerpts = extractEvidenceExcerpts(freeText);
  const summaryParts = [
    `Reporter selected "${reasonSelected || "other"}".`,
    `Normalized category: ${normalizedCategory.replaceAll("_", " ")}.`,
  ];

  if (evidenceExcerpts.length > 0) {
    summaryParts.push(`Evidence indicates: "${evidenceExcerpts[0]}".`);
  } else if (freeText.length > 0) {
    summaryParts.push(`Reporter notes: "${freeText.slice(0, 180)}".`);
  } else {
    summaryParts.push("No additional free-text details were provided.");
  }

  if (repeatedScamPattern) {
    summaryParts.push("Pattern alert: repeated scam signals detected across recent reports.");
  } else if (repeatPattern) {
    summaryParts.push("Pattern alert: repeated reports detected for this account.");
  }

  return {
    normalized_category: normalizedCategory,
    severity,
    summary: summaryParts.join(" "),
    evidence_excerpts: evidenceExcerpts,
    urgency_recommendation: urgencyRecommendation,
    recommended_action: recommendedAction,
    report_status: reportStatus,
    duplicate_report_id: duplicateReportId,
    duplicate_case_id: duplicateCaseId,
    escalate,
    confidence: confidenceFromSeverity(severity),
    labels: labels.length > 0 ? labels : ["other_unclear"],
  };
};

const riskAdjustments = (
  severity: IntakeDecision["severity"],
): { strikeDelta: number; riskDelta: number } => {
  switch (severity) {
    case "critical":
      return { strikeDelta: 1, riskDelta: 10 };
    case "high":
      return { strikeDelta: 1, riskDelta: 6 };
    case "medium":
      return { strikeDelta: 0, riskDelta: 2 };
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

  const { data: inserted, error: insertError } = await adminClient
    .from("rh_users")
    .insert({
      status: "active",
      mode: "alignment",
      app_user_id: appUserId,
      app_user_email: normalizedEmail,
    })
    .select("id")
    .single<RhUserRow>();

  if (!insertError && inserted?.id) {
    return inserted.id;
  }

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

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!isReportIntakeRequest(rawPayload)) {
    return jsonResponse(400, {
      error:
        "Invalid payload. Expected { reporter_app_user_id, reported_app_user_id, reason_selected, free_text, target_type?, target_id?, reporter_email?, reported_email?, dry_run? }",
    });
  }

  const payload = rawPayload as ReportIntakeRequest;
  const reasonSelected = payload.reason_selected.trim().toLowerCase();
  const freeText = payload.free_text.trim();
  const targetType: ReportTargetType = payload.target_type ?? "behavior";
  const targetId = payload.target_id ?? null;

  if (!REASON_CHOICES.has(reasonSelected)) {
    return jsonResponse(400, {
      error:
        "Invalid reason_selected. Expected one of harassment, inappropriate-content, fake-profile, spam, safety-concern, hateful-conduct, underage, other.",
    });
  }

  if (payload.dry_run) {
    const dryDecision = classifyReport(reasonSelected, freeText, [], null);
    return jsonResponse(200, {
      dry_run: true,
      report_id: null,
      event_id: null,
      case_id: null,
      ...dryDecision,
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let reporterRhUserId: string;
  let reportedRhUserId: string;
  try {
    [reporterRhUserId, reportedRhUserId] = await Promise.all([
      ensureRhUserByAppId(adminClient, payload.reporter_app_user_id, payload.reporter_email),
      ensureRhUserByAppId(adminClient, payload.reported_app_user_id, payload.reported_email),
    ]);
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to resolve report users",
      details: error instanceof Error ? error.message : "unknown error",
    });
  }

  const fourteenDaysAgoIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentReports, error: recentReportsError } = await adminClient
    .from("rh_reports")
    .select("id, reason_selected, free_text, status, created_at")
    .eq("reported_user_id", reportedRhUserId)
    .gte("created_at", fourteenDaysAgoIso)
    .order("created_at", { ascending: false })
    .limit(25);

  if (recentReportsError) {
    return jsonResponse(500, {
      error: "Failed to load recent reports for duplicate detection",
      details: recentReportsError.message,
    });
  }

  const recentRhReports = (recentReports ?? []) as RhReportRow[];
  const { data: openCase, error: openCaseError } = await adminClient
    .from("rh_moderation_cases")
    .select("id")
    .eq("source", "report")
    .in("status", ["open", "in_review"])
    .ilike("summary", `%reported_user_id:${reportedRhUserId}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<RhModerationCaseRow>();

  if (openCaseError) {
    return jsonResponse(500, {
      error: "Failed to load duplicate-case context",
      details: openCaseError.message,
    });
  }

  const decision = classifyReport(reasonSelected, freeText, recentRhReports, openCase?.id ?? null);

  const { data: insertedReport, error: insertReportError } = await adminClient
    .from("rh_reports")
    .insert({
      reporter_id: reporterRhUserId,
      reported_user_id: reportedRhUserId,
      target_type: targetType,
      target_id: targetId,
      reason_selected: reasonSelected,
      free_text: freeText,
      status: decision.report_status,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertReportError || !insertedReport?.id) {
    return jsonResponse(500, {
      error: "Failed to create report",
      details: insertReportError?.message ?? "unknown error",
    });
  }

  const reportId = insertedReport.id;

  const { strikeDelta, riskDelta } = riskAdjustments(decision.severity);
  if (strikeDelta > 0 || riskDelta > 0) {
    const { data: riskRow, error: riskRowError } = await adminClient
      .from("rh_users")
      .select("id, strike_count, risk_score")
      .eq("id", reportedRhUserId)
      .maybeSingle<{ id: string; strike_count: number; risk_score: number }>();

    if (!riskRowError && riskRow) {
      const nextRisk = Math.min(100, Math.max(0, Number(riskRow.risk_score) + riskDelta));
      const nextStrikeCount = Math.max(0, Number(riskRow.strike_count) + strikeDelta);
      await adminClient
        .from("rh_users")
        .update({
          risk_score: nextRisk,
          strike_count: nextStrikeCount,
        })
        .eq("id", riskRow.id);
    }
  }

  const inputSnapshot = {
    reporter_app_user_id: payload.reporter_app_user_id,
    reported_app_user_id: payload.reported_app_user_id,
    reporter_email: normalizeOptionalEmail(payload.reporter_email),
    reported_email: normalizeOptionalEmail(payload.reported_email),
    reason_selected: reasonSelected,
    free_text: freeText,
    target_type: targetType,
    target_id: targetId,
    recent_report_count_14d: recentRhReports.length,
    open_case_id: openCase?.id ?? null,
  };

  const outputSnapshot = {
    normalized_category: decision.normalized_category,
    severity: decision.severity,
    summary: decision.summary,
    evidence_excerpts: decision.evidence_excerpts,
    urgency_recommendation: decision.urgency_recommendation,
    recommended_action: decision.recommended_action,
    report_status: decision.report_status,
    duplicate_report_id: decision.duplicate_report_id,
    duplicate_case_id: decision.duplicate_case_id,
    confidence: decision.confidence,
    labels: decision.labels,
    escalate: decision.escalate,
  };

  const { data: eventRow, error: eventError } = await adminClient
    .from("rh_agent_events")
    .insert({
      agent_name: AGENT_NAME,
      event_type: "report_created",
      target_type: "report",
      target_id: reportId,
      actor_user_id: reporterRhUserId,
      related_user_id: reportedRhUserId,
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

  if (eventError || !eventRow?.id) {
    return jsonResponse(500, {
      error: "Failed to write agent event",
      details: eventError?.message ?? "unknown error",
    });
  }

  let caseId: string | null = null;
  const shouldCreateCase =
    decision.recommended_action === "escalate_immediately" ||
    decision.recommended_action === "urgent_review" ||
    (decision.recommended_action === "triage_and_queue" && decision.severity === "high");

  if (shouldCreateCase && !decision.duplicate_case_id) {
    const { data: caseRow, error: caseError } = await adminClient
      .from("rh_moderation_cases")
      .insert({
        source: "report",
        source_id: reportId,
        severity: decision.severity,
        summary: `${decision.summary} reported_user_id:${reportedRhUserId}`,
        status: "open",
      })
      .select("id")
      .single<{ id: string }>();

    if (caseError || !caseRow?.id) {
      return jsonResponse(500, {
        error: "Failed to create moderation case",
        details: caseError?.message ?? "unknown error",
      });
    }
    caseId = caseRow.id;
  } else if (decision.duplicate_case_id) {
    caseId = decision.duplicate_case_id;
  }

  return jsonResponse(200, {
    report_id: reportId,
    event_id: eventRow.id,
    case_id: caseId,
    ...outputSnapshot,
  });
});
