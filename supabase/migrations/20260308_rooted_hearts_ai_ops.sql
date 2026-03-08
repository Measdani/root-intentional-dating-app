-- Rooted Hearts AI ops schema (non-destructive starter migration)
-- Date: 2026-03-08
-- Note: Uses rh_ prefixes to avoid collisions with existing app/auth tables.

begin;

create extension if not exists pgcrypto;

create table if not exists public.rh_users (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'suspended', 'removed')),
  mode text not null default 'alignment' check (mode in ('alignment', 'growth', 'inner_work', 'suspended')),
  risk_score numeric(5,2) not null default 0.00 check (risk_score >= 0 and risk_score <= 100),
  strike_count integer not null default 0 check (strike_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.rh_users(id) on delete cascade,
  bio text not null default '',
  prompts_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'needs_edits', 'rejected', 'flagged')),
  quality_score integer not null default 0 check (quality_score >= 0 and quality_score <= 100),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.rh_users(id) on delete cascade,
  recipient_id uuid not null references public.rh_users(id) on delete cascade,
  thread_id text not null,
  content text not null,
  is_first_message boolean not null default false,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'blocked', 'flagged')),
  created_at timestamptz not null default now()
);

create table if not exists public.rh_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.rh_users(id) on delete cascade,
  reported_user_id uuid not null references public.rh_users(id) on delete cascade,
  target_type text not null check (target_type in ('message', 'profile', 'photo', 'behavior', 'other')),
  target_id text,
  reason_selected text not null,
  free_text text not null default '',
  status text not null default 'new' check (status in ('new', 'triaged', 'urgent_review', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.rh_agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  event_type text not null,
  target_type text not null,
  target_id text not null,
  actor_user_id uuid references public.rh_users(id) on delete set null,
  related_user_id uuid references public.rh_users(id) on delete set null,
  input_snapshot_json jsonb not null default '{}'::jsonb,
  output_snapshot_json jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) not null default 0.000 check (confidence >= 0 and confidence <= 1),
  applied_action text not null,
  escalated boolean not null default false,
  model_version text,
  rule_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_moderation_cases (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('message', 'profile', 'report', 'system_pattern')),
  source_id text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  summary text not null,
  assigned_to uuid references public.rh_users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'appealed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_coaching_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.rh_users(id) on delete cascade,
  trigger_source text not null,
  theme text not null,
  recommendation_type text not null check (recommendation_type in ('module', 'prompt', 'journal', 'reflection', 'cooldown')),
  content_json jsonb not null default '{}'::jsonb,
  delivered_at timestamptz
);

create table if not exists public.rh_admin_summaries (
  id uuid primary key default gen_random_uuid(),
  period_type text not null check (period_type in ('daily', 'weekly')),
  summary_text text not null,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rh_users_mode on public.rh_users(mode);
create index if not exists idx_rh_users_risk_score on public.rh_users(risk_score desc);
create index if not exists idx_rh_profiles_user_id on public.rh_profiles(user_id);
create index if not exists idx_rh_profiles_status on public.rh_profiles(status);
create index if not exists idx_rh_messages_sender_id on public.rh_messages(sender_id);
create index if not exists idx_rh_messages_recipient_id on public.rh_messages(recipient_id);
create index if not exists idx_rh_messages_thread_id on public.rh_messages(thread_id);
create index if not exists idx_rh_messages_status on public.rh_messages(status);
create index if not exists idx_rh_messages_created_at on public.rh_messages(created_at desc);
create index if not exists idx_rh_reports_reported_user_id on public.rh_reports(reported_user_id);
create index if not exists idx_rh_reports_status on public.rh_reports(status);
create index if not exists idx_rh_reports_created_at on public.rh_reports(created_at desc);
create index if not exists idx_rh_agent_events_target on public.rh_agent_events(target_type, target_id);
create index if not exists idx_rh_agent_events_created_at on public.rh_agent_events(created_at desc);
create index if not exists idx_rh_moderation_cases_status on public.rh_moderation_cases(status);
create index if not exists idx_rh_moderation_cases_severity on public.rh_moderation_cases(severity);
create index if not exists idx_rh_moderation_cases_created_at on public.rh_moderation_cases(created_at desc);
create index if not exists idx_rh_coaching_recs_user_id on public.rh_coaching_recommendations(user_id);
create index if not exists idx_rh_admin_summaries_period on public.rh_admin_summaries(period_type, created_at desc);

create or replace function public.rh_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rh_users_updated_at on public.rh_users;
create trigger trg_rh_users_updated_at
before update on public.rh_users
for each row execute function public.rh_set_updated_at();

drop trigger if exists trg_rh_profiles_updated_at on public.rh_profiles;
create trigger trg_rh_profiles_updated_at
before update on public.rh_profiles
for each row execute function public.rh_set_updated_at();

drop trigger if exists trg_rh_moderation_cases_updated_at on public.rh_moderation_cases;
create trigger trg_rh_moderation_cases_updated_at
before update on public.rh_moderation_cases
for each row execute function public.rh_set_updated_at();

create or replace view public.rh_repeat_offenders_v as
select
  u.id as user_id,
  u.risk_score,
  u.strike_count,
  count(r.id) filter (where r.created_at >= now() - interval '30 days') as reports_30d,
  count(m.id) filter (where m.status = 'blocked' and m.created_at >= now() - interval '30 days') as blocked_messages_30d
from public.rh_users u
left join public.rh_reports r on r.reported_user_id = u.id
left join public.rh_messages m on m.sender_id = u.id
group by u.id, u.risk_score, u.strike_count;

commit;
