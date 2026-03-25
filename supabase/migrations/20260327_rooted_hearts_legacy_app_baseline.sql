begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.rh_is_admin()') is null then
    execute $sql$
      create function public.rh_is_admin()
      returns boolean
      language sql
      stable
      as $fn$
        select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
      $fn$;
    $sql$;
  end if;
end
$$;

create table if not exists public.users (
  id text primary key,
  email text not null,
  name text not null default 'Rooted User',
  age integer not null default 30,
  city text not null default 'Profile setup pending',
  gender text not null default 'prefer-not-to-say',
  gender_identity text,
  gender_identity_custom text,
  open_to_dating text[] not null default '{}'::text[],
  open_to_dating_custom text,
  identity_expression text,
  identity_expression_custom text,
  identity_expression_visibility text,
  partnership_intent text not null default 'long-term',
  family_alignment jsonb not null default '{"hasChildren": false, "wantsChildren": "unsure", "openToPartnerWithParent": "comfortable"}'::jsonb,
  "values" text[] not null default '{}'::text[],
  growth_focus text not null default 'Profile setup in progress',
  relationship_vision text,
  communication_style text,
  community_boundaries text,
  photo_url text,
  bio text,
  assessment_passed boolean not null default false,
  assessment_score numeric(5,2),
  alignment_score numeric(5,2),
  membership_tier text not null default 'monthly',
  membership_status text not null default 'active',
  billing_period_end bigint,
  consent_timestamp bigint,
  consent_version text,
  cancel_at_period_end boolean not null default false,
  pool_id text,
  primary_style text,
  secondary_style text,
  user_status text not null default 'active',
  background_check_verified boolean not null default false,
  background_check_status text not null default 'pending',
  background_check_date bigint,
  suspension_end_date bigint,
  is_admin boolean not null default false,
  created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint
);

alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text not null default 'Rooted User';
alter table public.users add column if not exists age integer not null default 30;
alter table public.users add column if not exists city text not null default 'Profile setup pending';
alter table public.users add column if not exists gender text not null default 'prefer-not-to-say';
alter table public.users add column if not exists gender_identity text;
alter table public.users add column if not exists gender_identity_custom text;
alter table public.users add column if not exists open_to_dating text[] not null default '{}'::text[];
alter table public.users add column if not exists open_to_dating_custom text;
alter table public.users add column if not exists identity_expression text;
alter table public.users add column if not exists identity_expression_custom text;
alter table public.users add column if not exists identity_expression_visibility text;
alter table public.users add column if not exists partnership_intent text not null default 'long-term';
alter table public.users add column if not exists family_alignment jsonb not null default '{"hasChildren": false, "wantsChildren": "unsure", "openToPartnerWithParent": "comfortable"}'::jsonb;
alter table public.users add column if not exists "values" text[] not null default '{}'::text[];
alter table public.users add column if not exists growth_focus text not null default 'Profile setup in progress';
alter table public.users add column if not exists relationship_vision text;
alter table public.users add column if not exists communication_style text;
alter table public.users add column if not exists community_boundaries text;
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists assessment_passed boolean not null default false;
alter table public.users add column if not exists assessment_score numeric(5,2);
alter table public.users add column if not exists alignment_score numeric(5,2);
alter table public.users add column if not exists membership_tier text not null default 'monthly';
alter table public.users add column if not exists membership_status text not null default 'active';
alter table public.users add column if not exists billing_period_end bigint;
alter table public.users add column if not exists consent_timestamp bigint;
alter table public.users add column if not exists consent_version text;
alter table public.users add column if not exists cancel_at_period_end boolean not null default false;
alter table public.users add column if not exists pool_id text;
alter table public.users add column if not exists primary_style text;
alter table public.users add column if not exists secondary_style text;
alter table public.users add column if not exists user_status text not null default 'active';
alter table public.users add column if not exists background_check_verified boolean not null default false;
alter table public.users add column if not exists background_check_status text not null default 'pending';
alter table public.users add column if not exists background_check_date bigint;
alter table public.users add column if not exists suspension_end_date bigint;
alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.users add column if not exists updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;

