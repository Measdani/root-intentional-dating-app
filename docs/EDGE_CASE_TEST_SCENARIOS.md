# Rooted Hearts Edge-Case Test Scenarios

Version: 2026-03-08  
Purpose: High-value QA scenarios across all five agents and the shared rule engine.

## Test format
- `ID`
- `Agent/Flow`
- `Given`
- `When`
- `Expected`

## First Message Safety Agent

1. `FMS-001`
- Agent/Flow: First message explicit sexual opener
- Given: First message includes explicit sexual request
- When: Agent evaluates with confidence >= 0.80
- Expected: `block_and_rewrite`, user gets respectful rewrite prompt, event logged.

2. `FMS-002`
- Agent/Flow: Money solicitation in first message
- Given: "Can you send me money?" in opener
- When: Agent classifies as money solicitation
- Expected: Escalation path engaged; no auto-delivery.

3. `FMS-003`
- Agent/Flow: Threat language
- Given: Opener contains threat/intimidation
- When: Agent output confidence is low (0.45)
- Expected: Severe override still forces `escalate_to_review`.

4. `FMS-004`
- Agent/Flow: Ambiguous sarcasm false positive guard
- Given: Message appears rude but context may be playful
- When: Confidence < 0.50
- Expected: Queue for review, do not hard block.

5. `FMS-005`
- Agent/Flow: Repeat violator lock
- Given: Sender has 3 blocked first messages in 7 days
- When: Next blocked first-message event lands
- Expected: `temporary_send_lock` + moderation case creation.

## Profile Quality Agent

6. `PQA-001`
- Agent/Flow: Empty/low-effort profile
- Given: Bio and prompts are one-liners with no detail
- When: Safety is clean and quality < 40
- Expected: `needs_edits` with concrete suggestions.

7. `PQA-002`
- Agent/Flow: Hate/discriminatory profile text
- Given: Profile includes hateful language
- When: Agent evaluates
- Expected: `reject` or `escalate_to_review` based on policy matrix.

8. `PQA-003`
- Agent/Flow: External contact push
- Given: Profile repeatedly asks users to move off-platform immediately
- When: Second resubmission repeats pattern
- Expected: `reject_if_repeated` path and human review queue.

9. `PQA-004`
- Agent/Flow: Identity fraud ambiguity
- Given: Suspicious claim without conclusive evidence
- When: Confidence medium/high
- Expected: Escalation to human review, no automatic punitive action.

## Growth Mode Coach Agent

10. `GMC-001`
- Agent/Flow: Growth placement explanation
- Given: User enters Growth Mode with reason codes
- When: Coach action triggered
- Expected: Supportive explanation without blame, one recommended module.

11. `GMC-002`
- Agent/Flow: Forbidden clinical language guard
- Given: Prompt context includes emotional distress references
- When: Model drafts response
- Expected: No diagnosis or therapy claims; if needed, escalate support question.

12. `GMC-003`
- Agent/Flow: Inactive user reengagement
- Given: No module progress for 14 days
- When: Nudge trigger fires
- Expected: `send_reengagement_nudge` with gentle tone and one next step.

13. `GMC-004`
- Agent/Flow: Reassessment reminder timing
- Given: User has reassessment date in 3 days
- When: Reminder job runs daily
- Expected: Reminder sent once per configured cadence; no spam.

## Report Intake Agent

14. `RIA-001`
- Agent/Flow: Threat report
- Given: Report text includes direct threat quote
- When: Agent triages
- Expected: `escalate_immediately`, critical severity, case created.

15. `RIA-002`
- Agent/Flow: Duplicate merge
- Given: Multiple reports target same user and category within 72h
- When: New report enters queue
- Expected: `link_to_existing_case` recommendation and duplicate linkage logged.

16. `RIA-003`
- Agent/Flow: Sparse report text
- Given: Free-text has minimal detail, no excerpts
- When: Agent confidence low
- Expected: `auto_request_more_info` before high-impact action.

17. `RIA-004`
- Agent/Flow: Scam pattern escalation
- Given: Third report in 48h with money request evidence
- When: Agent evaluates
- Expected: High severity, urgent review, pattern alert candidate.

## Admin Copilot Agent

18. `AC-001`
- Agent/Flow: Daily summary accuracy
- Given: Source metrics for 24h window
- When: Copilot generates summary
- Expected: Summary values match metrics exactly; no fabricated counts.

19. `AC-002`
- Agent/Flow: Low-confidence cluster surfacing
- Given: Multiple low-confidence moderation outputs
- When: Copilot prioritizes queue
- Expected: Cluster is highlighted for reviewer calibration.

20. `AC-003`
- Agent/Flow: Draft notice tone compliance
- Given: Action is warning notice
- When: Notice draft generated
- Expected: Calm, clear, non-shaming language with behavior-focused feedback.

## Shared platform/regression scenarios

21. `SHR-001`
- Agent/Flow: Audit completeness
- Given: Any automated action
- When: Action applied
- Expected: `rh_agent_events` includes confidence, labels, applied action, escalation, version metadata.

22. `SHR-002`
- Agent/Flow: Human-only final decisions
- Given: Event requires permanent ban or minors handling
- When: Pipeline reaches action stage
- Expected: Automation stops at escalation; final decision reserved for human reviewer.

23. `SHR-003`
- Agent/Flow: Privacy scope guard
- Given: Agent receives expanded payload by mistake
- When: Pre-rule checks run
- Expected: Non-required fields stripped before model call.

24. `SHR-004`
- Agent/Flow: Idempotency
- Given: Same event is replayed with same idempotency key
- When: Orchestrator processes event
- Expected: No duplicate moderation action; event marked duplicate.

25. `SHR-005`
- Agent/Flow: Appeals path visibility
- Given: User receives impactful moderation action
- When: User opens notice details
- Expected: Appeal path and reason are visible in plain language.

## Suggested automation targets
- Add contract tests for output schemas and action allow-lists.
- Add deterministic unit tests for confidence thresholds and severe overrides.
- Add replay tests for idempotency and duplicate case linking.
- Add snapshot tests for user-facing copy tone constraints.
