begin;

create table if not exists public.rh_blocked_emails (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  reason text not null default '',
  source_report_id text,
  blocked_by text,
  blocked_at timestamptz not null default now()
);

create index if not exists idx_rh_blocked_emails_blocked_at
  on public.rh_blocked_emails(blocked_at desc);

alter table public.users
  add column if not exists guidelines_ack_required boolean not null default false,
  add column if not exists guidelines_acknowledged_at bigint,
  add column if not exists moderation_note text;

alter table public.rh_blocked_emails enable row level security;

drop policy if exists rh_blocked_emails_admin_select on public.rh_blocked_emails;
create policy rh_blocked_emails_admin_select
on public.rh_blocked_emails
for select
using (public.rh_is_admin());

drop policy if exists rh_blocked_emails_admin_delete on public.rh_blocked_emails;
create policy rh_blocked_emails_admin_delete
on public.rh_blocked_emails
for delete
using (public.rh_is_admin());

commit;
