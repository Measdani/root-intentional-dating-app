begin;

drop policy if exists rh_forest_unmatched_queries_insert_authenticated
  on public.rh_forest_unmatched_queries;

drop policy if exists rh_forest_unmatched_queries_insert_public
  on public.rh_forest_unmatched_queries;

create policy rh_forest_unmatched_queries_insert_public
on public.rh_forest_unmatched_queries
for insert
with check (true);

commit;
