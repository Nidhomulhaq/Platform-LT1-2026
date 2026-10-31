create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('operator', 'panitia', 'juri', 'peserta');
create type public.team_category as enum ('putra', 'putri');
create type public.task_type as enum ('cbt', 'upload', 'live');
create type public.score_status as enum (
  'draft',
  'pending_review',
  'approved',
  'revision_needed'
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 150),
  school_type text not null check (school_type in ('MI', 'MTs')),
  headmaster_name text not null default '',
  headmaster_title text not null default 'Kepala Madrasah / Ka Mabigus',
  pembina_name text not null default '',
  pembina_title text not null default 'Pembina Pramuka',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 150),
  role public.user_role not null default 'peserta',
  school_id uuid references public.schools(id) on delete set null,
  phone_number text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  category public.team_category not null,
  school_id uuid not null references public.schools(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, name, category)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  is_pinru boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create unique index team_members_one_pinru_per_team
  on public.team_members(team_id)
  where is_pinru;

create table public.competitions (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 1 and 150),
  description text not null default '',
  task_type public.task_type not null,
  max_score numeric(5, 2) not null default 100
    check (max_score > 0 and max_score <= 1000),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  juri_id uuid not null references public.profiles(id) on delete cascade,
  competition_id text not null references public.competitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (juri_id, competition_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  submission_url text not null default '',
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, team_id)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  juri_id uuid references public.profiles(id) on delete set null,
  score_value numeric(5, 2) not null check (score_value >= 0 and score_value <= 100),
  status public.score_status not null default 'draft',
  feedback_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, team_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  present boolean not null default false,
  recorded_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (competition_id, team_id)
);

create table public.event_settings (
  id boolean primary key default true check (id),
  leaderboard_published boolean not null default false,
  certificates_published boolean not null default false,
  certificates_published_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (certificates_published and certificates_published_at is not null)
    or (not certificates_published and certificates_published_at is null)
  )
);

insert into public.event_settings (id) values (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();
create trigger competitions_set_updated_at
  before update on public.competitions
  for each row execute function public.set_updated_at();
create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();
create trigger scores_set_updated_at
  before update on public.scores
  for each row execute function public.set_updated_at();
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();
create trigger event_settings_set_updated_at
  before update on public.event_settings
  for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles as p where p.id = (select auth.uid());
$$;

create or replace function public.has_role(allowed_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = any (allowed_roles), false);
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
    where tm.team_id = target_team_id
      and tm.user_id = (select auth.uid())
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
    where own_member.user_id = (select auth.uid())
      and other_member.user_id = target_user_id
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
    where ja.juri_id = (select auth.uid())
      and ja.competition_id = target_competition_id
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1),
      'Peserta'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.competitions enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.scores enable row level security;
alter table public.attendance enable row level security;
alter table public.event_settings enable row level security;

grant usage on type public.user_role to authenticated;
grant usage on type public.team_category to authenticated;
grant usage on type public.task_type to authenticated;
grant usage on type public.score_status to authenticated;

grant select on public.schools, public.teams, public.competitions,
  public.event_settings to anon, authenticated;
revoke select on public.scores from anon, authenticated;
grant select (id) on public.scores to anon;
grant select (id, competition_id, team_id) on public.scores to authenticated;
revoke select on public.profiles from authenticated;
grant select (id, full_name, role, school_id) on public.profiles to authenticated;
grant update on public.profiles to authenticated;
grant select on public.team_members, public.judge_assignments,
  public.submissions, public.attendance to authenticated;
grant insert, update on public.submissions to authenticated;
grant insert, update on public.scores to authenticated;
grant insert, update on public.attendance to authenticated;
grant insert, update, delete on public.schools, public.teams,
  public.competitions, public.team_members, public.judge_assignments to authenticated;
revoke update on public.event_settings from authenticated;

create policy "Schools are readable"
  on public.schools for select to anon, authenticated
  using (true);
create policy "Operators manage schools"
  on public.schools for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Users read visible profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.shares_team_with(id)
    or public.has_role(array['operator', 'panitia', 'juri']::public.user_role[])
  );
create policy "Users update own non-role profile fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = public.current_user_role()
  );
create policy "Operators manage profiles"
  on public.profiles for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Published teams are public"
  on public.teams for select to anon, authenticated
  using (
    exists (
      select 1 from public.event_settings as es
      where es.id and es.leaderboard_published
    )
    or public.is_team_member(id)
    or public.has_role(array['operator', 'panitia', 'juri']::public.user_role[])
  );
create policy "Operators manage teams"
  on public.teams for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Active competitions are public"
  on public.competitions for select to anon, authenticated
  using (
    is_active
    or public.has_role(array['operator', 'panitia', 'juri']::public.user_role[])
  );
create policy "Operators manage competitions"
  on public.competitions for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Users see relevant team memberships"
  on public.team_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_team_member(team_id)
    or public.has_role(array['operator', 'panitia', 'juri']::public.user_role[])
  );
create policy "Operators manage team memberships"
  on public.team_members for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Judges see their assignments"
  on public.judge_assignments for select to authenticated
  using (
    juri_id = (select auth.uid())
    or public.has_role(array['operator']::public.user_role[])
  );
create policy "Operators manage judge assignments"
  on public.judge_assignments for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Users see published or team scores"
  on public.scores for select to anon, authenticated
  using (
    (
      status = 'approved'
      and exists (
        select 1 from public.event_settings as es
        where es.id and (es.leaderboard_published or es.certificates_published)
      )
    )
    or public.is_team_member(team_id)
    or public.can_judge_competition(competition_id)
    or public.has_role(array['operator']::public.user_role[])
  );
