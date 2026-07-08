-- Blocking previously lived only in localStorage, including the "who has
-- blocked me" reverse lookup. That never crossed devices/browsers, so a real
-- block on one person's phone was invisible to the blocked person's own
-- session on a different device. This gives blocking a real, shared home.

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id text not null references public.users(id) on delete cascade,
  blocked_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

-- A user may see a block row if they are either party to it (so they can
-- check both "did I block them" and "did they block me"), or if they're an
-- admin. They can never browse other people's block relationships.
drop policy if exists user_blocks_select on public.user_blocks;
create policy user_blocks_select
on public.user_blocks
for select
using (auth.uid()::text = blocker_id or auth.uid()::text = blocked_id or public.rh_is_admin());

drop policy if exists user_blocks_insert on public.user_blocks;
create policy user_blocks_insert
on public.user_blocks
for insert
with check (auth.uid()::text = blocker_id);

drop policy if exists user_blocks_delete on public.user_blocks;
create policy user_blocks_delete
on public.user_blocks
for delete
using (auth.uid()::text = blocker_id or public.rh_is_admin());