create table if not exists public.blogs (
  id text primary key,
  title text not null default '',
  content text not null default '',
  category text not null default '',
  excerpt text not null default '',
  author text,
  read_time text,
  published boolean not null default false,
  module_only boolean not null default false,
  created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint
);

alter table public.blogs add column if not exists title text not null default '';
alter table public.blogs add column if not exists content text not null default '';
alter table public.blogs add column if not exists category text not null default '';
alter table public.blogs add column if not exists excerpt text not null default '';
alter table public.blogs add column if not exists author text;
alter table public.blogs add column if not exists read_time text;
alter table public.blogs add column if not exists published boolean not null default false;
alter table public.blogs add column if not exists module_only boolean not null default false;
alter table public.blogs add column if not exists created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.blogs add column if not exists updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;

create table if not exists public.growth_resources (
  id text primary key,
  type text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint
);

alter table public.growth_resources add column if not exists type text not null default 'free';
alter table public.growth_resources add column if not exists data jsonb not null default '[]'::jsonb;
alter table public.growth_resources add column if not exists updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;

create table if not exists public.assessment_results (
  id text primary key,
  user_id text not null,
  passed boolean not null default false,
  percentage numeric(5,2) not null default 0,
  total_score integer,
  style_scores jsonb,
  primary_style text,
  secondary_style text,
  integrity_flags text[] not null default '{}'::text[],
  growth_areas text[] not null default '{}'::text[],
  answered_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint
);

alter table public.assessment_results add column if not exists user_id text;
alter table public.assessment_results add column if not exists passed boolean not null default false;
alter table public.assessment_results add column if not exists percentage numeric(5,2) not null default 0;
alter table public.assessment_results add column if not exists total_score integer;
alter table public.assessment_results add column if not exists style_scores jsonb;
alter table public.assessment_results add column if not exists primary_style text;
alter table public.assessment_results add column if not exists secondary_style text;
alter table public.assessment_results add column if not exists integrity_flags text[] not null default '{}'::text[];
alter table public.assessment_results add column if not exists growth_areas text[] not null default '{}'::text[];
alter table public.assessment_results add column if not exists answered_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;

