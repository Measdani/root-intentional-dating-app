# Rooted Hearts AI Agent System Spec

Version: 2026-03-08  
Scope: Current build scope for five prioritized agents.

## 1. Goals

### Primary goals
- Reduce early moderation and support labor.
- Improve safety and message/profile quality.
- Keep platform behavior aligned with intentional dating.
- Support Growth Mode users with clear, non-shaming guidance.
- Help admins review high-impact items first.

### Non-goals
- No full replacement of human judgment for severe trust and safety decisions.
- No clinical diagnosis or therapy claims.
- No permanent enforcement without human review.
- No emotion manipulation for engagement.

## 2. Shared principles
- Warm but firm communication.
- Safety first for threats, coercion, sexual aggression, scams, and harassment.
- Minimal necessary action for low-risk cases.
- Human review for high-stakes outcomes.
- Transparent user-facing explanations for impactful actions.
- Privacy-aware context access by agent role.
- Audit logging for every automated decision.

## 3. Shared architecture
- App frontend: onboarding, assessment, profile, messaging, reporting, Growth Mode, admin dashboard.
- Backend application layer: auth, data, permissions, moderation state, notifications, agent triggers.
- AI orchestration layer: route events, attach context, apply rule gates, score confidence, return actions, escalate.
- Rule engine: deterministic policy checks, thresholds, cooldowns, rate limits.
- Review queue: high-risk, low-confidence, repeat-offender, and disputed cases.
- Audit log: full traceability for model output and applied actions.

## 4. Shared data entities

Reference entities (implemented in SQL migration with `rh_` prefix to avoid collisions):
- users
- profiles
- messages
- reports
- agent_events
- moderation_cases
- coaching_recommendations
- admin_summaries

See schema: `supabase/migrations/20260308_rooted_hearts_ai_ops.sql`

## 5. Agent definitions

### Agent 1: First Message Safety Agent
- Purpose: Evaluate first messages before delivery or feature unlock.
- Trigger: first-message submit, blocked-message retry, repeated violations.
- Outputs: labels, confidence, action, optional rewrite, optional escalation.
- Actions: `approve`, `approve_with_nudge`, `block_and_rewrite`, `block_and_warn`, `escalate_to_review`, `temporary_send_lock`.
- Immediate escalation categories: threat, stalking, blackmail/extortion, minor risk, violence/self-harm.

### Agent 2: Profile Quality Agent
- Purpose: Review profile bio and prompt answers for safety and quality.
- Trigger: profile create/edit/resubmit.
- Outputs: labels, quality score (0-100), safety score, action, optional rewrite tips.
- Actions: `approve`, `approve_with_improvement_suggestions`, `needs_edits`, `reject`, `escalate_to_review`.
- Escalate categories: identity fraud concerns, ambiguous discrimination, repeated rejected submissions.

### Agent 3: Growth Mode Coach Agent
- Purpose: Provide supportive growth guidance and next steps.
- Trigger: entry to Growth Mode, module completion, inactivity, guidance request, reassessment window.
- Outputs: explanation copy, module suggestions, reflection/journaling prompts, readiness reminders.
- Actions: `deliver_growth_explanation`, `recommend_module_path`, `send_reflection_prompt`, `send_reengagement_nudge`, `send_reassessment_notice`, `escalate_user_question_to_support`.
- Guardrails: no diagnosis, no therapy claims, no shaming.

### Agent 4: Report Intake Agent
- Purpose: Normalize, summarize, and prioritize user reports.
- Trigger: report created/updated, duplicate detection.
- Outputs: normalized category, severity, summary, evidence list, urgency, duplicate linking recommendation, escalation flag.
- Actions: `triage_and_queue`, `urgent_review`, `link_to_existing_case`, `auto_request_more_info`, `escalate_immediately`.
- Critical auto-escalation: threats, blackmail/extortion, minors, stalking, violence, repeated scam pattern with evidence.

### Agent 5: Admin Copilot Agent
- Purpose: Summaries, prioritization, pattern alerts, draft notices.
- Trigger: daily/weekly jobs, dashboard open, case view, trend threshold crossing.
- Outputs: summaries, priority queue, offender digest, draft notices, pattern alerts.
- Actions: `generate_daily_summary`, `generate_weekly_summary`, `prioritize_queue`, `draft_notice`, `flag_pattern_alert`.

## 6. Permissions model
- Suggest-only: Growth Mode Coach Agent, Admin Copilot Agent.
- Low-risk auto-action: First Message Safety Agent, Profile Quality Agent.
- Escalate and summarize: Report Intake Agent.
- Human-only final decisions: permanent bans, appeals, legal/safety crisis, minors, law-enforcement-sensitive matters.

## 7. Confidence policy
- `0.00-0.49`: no high-impact auto-action; queue or use soft nudge.
- `0.50-0.79`: low/medium confidence interventions for low-stakes actions only.
- `0.80-1.00`: high confidence auto-action allowed where policy permits.
- Severe safety categories can override confidence and force review.

## 8. Dashboard sections
- Today Overview
- Review Queue
- First Message Monitor
- Profile Review Center
- Reports Center
- Growth Mode Insights
- Admin Summaries

Detailed copy and UX states: `docs/ADMIN_DASHBOARD_WIREFRAME_COPY.md`

## 9. Event flows
- Unsafe opening message -> block and rewrite flow + repeat tracking.
- Weak but fixable profile -> `needs_edits` + user guidance + resubmission loop.
- Growth Mode placement -> supportive explanation + module path + reminder cadence.
- Serious report -> severity high/critical -> case creation -> queue prioritization.

## 10. Tone guide
- Calm, respectful, clear, boundaried, non-clinical, non-condescending.
- Avoid identity-level judgment statements.
- Use behavior-level feedback with specific next step.

## 11. Safety and compliance
- Log all automated actions.
- Provide appeal path for significant account-impacting decisions.
- Do not use protected characteristics in matching/enforcement logic.
- Keep moderation systems separate from compatibility reasoning where possible.
- Retain only necessary moderation data.
- Disclose AI-assisted moderation in public policy documents.

## 12. Build order
- Sprint 1: First Message Safety + Profile Quality + audit log + queue skeleton.
- Sprint 2: Report Intake + Admin Copilot daily summary + severity pipeline + repeat-offender digest.
- Sprint 3: Growth Mode Coach + recommendation engine + reassessment reminders + insights panel.

## 13. Contracts and implementation docs
- Prompt pack: `docs/ROOTED_HEARTS_AGENT_PROMPT_PACK.md`
- Policy matrix: `docs/MODERATION_POLICY_MATRIX.md`
- API contracts: `docs/AI_AGENT_API_CONTRACTS.md`
- Edge-case tests: `docs/EDGE_CASE_TEST_SCENARIOS.md`
- SQL schema: `supabase/migrations/20260308_rooted_hearts_ai_ops.sql`
