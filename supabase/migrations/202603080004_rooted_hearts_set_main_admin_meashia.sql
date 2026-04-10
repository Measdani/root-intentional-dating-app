-- Promote a specific account to main admin
-- Date: 2026-03-08
-- Target email: meashiadaniels@gmail.com
--
-- Preconditions:
-- 1) This email exists in auth.users (Supabase Auth user already created).
-- 2) public.users table exists (optional but recommended for app admin checks).

begin;

do $$
declare
  v_email constant text := 'meashiadaniels@gmail.com';
  v_auth_id uuid;
  v_now_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
begin
  -- Require a real Supabase Auth account for this email.
  select id
    into v_auth_id
  from auth.users
  where lower(email) = lower(v_email)
  order by created_at asc
  limit 1;

  if v_auth_id is null then
    raise exception 'No auth.users account found for %. Create it in Supabase Auth, then rerun this migration.', v_email;
  end if;

  -- Mark auth metadata so JWT-based admin checks pass as well.
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('is_admin', true),
      updated_at = now()
  where id = v_auth_id;

  -- Keep app-level users table in sync if present.
  if to_regclass('public.users') is not null then
    update public.users
    set is_admin = true
    where lower(email) = lower(v_email);

    if not found then
      begin
        insert into public.users (id, email, name, is_admin, created_at, updated_at)
        values (v_auth_id::text, v_email, 'Main Admin', true, v_now_ms, v_now_ms);
      exception
        when undefined_column then
          -- Fallback for leaner schemas.
          insert into public.users (id, email, is_admin)
          values (v_auth_id::text, v_email, true);
        when not_null_violation then
          raise exception 'public.users requires additional required columns. Create row for % manually, then set is_admin=true.', v_email;
      end;
    end if;

    update public.users
    set is_admin = true
    where id = v_auth_id::text or lower(email) = lower(v_email);
  end if;
end;
$$;

commit;
