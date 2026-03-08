# First Message Safety Edge Function Setup

Function name: `first-message-safety`  
File: `supabase/functions/first-message-safety/index.ts`

## Purpose
- Moderates first messages using deterministic safety rules.
- Writes decisions to:
- `rh_messages` (status update)
- `rh_agent_events` (audit log)
- `rh_moderation_cases` (only for escalations)

## Prerequisites
- Migrations already applied:
- `20260308_rooted_hearts_ai_ops.sql`
- `20260308_rooted_hearts_ai_ops_rls.sql`
- `20260308_rooted_hearts_ai_ops_app_user_mapping.sql`
- You should call this function server-side or from trusted admin flows.

## Deploy

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy first-message-safety
```

Local serve:

```bash
supabase functions serve first-message-safety --env-file .env.local
```

## Request body

Option A: moderate an existing `rh_messages` row by ID.

```json
{
  "message_id": "0d95f831-ffba-4aa4-8d88-0562f8bfc4d1",
  "force": false,
  "dry_run": false
}
```

Option B: send app-level user IDs + content directly (recommended for current app flow).

```json
{
  "sender_app_user_id": "user_173972...",
  "recipient_app_user_id": "user_173973...",
  "sender_email": "sender@example.com",
  "recipient_email": "recipient@example.com",
  "content": "Hey, I liked your profile and your focus on intentional connection.",
  "conversation_id": "conv_user_a_user_b"
}
```

## Response shape

```json
{
  "message_id": "0d95f831-ffba-4aa4-8d88-0562f8bfc4d1",
  "event_id": "489b0b57-4ad6-4452-9f72-6b4a6f8540b9",
  "case_id": null,
  "labels": ["off_platform_pressure_early"],
  "confidence": 0.9,
  "recommended_action": "block_and_rewrite",
  "message_status": "blocked",
  "blocked_reason": "Opening message must stay respectful and non-coercive.",
  "rewrite_prompt": "Try a greeting, mention something specific from their profile, and ask one thoughtful question.",
  "user_feedback": "That opening message does not meet our standards. Please rewrite it with respect and genuine interest.",
  "escalate": false
}
```

## Test examples

Safe opener:
```json
{
  "message_id": "<first-message-id>"
}
```

Inline payload opener:
```json
{
  "sender_app_user_id": "user_1",
  "recipient_app_user_id": "user_2",
  "content": "Hi, your profile stood out to me for your communication values.",
  "conversation_id": "conv_user_1_user_2"
}
```

Dry run:
```json
{
  "message_id": "<first-message-id>",
  "dry_run": true
}
```

Reprocess message:
```json
{
  "message_id": "<first-message-id>",
  "force": true
}
```

## Notes
- If a message is not `is_first_message = true`, function returns `400`.
- If message status is already processed and `force=false`, function returns `already_processed=true`.
- Severe categories create a row in `rh_moderation_cases`.
- Severe review feedback includes fallback support contact: `support@rootedhearts.net`.
