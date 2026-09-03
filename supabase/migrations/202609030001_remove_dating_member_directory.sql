-- Phase 1 of the application transition: remove the member directory.
-- Ordinary members may read only their own row from public.users. Admins keep
-- full access through the existing RLS policy for moderation and support.

drop view if exists public.user_profiles_public;

drop policy if exists users_authenticated_select on public.users;
create policy users_authenticated_select
on public.users
for select
using (auth.uid()::text = id or public.rh_is_admin());

comment on policy users_authenticated_select on public.users is
  'Members may retrieve only their own record; admins may retrieve all records.';
