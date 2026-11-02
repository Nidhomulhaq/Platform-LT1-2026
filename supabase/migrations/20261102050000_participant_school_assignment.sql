update public.profiles as p
set school_id = t.school_id
from public.team_members as tm
join public.teams as t on t.id = tm.team_id
where p.id = tm.user_id
  and p.role = 'peserta'
  and p.school_id is null;

alter table public.teams
  drop constraint teams_school_id_name_category_key,
  drop constraint teams_school_id_fkey,
  drop column school_id;

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
          'id', c.id || ':' || t.id,
          'competitionId', c.id,
          'title', c.title,
          'score', sc.score_value,
          'status', 'approved'
        ) order by c.created_at
      ) filter (where c.id is not null),
      '[]'::jsonb
    ),
    'issuedAt', es.certificates_published_at
  )
  into certificate
  from public.profiles as p
  join public.team_members as tm on tm.user_id = p.id
  join public.teams as t on t.id = tm.team_id
  join public.schools as s on s.id = p.school_id
  cross join public.event_settings as es
  left join public.competitions as c on true
  left join (
    select
      competition_id,
      team_id,
      sum(score_value) filter (where status = 'approved') as score_value,
      count(*) filter (where status = 'approved') as approved_count
    from public.scores
    group by competition_id, team_id
  ) as sc
    on sc.competition_id = c.id
    and sc.team_id = t.id
  where p.id = target_user_id
    and es.id
    and es.certificates_published
  group by p.id, p.full_name, t.id, t.name, t.category, s.id,
    s.name, s.school_type, s.headmaster_name, s.headmaster_title,
    s.pembina_name, s.pembina_title, es.certificates_published_at
  having count(c.id) > 0
    and count(c.id) filter (where coalesce(sc.approved_count, 0) > 0)
      = count(c.id);

  return certificate;
end;
$$;
