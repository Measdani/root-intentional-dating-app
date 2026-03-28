import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ProfileQualityRequest = {
  app_user_id: string;
  app_user_email?: string | null;
  bio?: string | null;
  prompts_json?: Record<string, unknown> | null;
  account_age_days?: number;
  prior_profile_moderation_actions?: number;
  user_mode?: string;
  dry_run?: boolean;
};

type RhUserRow = {
  id: string;
};

type RhProfileRow = {
  id: string;
};

type ProfileDecision = {
  labels: string[];
  quality_score: number;
  safety_score: number;
  confidence: number;
  recommended_action:
    | "approve"
    | "approve_with_improvement_suggestions"
    | "needs_edits"
    | "reject"
    | "escalate_to_review";
  profile_status: "approved" | "needs_edits" | "rejected" | "flagged";
  blocked_reason: string | null;
  user_feedback: string | null;
  improvement_notes: string[];
  escalate: boolean;
  severity_for_case: "low" | "medium" | "high" | "critical" | null;
};

const AGENT_NAME = "profile_quality";
const RULE_VERSION = "pq-rules-2026-03-28-lite";
const MODEL_VERSION = "deterministic-rule-engine-v1";
const SUPPORT_EMAIL = "support@rootedhearts.net";
const MIN_BIO_CHAR_COUNT = 20;

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

const isNumberOrUndefined = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const isObjectOrUndefined = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "object" && !Array.isArray(value));

const isProfileQualityRequest = (value: unknown): value is ProfileQualityRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProfileQualityRequest>;
  const validEmail = payload.app_user_email === undefined || payload.app_user_email === null || typeof payload.app_user_email === "string";
  const validBio = payload.bio === undefined || payload.bio === null || typeof payload.bio === "string";
  const validMode = payload.user_mode === undefined || typeof payload.user_mode === "string";

  return (
    isNonEmptyString(payload.app_user_id) &&
    validEmail &&
    validBio &&
    validMode &&
    isObjectOrUndefined(payload.prompts_json) &&
    isNumberOrUndefined(payload.account_age_days) &&
    isNumberOrUndefined(payload.prior_profile_moderation_actions) &&
    isBooleanOrUndefined(payload.dry_run)
  );
};

