-- Rooted Hearts AI ops RLS policies
-- Date: 2026-03-08
-- Run after: 20260308_rooted_hearts_ai_ops.sql

begin;

create or replace function public.rh_is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$;

alter table public.rh_users enable row level security;
alter table public.rh_profiles enable row level security;
alter table public.rh_messages enable row level security;
alter table public.rh_reports enable row level security;
alter table public.rh_agent_events enable row level security;
alter table public.rh_moderation_cases enable row level security;
alter table public.rh_coaching_recommendations enable row level security;
alter table public.rh_admin_summaries enable row level security;

drop policy if exists rh_users_self_select on public.rh_users;
create policy rh_users_self_select
on public.rh_users
for select
using (id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_users_self_insert on public.rh_users;
create policy rh_users_self_insert
on public.rh_users
for insert
with check (id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_users_self_update on public.rh_users;
create policy rh_users_self_update
on public.rh_users
for update
using (id = auth.uid() or public.rh_is_admin())
with check (id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_profiles_select on public.rh_profiles;
create policy rh_profiles_select
on public.rh_profiles
for select
using (user_id = auth.uid() or status = 'approved' or public.rh_is_admin());

drop policy if exists rh_profiles_insert on public.rh_profiles;
create policy rh_profiles_insert
on public.rh_profiles
for insert
with check (user_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_profiles_update on public.rh_profiles;
create policy rh_profiles_update
on public.rh_profiles
for update
using (user_id = auth.uid() or public.rh_is_admin())
with check (user_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_messages_select_participant on public.rh_messages;
create policy rh_messages_select_participant
on public.rh_messages
for select
using (sender_id = auth.uid() or recipient_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_messages_insert_sender on public.rh_messages;
create policy rh_messages_insert_sender
on public.rh_messages
for insert
with check (sender_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_messages_admin_update on public.rh_messages;
create policy rh_messages_admin_update
on public.rh_messages
for update
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists rh_reports_select on public.rh_reports;
create policy rh_reports_select
on public.rh_reports
for select
using (reporter_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_reports_insert on public.rh_reports;
create policy rh_reports_insert
on public.rh_reports
for insert
with check (reporter_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_reports_update on public.rh_reports;
create policy rh_reports_update
on public.rh_reports
for update
using (reporter_id = auth.uid() or public.rh_is_admin())
with check (reporter_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_coaching_recs_select on public.rh_coaching_recommendations;
create policy rh_coaching_recs_select
on public.rh_coaching_recommendations
for select
using (user_id = auth.uid() or public.rh_is_admin());

drop policy if exists rh_coaching_recs_admin_write on public.rh_coaching_recommendations;
create policy rh_coaching_recs_admin_write
on public.rh_coaching_recommendations
for all
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists rh_agent_events_admin_only on public.rh_agent_events;
create policy rh_agent_events_admin_only
on public.rh_agent_events
for all
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists rh_moderation_cases_admin_only on public.rh_moderation_cases;
create policy rh_moderation_cases_admin_only
on public.rh_moderation_cases
for all
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists rh_admin_summaries_admin_only on public.rh_admin_summaries;
create policy rh_admin_summaries_admin_only
on public.rh_admin_summaries
for all
using (public.rh_is_admin())
with check (public.rh_is_admin());

commit;
