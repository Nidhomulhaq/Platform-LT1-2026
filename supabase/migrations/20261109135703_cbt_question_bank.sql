create table public.cbt_question_sets (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null
    references public.competitions(id) on delete cascade,
  version integer not null check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cbt_question_sets_competition_version_key
    unique (competition_id, version),
  constraint cbt_question_sets_id_competition_id_key
    unique (id, competition_id)
);

alter table public.competitions
  add column current_question_set_id uuid,
  add constraint competitions_current_question_set_fkey
    foreign key (current_question_set_id, id)
    references public.cbt_question_sets(id, competition_id)
    on delete set null (current_question_set_id);

create index competitions_current_question_set_id_idx
  on public.competitions(current_question_set_id)
  where current_question_set_id is not null;

create index cbt_question_sets_created_by_idx
  on public.cbt_question_sets(created_by)
  where created_by is not null;

create table public.cbt_questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null
    references public.cbt_question_sets(id) on delete cascade,
  position integer not null check (position > 0),
  prompt text not null check (length(btrim(prompt)) between 1 and 1000),
  options text[] not null check (cardinality(options) = 4),
  created_at timestamptz not null default now(),
  constraint cbt_questions_question_set_position_key
    unique (question_set_id, position)
);

create table public.cbt_answer_keys (
  question_id uuid primary key
    references public.cbt_questions(id) on delete cascade,
  correct_option smallint not null check (correct_option between 1 and 4),
  created_at timestamptz not null default now()
);