const normalizeOptionalEmail = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const LOW_EFFORT_PATTERNS = [
  /^\s*(ask me|just ask|idk|later)\s*[.!?]*\s*$/i,
  /^\s*(hi|hey|hello)\s*[.!?]*\s*$/i,
];
const BIO_WORD_PATTERN = /[a-z]+(?:['-][a-z]+)*/gi;
const LONG_CONSONANT_CLUSTER_PATTERN = /[bcdfghjklmnpqrstvwxyz]{5,}/i;
const REPEATED_CHARACTER_PATTERN = /(.)\1{3,}/i;

const SEXUAL_PATTERNS = [
  /\bnudes?\b/i,
  /\bsex(y|ual)?\b/i,
  /\bhook[\s-]?up\b/i,
  /\bfwb\b/i,
  /\bno strings attached\b/i,
  /\bnsfw\b/i,
  /\bonlyfans\b/i,
];

const AGGRESSIVE_PATTERNS = [
  /\bbitch\b/i,
  /\bslut\b/i,
  /\bwhore\b/i,
  /\bstupid\b/i,
  /\bidiot\b/i,
  /\bno drama\b/i,
  /\bdon't waste my time\b/i,
];

const DISCRIMINATORY_PATTERNS = [
  /\bno (black|white|asian|latino|muslim|christian|gay|lesbian|trans)\b/i,
  /\bi hate (black|white|asian|latino|muslim|christian|gay|lesbian|trans)\b/i,
];

const SCAM_PATTERNS = [
  /\bcashapp\b/i,
  /\bvenmo\b/i,
  /\bzelle\b/i,
  /\bpaypal\b/i,
  /\bgift card\b/i,
  /\bwire transfer\b/i,
  /\bcrypto\b/i,
  /\bbitcoin\b/i,
  /\bsugar (daddy|baby)\b/i,
  /\bhelp me with\b.{0,20}\bmoney\b/i,
];

const EXTERNAL_CONTACT_PATTERNS = [
  /\bwhatsapp\b/i,
  /\btelegram\b/i,
  /\bsnap(chat)?\b/i,
  /\binstagram\b/i,
  /\btext me\b/i,
  /\bcall me\b/i,
  /\bwhat'?s your number\b/i,
];

const IDENTITY_SUSPICIOUS_PATTERNS = [
  /\bi am (a )?(celebrity|famous|public figure)\b/i,
  /\bnot my photos\b/i,
  /\busing my friend'?s pics\b/i,
  /\bcatfish\b/i,
  /\bimpersonat(e|ing)\b/i,
];

const INTENTIONALITY_PATTERNS = [
  /\bintentional\b/i,
  /\bmarriage\b/i,
  /\blong[- ]term\b/i,
  /\bpartnership\b/i,
  /\bcommitment\b/i,
  /\bhealthy relationship\b/i,
  /\bready\b/i,
];

const matchesAny = (value: string, patterns: RegExp[]) => patterns.some((pattern) => pattern.test(value));

const getBioWords = (value: string): string[] =>
  value.match(BIO_WORD_PATTERN)?.map((word) => word.toLowerCase()) ?? [];

const countVowels = (value: string): number =>
  (value.match(/[aeiouy]/gi) ?? []).length;

const isSuspiciousBioWord = (word: string): boolean => {
  if (word.length < 8) return false;

  const vowelRatio = countVowels(word) / word.length;
  const hasLongConsonantCluster = LONG_CONSONANT_CLUSTER_PATTERN.test(word);
  const hasRepeatedCharacters = REPEATED_CHARACTER_PATTERN.test(word);

  return (
    hasRepeatedCharacters ||
    (word.length >= 10 && hasLongConsonantCluster) ||
    (word.length >= 12 && (vowelRatio < 0.22 || vowelRatio > 0.8))
  );
};

const looksLikeKeyboardSmash = (value: string): boolean => {
  const words = getBioWords(value);
  if (words.length === 0) return false;

  const suspiciousWords = words.filter(isSuspiciousBioWord);
  if (suspiciousWords.length === 0) return false;

  const alphaCharacters = value.replace(/[^a-z]/gi, "");
  const suspiciousCharacterCount = suspiciousWords.reduce(
    (total, word) => total + word.length,
    0,
  );
  const suspiciousCharacterShare = alphaCharacters.length > 0
    ? suspiciousCharacterCount / alphaCharacters.length
    : 0;

  return suspiciousWords.length >= 2 || suspiciousCharacterShare >= 0.45;
};

const flattenPromptValue = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenPromptValue(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => flattenPromptValue(item));
  }
  return [];
};

const buildPromptSnippets = (promptsJson: Record<string, unknown> | null | undefined): string[] => {
  if (!promptsJson) return [];
  return Object.entries(promptsJson)
    .flatMap(([key, rawValue]) => {
      const values = flattenPromptValue(rawValue);
      if (values.length === 0) return [];
      return [`${key}: ${values.join(", ")}`];
    });
};

