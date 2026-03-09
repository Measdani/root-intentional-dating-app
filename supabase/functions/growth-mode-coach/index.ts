import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type GrowthCoachAction =
  | "deliver_growth_explanation"
  | "recommend_module_path"
  | "send_reflection_prompt"
  | "send_reengagement_nudge"
  | "send_reassessment_notice"
  | "escalate_user_question_to_support";

type GrowthCoachRequest = {
  app_user_id: string;
  app_user_email?: string | null;
  trigger_source?:
    | "enters_growth_mode"
    | "module_completed"
    | "inactive"
    | "user_requested_guidance"
    | "upcoming_reassessment";
  assessment_summary?: string | null;
  reason_codes?: string[] | null;
  module_progress?: Record<string, unknown> | null;
  prior_recommendation_themes?: string[] | null;
  cooldown_reassessment_date?: string | null;
  user_question?: string | null;
  dry_run?: boolean;
};

type RhUserRow = {
  id: string;
};

const AGENT_NAME = "growth_mode_coach";
const RULE_VERSION = "gmc-rules-2026-03-09";
const MODEL_VERSION = "deterministic-rule-engine-v1";
const SUPPORT_EMAIL = "support@rootedhearts.net";

const REASON_CODE_THEME_MAP: Array<{
  pattern: RegExp;
  theme:
    | "emotional_awareness"
    | "communication_habits"
    | "boundaries"
    | "conflict_patterns"
    | "consistency"
    | "self_reflection"
    | "relationship_readiness_habits"
    | "personal_accountability";
}> = [
  { pattern: /(emotion|regulation|reactive|defensive)/i, theme: "emotional_awareness" },
  { pattern: /(communication|disrespect|tone|message|conversation)/i, theme: "communication_habits" },
  { pattern: /(boundary|pressure|coerc)/i, theme: "boundaries" },
  { pattern: /(conflict|repair|argument|fight)/i, theme: "conflict_patterns" },
  { pattern: /(consisten|follow through|reliable)/i, theme: "consistency" },
  { pattern: /(reflection|self[-_ ]awareness|journ)/i, theme: "self_reflection" },
  { pattern: /(readiness|intentional|alignment|relationship)/i, theme: "relationship_readiness_habits" },
  { pattern: /(accountability|ownership|responsib)/i, theme: "personal_accountability" },
];

const THEME_MODULE_MAP: Record<string, string[]> = {
  emotional_awareness: [
    "Emotional Regulation Foundations",
    "Pause-Before-Response practice",
  ],
  communication_habits: [
    "The Art of Accountability",
    "Respectful Communication mini-guide",
  ],
  boundaries: ["Healthy Boundaries", "Boundary scripts workshop"],
  conflict_patterns: ["Conflict as Connection", "Repair conversation practice"],
  consistency: ["The Art of Accountability", "Follow-through habit planner"],
  self_reflection: ["Building Wholeness", "Daily reflection check-in"],
  relationship_readiness_habits: [
    "Building Wholeness",
    "Relationship readiness habits track",
  ],
  personal_accountability: ["The Art of Accountability", "Ownership reset module"],
};

const THEME_REFLECTION_PROMPT_MAP: Record<string, string> = {
  emotional_awareness:
    "Think about your last difficult conversation. What feeling showed up first, and what would have changed if you paused before replying?",
  communication_habits:
    "Review your last three introductions. Did they feel respectful, specific, and curious, or rushed and generic?",
  boundaries:
    "Where have you recently pushed past someone else's boundary or ignored your own? What respectful boundary language would you use now?",
  conflict_patterns:
    "In your last disagreement, did you prioritize being understood or understanding first? What repair step could you take today?",
  consistency:
    "What is one commitment you made in dating recently that you did not follow through on? How will you close that gap this week?",
  self_reflection:
    "What repeated pattern keeps showing up in your connections, and what personal trigger may be driving it?",
  relationship_readiness_habits:
    "What daily habit would make you more emotionally available and intentional in a relationship over the next 30 days?",
  personal_accountability:
    "Where are you tempted to blame others for an outcome that also involved your own choices?",
};

const THEME_JOURNAL_PROMPT_MAP: Record<string, string> = {
  emotional_awareness:
    "Write about a moment this week when your emotions escalated quickly. What body signal happened first?",
  communication_habits:
    "Journal one message you sent that represented your best communication and one that did not. What was different?",
  boundaries:
    "Journal three boundary statements you can use calmly and clearly in future conversations.",
  conflict_patterns:
    "Describe a conflict pattern you want to break and the first repair action you will practice next time.",
  consistency:
    "List two actions that show reliability in dating and track whether you completed them this week.",
  self_reflection:
    "Name one behavior you want to change and why it matters for the relationship you want to build.",
  relationship_readiness_habits:
    "Write a short readiness plan for the next 14 days that supports emotional availability.",
  personal_accountability:
    "Write about one recent decision you now own fully and what you learned from it.",
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

const isArrayOrUndefined = (value: unknown): boolean =>
  value === undefined || value === null || Array.isArray(value);

const isObjectOrUndefined = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === "object" && !Array.isArray(value));

