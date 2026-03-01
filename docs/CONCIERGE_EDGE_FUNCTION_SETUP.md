# Concierge Edge Function Setup

This project supports optional AI enrichment for private vibe-check snapshots.

If the function is unavailable, the app falls back to built-in heuristic snapshots automatically.

## Function Name

- `concierge-vibe-check`

## File

- `supabase/functions/concierge-vibe-check/index.ts`

## Deploy Steps

1. Install/login to Supabase CLI.
2. Link your project:

```bash
supabase link --project-ref <your-project-ref>
```

3. Set secrets:

```bash
supabase secrets set OPENAI_API_KEY=<your-openai-api-key>
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

4. Deploy:

```bash
supabase functions deploy concierge-vibe-check
```

5. (Optional) Serve locally for testing:

```bash
supabase functions serve concierge-vibe-check --env-file .env.local
```

## Expected Request Shape

```json
{
  "conversationId": "conv_u1_u2",
  "userId": "u1",
  "messageCount": 12,
  "messages": [
    {
      "fromUserId": "u1",
      "toUserId": "u2",
      "message": "sample",
      "timestamp": 1730000000000
    }
  ]
}
```

## Expected Response Shape

```json
{
  "headline": "Compatibility Snapshot: ...",
  "highlights": ["...", "..."],
  "caution": "...",
  "model": "gpt-4.1-mini"
}
```

## Notes

- The frontend calls this using `supabase.functions.invoke('concierge-vibe-check')`.
- Keep responses short and neutral.
- Do not return personal data beyond the summary content.
