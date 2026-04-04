begin;

drop policy if exists growth_resources_public_select on public.growth_resources;
create policy growth_resources_public_select
on public.growth_resources
for select
using (true);

commit;
