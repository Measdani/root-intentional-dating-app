# Profile Quality Edge Function Setup

This document covers deploy + test for Agent 2 (`profile-quality`).

## 1) Deploy

Run from your project root:

```bash
npx supabase@latest functions deploy profile-quality --project-ref akavxkhtfuyiclcpjsem
```

## 2) Request Payload

The function expects:

```json
{
  "app_user_id": "user_123",
  "app_user_email": "person@example.com",
  "bio": "Intentional, family-minded, and building toward long-term partnership.",
  "prompts_json": {
    "relationship_intent": "long-term",
    "growth_focus": "Building emotional resilience",
    "values": ["Honesty", "Accountability", "Family"],
    "wants_children": "open",
    "open_to_partner_with_parent": "comfortable"
  },
  "user_mode": "alignment"
}
```

Optional flags:

- `dry_run` (boolean): classify without writing DB records.
- `account_age_days` (number)
- `prior_profile_moderation_actions` (number)

## 3) Expected Output (shape)

```json
{
  "profile_id": "uuid",
  "event_id": "uuid",
  "case_id": null,
  "labels": ["clean_acceptable"],
  "quality_score": 84,
  "safety_score": 100,
  "confidence": 0.89,
  "recommended_action": "approve",
  "profile_status": "approved",
  "blocked_reason": null,
  "user_feedback": null,
  "improvement_notes": [],
  "escalate": false
}
```

## 4) App Integration

`SignUpSection` now runs this function before account creation.

- `approve` / `approve_with_improvement_suggestions`: sign-up continues.
- `needs_edits` / `reject` / `escalate_to_review`: user is sent back to Step 5 with inline feedback.
