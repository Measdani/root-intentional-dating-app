begin;

create table if not exists public.rh_learning_lessons (
  id text primary key,
  area_id text not null check (area_id in ('know-yourself', 'learn-to-date', 'build-relationship', 'sustain-love')),
  title text not null,
  summary text not null default '',
  estimated_minutes integer not null default 5 check (estimated_minutes between 1 and 180),
  shared_foundation text not null default '',
  female_perspective text not null default '',
  male_perspective text not null default '',
  reflection_prompt text not null default '',
  action_step text not null default '',
  order_index integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_approved_answers (
  id uuid primary key default gen_random_uuid(),
  source_question_id uuid unique references public.rh_member_questions(id) on delete set null,
  question text not null,
  answer text not null,
  area_id text not null check (area_id in ('know-yourself', 'learn-to-date', 'build-relationship', 'sustain-love')),
  perspective text not null default 'shared' check (perspective in ('female', 'male', 'shared')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rh_learning_lessons enable row level security;
alter table public.rh_approved_answers enable row level security;

drop policy if exists rh_learning_lessons_member_read on public.rh_learning_lessons;
create policy rh_learning_lessons_member_read on public.rh_learning_lessons
for select using (
  public.rh_is_admin()
  or (
    published = true
    and auth.uid() is not null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()::text and u.access_status = 'active'
    )
  )
);

drop policy if exists rh_learning_lessons_admin_insert on public.rh_learning_lessons;
create policy rh_learning_lessons_admin_insert on public.rh_learning_lessons
for insert with check (public.rh_is_admin());

drop policy if exists rh_learning_lessons_admin_update on public.rh_learning_lessons;
create policy rh_learning_lessons_admin_update on public.rh_learning_lessons
for update using (public.rh_is_admin()) with check (public.rh_is_admin());

drop policy if exists rh_learning_lessons_admin_delete on public.rh_learning_lessons;
create policy rh_learning_lessons_admin_delete on public.rh_learning_lessons
for delete using (public.rh_is_admin());

drop policy if exists rh_approved_answers_member_read on public.rh_approved_answers;
create policy rh_approved_answers_member_read on public.rh_approved_answers
for select using (
  public.rh_is_admin()
  or (
    published = true
    and auth.uid() is not null
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()::text and u.access_status = 'active'
    )
  )
);

drop policy if exists rh_approved_answers_admin_all on public.rh_approved_answers;
create policy rh_approved_answers_admin_all on public.rh_approved_answers
for all using (public.rh_is_admin()) with check (public.rh_is_admin());

create index if not exists rh_learning_lessons_area_order_idx on public.rh_learning_lessons(area_id, order_index);
create index if not exists rh_approved_answers_published_idx on public.rh_approved_answers(published, updated_at desc);

commit;
