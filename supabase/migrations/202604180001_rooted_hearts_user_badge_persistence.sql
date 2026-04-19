begin;

alter table public.users
  add column if not exists growth_style_badges text[] not null default '{}'::text[];

alter table public.users
  add column if not exists partner_journey_badges text[] not null default '{}'::text[];

update public.users
set
  growth_style_badges = coalesce(growth_style_badges, '{}'::text[]),
  partner_journey_badges = coalesce(partner_journey_badges, '{}'::text[])
where
  growth_style_badges is null
  or partner_journey_badges is null;

commit;
