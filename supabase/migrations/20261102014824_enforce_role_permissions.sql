alter table public.profiles
  add column is_active boolean not null default true;

create table public.panitia_assignments (
  id uuid primary key default gen_random_uuid(),
  panitia_id uuid not null references public.profiles(id) on delete cascade,
  competition_id text not null references public.competitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (panitia_id, competition_id)
);

create index panitia_assignments_competition_id_idx
  on public.panitia_assignments(competition_id);

alter table public.panitia_assignments enable row level security;

grant select on public.panitia_assignments to authenticated;
grant insert, update, delete on public.panitia_assignments to authenticated;
grant select (is_active) on public.profiles to authenticated;

create policy "Panitia see their assignments"
  on public.panitia_assignments for select to authenticated
  using (
    panitia_id = (select auth.uid())
    or public.has_role(array['operator']::public.user_role[])
  );
create policy "Operators manage panitia assignments"
  on public.panitia_assignments for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create or replace function public.set_team_pinru(
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
    raise exception 'Only operators can assign a team leader'
      using errcode = '42501';
  end if;

  perform 1
  from public.teams
  where id = target_team_id
  for update;

  if not exists (
    select 1
    from public.team_members as tm
    join public.profiles as p on p.id = tm.user_id
    where tm.user_id = target_user_id
      and tm.team_id = target_team_id
      and p.role = 'peserta'
      and p.is_active
  ) then
    raise exception 'The selected participant is not an active member of this team'
      using errcode = '23514';
  end if;

  update public.team_members
  set is_pinru = false
  where team_id = target_team_id
    and is_pinru;

  update public.team_members
  set is_pinru = true
  where team_id = target_team_id
    and user_id = target_user_id;
end;
$$;

revoke all on function public.set_team_pinru(uuid, uuid) from public;
grant execute on function public.set_team_pinru(uuid, uuid) to authenticated;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as tm
    join public.profiles as p on p.id = tm.user_id
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
      and p.role = 'peserta'
      and p.is_active
  );
$$;

create or replace function public.shares_team_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members as own_member
    join public.team_members as other_member
      on other_member.team_id = own_member.team_id
    join public.profiles as own_profile
      on own_profile.id = own_member.user_id
    where own_member.user_id = (select auth.uid())
      and other_member.user_id = target_user_id
      and own_profile.role = 'peserta'
      and own_profile.is_active
  );
$$;

create or replace function public.can_judge_competition(target_competition_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.judge_assignments as ja
    join public.profiles as p on p.id = ja.juri_id
    where ja.juri_id = (select auth.uid())
      and ja.competition_id = target_competition_id
      and p.is_active
  );
$$;

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
  );

drop policy "Active competitions are public" on public.competitions;
create policy "Active competitions are public"
  on public.competitions for select to anon, authenticated
  using (
    (
      is_active
      and (
        (select auth.uid()) is null
        or public.has_role(array['peserta']::public.user_role[])
      )
    )
    or public.has_role(array['operator']::public.user_role[])
    or exists (
      select 1
      from public.panitia_assignments as pa
      where pa.competition_id = competitions.id
        and pa.panitia_id = (select auth.uid())
    )
    or public.can_judge_competition(id)
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
  );

drop policy "Assigned judges revise scores" on public.scores;
create policy "Assigned judges revise scores"
  on public.scores for update to authenticated
  using (
    public.has_role(array['juri']::public.user_role[])
    and public.can_judge_competition(competition_id)
    and status in ('draft', 'pending_review', 'revision_needed')
  )
  with check (
    public.has_role(array['juri']::public.user_role[])
    and public.can_judge_competition(competition_id)
    and status in ('draft', 'pending_review')
    and juri_id = (select auth.uid())
  );

revoke update on public.scores from authenticated;
grant update (score_value, status, feedback_notes)
  on public.scores to authenticated;

drop policy "Users see relevant submissions" on public.submissions;
create policy "Users see relevant submissions"
  on public.submissions for select to authenticated
  using (
    public.is_team_member(team_id)
    or public.can_judge_competition(competition_id)
    or public.has_role(array['operator']::public.user_role[])
    or exists (
      select 1
      from public.panitia_assignments as pa
      where pa.panitia_id = (select auth.uid())
        and pa.competition_id = submissions.competition_id
    )
  );

