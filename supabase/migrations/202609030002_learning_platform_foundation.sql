begin;

alter table public.users add column if not exists access_plan text not null default 'lifetime';
alter table public.users add column if not exists access_status text not null default 'active';
alter table public.users add column if not exists access_granted_at timestamptz;
alter table public.users add column if not exists last_viewing_perspective text not null default 'female';

create table if not exists public.rh_learning_progress (
  user_id text not null,
  lesson_id text not null,
  completed boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create table if not exists public.rh_saved_lessons (
  user_id text not null,
  lesson_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.rh_member_questions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  question text not null check (char_length(question) between 10 and 3000),
  viewing_perspective text not null check (viewing_perspective in ('female', 'male')),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'answered', 'declined')),
  anonymized_question text,
  answer text,
  publish_to_library boolean not null default false,
  area_id text check (area_id in ('know-yourself', 'learn-to-date', 'build-relationship', 'sustain-love')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.rh_learning_progress enable row level security;
alter table public.rh_saved_lessons enable row level security;
alter table public.rh_member_questions enable row level security;

drop policy if exists rh_learning_progress_owner on public.rh_learning_progress;
create policy rh_learning_progress_owner on public.rh_learning_progress
for all using (auth.uid()::text = user_id or public.rh_is_admin())
with check (auth.uid()::text = user_id or public.rh_is_admin());

drop policy if exists rh_saved_lessons_owner on public.rh_saved_lessons;
create policy rh_saved_lessons_owner on public.rh_saved_lessons
for all using (auth.uid()::text = user_id or public.rh_is_admin())
with check (auth.uid()::text = user_id or public.rh_is_admin());

drop policy if exists rh_member_questions_owner_select on public.rh_member_questions;
create policy rh_member_questions_owner_select on public.rh_member_questions
for select using (auth.uid()::text = user_id or public.rh_is_admin());

drop policy if exists rh_member_questions_owner_insert on public.rh_member_questions;
create policy rh_member_questions_owner_insert on public.rh_member_questions
for insert with check (auth.uid()::text = user_id);

drop policy if exists rh_member_questions_admin_update on public.rh_member_questions;
create policy rh_member_questions_admin_update on public.rh_member_questions
for update using (public.rh_is_admin()) with check (public.rh_is_admin());

create index if not exists rh_learning_progress_user_last_viewed_idx on public.rh_learning_progress(user_id, last_viewed_at desc);
create index if not exists rh_member_questions_status_created_idx on public.rh_member_questions(status, created_at desc);

commit;
