-- Rooted Hearts AI ops app-user mapping support
-- Date: 2026-03-08
-- Purpose: map existing app user IDs/emails to rh_users UUID rows for edge moderation flows.

begin;

alter table public.rh_users
  add column if not exists app_user_id text,
  add column if not exists app_user_email text;

create unique index if not exists idx_rh_users_app_user_id_unique
  on public.rh_users(app_user_id)
  where app_user_id is not null;

create index if not exists idx_rh_users_app_user_email
  on public.rh_users(app_user_email)
  where app_user_email is not null;

commit;
