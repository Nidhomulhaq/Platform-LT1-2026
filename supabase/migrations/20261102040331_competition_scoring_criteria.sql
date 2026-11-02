alter table public.competitions
  add column criteria jsonb not null default '[]'::jsonb,
  add constraint competitions_criteria_is_array
    check (jsonb_typeof(criteria) = 'array');

alter table public.scores
  add column criterion_scores jsonb not null default '{}'::jsonb,
  add constraint scores_criterion_scores_is_object
    check (jsonb_typeof(criterion_scores) = 'object');

alter table public.scores
  drop constraint scores_score_value_check,
  alter column score_value type numeric using score_value::numeric,
  add constraint scores_score_value_check check (score_value >= 0),
  drop constraint scores_competition_id_team_id_key;

create unique index scores_one_legacy_record_per_team_competition
  on public.scores (competition_id, team_id)
  where juri_id is null;

create unique index scores_one_record_per_judge_team_competition
  on public.scores (competition_id, team_id, juri_id)
  where juri_id is not null;

grant update (score_value, status, feedback_notes, criterion_scores)
  on public.scores to authenticated;

create or replace function public.validate_competition_score()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  competition_criteria jsonb;
  criterion jsonb;
  criterion_id text;
  criterion_score numeric;
  total_score numeric := 0;
begin
  select c.criteria
    into competition_criteria
    from public.competitions as c
    where c.id = new.competition_id;

  if competition_criteria is null then
    raise exception 'Competition not found' using errcode = '23503';
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

create trigger scores_validate_competition_score
  before insert or update of competition_id, score_value, criterion_scores
  on public.scores
  for each row execute function public.validate_competition_score();

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
        'judgeId', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
          then sc.juri_id
          else null
        end,
        'judgeName', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
          then coalesce(j.full_name, '')
          else ''
        end,
        'criterionScores', case
          when public.has_role(array['operator']::public.user_role[])
            or public.can_judge_competition(sc.competition_id)
          then sc.criterion_scores
          else '{}'::jsonb
        end,
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
  left join public.profiles as j on j.id = sc.juri_id
  cross join public.event_settings as es
  where
    public.has_role(array['operator']::public.user_role[])
    or (
      public.has_role(array['juri']::public.user_role[])
      and public.can_judge_competition(sc.competition_id)
      and sc.juri_id = (select auth.uid())
    )
    or public.is_team_member(sc.team_id)
    or (
      sc.status = 'approved'
      and es.id
      and es.leaderboard_published
    );
$$;
