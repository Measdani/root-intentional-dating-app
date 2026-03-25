begin;

alter table public.growth_resources enable row level security;
alter table public.growth_resources alter column type set default 'intentional';

update public.growth_resources
set type = 'intentional'
where type = 'free';

update public.growth_resources
set type = 'alignment'
where type = 'paid';

update public.growth_resources
set id = 'resources_intentional'
where id = 'resources_free'
  and not exists (
    select 1
    from public.growth_resources existing
    where existing.id = 'resources_intentional'
  );

update public.growth_resources
set id = 'resources_alignment'
where id = 'resources_paid'
  and not exists (
    select 1
    from public.growth_resources existing
    where existing.id = 'resources_alignment'
  );

drop policy if exists growth_resources_public_select on public.growth_resources;
create policy growth_resources_public_select
on public.growth_resources
for select
using (
  public.rh_is_admin()
  or exists (
    select 1
    from public.users u
    where u.id::text = auth.uid()::text
      and (
        (public.growth_resources.type = 'intentional' and coalesce(u.assessment_passed, false) = false)
        or (public.growth_resources.type = 'alignment' and coalesce(u.assessment_passed, false) = true)
      )
  )
);

commit;
