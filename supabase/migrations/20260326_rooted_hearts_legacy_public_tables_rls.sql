begin;

do $$
declare
  v_users_has_is_admin boolean := false;
begin
  if to_regclass('public.users') is not null then
    execute 'alter table public.users enable row level security';

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'users'
        and column_name = 'is_admin'
    )
    into v_users_has_is_admin;

    execute 'drop policy if exists users_authenticated_select on public.users';
    execute $sql$
      create policy users_authenticated_select
      on public.users
      for select
      using (auth.role() = 'authenticated')
    $sql$;

    execute 'drop policy if exists users_self_insert on public.users';
    if v_users_has_is_admin then
      execute $sql$
        create policy users_self_insert
        on public.users
        for insert
        with check (
          (auth.uid() is not null and auth.uid()::text = id::text and coalesce(is_admin, false) = false)
          or public.rh_is_admin()
        )
      $sql$;
    else
      execute $sql$
        create policy users_self_insert
        on public.users
        for insert
        with check (
          auth.uid() is not null and auth.uid()::text = id::text
        )
      $sql$;
    end if;

    execute 'drop policy if exists users_self_or_admin_update on public.users';
    if v_users_has_is_admin then
      execute $sql$
        create policy users_self_or_admin_update
        on public.users
        for update
        using (
          auth.uid()::text = id::text
          or public.rh_is_admin()
        )
        with check (
          (auth.uid()::text = id::text and coalesce(is_admin, false) = false)
          or public.rh_is_admin()
        )
      $sql$;
    else
      execute $sql$
        create policy users_self_or_admin_update
        on public.users
        for update
        using (
          auth.uid()::text = id::text
          or public.rh_is_admin()
        )
        with check (
          auth.uid()::text = id::text
          or public.rh_is_admin()
        )
      $sql$;
    end if;

    execute 'drop policy if exists users_admin_delete on public.users';
    execute $sql$
      create policy users_admin_delete
      on public.users
      for delete
      using (public.rh_is_admin())
    $sql$;
  end if;

  if to_regclass('public.assessment_results') is not null then
    execute 'alter table public.assessment_results enable row level security';

    execute 'drop policy if exists assessment_results_self_select on public.assessment_results';
    execute $sql$
      create policy assessment_results_self_select
      on public.assessment_results
      for select
      using (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists assessment_results_self_insert on public.assessment_results';
    execute $sql$
      create policy assessment_results_self_insert
      on public.assessment_results
      for insert
      with check (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists assessment_results_self_update on public.assessment_results';
    execute $sql$
      create policy assessment_results_self_update
      on public.assessment_results
      for update
      using (auth.uid()::text = user_id::text)
      with check (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists assessment_results_self_delete on public.assessment_results';
    execute $sql$
      create policy assessment_results_self_delete
      on public.assessment_results
      for delete
      using (auth.uid()::text = user_id::text)
    $sql$;
  end if;

  if to_regclass('public.journal_entries') is not null then
    execute 'alter table public.journal_entries enable row level security';

    execute 'drop policy if exists journal_entries_self_select on public.journal_entries';
    execute $sql$
      create policy journal_entries_self_select
      on public.journal_entries
      for select
      using (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists journal_entries_self_insert on public.journal_entries';
    execute $sql$
      create policy journal_entries_self_insert
      on public.journal_entries
      for insert
      with check (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists journal_entries_self_update on public.journal_entries';
    execute $sql$
      create policy journal_entries_self_update
      on public.journal_entries
      for update
      using (auth.uid()::text = user_id::text)
      with check (auth.uid()::text = user_id::text)
    $sql$;

    execute 'drop policy if exists journal_entries_self_delete on public.journal_entries';
    execute $sql$
      create policy journal_entries_self_delete
      on public.journal_entries
      for delete
      using (auth.uid()::text = user_id::text)
    $sql$;
  end if;

  if to_regclass('public.reports') is not null then
    execute 'alter table public.reports enable row level security';

    execute 'drop policy if exists reports_owner_or_admin_select on public.reports';
    execute $sql$
      create policy reports_owner_or_admin_select
      on public.reports
      for select
      using (
        auth.uid()::text = reporter_id::text
        or public.rh_is_admin()
      )
    $sql$;

    execute 'drop policy if exists reports_owner_insert on public.reports';
    execute $sql$
      create policy reports_owner_insert
      on public.reports
      for insert
      with check (
        auth.uid()::text = reporter_id::text
        or public.rh_is_admin()
      )
    $sql$;

    execute 'drop policy if exists reports_admin_update on public.reports';
    execute $sql$
      create policy reports_admin_update
      on public.reports
      for update
      using (public.rh_is_admin())
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists reports_admin_delete on public.reports';
    execute $sql$
      create policy reports_admin_delete
      on public.reports
      for delete
      using (public.rh_is_admin())
    $sql$;
  end if;

  if to_regclass('public.support_messages') is not null then
    execute 'alter table public.support_messages enable row level security';

    execute 'drop policy if exists support_messages_owner_or_admin_select on public.support_messages';
    execute $sql$
      create policy support_messages_owner_or_admin_select
      on public.support_messages
      for select
      using (
        auth.uid()::text = user_id::text
        or public.rh_is_admin()
      )
    $sql$;

    execute 'drop policy if exists support_messages_owner_insert on public.support_messages';
    execute $sql$
      create policy support_messages_owner_insert
      on public.support_messages
      for insert
      with check (
        auth.uid()::text = user_id::text
        or public.rh_is_admin()
      )
    $sql$;

    execute 'drop policy if exists support_messages_admin_update on public.support_messages';
    execute $sql$
      create policy support_messages_admin_update
      on public.support_messages
      for update
      using (public.rh_is_admin())
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists support_messages_admin_delete on public.support_messages';
    execute $sql$
      create policy support_messages_admin_delete
      on public.support_messages
      for delete
      using (public.rh_is_admin())
    $sql$;
  end if;

  if to_regclass('public.blogs') is not null then
    execute 'alter table public.blogs enable row level security';

    execute 'drop policy if exists blogs_public_select on public.blogs';
    execute $sql$
      create policy blogs_public_select
      on public.blogs
      for select
      using (true)
    $sql$;

    execute 'drop policy if exists blogs_admin_insert on public.blogs';
    execute $sql$
      create policy blogs_admin_insert
      on public.blogs
      for insert
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists blogs_admin_update on public.blogs';
    execute $sql$
      create policy blogs_admin_update
      on public.blogs
      for update
      using (public.rh_is_admin())
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists blogs_admin_delete on public.blogs';
    execute $sql$
      create policy blogs_admin_delete
      on public.blogs
      for delete
      using (public.rh_is_admin())
    $sql$;
  end if;

  if to_regclass('public.growth_resources') is not null then
    execute 'alter table public.growth_resources enable row level security';

    execute 'drop policy if exists growth_resources_public_select on public.growth_resources';
    execute $sql$
      create policy growth_resources_public_select
      on public.growth_resources
      for select
      using (true)
    $sql$;

    execute 'drop policy if exists growth_resources_admin_insert on public.growth_resources';
    execute $sql$
      create policy growth_resources_admin_insert
      on public.growth_resources
      for insert
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists growth_resources_admin_update on public.growth_resources';
    execute $sql$
      create policy growth_resources_admin_update
      on public.growth_resources
      for update
      using (public.rh_is_admin())
      with check (public.rh_is_admin())
    $sql$;

    execute 'drop policy if exists growth_resources_admin_delete on public.growth_resources';
    execute $sql$
      create policy growth_resources_admin_delete
      on public.growth_resources
      for delete
      using (public.rh_is_admin())
    $sql$;
  end if;
end
$$;

commit;