create table if not exists public.journal_entries (
  id text primary key default gen_random_uuid()::text,
  user_id text not null,
  section_key text not null,
  related_user_id text,
  title text,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_entries add column if not exists user_id text;
alter table public.journal_entries add column if not exists section_key text;
alter table public.journal_entries add column if not exists related_user_id text;
alter table public.journal_entries add column if not exists title text;
alter table public.journal_entries add column if not exists content text not null default '';
alter table public.journal_entries add column if not exists created_at timestamptz not null default now();
alter table public.journal_entries add column if not exists updated_at timestamptz not null default now();

create table if not exists public.reports (
  id text primary key,
  reporter_id text not null,
  reported_user_id text not null,
  reason text not null,
  details text not null default '',
  conversation_id text,
  status text not null default 'pending',
  severity text not null default 'low',
  assigned_admin_id text,
  admin_notes text,
  action_taken jsonb,
  screenshots text[] not null default '{}'::text[],
  related_report_ids text[] not null default '{}'::text[],
  created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  resolved_at bigint
);

alter table public.reports add column if not exists reporter_id text;
alter table public.reports add column if not exists reported_user_id text;
alter table public.reports add column if not exists reason text not null default 'other';
alter table public.reports add column if not exists details text not null default '';
alter table public.reports add column if not exists conversation_id text;
alter table public.reports add column if not exists status text not null default 'pending';
alter table public.reports add column if not exists severity text not null default 'low';
alter table public.reports add column if not exists assigned_admin_id text;
alter table public.reports add column if not exists admin_notes text;
alter table public.reports add column if not exists action_taken jsonb;
alter table public.reports add column if not exists screenshots text[] not null default '{}'::text[];
alter table public.reports add column if not exists related_report_ids text[] not null default '{}'::text[];
alter table public.reports add column if not exists created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.reports add column if not exists updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.reports add column if not exists resolved_at bigint;

create table if not exists public.support_messages (
  id text primary key,
  user_id text not null,
  user_email text not null,
  user_name text not null,
  membership_tier text not null default 'monthly',
  category text not null default 'other',
  subject text not null default '',
  message text not null default '',
  status text not null default 'unread',
  priority text not null default 'normal',
  assigned_admin_id text,
  admin_response text,
  admin_notes text,
  created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint,
  resolved_at bigint
);

alter table public.support_messages add column if not exists user_id text;
alter table public.support_messages add column if not exists user_email text not null default '';
alter table public.support_messages add column if not exists user_name text not null default 'Rooted User';
alter table public.support_messages add column if not exists membership_tier text not null default 'monthly';
alter table public.support_messages add column if not exists category text not null default 'other';
alter table public.support_messages add column if not exists subject text not null default '';
alter table public.support_messages add column if not exists message text not null default '';
alter table public.support_messages add column if not exists status text not null default 'unread';
alter table public.support_messages add column if not exists priority text not null default 'normal';
alter table public.support_messages add column if not exists assigned_admin_id text;
alter table public.support_messages add column if not exists admin_response text;
alter table public.support_messages add column if not exists admin_notes text;
alter table public.support_messages add column if not exists created_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.support_messages add column if not exists updated_at bigint not null default floor(extract(epoch from now()) * 1000)::bigint;
alter table public.support_messages add column if not exists resolved_at bigint;

create unique index if not exists idx_users_email_lower_unique
  on public.users(lower(email));

create index if not exists idx_users_created_at
  on public.users(created_at desc);

create index if not exists idx_users_pool_id
  on public.users(pool_id);

create index if not exists idx_blogs_published_created_at
  on public.blogs(published, created_at desc);

create index if not exists idx_growth_resources_type
  on public.growth_resources(type);

create index if not exists idx_assessment_results_user_id_answered_at
  on public.assessment_results(user_id, answered_at desc);

create index if not exists idx_journal_entries_user_id_section_key
  on public.journal_entries(user_id, section_key);

create index if not exists idx_journal_entries_created_at
  on public.journal_entries(created_at desc);

create index if not exists idx_reports_reporter_id
  on public.reports(reporter_id);

create index if not exists idx_reports_reported_user_id
  on public.reports(reported_user_id);

create index if not exists idx_reports_status_created_at
  on public.reports(status, created_at desc);

create index if not exists idx_support_messages_user_id
  on public.support_messages(user_id);

create index if not exists idx_support_messages_status_created_at
  on public.support_messages(status, created_at desc);

alter table public.users enable row level security;
alter table public.assessment_results enable row level security;
alter table public.journal_entries enable row level security;
alter table public.reports enable row level security;
alter table public.support_messages enable row level security;
alter table public.blogs enable row level security;
alter table public.growth_resources enable row level security;

drop policy if exists users_authenticated_select on public.users;
create policy users_authenticated_select
on public.users
for select
using (auth.role() = 'authenticated');

drop policy if exists users_self_insert on public.users;
create policy users_self_insert
on public.users
for insert
with check (
  (auth.uid() is not null and auth.uid()::text = id::text and coalesce(is_admin, false) = false)
  or public.rh_is_admin()
);

drop policy if exists users_self_or_admin_update on public.users;
create policy users_self_or_admin_update
on public.users
for update
using (
  auth.uid()::text = id::text
  or public.rh_is_admin()
)
with check (
  (auth.uid()::text = id::text and coalesce(is_admin, false) = false)
  or public.rh_is_admin()
);

drop policy if exists users_admin_delete on public.users;
create policy users_admin_delete
on public.users
for delete
using (public.rh_is_admin());

drop policy if exists assessment_results_self_select on public.assessment_results;
create policy assessment_results_self_select
on public.assessment_results
for select
using (auth.uid()::text = user_id::text);

drop policy if exists assessment_results_self_insert on public.assessment_results;
create policy assessment_results_self_insert
on public.assessment_results
for insert
with check (auth.uid()::text = user_id::text);

drop policy if exists assessment_results_self_update on public.assessment_results;
create policy assessment_results_self_update
on public.assessment_results
for update
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);