const evaluateProfile = (bio: string, promptsJson: Record<string, unknown> | null | undefined): ProfileDecision => {
  const safeBio = bio.trim();
  const bioWords = getBioWords(safeBio);
  const promptSnippets = buildPromptSnippets(promptsJson);
  const promptText = promptSnippets.join(" ");
  const combinedText = [safeBio, promptText].filter(Boolean).join("\n");
  const labels: string[] = [];
  const improvementNotes: string[] = [];

  const hasSexual = matchesAny(combinedText, SEXUAL_PATTERNS);
  const hasAggressive = matchesAny(combinedText, AGGRESSIVE_PATTERNS);
  const hasDiscriminatory = matchesAny(combinedText, DISCRIMINATORY_PATTERNS);
  const hasScam = matchesAny(combinedText, SCAM_PATTERNS);
  const hasExternalContact = matchesAny(combinedText, EXTERNAL_CONTACT_PATTERNS);
  const hasSuspiciousIdentity = matchesAny(combinedText, IDENTITY_SUSPICIOUS_PATTERNS);
  const hasIntentSignals = matchesAny(combinedText, INTENTIONALITY_PATTERNS);

  const hasMissingRequiredBio = safeBio.length === 0;
  const hasTooShortBio = safeBio.length > 0 && safeBio.length < MIN_BIO_CHAR_COUNT;
  const hasNoRealBioWords = safeBio.length > 0 && bioWords.length === 0;
  const hasGibberishBio = safeBio.length > 0 && looksLikeKeyboardSmash(safeBio);
  const isLowEffortBio = safeBio.length > 0 && LOW_EFFORT_PATTERNS.some((pattern) => pattern.test(safeBio));
  const needsBasicEdits =
    hasMissingRequiredBio ||
    hasTooShortBio ||
    hasNoRealBioWords ||
    hasGibberishBio;

  if (hasSexual) labels.push("sexual_explicit");
  if (hasAggressive) labels.push("aggressive_disrespectful");
  if (hasDiscriminatory) labels.push("discriminatory_exclusionary_harm");
  if (hasScam) labels.push("scam_like_solicitation");
  if (hasExternalContact) labels.push("external_contact_pushing");
  if (hasSuspiciousIdentity) labels.push("suspicious_identity_claim");
  if (hasMissingRequiredBio) labels.push("bio_required");
  if (hasTooShortBio) labels.push("bio_too_short");
  if (hasNoRealBioWords) labels.push("bio_needs_real_words");
  if (isLowEffortBio) labels.push("low_effort");
  if (hasGibberishBio) labels.push("gibberish_or_random_text");
  if (labels.length === 0) labels.push("clean_acceptable");

  if (hasMissingRequiredBio) {
    improvementNotes.push("Add an About You section before submitting your profile.");
  }
  if (hasTooShortBio) {
    improvementNotes.push("Add a little more detail to About You before submitting your profile.");
  }
  if (!hasIntentSignals) {
    improvementNotes.push("Add one clear sentence about your relationship intentions.");
  }
  if (isLowEffortBio) {
    improvementNotes.push("Avoid generic lines like 'just ask' and include something concrete from your life.");
  }
  if (hasNoRealBioWords || hasGibberishBio) {
    improvementNotes.push("Replace random letters or keyboard-smash text with real words and clear sentences.");
  }
  if (hasExternalContact) {
    improvementNotes.push("Remove requests to move off-platform and keep early connection inside the app.");
  }

  let clarity = 100;
  let effort = 100;
  let warmthRespect = 100;
  let intentionality = hasIntentSignals ? 90 : 75;
  let authenticity = 100;
  let safetyScore = 100;

  if (hasMissingRequiredBio) {
    clarity -= 35;
    effort -= 35;
    intentionality -= 20;
  }
  if (hasTooShortBio) {
    clarity -= 20;
    effort -= 20;
  }
  if (hasNoRealBioWords) {
    clarity -= 35;
    authenticity -= 35;
  }
  if (hasGibberishBio) {
    clarity -= 45;
    effort -= 40;
    authenticity -= 35;
  }
  if (isLowEffortBio) effort -= 15;

  if (hasAggressive) warmthRespect -= 50;
  if (hasDiscriminatory) warmthRespect -= 60;
  if (hasSexual) warmthRespect -= 40;

  if (hasScam) authenticity -= 60;
  if (hasSuspiciousIdentity) authenticity -= 45;
  if (hasExternalContact) authenticity -= 20;

  if (hasSexual) safetyScore -= 40;
  if (hasAggressive) safetyScore -= 35;
  if (hasDiscriminatory) safetyScore -= 50;
  if (hasScam) safetyScore -= 45;
  if (hasSuspiciousIdentity) safetyScore -= 25;
  if (hasExternalContact) safetyScore -= 20;

  const qualityScore = clampScore(
    (clarity * 0.25) +
      (effort * 0.25) +
      (warmthRespect * 0.2) +
      (intentionality * 0.15) +
      (authenticity * 0.15),
  );
  const normalizedSafetyScore = clampScore(safetyScore);

  const hardReject = hasSexual || hasAggressive || hasDiscriminatory || hasScam;
  if (hardReject) {
    return {
      labels,
      quality_score: qualityScore,
      safety_score: normalizedSafetyScore,
      confidence: 0.93,
      recommended_action: "reject",
      profile_status: "rejected",
      blocked_reason: "Profile contains explicit, harmful, or scam-like content.",
      user_feedback:
        "Parts of this profile do not meet our community standards. Please remove explicit, harmful, or disrespectful language before resubmitting.",
      improvement_notes: improvementNotes,
      escalate: false,
      severity_for_case: null,
    };
  }

  if (hasSuspiciousIdentity) {
    return {
      labels: labels.includes("ambiguous_needs_review") ? labels : [...labels, "ambiguous_needs_review"],
      quality_score: qualityScore,
      safety_score: normalizedSafetyScore,
      confidence: 0.82,
      recommended_action: "escalate_to_review",
      profile_status: "flagged",
      blocked_reason: "Profile requires additional verification review.",
      user_feedback: `This profile needs additional review before it can go live. If you need help, contact ${SUPPORT_EMAIL}.`,
      improvement_notes: improvementNotes,
      escalate: true,
      severity_for_case: "high",
    };
  }

  if (needsBasicEdits) {
    const userFeedback = hasMissingRequiredBio
      ? "About You is required before your profile can go live. Add a short description in real words."
      : hasNoRealBioWords || hasGibberishBio
      ? "Please replace random letters in About You with real words before submitting again."
      : `About You needs a little more detail before your profile can go live. Add at least ${MIN_BIO_CHAR_COUNT} characters in real words.`;
    return {
      labels,
      quality_score: qualityScore,
      safety_score: normalizedSafetyScore,
      confidence: 0.87,
      recommended_action: "needs_edits",
      profile_status: "needs_edits",
      blocked_reason: "Profile quality needs improvement before publishing.",
      user_feedback: userFeedback,
      improvement_notes: improvementNotes,
      escalate: false,
      severity_for_case: null,
    };
  }

  if (hasExternalContact || isLowEffortBio || !hasIntentSignals || qualityScore < 60) {
    return {
      labels,
      quality_score: qualityScore,
      safety_score: normalizedSafetyScore,
      confidence: 0.8,
      recommended_action: "approve_with_improvement_suggestions",
      profile_status: "approved",
      blocked_reason: null,
      user_feedback: null,
      improvement_notes: improvementNotes,
      escalate: false,
      severity_for_case: null,
    };
  }

  return {
    labels,
    quality_score: qualityScore,
    safety_score: normalizedSafetyScore,
    confidence: 0.89,
    recommended_action: "approve",
    profile_status: "approved",
    blocked_reason: null,
    user_feedback: null,
    improvement_notes: [],
    escalate: false,
    severity_for_case: null,
  };
};

