-- Rooted Hearts admin check migration
-- Date: 2026-03-08
-- Purpose: switch rh_is_admin() to use existing public.users.is_admin

begin;

create or replace function public.rh_is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean := false;
begin
  -- Preferred path: existing app users table.
  -- Works whether users.id is text or uuid.
  if to_regclass('public.users') is not null then
    begin
      select coalesce(u.is_admin, false)
        into v_is_admin
      from public.users u
      where u.id::text = auth.uid()::text
      limit 1;

      if coalesce(v_is_admin, false) then
        return true;
      end if;
    exception
      when undefined_column then
        -- If users.is_admin is not present, continue to legacy fallback.
        null;
    end;
  end if;

  -- Backward-compatible fallback: JWT app_metadata claim.
  return coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
end;
$$;

commit;