create table public.cbt_attempts (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null
    references public.competitions(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  question_set_id uuid not null,
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  constraint cbt_attempts_one_per_team_key unique (competition_id, team_id),
  constraint cbt_attempts_question_set_competition_fkey
    foreign key (question_set_id, competition_id)
    references public.cbt_question_sets(id, competition_id),
  constraint cbt_attempts_id_competition_team_key
    unique (id, competition_id, team_id)
);

create index cbt_attempts_question_set_id_idx
  on public.cbt_attempts(question_set_id);

create index cbt_attempts_team_id_idx
  on public.cbt_attempts(team_id);

create index cbt_attempts_started_by_idx
  on public.cbt_attempts(started_by)
  where started_by is not null;

alter table public.submissions
  add column cbt_attempt_id uuid,
  add constraint submissions_cbt_attempt_fkey
    foreign key (cbt_attempt_id, competition_id, team_id)
    references public.cbt_attempts(id, competition_id, team_id)
    on delete cascade;

create index submissions_cbt_attempt_id_idx
  on public.submissions(cbt_attempt_id)
  where cbt_attempt_id is not null;

alter table public.cbt_question_sets enable row level security;
alter table public.cbt_questions enable row level security;
alter table public.cbt_answer_keys enable row level security;
alter table public.cbt_attempts enable row level security;

revoke all on table
  public.cbt_question_sets,
  public.cbt_questions,
  public.cbt_answer_keys,
  public.cbt_attempts
from public, anon, authenticated;

grant select on table
  public.cbt_question_sets,
  public.cbt_questions,
  public.cbt_answer_keys
to authenticated;

create policy "Operators read CBT question sets"
  on public.cbt_question_sets for select to authenticated
  using (public.has_role(array['operator']::public.user_role[]));

create policy "Operators read CBT questions"
  on public.cbt_questions for select to authenticated
  using (public.has_role(array['operator']::public.user_role[]));

create policy "Operators read CBT answer keys"
  on public.cbt_answer_keys for select to authenticated
  using (public.has_role(array['operator']::public.user_role[]));

create or replace function public.save_competition_questions(
  target_competition_id text,
  question_set jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  competition_task_type public.task_type;
  next_version integer;
  new_question_set_id uuid;
  question_item jsonb;
  option_item jsonb;
  question_position integer;
  prompt_text text;
  option_values text[];
  correct_option_value smallint;
  new_question_id uuid;
begin
  if auth.uid() is null
    or not public.has_role(array['operator']::public.user_role[]) then
    raise exception 'Only operators can manage CBT questions'
      using errcode = '42501';
  end if;

  select c.task_type
    into competition_task_type
    from public.competitions as c
    where c.id = target_competition_id
    for update;

  if not found then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;
  if competition_task_type <> 'cbt' then
    raise exception 'Questions can only be saved for CBT competitions'
      using errcode = '23514';
  end if;
  if jsonb_typeof(question_set) is distinct from 'array' then
    raise exception 'The question bank must be a JSON array'
      using errcode = '22023';
  end if;
  if jsonb_array_length(question_set) = 0 then
    raise exception 'A CBT question bank must contain at least one question'
      using errcode = '23514';
  end if;

  select coalesce(max(qs.version), 0) + 1
    into next_version
    from public.cbt_question_sets as qs
    where qs.competition_id = target_competition_id;

  insert into public.cbt_question_sets (
    competition_id,
    version,
    created_by
  )
  values (
    target_competition_id,
    next_version,
    auth.uid()
  )
  returning id into new_question_set_id;

  for question_item, question_position in
    select item.value, item.ordinality::integer
    from jsonb_array_elements(question_set) with ordinality as item(value, ordinality)
  loop
    if jsonb_typeof(question_item) is distinct from 'object'
      or jsonb_typeof(question_item -> 'prompt') is distinct from 'string'
      or jsonb_typeof(question_item -> 'options') is distinct from 'array'
      or jsonb_typeof(question_item -> 'correct_option') is distinct from 'number'
      or (question_item ->> 'correct_option') !~ '^[1-4]$' then
      raise exception 'Question % is invalid', question_position
        using errcode = '22023';
    end if;

    prompt_text := btrim(question_item ->> 'prompt');
    if length(prompt_text) not between 1 and 1000 then
      raise exception 'Question % must contain 1 to 1000 characters',
        question_position using errcode = '22023';
    end if;

    if jsonb_array_length(question_item -> 'options') <> 4 then
      raise exception 'Question % must have exactly four options',
        question_position using errcode = '22023';
    end if;

    for option_item in
      select item.value
      from jsonb_array_elements(question_item -> 'options') as item(value)
    loop
      if jsonb_typeof(option_item) is distinct from 'string'
        or length(btrim(option_item #>> '{}')) not between 1 and 500 then
        raise exception 'Every option in question % must contain 1 to 500 characters',
          question_position using errcode = '22023';
      end if;
    end loop;

    select array_agg(btrim(item.value) order by item.ordinality)
      into option_values
      from jsonb_array_elements_text(question_item -> 'options')
        with ordinality as item(value, ordinality);

    if (
      select count(distinct lower(option_value))
      from unnest(option_values) as option_value
    ) <> 4 then
      raise exception 'Question % must have four distinct options',
        question_position using errcode = '22023';
    end if;

    correct_option_value := (question_item ->> 'correct_option')::smallint;

    insert into public.cbt_questions (
      question_set_id,
      position,
      prompt,
      options
    )
    values (
      new_question_set_id,
      question_position,
      prompt_text,
      option_values
    )
    returning id into new_question_id;

    insert into public.cbt_answer_keys (question_id, correct_option)
    values (new_question_id, correct_option_value);
  end loop;

  update public.competitions
  set current_question_set_id = new_question_set_id,
      updated_at = now()
  where id = target_competition_id;

  return new_question_set_id;
end;
$$;

revoke all on function public.save_competition_questions(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_competition_questions(text, jsonb)
  to authenticated;

create or replace function public.start_cbt_attempt(
  target_competition_id text
)
returns table (
  attempt_id uuid,
  question_id uuid,
  "position" integer,
  prompt text,
  options text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_question_set uuid;
  participant_team_id uuid;
  current_attempt_id uuid;
begin
  if auth.uid() is null
    or not public.has_role(array['peserta']::public.user_role[]) then
    raise exception 'Only active participants can start a CBT attempt'
      using errcode = '42501';
  end if;

  select tm.team_id
    into participant_team_id
    from public.team_members as tm
    join public.profiles as p on p.id = tm.user_id
    where tm.user_id = auth.uid()
      and tm.is_pinru
      and p.role = 'peserta'
      and p.is_active;

  if not found then
    raise exception 'Only the active Pinru can start the team CBT'
      using errcode = '42501';
  end if;

  select c.current_question_set_id
    into current_question_set
    from public.competitions as c
    where c.id = target_competition_id
      and c.task_type = 'cbt'
      and c.is_active
    for share;

  if not found then
    raise exception 'This CBT competition is not currently released'
      using errcode = '55000';
  end if;
  if current_question_set is null or not exists (
    select 1
    from public.cbt_questions as q
    where q.question_set_id = current_question_set
  ) then
    raise exception 'This CBT competition has no available questions'
      using errcode = '55000';
  end if;
  if exists (
    select 1
    from public.submissions as s
    where s.competition_id = target_competition_id
      and s.team_id = participant_team_id
  ) then
    raise exception 'This team has already submitted its CBT answers'
      using errcode = '23505';
  end if;

  insert into public.cbt_attempts (
    competition_id,
    team_id,
    question_set_id,
    started_by
  )
  values (
    target_competition_id,
    participant_team_id,
    current_question_set,
    auth.uid()
  )
  on conflict (competition_id, team_id) do nothing;

  select a.id
    into current_attempt_id
    from public.cbt_attempts as a
    where a.competition_id = target_competition_id
      and a.team_id = participant_team_id;

  return query
    select
      current_attempt_id,
      q.id,
      q.position,
      q.prompt,
      q.options
    from public.cbt_questions as q
    join public.cbt_attempts as a on a.question_set_id = q.question_set_id
    where a.id = current_attempt_id
    order by q.position;
end;
$$;

revoke all on function public.start_cbt_attempt(text)
  from public, anon, authenticated;
grant execute on function public.start_cbt_attempt(text)
  to authenticated;

create or replace function public.reject_direct_cbt_submission_mutations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(
      pg_catalog.current_setting('app.allow_cbt_submission_write', true),
      ''
    ) = 'on' then
    return new;
  end if;

  if exists (
    select 1
    from public.competitions as c
    where c.id = new.competition_id
      and c.task_type = 'cbt'
  ) or (
    tg_op = 'UPDATE'
    and exists (
      select 1
      from public.competitions as c
      where c.id = old.competition_id
        and c.task_type = 'cbt'
    )
  ) then
    raise exception 'CBT answers must be submitted through the scoring function'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_direct_cbt_submission_mutations()
  from public, anon, authenticated;

create trigger submissions_reject_direct_cbt_mutations
  before insert or update on public.submissions
  for each row execute function public.reject_direct_cbt_submission_mutations();

create or replace function public.prevent_competition_task_type_change_after_activity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.task_type is distinct from new.task_type and (
    exists (
      select 1
      from public.submissions as s
      where s.competition_id = old.id
    )
    or exists (
      select 1
      from public.scores as sc
      where sc.competition_id = old.id
    )
    or exists (
      select 1
      from public.cbt_attempts as a
      where a.competition_id = old.id
    )
  ) then
    raise exception 'Task type cannot change after submissions, attempts, or scores exist'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger competitions_lock_task_type_after_activity
  before update of task_type on public.competitions
  for each row execute function public.prevent_competition_task_type_change_after_activity();

create or replace function public.submit_cbt_answers(
  target_attempt_id uuid,
  selected_answers jsonb
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_competition_id text;
  attempt_team_id uuid;
  attempt_question_set_id uuid;
  total_questions integer;
  correct_answers integer := 0;
  selected_option smallint;
  selected_option_value jsonb;
  question_record record;
  final_score numeric;
begin
  if auth.uid() is null
    or not public.has_role(array['peserta']::public.user_role[]) then
    raise exception 'Only active participants can submit CBT answers'
      using errcode = '42501';
  end if;

  select a.competition_id, a.team_id, a.question_set_id
    into attempt_competition_id, attempt_team_id, attempt_question_set_id
    from public.cbt_attempts as a
    where a.id = target_attempt_id
    for update;

  if not found then
    raise exception 'CBT attempt not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.team_members as tm
    join public.profiles as p on p.id = tm.user_id
    where tm.team_id = attempt_team_id
      and tm.user_id = auth.uid()
      and tm.is_pinru
      and p.role = 'peserta'
      and p.is_active
  ) then
    raise exception 'Only the active Pinru can submit the team CBT'
      using errcode = '42501';
  end if;

  if jsonb_typeof(selected_answers) is distinct from 'object' then
    raise exception 'CBT answers must be a JSON object'
      using errcode = '22023';
  end if;

  select count(*)
    into total_questions
    from public.cbt_questions as q
    join public.cbt_answer_keys as answer_key
      on answer_key.question_id = q.id
    where q.question_set_id = attempt_question_set_id;

  if total_questions = 0
    or jsonb_object_length(selected_answers) <> total_questions then
    raise exception 'Submit exactly one answer for every CBT question'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.submissions as s
    where s.competition_id = attempt_competition_id
      and s.team_id = attempt_team_id
  ) then
    raise exception 'This team has already submitted its CBT answers'
      using errcode = '23505';
  end if;
  if exists (
    select 1
    from public.scores as sc
    where sc.competition_id = attempt_competition_id
      and sc.team_id = attempt_team_id
  ) then
    raise exception 'A score already exists for this team and competition'
      using errcode = '23505';
  end if;

  for question_record in
    select q.id, answer_key.correct_option
    from public.cbt_questions as q
    join public.cbt_answer_keys as answer_key
      on answer_key.question_id = q.id
    where q.question_set_id = attempt_question_set_id
    order by q.position
  loop
    selected_option_value := selected_answers -> question_record.id::text;
    if jsonb_typeof(selected_option_value) is distinct from 'number'
      or (selected_option_value #>> '{}') !~ '^[1-4]$' then
      raise exception 'Every answer must select one of the four options'
        using errcode = '22023';
    end if;

    selected_option := (selected_option_value #>> '{}')::smallint;
    if selected_option = question_record.correct_option then
      correct_answers := correct_answers + 1;
    end if;
  end loop;

  final_score := round(
    correct_answers::numeric * 100 / total_questions,
    2
  );

  perform pg_catalog.set_config(
    'app.allow_cbt_submission_write',
    'on',
    true
  );

  insert into public.submissions (
    competition_id,
    team_id,
    cbt_attempt_id,
    submission_url,
    answers
  )
  values (
    attempt_competition_id,
    attempt_team_id,
    target_attempt_id,
    '',
    selected_answers
  );

  insert into public.scores (
    competition_id,
    team_id,
    juri_id,
    score_value,
    criterion_scores,
    status,
    feedback_notes
  )
  values (
    attempt_competition_id,
    attempt_team_id,
    null,
    final_score,
    '{}'::jsonb,
    'approved',
    'Nilai dihitung otomatis dari jawaban CBT.'
  );

  return final_score;
end;
$$;

revoke all on function public.submit_cbt_answers(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_cbt_answers(uuid, jsonb)
  to authenticated;

create or replace function public.validate_competition_score()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  competition_criteria jsonb;
  competition_task_type public.task_type;
  criterion jsonb;
  criterion_id text;
  criterion_score numeric;
  total_score numeric := 0;
  cbt_total_questions integer;
  cbt_correct_answers integer;
  cbt_expected_score numeric;
begin
  select c.criteria, c.task_type
    into competition_criteria, competition_task_type
    from public.competitions as c
    where c.id = new.competition_id;

  if not found then
    raise exception 'Competition not found' using errcode = '23503';
  end if;

  if competition_task_type = 'cbt' then
    if new.juri_id is not null
      or new.criterion_scores <> '{}'::jsonb
      or new.status <> 'approved' then
      raise exception 'CBT scores are calculated automatically'
        using errcode = '23514';
    end if;

    select
      count(*)::integer,
      count(*) filter (
        where (submission.answers ->> q.id::text)::smallint
          = answer_key.correct_option
      )::integer
      into cbt_total_questions, cbt_correct_answers
      from public.cbt_questions as q
      join public.cbt_answer_keys as answer_key
        on answer_key.question_id = q.id
      join public.cbt_attempts as attempt
        on attempt.question_set_id = q.question_set_id
      join public.submissions as submission
        on submission.cbt_attempt_id = attempt.id
      where attempt.competition_id = new.competition_id
        and attempt.team_id = new.team_id;

    if cbt_total_questions = 0 then
      raise exception 'A CBT score requires a submitted attempt'
        using errcode = '23514';
    end if;

    cbt_expected_score := round(
      cbt_correct_answers::numeric * 100 / cbt_total_questions,
      2
    );
    if new.score_value <> cbt_expected_score then
      raise exception 'CBT score must match the submitted answers'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if jsonb_array_length(competition_criteria) = 0 then
    if new.criterion_scores <> '{}'::jsonb or new.score_value > 100 then
      raise exception 'This competition accepts a single score from 0 to 100'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if jsonb_object_length(new.criterion_scores)
      <> jsonb_array_length(competition_criteria) then
    raise exception 'Every competition criterion must have exactly one score'
      using errcode = '23514';
  end if;

  for criterion in
    select item.value from jsonb_array_elements(competition_criteria) as item
  loop
    criterion_id := criterion ->> 'id';
    if criterion_id is null
      or length(trim(criterion_id)) = 0
      or jsonb_typeof(new.criterion_scores -> criterion_id)
        is distinct from 'number' then
      raise exception 'Competition criterion scores are invalid'
        using errcode = '23514';
    end if;

    criterion_score := (new.criterion_scores ->> criterion_id)::numeric;
    if criterion_score < 0 or criterion_score > 100 then
      raise exception 'Each competition criterion score must be from 0 to 100'
        using errcode = '23514';
    end if;
    total_score := total_score + criterion_score;
  end loop;

  if new.score_value <> total_score then
    raise exception 'Total score must equal the sum of criterion scores'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_competition_score() from public;

drop trigger scores_validate_competition_score on public.scores;
create trigger scores_validate_competition_score
  before insert or update of
    competition_id,
    team_id,
    juri_id,
    score_value,
    criterion_scores,
    status
  on public.scores
  for each row execute function public.validate_competition_score();

create or replace function public.set_competition_active(
  target_competition_id text,
  should_be_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  competition_task_type public.task_type;
  current_question_set uuid;
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

  select c.task_type, c.current_question_set_id
    into competition_task_type, current_question_set
    from public.competitions as c
    where c.id = target_competition_id
    for update;

  if not found then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;

  if should_be_active
    and competition_task_type = 'cbt'
    and (
      current_question_set is null
      or not exists (
        select 1
        from public.cbt_questions as q
        where q.question_set_id = current_question_set
      )
    )
  then
    raise exception 'Add at least one CBT question before releasing this competition'
      using errcode = '23514';
  end if;

  update public.competitions
  set is_active = should_be_active,
      updated_at = now()
  where id = target_competition_id;
end;
$$;

revoke all on function public.set_competition_active(text, boolean)
  from public, anon, authenticated;
grant execute on function public.set_competition_active(text, boolean)
  to authenticated;