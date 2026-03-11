import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type AdminCopilotAction =
  | "generate_daily_summary"
  | "generate_weekly_summary"
  | "prioritize_queue";

type AdminCopilotRequest = {
  action?: AdminCopilotAction;
  period_type?: "daily" | "weekly";
  dry_run?: boolean;
  max_items?: number;
};

type PrioritizedCase = {
  case_id: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  source_id: string;
  summary: string;
  status: string;
  created_at: string;
};

type RepeatOffenderDigest = {
  user_id: string;
  risk_score: number;
  strike_count: number;
  reports_30d: number;
  blocked_messages_30d: number;
};

type LowConfidenceCluster = {
  cluster_key: string;
  agent_name: string;
  action: string;
  count: number;
  avg_confidence: number;
};

type CopilotMetrics = {
  blocked_first_messages: number;
  profiles_needing_edits: number;
  new_reports: number;
  urgent_reports: number;
  rising_risk_users: number;
  top_block_reasons: { reason: string; count: number }[];
};

type GrowthModeInsights = {
  growth_mode_users: number;
  newly_placed_in_growth: number;
  coached_users_in_window: number;
  low_engagement_users: number;
  reassessment_notices_sent: number;
  top_themes: Array<{ theme: string; count: number }>;
  top_modules: Array<{ module: string; count: number }>;
};

const AGENT_NAME = "admin_copilot";
const RULE_VERSION = "ac-rules-2026-03-09";
const MODEL_VERSION = "deterministic-rule-engine-v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTIONS: AdminCopilotAction[] = [
  "generate_daily_summary",
  "generate_weekly_summary",
  "prioritize_queue",
];

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const isBooleanOrUndefined = (value: unknown): boolean =>
  value === undefined || typeof value === "boolean";

const isNumberOrUndefined = (value: unknown): boolean =>
  value === undefined || typeof value === "number";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const toPositiveInt = (value: unknown, fallbackValue: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallbackValue;
  return Math.max(1, Math.min(50, Math.round(value)));
};

const isAdminCopilotRequest = (value: unknown): value is AdminCopilotRequest => {
  if (!value || typeof value !== "object") return true;
  const payload = value as Partial<AdminCopilotRequest>;
  const validAction = payload.action === undefined || ACTIONS.includes(payload.action);
  const validPeriod =
    payload.period_type === undefined ||
    payload.period_type === "daily" ||
    payload.period_type === "weekly";

  return validAction && validPeriod && isBooleanOrUndefined(payload.dry_run) && isNumberOrUndefined(payload.max_items);
};

const severityRank = (severity: string): number => {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
};

const normalizeReasonLabel = (label: string): string => {
  switch (label) {
    case "sexual_content":
      return "sexual openers";
    case "off_platform_pressure_early":
      return "off-platform pressure";
    case "manipulation_pressure":
      return "pressuring language";
    case "harassment_insult":
      return "insults/harassment";
    case "money_solicitation":
      return "money requests";
    case "scam_indicator":
      return "scam indicators";
    case "hate_discrimination":
      return "hate/discriminatory language";
    default:
      return label.replaceAll("_", " ");
  }
};

const normalizeThemeLabel = (theme: string): string =>
  theme
    .trim()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ");

