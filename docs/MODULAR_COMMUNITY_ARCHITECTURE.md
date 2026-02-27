# Modular Community Architecture

## Goal
Use one shared codebase while supporting multiple community areas (for example `rooted` and `lgbtq`) with isolated login/session data and configurable matching behavior.

## Pool IDs
- `core` (Rooted Hearts)
- `lgbtq` (Rooted Hearts LGBTQ+)

Community routes map to pools:
- `rooted` -> `core`
- `lgbtq` -> `lgbtq`

## What was added
- `src/modules/communities.ts`
  - Central registry for all communities.
  - Resolves active community from URL (`?community=...`), path prefix, or persisted preference.
- `src/modules/storageNamespace.ts`
  - Automatically namespaces key localStorage data per community.
  - Prevents login/session bleed between community areas.
  - Keeps legacy compatibility for the `rooted` community by mirroring legacy keys.
- `src/modules/matching.ts`
  - Shared matching strategy function (`opposite-gender` vs `inclusive`).
- `src/modules/poolMembership.ts`
  - Resolves and persists account-to-pool assignment (`core` / `lgbtq`).
  - Supports auto-routing when login happens from the wrong auth tab.
- `src/modules/CommunityContext.tsx`
  - Exposes `activeCommunity`, `communities`, and `switchCommunity()` to the UI without full page reload.
- `src/components/CommunitySwitcher.tsx`
  - Reusable switch control to move between community areas.
- `src/components/AuthPoolTabs.tsx`
  - Auth tab selector:
    - `[ Rooted Hearts ] [ Rooted Hearts LGBTQ+ ]`

## Boot flow
`src/main.tsx` now:
1. Resolves active community.
2. Installs localStorage namespacing before app render.
3. Persists active community.
4. Wraps app in `CommunityProvider`.

This ensures context and storage are aligned before `AppContext` reads user/admin session keys.

## URL usage
- Rooted area: `/?community=rooted`
- LGBTQ+ area: `/?community=lgbtq`

If `community` is omitted, the app falls back to path prefix, then stored preference, then `rooted`.

## Auth pool behavior
- The selected auth tab is the pool selector for sign-up.
- New account signups are assigned `poolId` from the selected tab.
- On login, if the user account pool differs from the selected tab, the app:
  1. Switches to the account's correct community area.
  2. Continues login flow.
  3. Shows a calm confirmation banner:
     - "You're signed in to Rooted Hearts LGBTQ+. We redirected you to your space."

## Add a new community
1. Add a new entry to `COMMUNITIES` in `src/modules/communities.ts`.
2. Choose `matchingMode`:
   - `opposite-gender`
   - `inclusive`
3. Customize branding copy (`heroTitle`, `heroTagline`, login/signup text).
4. Link to it from your UI with `switchCommunity(newId)` or URL `?community=newId`.

## Notes
- This is front-end isolation only. For production-grade separation, also segment backend data by `community_id` in your database tables and queries.
- Existing content/policy text is still mostly shared; this architecture makes it straightforward to split those next by community config.
