# Report Intake Edge Function Setup

This document covers deploy + test for Agent 4 (`report-intake`).

## 1) Deploy

Run from project root:

```bash
npx supabase@latest functions deploy report-intake --project-ref akavxkhtfuyiclcpjsem
```

## 2) Request Payload

```json
{
  "reporter_app_user_id": "user_123",
  "reported_app_user_id": "user_999",
  "reason_selected": "spam",
  "free_text": "They asked for my number immediately, moved to WhatsApp, and requested gas money after two messages.",
  "target_type": "message",
  "target_id": "conv_123_999",
  "reporter_email": "reporter@example.com",
  "reported_email": "reported@example.com"
}
```

Allowed `reason_selected`:

- `harassment`
- `inappropriate-content`
- `fake-profile`
- `spam`
- `safety-concern`
- `hateful-conduct`
- `underage`
- `other`

## 3) Expected Output (shape)

```json
{
  "report_id": "uuid",
  "event_id": "uuid",
  "case_id": "uuid-or-null",
  "normalized_category": "scam_money_request",
  "severity": "high",
  "summary": "...",
  "evidence_excerpts": ["..."],
  "urgency_recommendation": "urgent_queue",
  "recommended_action": "urgent_review",
  "report_status": "urgent_review",
  "confidence": 0.9
}
```

## 4) What It Writes

- `rh_reports` (triaged report row)
- `rh_agent_events` (full intake decision snapshot)
- `rh_moderation_cases` (for urgent/critical outcomes)

## 5) App Integration

`AppContext.reportUser` now calls `report-intake` in parallel with the existing local admin report flow.

- Existing admin UI behavior remains unchanged.
- AI ops triage data is now captured in `rh_*` moderation tables.