drop policy if exists assessment_results_self_delete on public.assessment_results;
create policy assessment_results_self_delete
on public.assessment_results
for delete
using (auth.uid()::text = user_id::text);

drop policy if exists journal_entries_self_select on public.journal_entries;
create policy journal_entries_self_select
on public.journal_entries
for select
using (auth.uid()::text = user_id::text);

drop policy if exists journal_entries_self_insert on public.journal_entries;
create policy journal_entries_self_insert
on public.journal_entries
for insert
with check (auth.uid()::text = user_id::text);

drop policy if exists journal_entries_self_update on public.journal_entries;
create policy journal_entries_self_update
on public.journal_entries
for update
using (auth.uid()::text = user_id::text)
with check (auth.uid()::text = user_id::text);

drop policy if exists journal_entries_self_delete on public.journal_entries;
create policy journal_entries_self_delete
on public.journal_entries
for delete
using (auth.uid()::text = user_id::text);

drop policy if exists reports_owner_or_admin_select on public.reports;
create policy reports_owner_or_admin_select
on public.reports
for select
using (
  auth.uid()::text = reporter_id::text
  or public.rh_is_admin()
);

drop policy if exists reports_owner_insert on public.reports;
create policy reports_owner_insert
on public.reports
for insert
with check (
  auth.uid()::text = reporter_id::text
  or public.rh_is_admin()
);

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
on public.reports
for update
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists reports_admin_delete on public.reports;
create policy reports_admin_delete
on public.reports
for delete
using (public.rh_is_admin());

drop policy if exists support_messages_owner_or_admin_select on public.support_messages;
create policy support_messages_owner_or_admin_select
on public.support_messages
for select
using (
  auth.uid()::text = user_id::text
  or public.rh_is_admin()
);

drop policy if exists support_messages_owner_insert on public.support_messages;
create policy support_messages_owner_insert
on public.support_messages
for insert
with check (
  auth.uid()::text = user_id::text
  or public.rh_is_admin()
);

drop policy if exists support_messages_admin_update on public.support_messages;
create policy support_messages_admin_update
on public.support_messages
for update
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists support_messages_admin_delete on public.support_messages;
create policy support_messages_admin_delete
on public.support_messages
for delete
using (public.rh_is_admin());

drop policy if exists blogs_public_select on public.blogs;
create policy blogs_public_select
on public.blogs
for select
using (coalesce(published, false) = true or public.rh_is_admin());

drop policy if exists blogs_admin_insert on public.blogs;
create policy blogs_admin_insert
on public.blogs
for insert
with check (public.rh_is_admin());

drop policy if exists blogs_admin_update on public.blogs;
create policy blogs_admin_update
on public.blogs
for update
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists blogs_admin_delete on public.blogs;
create policy blogs_admin_delete
on public.blogs
for delete
using (public.rh_is_admin());

drop policy if exists growth_resources_public_select on public.growth_resources;
create policy growth_resources_public_select
on public.growth_resources
for select
using (true);

drop policy if exists growth_resources_admin_insert on public.growth_resources;
create policy growth_resources_admin_insert
on public.growth_resources
for insert
with check (public.rh_is_admin());

drop policy if exists growth_resources_admin_update on public.growth_resources;
create policy growth_resources_admin_update
on public.growth_resources
for update
using (public.rh_is_admin())
with check (public.rh_is_admin());

drop policy if exists growth_resources_admin_delete on public.growth_resources;
create policy growth_resources_admin_delete
on public.growth_resources
for delete
using (public.rh_is_admin());

commit;