const riskAdjustments = (
  action: ProfileDecision["recommended_action"],
): { strikeDelta: number; riskDelta: number } => {
  switch (action) {
    case "reject":
      return { strikeDelta: 1, riskDelta: 6 };
    case "escalate_to_review":
      return { strikeDelta: 1, riskDelta: 12 };
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

  if (!isProfileQualityRequest(rawPayload)) {
    return jsonResponse(400, {
      error:
        "Invalid payload. Expected { app_user_id, app_user_email?, bio?, prompts_json?, account_age_days?, prior_profile_moderation_actions?, user_mode?, dry_run? }",
    });
  }

  const payload = rawPayload as ProfileQualityRequest;
  const bio = typeof payload.bio === "string" ? payload.bio : "";
  const promptsJson = payload.prompts_json && typeof payload.prompts_json === "object"
    ? payload.prompts_json
    : {};

  const decision = evaluateProfile(bio, promptsJson);

  if (payload.dry_run) {
    return jsonResponse(200, {
      dry_run: true,
      profile_id: null,
      event_id: null,
      case_id: null,
      ...decision,
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let rhUserId: string;
  try {
    rhUserId = await ensureRhUserByAppId(adminClient, payload.app_user_id, payload.app_user_email);
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to resolve profile user",
      details: error instanceof Error ? error.message : "unknown error",
    });
  }

  const { data: latestProfile, error: latestProfileError } = await adminClient
    .from("rh_profiles")
    .select("id")
    .eq("user_id", rhUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<RhProfileRow>();

  if (latestProfileError) {
    return jsonResponse(500, {
      error: "Failed to query profile for moderation",
      details: latestProfileError.message,
    });
  }

  let profileId = latestProfile?.id ?? null;
  if (profileId) {
    const { error: updateProfileError } = await adminClient
      .from("rh_profiles")
      .update({
        bio,
        prompts_json: promptsJson,
        status: decision.profile_status,
        quality_score: decision.quality_score,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    if (updateProfileError) {
      return jsonResponse(500, {
        error: "Failed to update moderated profile",
        details: updateProfileError.message,
      });
    }
  } else {
    const { data: insertedProfile, error: insertProfileError } = await adminClient
      .from("rh_profiles")
      .insert({
        user_id: rhUserId,
        bio,
        prompts_json: promptsJson,
        status: decision.profile_status,
        quality_score: decision.quality_score,
        last_reviewed_at: new Date().toISOString(),
      })
      .select("id")
      .single<RhProfileRow>();

    if (insertProfileError || !insertedProfile?.id) {
      return jsonResponse(500, {
        error: "Failed to create moderated profile",
        details: insertProfileError?.message ?? "unknown error",
      });
    }
    profileId = insertedProfile.id;
  }

  const { strikeDelta, riskDelta } = riskAdjustments(decision.recommended_action);
  if (strikeDelta > 0 || riskDelta > 0) {
    const { data: userRiskRow, error: userRiskError } = await adminClient
      .from("rh_users")
      .select("id, strike_count, risk_score")
      .eq("id", rhUserId)
      .maybeSingle<{ id: string; strike_count: number; risk_score: number }>();

    if (!userRiskError && userRiskRow) {
      const nextRisk = Math.min(100, Math.max(0, Number(userRiskRow.risk_score) + riskDelta));
      const nextStrikeCount = Math.max(0, Number(userRiskRow.strike_count) + strikeDelta);
      await adminClient
        .from("rh_users")
        .update({
          risk_score: nextRisk,
          strike_count: nextStrikeCount,
        })
        .eq("id", userRiskRow.id);
    }
  }

  const inputSnapshot = {
    app_user_id: payload.app_user_id,
    app_user_email: normalizeOptionalEmail(payload.app_user_email),
    bio,
    prompts_json: promptsJson,
    account_age_days: payload.account_age_days ?? null,
    prior_profile_moderation_actions: payload.prior_profile_moderation_actions ?? null,
    user_mode: payload.user_mode ?? null,
  };

  const outputSnapshot = {
    labels: decision.labels,
    quality_score: decision.quality_score,
    safety_score: decision.safety_score,
    confidence: decision.confidence,
    recommended_action: decision.recommended_action,
    profile_status: decision.profile_status,
    blocked_reason: decision.blocked_reason,
    user_feedback: decision.user_feedback,
    improvement_notes: decision.improvement_notes,
    escalate: decision.escalate,
  };

  const { data: eventRow, error: eventError } = await adminClient
    .from("rh_agent_events")
    .insert({
      agent_name: AGENT_NAME,
      event_type: "profile_submitted",
      target_type: "profile",
      target_id: profileId,
      actor_user_id: rhUserId,
      related_user_id: null,
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
      error: "Failed to write profile moderation event",
      details: eventError?.message ?? "unknown error",
    });
  }

  let caseId: string | null = null;
  if (decision.escalate && decision.severity_for_case) {
    const { data: caseRow, error: caseError } = await adminClient
      .from("rh_moderation_cases")
      .insert({
        source: "profile",
        source_id: profileId,
        severity: decision.severity_for_case,
        summary: `Profile escalation triggered. Labels: ${decision.labels.join(", ")}`,
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
  }

  return jsonResponse(200, {
    profile_id: profileId,
    event_id: eventRow.id,
    case_id: caseId,
    ...outputSnapshot,
  });
});