create policy "Assigned judges submit scores"
  on public.scores for insert to authenticated
  with check (
    public.has_role(array['juri']::public.user_role[])
    and public.can_judge_competition(competition_id)
    and status in ('draft', 'pending_review')
    and (juri_id is null or juri_id = (select auth.uid()))
  );
create policy "Assigned judges revise scores"
  on public.scores for update to authenticated
  using (
    public.has_role(array['juri']::public.user_role[])
    and public.can_judge_competition(competition_id)
    and status in ('draft', 'revision_needed')
  )
  with check (
    public.has_role(array['juri']::public.user_role[])
    and public.can_judge_competition(competition_id)
    and status in ('draft', 'pending_review')
    and juri_id = (select auth.uid())
  );
create policy "Operators review scores"
  on public.scores for update to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));
create policy "Operators manage scores"
  on public.scores for delete to authenticated
  using (public.has_role(array['operator']::public.user_role[]));

create policy "Users see relevant submissions"
  on public.submissions for select to authenticated
  using (
    public.is_team_member(team_id)
    or public.can_judge_competition(competition_id)
    or public.has_role(array['operator', 'panitia']::public.user_role[])
  );
create policy "Team members submit work"
  on public.submissions for insert to authenticated
  with check (public.is_team_member(team_id));
create policy "Team members update work"
  on public.submissions for update to authenticated
  using (public.is_team_member(team_id))
  with check (public.is_team_member(team_id));
create policy "Operators manage submissions"
  on public.submissions for all to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

create policy "Users see relevant attendance"
  on public.attendance for select to authenticated
  using (
    public.is_team_member(team_id)
    or public.has_role(array['operator', 'panitia']::public.user_role[])
  );
create policy "Event staff record attendance"
  on public.attendance for insert to authenticated
  with check (
    public.has_role(array['operator', 'panitia']::public.user_role[])
    and recorded_by = (select auth.uid())
  );
create policy "Event staff update attendance"
  on public.attendance for update to authenticated
  using (public.has_role(array['operator', 'panitia']::public.user_role[]))
  with check (public.has_role(array['operator', 'panitia']::public.user_role[]));

create policy "Publication settings are readable"
  on public.event_settings for select to anon, authenticated
  using (true);
create policy "Operators publish event results"
  on public.event_settings for update to authenticated
  using (public.has_role(array['operator']::public.user_role[]))
  with check (public.has_role(array['operator']::public.user_role[]));

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
  if not public.has_role(array['operator', 'panitia']::public.user_role[]) then
    raise exception 'Only event staff can change competition availability'
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

grant execute on function public.set_competition_active(text, boolean)
  to authenticated;

create or replace function public.set_certificates_published(should_publish boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  issued_at timestamptz;
begin
  if not public.has_role(array['operator']::public.user_role[]) then
    raise exception 'Only operators can publish certificates'
      using errcode = '42501';
  end if;

  if should_publish and (
    not exists (select 1 from public.teams)
    or not exists (select 1 from public.competitions)
    or exists (
      select 1
      from public.teams as t
      cross join public.competitions as c
      left join public.scores as sc
        on sc.team_id = t.id
        and sc.competition_id = c.id
      where sc.id is null or sc.status <> 'approved'
    )
  ) then
    raise exception 'All team scores must be approved before certificates are published'
      using errcode = '23514';
  end if;

  update public.event_settings
  set certificates_published = should_publish,
      certificates_published_at = case
        when should_publish then now()
        else null
      end
  where id
  returning certificates_published_at into issued_at;

  if not found then
    raise exception 'Event settings are not initialized' using errcode = 'P0002';
  end if;

  return issued_at;
end;
$$;

revoke all on function public.set_certificates_published(boolean) from public;
grant execute on function public.set_certificates_published(boolean) to authenticated;

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
        'score', sc.score_value,
        'status', sc.status,
        'feedback', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
            or public.is_team_member(sc.team_id)
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
      and (es.leaderboard_published or es.certificates_published)
    );
$$;

revoke all on function public.get_workspace_scores() from public;
grant execute on function public.get_workspace_scores() to anon, authenticated;

create or replace function public.get_public_certificate(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  certificate jsonb;
begin
  select jsonb_build_object(
    'userId', p.id,
    'participant', jsonb_build_object(
      'id', p.id,
      'name', p.full_name
    ),
    'team', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'category', t.category
    ),
    'school', jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'schoolType', s.school_type,
      'headmasterName', s.headmaster_name,
      'headmasterTitle', s.headmaster_title,
      'pembinaName', s.pembina_name,
      'pembinaTitle', s.pembina_title
    ),
    'scores', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', sc.id,
          'competitionId', c.id,
          'title', c.title,
          'score', sc.score_value,
          'status', sc.status
        ) order by c.created_at
      ) filter (where sc.id is not null),
      '[]'::jsonb
    ),
    'issuedAt', es.certificates_published_at
  )
  into certificate
  from public.profiles as p
  join public.team_members as tm on tm.user_id = p.id
  join public.teams as t on t.id = tm.team_id
  join public.schools as s on s.id = t.school_id
  cross join public.event_settings as es
  left join public.competitions as c on true
  left join public.scores as sc
    on sc.competition_id = c.id
    and sc.team_id = t.id
  where p.id = target_user_id
    and es.id
    and es.certificates_published
  group by p.id, p.full_name, t.id, t.name, t.category, s.id,
    s.name, s.school_type, s.headmaster_name, s.headmaster_title,
    s.pembina_name, s.pembina_title, es.certificates_published_at
  having count(c.id) > 0
    and count(sc.id) filter (where sc.status = 'approved') = count(c.id);

  return certificate;
end;
$$;

revoke all on function public.get_public_certificate(uuid) from public;
grant execute on function public.get_public_certificate(uuid) to anon, authenticated;
