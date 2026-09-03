# Rooted Hearts Phase 2

## Connected in this version

- Real lesson catalog organized into four learning areas
- Shared teaching plus switchable female and male perspective content
- Per-member viewed and completed lesson progress with local fallback
- Saved lessons with per-member persistence
- Searchable approved Rooted Hearts answers
- Private member question submission ready for editorial review
- Private journal entry creation and history
- Lifetime-access fields on member accounts
- Owner-only database rules for progress, saved lessons, and questions

## Deployment order

1. Apply `supabase/migrations/202609030001_remove_dating_member_directory.sql`.
2. Apply `supabase/migrations/202609030002_learning_platform_foundation.sql`.
3. Deploy the application source.
4. Test account creation, sign-in, lesson progress, saves, questions, and journal entries with a non-admin account.

The database migrations must run before deploying this source because account creation now writes the lifetime-access fields.

## Still to build

- Secure payment checkout and webhook-confirmed access activation
- Admin question-review and publishing interface
- Migration of the complete legacy growth-resource catalog
- Admin editing for learning-area and perspective fields
- Final education-focused Terms of Service and Privacy Policy