const isGrowthCoachRequest = (value: unknown): value is GrowthCoachRequest => {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<GrowthCoachRequest>;
  const validEmail =
    payload.app_user_email === undefined ||
    payload.app_user_email === null ||
    typeof payload.app_user_email === "string";
  const validSummary =
    payload.assessment_summary === undefined ||
    payload.assessment_summary === null ||
    typeof payload.assessment_summary === "string";
  const validQuestion =
    payload.user_question === undefined ||
    payload.user_question === null ||
    typeof payload.user_question === "string";
  const validDate =
    payload.cooldown_reassessment_date === undefined ||
    payload.cooldown_reassessment_date === null ||
    typeof payload.cooldown_reassessment_date === "string";
  const validTrigger =
    payload.trigger_source === undefined ||
    payload.trigger_source === "enters_growth_mode" ||
    payload.trigger_source === "module_completed" ||
    payload.trigger_source === "inactive" ||
    payload.trigger_source === "user_requested_guidance" ||
    payload.trigger_source === "upcoming_reassessment";

  return (
    isNonEmptyString(payload.app_user_id) &&
    validEmail &&
    validSummary &&
    validQuestion &&
    validDate &&
    validTrigger &&
    isArrayOrUndefined(payload.reason_codes) &&
    isArrayOrUndefined(payload.prior_recommendation_themes) &&
    isObjectOrUndefined(payload.module_progress) &&
    isBooleanOrUndefined(payload.dry_run)
  );
};

const normalizeOptionalEmail = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0)
    : [];

const chooseTheme = (
  reasonCodes: string[],
  priorThemes: string[],
): keyof typeof THEME_MODULE_MAP => {
  for (const code of reasonCodes) {
    for (const mapping of REASON_CODE_THEME_MAP) {
      if (mapping.pattern.test(code)) {
        return mapping.theme;
      }
    }
  }

  if (priorThemes.length > 0) {
    for (const theme of priorThemes) {
      if (theme in THEME_MODULE_MAP) {
        return theme as keyof typeof THEME_MODULE_MAP;
      }
    }
  }

  return "relationship_readiness_habits";
};

const computeDaysUntilReassessment = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const delta = parsed - Date.now();
  return Math.ceil(delta / (24 * 60 * 60 * 1000));
};

const shouldEscalateQuestion = (question: string | null | undefined): boolean => {
  if (!question) return false;
  return /(appeal|legal|lawyer|police|threat|blackmail|extortion|stalk|minor|urgent safety|violence)/i.test(question);
};

