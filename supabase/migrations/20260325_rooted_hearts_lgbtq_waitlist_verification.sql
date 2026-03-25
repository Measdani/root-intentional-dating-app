begin;

create table if not exists public.rh_lgbtq_waitlist_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_normalized text not null,
  safety_feature text not null,
  identity_preferences text not null,
  personal_work text not null,
  verification_token_hash text,
  verification_requested_at timestamptz,
  verification_expires_at timestamptz,
  verification_email_sent_at timestamptz,
  verified_at timestamptz,
  thank_you_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_rh_lgbtq_waitlist_submissions_email_normalized
  on public.rh_lgbtq_waitlist_submissions(email_normalized);

create index if not exists idx_rh_lgbtq_waitlist_submissions_token_hash
  on public.rh_lgbtq_waitlist_submissions(verification_token_hash);

create index if not exists idx_rh_lgbtq_waitlist_submissions_verified_at
  on public.rh_lgbtq_waitlist_submissions(verified_at desc);

alter table public.rh_lgbtq_waitlist_submissions enable row level security;

drop policy if exists rh_lgbtq_waitlist_admin_select
  on public.rh_lgbtq_waitlist_submissions;
create policy rh_lgbtq_waitlist_admin_select
on public.rh_lgbtq_waitlist_submissions
for select
using (public.rh_is_admin());

drop policy if exists rh_lgbtq_waitlist_admin_delete
  on public.rh_lgbtq_waitlist_submissions;
create policy rh_lgbtq_waitlist_admin_delete
on public.rh_lgbtq_waitlist_submissions
for delete
using (public.rh_is_admin());

commit;
