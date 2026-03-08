# Rooted Hearts AI Agent API Contracts

Version: 2026-03-08  
Purpose: Event, request, and response contracts for orchestration and admin pipelines.

## 1) Contract conventions
- Transport: JSON over HTTP or internal event bus.
- IDs: opaque string IDs (`usr_*`, `msg_*`, `rep_*`, `case_*`).
- Timestamps: ISO 8601 UTC.
- Confidence: float `0.0` to `1.0`.
- Idempotency: required on ingest endpoints.

## 2) Core event envelope

```json
{
  "event_id": "evt_01HZX...",
  "event_name": "first_message_submitted",
  "occurred_at": "2026-03-08T15:20:00Z",
  "idempotency_key": "first_message_submitted:msg_123:v1",
  "actor_user_id": "usr_1",
  "related_user_id": "usr_2",
  "payload": {}
}
```

## 3) Event types

### `first_message_submitted`
```json
{
  "event": "first_message_submitted",
  "message_id": "msg_123",
  "sender_id": "usr_1",
  "recipient_id": "usr_2",
  "content": "hey beautiful send me more pics",
  "is_first_message": true
}
```

### `profile_submitted`
```json
{
  "event": "profile_submitted",
  "profile_id": "pro_123",
  "user_id": "usr_1",
  "bio": "just ask",
  "prompts": {
    "relationship_goal": "looking for my person",
    "weekend": "ask me"
  }
}
```

### `report_created`
```json
{
  "event": "report_created",
  "report_id": "rep_123",
  "reporter_id": "usr_9",
  "reported_user_id": "usr_5",
  "target_type": "message",
  "target_id": "msg_991",
  "reason_selected": "asked_for_money",
  "free_text": "He asked me for gas money after two messages and wanted my number immediately."
}
```

### `growth_mode_entered`
```json
{
  "event": "growth_mode_entered",
  "user_id": "usr_7",
  "reason_codes": ["low_emotional_regulation"],
  "assessment_summary": {
    "growth_areas": ["conflict repair"]
  },
  "reassessment_eligible_at": "2026-04-10T00:00:00Z"
}
```

### `daily_admin_summary_requested`
```json
{
  "event": "daily_admin_summary_requested",
  "period_start": "2026-03-07T00:00:00Z",
  "period_end": "2026-03-08T00:00:00Z"
}
```

## 4) Orchestrator endpoints (reference)

### POST `/api/agent-events/ingest`
- Purpose: Ingest platform event and dispatch to correct agent.
- Request: core event envelope.
- Response:

```json
{
  "event_id": "evt_01HZX...",
  "dispatch_status": "accepted",
  "routed_agent": "first_message_safety"
}
```

### POST `/api/agent-runs/{agent_name}`
- Purpose: Direct run for retries or backfill.
- Request:

```json
{
  "input": {},
  "context": {
    "policy_version": "2026-03-08",
    "model_version": "gpt-5.x",
    "request_source": "orchestrator"
  }
}
```

### Response contract (all agents)

```json
{
  "agent_name": "first_message_safety",
  "target_type": "message",
  "target_id": "msg_123",
  "confidence": 0.92,
  "labels": ["sexual_content"],
  "recommended_action": "block_and_rewrite",
  "applied_action": "block_and_rewrite",
  "escalated": false,
  "human_review_required": false,
  "output_snapshot": {},
  "model_version": "gpt-5.x",
  "policy_version": "2026-03-08"
}
```

## 5) Moderation case contract

### POST `/api/moderation-cases`
```json
{
  "source": "report",
  "source_id": "rep_123",
  "severity": "high",
  "summary": "Possible scam pattern with money request and off-platform pressure.",
  "related_user_ids": ["usr_5", "usr_9"],
  "created_by": "report_intake_agent"
}
```

### PATCH `/api/moderation-cases/{case_id}`
```json
{
  "status": "in_review",
  "assigned_to": "admin_2",
  "resolution_note": "Temporary lock issued pending follow-up review."
}
```

## 6) Audit log write contract

### POST `/api/agent-events/log`
```json
{
  "agent_name": "profile_quality",
  "event_type": "profile_submitted",
  "target_type": "profile",
  "target_id": "pro_123",
  "actor_user_id": "usr_1",
  "related_user_id": null,
  "input_snapshot_json": {},
  "output_snapshot_json": {},
  "confidence": 0.84,
  "applied_action": "needs_edits",
  "escalated": false,
  "model_version": "gpt-5.x",
  "rule_version": "2026-03-08"
}
```

## 7) Idempotency and replay rules
- Reject duplicate `idempotency_key` with `200` and `dispatch_status: duplicate`.
- Do not reapply moderation actions for duplicate events.
- Keep immutable event history; append corrective event on reversal.

## 8) Error contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: payload.message_id",
    "retryable": false
  }
}
```

Common codes:
- `VALIDATION_ERROR`
- `POLICY_CONFLICT`
- `MODEL_TIMEOUT`
- `LOW_CONFIDENCE_REVIEW_REQUIRED`
- `INTERNAL_ERROR`

## 9) Security and access
- Admin and service-role auth only for orchestration/admin endpoints.
- Minimize payload fields per agent need-to-know.
- Redact sensitive content in logs where not required.
- Preserve full evidence only in authorized moderation contexts.