const buildCoachOutput = (payload: GrowthCoachRequest) => {
  const reasonCodes = normalizeStringArray(payload.reason_codes);
  const priorThemes = normalizeStringArray(payload.prior_recommendation_themes);
  const theme = chooseTheme(reasonCodes, priorThemes);
  const recommendedModules = THEME_MODULE_MAP[theme] ?? ["Building Wholeness"];
  const reflectionPrompt = THEME_REFLECTION_PROMPT_MAP[theme];
  const journalingPrompt = THEME_JOURNAL_PROMPT_MAP[theme];
  const triggerSource = payload.trigger_source ?? "enters_growth_mode";
  const reassessmentDays = computeDaysUntilReassessment(payload.cooldown_reassessment_date);

  let recommendedAction: GrowthCoachAction = "recommend_module_path";
  let escalateToSupport = false;
  let urgency = "normal";

  if (shouldEscalateQuestion(payload.user_question)) {
    recommendedAction = "escalate_user_question_to_support";
    escalateToSupport = true;
    urgency = "high";
  } else if (triggerSource === "upcoming_reassessment" || (reassessmentDays !== null && reassessmentDays <= 7)) {
    recommendedAction = "send_reassessment_notice";
  } else if (triggerSource === "inactive") {
    recommendedAction = "send_reengagement_nudge";
  } else if (triggerSource === "user_requested_guidance") {
    recommendedAction = "send_reflection_prompt";
  } else if (triggerSource === "enters_growth_mode") {
    recommendedAction = "deliver_growth_explanation";
  } else {
    recommendedAction = "recommend_module_path";
  }

  const explanationCopy =
    recommendedAction === "escalate_user_question_to_support"
      ? `Thanks for reaching out. Your question needs human support review. Please contact ${SUPPORT_EMAIL} and our team will help you directly.`
      : "You are not being written off. You are being given a place to strengthen the parts of connection that matter most. Growth Mode is designed to help you build healthier patterns, stronger awareness, and better relationship readiness over time.";

  const accountabilityNudge =
    "Small, consistent shifts matter more than perfect moments. Focus on one communication habit and practice it daily this week.";

  const reassessmentNotice =
    reassessmentDays !== null && reassessmentDays >= 0
      ? `Your reassessment window opens in ${reassessmentDays} day${reassessmentDays === 1 ? "" : "s"}. Keep building consistent habits until then.`
      : null;

  return {
    theme,
    recommendedAction,
    escalateToSupport,
    urgency,
    explanationCopy,
    recommendedModules,
    reflectionPrompt,
    journalingPrompt,
    accountabilityNudge,
    reassessmentNotice,
    confidence: recommendedAction === "escalate_user_question_to_support" ? 0.95 : 0.87,
  };
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
      mode: "growth",
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

  if (!isGrowthCoachRequest(rawPayload)) {
    return jsonResponse(400, {
      error:
        "Invalid payload. Expected { app_user_id, app_user_email?, trigger_source?, assessment_summary?, reason_codes?, module_progress?, prior_recommendation_themes?, cooldown_reassessment_date?, user_question?, dry_run? }",
    });
  }

  const payload = rawPayload as GrowthCoachRequest;
  const output = buildCoachOutput(payload);

  if (payload.dry_run) {
    return jsonResponse(200, {
      dry_run: true,
      event_id: null,
      recommendation_id: null,
      recommended_action: output.recommendedAction,
      theme: output.theme,
      explanation_copy: output.explanationCopy,
      recommended_modules: output.recommendedModules,
      journaling_prompt: output.journalingPrompt,
      reflection_prompt: output.reflectionPrompt,
      accountability_nudge: output.accountabilityNudge,
      reassessment_notice: output.reassessmentNotice,
      escalate_to_support: output.escalateToSupport,
      support_email: SUPPORT_EMAIL,
      confidence: output.confidence,
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let rhUserId: string;
  try {
    rhUserId = await ensureRhUserByAppId(
      adminClient,
      payload.app_user_id,
      payload.app_user_email,
    );
  } catch (error) {
    return jsonResponse(500, {
      error: "Failed to resolve growth-mode user",
      details: error instanceof Error ? error.message : "unknown error",
    });
  }

  const recommendationType =
    output.recommendedAction === "recommend_module_path"
      ? "module"
      : output.recommendedAction === "send_reflection_prompt"
      ? "reflection"
      : output.recommendedAction === "send_reassessment_notice"
      ? "cooldown"
      : "prompt";

  const { data: recommendationRow, error: recommendationError } = await adminClient
    .from("rh_coaching_recommendations")
    .insert({
      user_id: rhUserId,
      trigger_source: payload.trigger_source ?? "enters_growth_mode",
      theme: output.theme,
      recommendation_type: recommendationType,
      content_json: {
        explanation_copy: output.explanationCopy,
        recommended_modules: output.recommendedModules,
        journaling_prompt: output.journalingPrompt,
        reflection_prompt: output.reflectionPrompt,
        accountability_nudge: output.accountabilityNudge,
        reassessment_notice: output.reassessmentNotice,
        escalate_to_support: output.escalateToSupport,
        support_email: SUPPORT_EMAIL,
      },
      delivered_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (recommendationError || !recommendationRow?.id) {
    return jsonResponse(500, {
      error: "Failed to store coaching recommendation",
      details: recommendationError?.message ?? "unknown error",
    });
  }

  const inputSnapshot = {
    app_user_id: payload.app_user_id,
    app_user_email: normalizeOptionalEmail(payload.app_user_email),
    trigger_source: payload.trigger_source ?? "enters_growth_mode",
    assessment_summary: payload.assessment_summary ?? null,
    reason_codes: normalizeStringArray(payload.reason_codes),
    module_progress: payload.module_progress ?? {},
    prior_recommendation_themes: normalizeStringArray(payload.prior_recommendation_themes),
    cooldown_reassessment_date: payload.cooldown_reassessment_date ?? null,
    user_question: payload.user_question ?? null,
  };

  const outputSnapshot = {
    recommended_action: output.recommendedAction,
    theme: output.theme,
    explanation_copy: output.explanationCopy,
    recommended_modules: output.recommendedModules,
    journaling_prompt: output.journalingPrompt,
    reflection_prompt: output.reflectionPrompt,
    accountability_nudge: output.accountabilityNudge,
    reassessment_notice: output.reassessmentNotice,
    escalate_to_support: output.escalateToSupport,
    support_email: SUPPORT_EMAIL,
    confidence: output.confidence,
  };

  const { data: eventRow, error: eventError } = await adminClient
    .from("rh_agent_events")
    .insert({
      agent_name: AGENT_NAME,
      event_type: payload.trigger_source ?? "enters_growth_mode",
      target_type: "user",
      target_id: rhUserId,
      actor_user_id: rhUserId,
      related_user_id: null,
      input_snapshot_json: inputSnapshot,
      output_snapshot_json: outputSnapshot,
      confidence: output.confidence,
      applied_action: output.recommendedAction,
      escalated: output.escalateToSupport,
      model_version: MODEL_VERSION,
      rule_version: RULE_VERSION,
    })
    .select("id")
    .single<{ id: string }>();

  if (eventError || !eventRow?.id) {
    return jsonResponse(500, {
      error: "Failed to write growth-mode coach event",
      details: eventError?.message ?? "unknown error",
    });
  }

  return jsonResponse(200, {
    recommendation_id: recommendationRow.id,
    event_id: eventRow.id,
    ...outputSnapshot,
  });
});
