# Rooted Hearts Moderation Policy Matrix

Version: 2026-03-08  
Purpose: Deterministic rule layer that sits after model output and before action application.

## 1) Confidence bands

| Band | Range | Default behavior |
|---|---:|---|
| Low | 0.00-0.49 | No high-impact auto-action. Queue or soft nudge. |
| Medium | 0.50-0.79 | Low/medium-impact intervention allowed if policy-safe. |
| High | 0.80-1.00 | Auto-action allowed where category and agent policy permit. |

Severe safety categories override confidence and force human review.

## 2) Severe override categories

These categories always create or update a moderation case and require human review:
- threat_intimidation
- stalking_repeated_unwanted_contact
- blackmail_extortion
- minors_or_underage_risk
- violence_or_self_harm_concern
- legal_or_law_enforcement_sensitive

## 3) First Message Safety Agent matrix

| Category | Low confidence | Medium confidence | High confidence |
|---|---|---|---|
| respectful_safe | approve | approve | approve |
| low_effort | approve_with_nudge | approve_with_nudge | approve_with_nudge |
| sexual_content | block_and_rewrite + queue_if_repeat | block_and_rewrite | block_and_rewrite |
| harassment_insult | block_and_warn + queue | block_and_warn | block_and_warn |
| manipulation_pressure | block_and_rewrite + queue_if_repeat | block_and_rewrite | block_and_warn |
| money_solicitation | escalate_to_review | escalate_to_review | block_and_warn + escalate_to_review |
| scam_indicator | escalate_to_review | urgent queue | escalate_to_review |
| off_platform_pressure_early | block_and_rewrite | block_and_rewrite | block_and_warn |
| hate_discrimination | escalate_to_review | escalate_to_review | escalate_to_review |
| threat_intimidation | escalate_to_review | escalate_to_review | escalate_to_review |
| self_harm_or_violence_mention | escalate_to_review | escalate_to_review | escalate_to_review |
| ambiguous_needs_review | queue | queue | queue_if_conflict |

Repeat behavior rule:
- `3+` blocked first messages in `7` days -> apply `temporary_send_lock` and create moderation case.

## 4) Profile Quality Agent matrix

| Category | Low confidence | Medium confidence | High confidence |
|---|---|---|---|
| clean_acceptable | approve | approve | approve |
| incomplete_or_vague | approve_with_improvement_suggestions | needs_edits | needs_edits |
| low_effort | approve_with_improvement_suggestions | needs_edits | needs_edits |
| sexual_explicit | needs_edits + queue_if_repeat | reject | reject |
| aggressive_disrespectful | needs_edits + queue_if_repeat | needs_edits | reject |
| discriminatory_exclusionary_harm | escalate_to_review | escalate_to_review | reject_or_escalate |
| scam_or_solicitation | escalate_to_review | reject + escalate_to_review | reject + escalate_to_review |
| external_contact_pushing | needs_edits | needs_edits | reject_if_repeated |
| suspicious_identity_claim | escalate_to_review | escalate_to_review | escalate_to_review |
| ambiguous_needs_review | queue | queue | queue_if_conflict |

Repeated rejection rule:
- `2+` rejected resubmissions in `30` days -> force human review.

## 5) Report Intake Agent matrix

| Normalized category | Low confidence | Medium confidence | High confidence |
|---|---|---|---|
| harassment | triage_and_queue | triage_and_queue | urgent_review_if_repeat |
| sexual_misconduct | triage_and_queue | urgent_review | urgent_review |
| scam_money_request | urgent_review | urgent_review | urgent_review |
| fake_account_impersonation | triage_and_queue | urgent_review_if_repeat | urgent_review |
| hate_discriminatory_conduct | urgent_review | urgent_review | urgent_review |
| off_platform_pressure | triage_and_queue | triage_and_queue | urgent_review_if_repeat |
| threats_intimidation | escalate_immediately | escalate_immediately | escalate_immediately |
| stalking_repeated_unwanted_contact | escalate_immediately | escalate_immediately | escalate_immediately |
| profile_misrepresentation | triage_and_queue | triage_and_queue | urgent_review_if_pattern |
| other_unclear | auto_request_more_info | triage_and_queue | triage_and_queue |

Duplicate rule:
- If same reported user + category + target cluster in `72` hours -> `link_to_existing_case`.

## 6) Human-only final decisions

Never fully automated:
- Permanent bans
- Appeals decisions
- Minors-related actions
- Legal crisis or law-enforcement-sensitive matters
- Blackmail/extortion and explicit violence response outcomes

## 7) User-facing feedback requirements

For any blocked/rejected/restricted action:
- Include plain-language reason.
- Include one corrective next step where applicable.
- Avoid identity-level labels ("you are unsafe").
- Preserve calm, non-shaming tone.

## 8) Audit requirements

Every applied moderation action must log:
- actor and target IDs
- category and confidence
- model/rule version
- recommended action and applied action
- escalation flag
- human reviewer status and outcome if reviewed
