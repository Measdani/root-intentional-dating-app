begin;

create table if not exists public.rh_forest_unmatched_queries (
  id uuid primary key default gen_random_uuid(),
  query_text text not null,
  normalized_query text not null,
  token_snapshot text[] not null default '{}'::text[],
  match_count integer not null default 0,
  top_score integer not null default 0,
  top_topics text[] not null default '{}'::text[],
  page_context text,
  created_at timestamptz not null default now()
);

create index if not exists idx_rh_forest_unmatched_queries_created_at
  on public.rh_forest_unmatched_queries(created_at desc);

create index if not exists idx_rh_forest_unmatched_queries_normalized_query
  on public.rh_forest_unmatched_queries(normalized_query);

alter table public.rh_forest_unmatched_queries enable row level security;

drop policy if exists rh_forest_unmatched_queries_insert_authenticated
  on public.rh_forest_unmatched_queries;
create policy rh_forest_unmatched_queries_insert_authenticated
on public.rh_forest_unmatched_queries
for insert
with check (auth.uid() is not null or public.rh_is_admin());

drop policy if exists rh_forest_unmatched_queries_admin_select
  on public.rh_forest_unmatched_queries;
create policy rh_forest_unmatched_queries_admin_select
on public.rh_forest_unmatched_queries
for select
using (public.rh_is_admin());

drop policy if exists rh_forest_unmatched_queries_admin_delete
  on public.rh_forest_unmatched_queries;
create policy rh_forest_unmatched_queries_admin_delete
on public.rh_forest_unmatched_queries
for delete
using (public.rh_is_admin());

commit;