const extractRecommendedModules = (value: unknown): string[] => {
  const content = asRecord(value);
  const modules = content.recommended_modules;
  if (!Array.isArray(modules)) return [];
  return modules
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const buildSummaryText = (
  periodLabel: "24 hours" | "7 days",
  metrics: CopilotMetrics,
  prioritizedReviewList: PrioritizedCase[],
  patternAlerts: string[],
  growthModeInsights: GrowthModeInsights,
): string => {
  const reasonPreview =
    metrics.top_block_reasons.length > 0
      ? metrics.top_block_reasons
          .slice(0, 2)
          .map((entry) => entry.reason)
          .join(" and ")
      : "mixed policy reasons";

  const priorityPreview =
    prioritizedReviewList.length > 0
      ? `${prioritizedReviewList.length} moderation case(s) are currently queued by severity`
      : "no open moderation cases were found";

  const patternPreview =
    patternAlerts.length > 0 ? ` Pattern alert: ${patternAlerts[0]}` : "";
  const growthPreview =
    growthModeInsights.growth_mode_users > 0
      ? ` Growth Mode currently has ${growthModeInsights.growth_mode_users} users, with ${growthModeInsights.low_engagement_users} flagged for low engagement.`
      : "";

  return (
    `In the last ${periodLabel}, ${metrics.blocked_first_messages} first messages were blocked, mostly for ${reasonPreview}. ` +
    `${metrics.profiles_needing_edits} profiles were sent back for edits. ` +
    `${metrics.urgent_reports} reports were marked urgent out of ${metrics.new_reports} new reports. ` +
    `${priorityPreview}.${patternPreview}${growthPreview}`
  ).trim();
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

  let rawPayload: unknown = {};
  try {
    rawPayload = await request.json();
  } catch {
    rawPayload = {};
  }

  if (!isAdminCopilotRequest(rawPayload)) {
    return jsonResponse(400, {
      error: "Invalid payload. Expected { action?, period_type?, dry_run?, max_items? }",
    });
  }

  const payload = (rawPayload as AdminCopilotRequest) ?? {};
  const action: AdminCopilotAction = payload.action ?? "generate_daily_summary";
  const periodType: "daily" | "weekly" =
    payload.period_type ?? (action === "generate_weekly_summary" ? "weekly" : "daily");
  const dryRun = Boolean(payload.dry_run);
  const maxItems = toPositiveInt(payload.max_items, 10);

  if (!ACTIONS.includes(action)) {
    return jsonResponse(400, { error: "Unsupported action." });
  }

  const now = new Date();
  const windowMs = periodType === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const fromIso = new Date(now.getTime() - windowMs).toISOString();
  const scamWindowIso = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const engagementFromIso = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [blockedMessagesRes, profilesNeedsEditsRes, reportsRes, urgentReportsRes, risingRiskRes] =
    await Promise.all([
      adminClient
        .from("rh_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_first_message", true)
        .eq("status", "blocked")
        .gte("created_at", fromIso),
      adminClient
        .from("rh_profiles")
        .select("id", { count: "exact", head: true })
        .in("status", ["needs_edits", "rejected"])
        .gte("updated_at", fromIso),
      adminClient
        .from("rh_reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso),
      adminClient
        .from("rh_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "urgent_review")
        .gte("created_at", fromIso),
      adminClient
        .from("rh_users")
        .select("id", { count: "exact", head: true })
        .gte("risk_score", 60),
    ]);

  if (
    blockedMessagesRes.error ||
    profilesNeedsEditsRes.error ||
    reportsRes.error ||
    urgentReportsRes.error ||
    risingRiskRes.error
  ) {
    return jsonResponse(500, {
      error: "Failed to gather admin metrics",
      details:
        blockedMessagesRes.error?.message ||
        profilesNeedsEditsRes.error?.message ||
        reportsRes.error?.message ||
        urgentReportsRes.error?.message ||
        risingRiskRes.error?.message ||
        "unknown error",
    });
  }

  const { data: messageEvents, error: messageEventsError } = await adminClient
    .from("rh_agent_events")
    .select("output_snapshot_json")
    .eq("agent_name", "first_message_safety")
    .eq("target_type", "message")
    .gte("created_at", fromIso)
    .limit(600);

  if (messageEventsError) {
    return jsonResponse(500, {
      error: "Failed to gather first-message reason distribution",
      details: messageEventsError.message,
    });
  }

  const reasonCounter = new Map<string, number>();
  for (const row of messageEvents ?? []) {
    const output = asRecord((row as { output_snapshot_json?: unknown }).output_snapshot_json);
    const labels = toStringArray(output.labels);
    if (labels.length === 0) continue;
    const first = labels.find((label) => label !== "respectful_safe" && label !== "low_effort") ?? labels[0];
    reasonCounter.set(first, (reasonCounter.get(first) ?? 0) + 1);
  }

  const topBlockReasons = Array.from(reasonCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({
      reason: normalizeReasonLabel(reason),
      count,
    }));

  const { data: moderationCases, error: moderationCasesError } = await adminClient
    .from("rh_moderation_cases")
    .select("id, source, source_id, severity, summary, status, created_at")
    .in("status", ["open", "in_review"])
    .limit(200);

  if (moderationCasesError) {
    return jsonResponse(500, {
      error: "Failed to load moderation queue",
      details: moderationCasesError.message,
    });
  }

  const prioritizedReviewList = ((moderationCases ?? []) as PrioritizedCase[])
    .sort((a, b) => {
      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    })
    .slice(0, maxItems);

  const { data: repeatOffendersRaw, error: repeatOffendersError } = await adminClient
    .from("rh_repeat_offenders_v")
    .select("user_id, risk_score, strike_count, reports_30d, blocked_messages_30d")
    .order("risk_score", { ascending: false })
    .limit(30);

  if (repeatOffendersError) {
    return jsonResponse(500, {
      error: "Failed to load repeat offender digest",
      details: repeatOffendersError.message,
    });
  }

  const repeatOffenderDigest = ((repeatOffendersRaw ?? []) as RepeatOffenderDigest[])
    .filter(
      (row) =>
        Number(row.risk_score) >= 60 ||
        Number(row.reports_30d) >= 2 ||
        Number(row.blocked_messages_30d) >= 3,
    )
    .slice(0, maxItems);

  const { data: lowConfidenceRaw, error: lowConfidenceError } = await adminClient
    .from("rh_agent_events")
    .select("agent_name, applied_action, confidence")
    .gte("created_at", fromIso)
    .lt("confidence", 0.8)
    .limit(600);

  if (lowConfidenceError) {
    return jsonResponse(500, {
      error: "Failed to load low-confidence clusters",
      details: lowConfidenceError.message,
    });
  }

  const lowConfidenceAccumulator = new Map<string, { count: number; total: number; agent: string; action: string }>();
  for (const row of lowConfidenceRaw ?? []) {
    const r = row as { agent_name?: string; applied_action?: string; confidence?: number };
    const agent = typeof r.agent_name === "string" ? r.agent_name : "unknown";
    const actionName = typeof r.applied_action === "string" ? r.applied_action : "unknown";
    const confidence = typeof r.confidence === "number" ? r.confidence : 0;
    const key = `${agent}:${actionName}`;
    const current = lowConfidenceAccumulator.get(key) ?? {
      count: 0,
      total: 0,
      agent,
      action: actionName,
    };
    current.count += 1;
    current.total += confidence;
    lowConfidenceAccumulator.set(key, current);
  }

  const lowConfidenceClusters: LowConfidenceCluster[] = Array.from(lowConfidenceAccumulator.entries())
    .map(([clusterKey, value]) => ({
      cluster_key: clusterKey,
      agent_name: value.agent,
      action: value.action,
      count: value.count,
      avg_confidence: value.count > 0 ? Number((value.total / value.count).toFixed(3)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const { data: reports48h, error: reports48hError } = await adminClient
    .from("rh_reports")
    .select("reported_user_id, reason_selected, free_text")
    .gte("created_at", scamWindowIso)
    .limit(500);

  if (reports48hError) {
    return jsonResponse(500, {
      error: "Failed to evaluate 48h pattern alerts",
      details: reports48hError.message,
    });
  }

  const scamWords = /\b(money|cashapp|venmo|zelle|paypal|gift card|crypto|bitcoin)\b/i;
  const scamCounts = new Map<string, number>();
  for (const row of reports48h ?? []) {
    const report = row as { reported_user_id?: string; reason_selected?: string; free_text?: string };
    const reportedUserId = typeof report.reported_user_id === "string" ? report.reported_user_id : null;
    if (!reportedUserId) continue;
    const reason = typeof report.reason_selected === "string" ? report.reason_selected.toLowerCase() : "";
    const freeText = typeof report.free_text === "string" ? report.free_text : "";
    const isScam = reason === "spam" || scamWords.test(freeText);
    if (!isScam) continue;
    scamCounts.set(reportedUserId, (scamCounts.get(reportedUserId) ?? 0) + 1);
  }

  const patternAlerts: string[] = [];
  for (const [userId, count] of scamCounts.entries()) {
    if (count >= 3) {
      patternAlerts.push(
        `Potential romance scam pattern detected: ${count} scam-like reports in 48 hours tied to user ${userId}.`,
      );
    }
  }

  const metrics: CopilotMetrics = {
    blocked_first_messages: blockedMessagesRes.count ?? 0,
    profiles_needing_edits: profilesNeedsEditsRes.count ?? 0,
    new_reports: reportsRes.count ?? 0,
    urgent_reports: urgentReportsRes.count ?? 0,
    rising_risk_users: risingRiskRes.count ?? 0,
    top_block_reasons: topBlockReasons,
  };

  const [growthUsersRes, growthWindowCoachingRes, growthRecentCoachingRes] =
    await Promise.all([
      adminClient
        .from("rh_users")
        .select("id")
        .eq("mode", "growth")
        .limit(5000),
      adminClient
        .from("rh_coaching_recommendations")
        .select("user_id, theme, recommendation_type, trigger_source, content_json")
        .gte("delivered_at", fromIso)
        .limit(3000),
      adminClient
        .from("rh_coaching_recommendations")
        .select("user_id")
        .gte("delivered_at", engagementFromIso)
        .limit(5000),
    ]);

  if (
    growthUsersRes.error ||
    growthWindowCoachingRes.error ||
    growthRecentCoachingRes.error
  ) {
    return jsonResponse(500, {
      error: "Failed to load growth-mode insights",
      details:
        growthUsersRes.error?.message ||
        growthWindowCoachingRes.error?.message ||
        growthRecentCoachingRes.error?.message ||
        "unknown error",
    });
  }

  const growthUserIds = new Set(
    (growthUsersRes.data ?? [])
      .map((row) => (row as { id?: string }).id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const coachedUsersInWindow = new Set<string>();
  const newlyPlacedUsers = new Set<string>();
  let reassessmentNoticesSent = 0;
  const themeCounter = new Map<string, number>();
  const moduleCounter = new Map<string, number>();

  for (const row of growthWindowCoachingRes.data ?? []) {
    const coaching = row as {
      user_id?: string;
      theme?: string;
      recommendation_type?: string;
      trigger_source?: string;
      content_json?: unknown;
    };

    if (typeof coaching.user_id === "string") {
      coachedUsersInWindow.add(coaching.user_id);
      if (coaching.trigger_source === "enters_growth_mode") {
        newlyPlacedUsers.add(coaching.user_id);
      }
    }

    if (coaching.recommendation_type === "cooldown") {
      reassessmentNoticesSent += 1;
    }

    if (typeof coaching.theme === "string" && coaching.theme.trim().length > 0) {
      const themeKey = coaching.theme.trim().toLowerCase();
      themeCounter.set(themeKey, (themeCounter.get(themeKey) ?? 0) + 1);
    }

    for (const moduleName of extractRecommendedModules(coaching.content_json)) {
      moduleCounter.set(moduleName, (moduleCounter.get(moduleName) ?? 0) + 1);
    }
  }

  const recentlyEngagedGrowthUsers = new Set(
    (growthRecentCoachingRes.data ?? [])
      .map((row) => (row as { user_id?: string }).user_id)
      .filter(
        (userId): userId is string =>
          typeof userId === "string" && userId.length > 0 && growthUserIds.has(userId),
      ),
  );

  const lowEngagementUsers = Math.max(
    growthUserIds.size - recentlyEngagedGrowthUsers.size,
    0,
  );

  const topThemes = Array.from(themeCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme, count]) => ({
      theme: normalizeThemeLabel(theme),
      count,
    }));

  const topModules = Array.from(moduleCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([module, count]) => ({
      module,
      count,
    }));

  const growthModeInsights: GrowthModeInsights = {
    growth_mode_users: growthUserIds.size,
    newly_placed_in_growth: newlyPlacedUsers.size,
    coached_users_in_window: coachedUsersInWindow.size,
    low_engagement_users: lowEngagementUsers,
    reassessment_notices_sent: reassessmentNoticesSent,
    top_themes: topThemes,
    top_modules: topModules,
  };

  const summaryText = buildSummaryText(
    periodType === "weekly" ? "7 days" : "24 hours",
    metrics,
    prioritizedReviewList,
    patternAlerts,
    growthModeInsights,
  );

  const responsePayload = {
    action,
    period_type: periodType,
    summary_text: summaryText,
    metrics_json: metrics,
    growth_mode_insights: growthModeInsights,
    prioritized_review_list: prioritizedReviewList,
    repeat_offender_digest: repeatOffenderDigest,
    low_confidence_clusters: lowConfidenceClusters,
    pattern_alerts: patternAlerts,
  };

  if (dryRun) {
    return jsonResponse(200, {
      dry_run: true,
      summary_id: null,
      event_id: null,
      ...responsePayload,
    });
  }

  let summaryId: string | null = null;
  if (action === "generate_daily_summary" || action === "generate_weekly_summary") {
    const { data: insertedSummary, error: summaryError } = await adminClient
      .from("rh_admin_summaries")
      .insert({
        period_type: periodType,
        summary_text: summaryText,
        metrics_json: {
          ...metrics,
          growth_mode_users: growthModeInsights.growth_mode_users,
          growth_low_engagement_users: growthModeInsights.low_engagement_users,
          growth_newly_placed: growthModeInsights.newly_placed_in_growth,
          prioritized_review_count: prioritizedReviewList.length,
          repeat_offender_count: repeatOffenderDigest.length,
          low_confidence_cluster_count: lowConfidenceClusters.length,
          pattern_alert_count: patternAlerts.length,
        },
      })
      .select("id")
      .single<{ id: string }>();

    if (summaryError || !insertedSummary?.id) {
      return jsonResponse(500, {
        error: "Failed to store admin summary",
        details: summaryError?.message ?? "unknown error",
      });
    }
    summaryId = insertedSummary.id;
  }

  const eventTargetId = `${action}:${periodType}:${now.toISOString()}`;
  const { data: eventRow, error: eventError } = await adminClient
    .from("rh_agent_events")
    .insert({
      agent_name: AGENT_NAME,
      event_type: action,
      target_type: "system",
      target_id: eventTargetId,
      actor_user_id: null,
      related_user_id: null,
      input_snapshot_json: {
        action,
        period_type: periodType,
        max_items: maxItems,
      },
      output_snapshot_json: responsePayload,
      confidence: 0.9,
      applied_action: action,
      escalated: patternAlerts.length > 0,
      model_version: MODEL_VERSION,
      rule_version: RULE_VERSION,
    })
    .select("id")
    .single<{ id: string }>();

  if (eventError || !eventRow?.id) {
    return jsonResponse(500, {
      error: "Failed to write admin copilot event",
      details: eventError?.message ?? "unknown error",
    });
  }

  return jsonResponse(200, {
    summary_id: summaryId,
    event_id: eventRow.id,
    ...responsePayload,
  });
});
