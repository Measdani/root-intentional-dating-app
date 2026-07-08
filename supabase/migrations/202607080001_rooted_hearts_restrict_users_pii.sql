-- Any authenticated user could previously select every column of every row in
-- public.users (email, background-check status, membership/billing details,
-- is_admin, suspension state, moderation notes) via the anon-key client.
-- This locks the base table down to "self or admin" and exposes only the
-- columns Browse/Inbox/Profile actually need through a safe view.

drop policy if exists users_authenticated_select on public.users;
create policy users_authenticated_select
on public.users
for select
using (auth.uid()::text = id or public.rh_is_admin());

drop view if exists public.user_profiles_public;
create view public.user_profiles_public as
select
  id,
  name,
  age,
  city,
  gender,
  gender_identity,
  gender_identity_custom,
  open_to_dating,
  open_to_dating_custom,
  identity_expression,
  identity_expression_custom,
  identity_expression_visibility,
  partnership_intent,
  family_alignment,
  "values",
  growth_focus,
  relationship_vision,
  communication_style,
  community_boundaries,
  photo_url,
  bio,
  assessment_passed,
  alignment_score,
  pool_id,
  primary_style,
  secondary_style,
  growth_style_badges,
  partner_journey_badges,
  background_check_verified,
  user_status,
  created_at,
  updated_at
from public.users;

grant select on public.user_profiles_public to authenticated;