drop policy "Team members submit work" on public.submissions;
create policy "Pinru submit work"
  on public.submissions for insert to authenticated
  with check (
    exists (
      select 1
      from public.team_members as tm
      where tm.team_id = submissions.team_id
        and tm.user_id = (select auth.uid())
        and tm.is_pinru
    )
  );

drop policy "Team members update work" on public.submissions;
create policy "Pinru update work"
  on public.submissions for update to authenticated
  using (
    exists (
      select 1
      from public.team_members as tm
      where tm.team_id = submissions.team_id
        and tm.user_id = (select auth.uid())
        and tm.is_pinru
    )
  )
  with check (
    exists (
      select 1
      from public.team_members as tm
      where tm.team_id = submissions.team_id
        and tm.user_id = (select auth.uid())
        and tm.is_pinru
    )
  );

revoke update on public.submissions from authenticated;
grant update (submission_url, answers) on public.submissions to authenticated;

drop policy "Users see relevant attendance" on public.attendance;
create policy "Users see relevant attendance"
  on public.attendance for select to authenticated
  using (
    public.is_team_member(team_id)
    or public.has_role(array['operator']::public.user_role[])
    or exists (
      select 1
      from public.panitia_assignments as pa
      where pa.panitia_id = (select auth.uid())
        and pa.competition_id = attendance.competition_id
    )
  );

drop policy "Event staff record attendance" on public.attendance;
drop policy "Event staff update attendance" on public.attendance;
create policy "Event staff record attendance"
  on public.attendance for insert to authenticated
  with check (
    recorded_by = (select auth.uid())
    and (
      public.has_role(array['operator']::public.user_role[])
      or exists (
        select 1
        from public.panitia_assignments as pa
        where pa.panitia_id = (select auth.uid())
          and pa.competition_id = attendance.competition_id
      )
    )
  );
create policy "Event staff update attendance"
  on public.attendance for update to authenticated
  using (
    public.has_role(array['operator']::public.user_role[])
    or exists (
      select 1
      from public.panitia_assignments as pa
      where pa.panitia_id = (select auth.uid())
        and pa.competition_id = attendance.competition_id
    )
  )
  with check (
    recorded_by = (select auth.uid())
    and (
      public.has_role(array['operator']::public.user_role[])
      or exists (
        select 1
        from public.panitia_assignments as pa
        where pa.panitia_id = (select auth.uid())
          and pa.competition_id = attendance.competition_id
      )
    )
  );

revoke update on public.attendance from authenticated;
grant update (present, recorded_by) on public.attendance to authenticated;

create or replace function public.set_competition_active(
  target_competition_id text,
  should_be_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['operator']::public.user_role[])
    and (
      not public.has_role(array['panitia']::public.user_role[])
      or not exists (
        select 1
        from public.panitia_assignments as pa
        where pa.panitia_id = (select auth.uid())
          and pa.competition_id = target_competition_id
      )
    )
  then
    raise exception 'Only operators or assigned event staff can change competition availability'
      using errcode = '42501';
  end if;

  update public.competitions
  set is_active = should_be_active
  where id = target_competition_id;

  if not found then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_competition_active(text, boolean) from public;
grant execute on function public.set_competition_active(text, boolean)
  to authenticated;

create or replace function public.get_workspace_scores()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sc.id,
        'competitionId', sc.competition_id,
        'teamId', sc.team_id,
        'score', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
            or sc.status = 'approved'
          then sc.score_value
          else null
        end,
        'status', sc.status,
        'feedback', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
            or (public.is_team_member(sc.team_id) and sc.status = 'approved')
          then sc.feedback_notes
          else ''
        end
      ) order by sc.created_at
    ),
    '[]'::jsonb
  )
  from public.scores as sc
  cross join public.event_settings as es
  where
    public.has_role(array['operator']::public.user_role[])
    or (
      public.has_role(array['juri']::public.user_role[])
      and public.can_judge_competition(sc.competition_id)
    )
    or public.is_team_member(sc.team_id)
    or (
      sc.status = 'approved'
      and es.id
      and es.leaderboard_published
    );
$$;