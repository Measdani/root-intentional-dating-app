# Rooted Hearts restructuring guide

## What is currently canonical

The application that builds from the repository root is the canonical app:

- `src/` contains the React application.
- `supabase/` contains database migrations and Edge Functions.
- `api/` contains Vercel serverless endpoints.
- `public/` contains static assets.
- Root configuration files (`package.json`, `vite.config.ts`, and related files)
  control the build.

The top-level `app/` directory is a Git submodule that contains another copy of
the application. Keeping both copies active makes it easy to edit or deploy the
wrong version. After confirming the root app is the desired source of truth,
remove the submodule in a dedicated cleanup change.

## Main pressure points

1. `src/store/AppContext.tsx` owns too many unrelated concerns (navigation,
   authentication, profiles, assessment state, messages, and UI state).
2. `src/App.tsx` implements routing with a large string-based switch instead of
   explicit routes and route guards.
3. `src/sections/` mixes public pages, authenticated product screens, growth
   content, authentication screens, and admin screens in one directory.
4. `src/services/` is flat even though it covers several independent domains.
5. Large shared mock/static datasets live beside production domain logic.

## Suggested target structure

```text
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
    layouts/
  features/
    auth/
    assessment/
    matching/
    messaging/
    growth/
    safety/
    community/
    support/
    admin/
  shared/
    components/
      ui/
    hooks/
    lib/
    types/
    assets/
  integrations/
    supabase/
```

Each feature should contain its own pages, components, services, types, and
tests. Code belongs in `shared/` only when multiple features genuinely use it.

## Safe migration sequence

1. Establish one source of truth by resolving the duplicate `app/` submodule.
2. Add a real router and reproduce the current view names as URL routes without
   changing screen behavior.
3. Split `AppContext` into focused providers: session/auth, navigation (until
   routing fully replaces it), assessment, messaging, and transient UI.
4. Move one feature at a time from `sections/`, `components/`, and `services/`
   into `features/<feature>/`, updating imports after each move.
5. Put the Supabase client and generated database types under
   `integrations/supabase/`; keep domain-specific queries inside their feature.
6. Add unit tests for permissions and services, plus route-level smoke tests for
   public, member, and admin access.
7. Only after the moves are stable, remove compatibility exports and obsolete
   folders.

## Recommended first slice

Start with blocking/reporting because it is bounded and security-sensitive:

```text
src/features/safety/
  components/ReportUserModal.tsx
  services/blockService.ts
  services/reportService.ts
  services/reportIntakeService.ts
  types.ts
```

Keep `supabase/migrations/202607080002_rooted_hearts_user_blocks.sql` in place;
migrations should remain chronological and should not be moved into frontend
feature folders.

Before changing that migration, consider adding a database constraint that
prevents self-blocking (`blocker_id <> blocked_id`). Existing RLS correctly
limits inserts and deletes to the blocker and lets either party detect the
relationship.

