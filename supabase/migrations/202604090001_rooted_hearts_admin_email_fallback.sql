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
  v_email text := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
begin
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

      if v_email is not null then
        select coalesce(u.is_admin, false)
          into v_is_admin
        from public.users u
        where lower(coalesce(u.email, '')) = v_email
        order by u.updated_at desc nulls last
        limit 1;

        if coalesce(v_is_admin, false) then
          return true;
        end if;
      end if;
    exception
      when undefined_column then
        null;
    end;
  end if;

  return coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
end;
$$;

commit;
