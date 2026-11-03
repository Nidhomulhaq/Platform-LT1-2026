alter table public.teams
  add column pendamping_id uuid references public.profiles(id) on delete set null;

create unique index teams_one_per_pendamping
  on public.teams(pendamping_id)
  where pendamping_id is not null;

create or replace function public.can_access_companion_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.teams as t
    join public.profiles as p on p.id = t.pendamping_id
    where t.id = target_team_id
      and t.pendamping_id = (select auth.uid())
      and p.role = 'pendamping_regu'
      and p.is_active
  );
$$;

revoke all on function public.can_access_companion_team(uuid) from public;
grant execute on function public.can_access_companion_team(uuid)
  to anon, authenticated;

create or replace function public.set_team_pendamping(
  target_user_id uuid,
  target_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['operator']::public.user_role[]) then
    raise exception 'Only operators can assign a team companion'
      using errcode = '42501';
  end if;

  if target_team_id is not null then
    if not exists (
      select 1
      from public.profiles as p
      where p.id = target_user_id
        and p.role = 'pendamping_regu'
        and p.is_active
        and p.school_id is not null
    ) then
      raise exception 'The selected account must be an active team companion with a school'
        using errcode = '23514';
    end if;

    perform 1
    from public.teams
    where id = target_team_id
    for update;

    if not found then
      raise exception 'Team not found' using errcode = 'P0002';
    end if;

    if exists (
      select 1
      from public.teams as t
      where t.id = target_team_id
        and t.pendamping_id is not null
        and t.pendamping_id <> target_user_id
    ) then
      raise exception 'This team already has a companion'
        using errcode = '23505';
    end if;
  elsif not exists (
    select 1
    from public.profiles as p
    where p.id = target_user_id
      and p.role = 'pendamping_regu'
  ) then
    raise exception 'The selected account is not a team companion'
      using errcode = '23514';
  end if;

  update public.teams
  set pendamping_id = null
  where pendamping_id = target_user_id;

  if target_team_id is not null then
    update public.teams
    set pendamping_id = target_user_id
    where id = target_team_id;
  end if;
end;
$$;

revoke all on function public.set_team_pendamping(uuid, uuid) from public;
grant execute on function public.set_team_pendamping(uuid, uuid) to authenticated;

drop policy "Users read visible profiles" on public.profiles;
create policy "Users read visible profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.shares_team_with(id)
    or public.has_role(array['operator']::public.user_role[])
    or (
      public.has_role(array['panitia', 'juri']::public.user_role[])
      and exists (
        select 1
        from public.team_members as tm
        where tm.user_id = profiles.id
      )
      and (
        exists (
          select 1
          from public.panitia_assignments as pa
          where pa.panitia_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.judge_assignments as ja
          where ja.juri_id = (select auth.uid())
        )
      )
    )
    or (
      public.has_role(array['pendamping_regu']::public.user_role[])
      and exists (
        select 1
        from public.team_members as tm
        where tm.user_id = profiles.id
          and public.can_access_companion_team(tm.team_id)
      )
    )
  );

drop policy "Published teams are public" on public.teams;
create policy "Published teams are public"
  on public.teams for select to anon, authenticated
  using (
    exists (
      select 1 from public.event_settings as es
      where es.id and es.leaderboard_published
    )
    or public.is_team_member(id)
    or public.has_role(array['operator']::public.user_role[])
    or (
      public.has_role(array['panitia']::public.user_role[])
      and exists (
        select 1
        from public.panitia_assignments as pa
        where pa.panitia_id = (select auth.uid())
      )
    )
    or (
      public.has_role(array['juri']::public.user_role[])
      and exists (
        select 1
        from public.judge_assignments as ja
        where ja.juri_id = (select auth.uid())
      )
    )
    or public.can_access_companion_team(id)
  );

drop policy "Users see relevant team memberships" on public.team_members;
create policy "Users see relevant team memberships"
  on public.team_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_team_member(team_id)
    or public.has_role(array['operator']::public.user_role[])
    or (
      public.has_role(array['panitia']::public.user_role[])
      and exists (
        select 1
        from public.panitia_assignments as pa
        where pa.panitia_id = (select auth.uid())
      )
    )
    or (
      public.has_role(array['juri']::public.user_role[])
      and exists (
        select 1
        from public.judge_assignments as ja
        where ja.juri_id = (select auth.uid())
      )
    )
    or public.can_access_companion_team(team_id)
  );