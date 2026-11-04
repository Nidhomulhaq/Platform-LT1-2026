create or replace function public.set_leaderboard_published(should_publish boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_at timestamptz;
begin
  if (select auth.uid()) is null
    or not public.has_role(array['operator']::public.user_role[]) then
    raise exception 'Only operators can publish the leaderboard'
      using errcode = '42501';
  end if;

  update public.event_settings
  set leaderboard_published = should_publish
  where id
  returning updated_at into changed_at;

  if not found then
    raise exception 'Event settings are not initialized'
      using errcode = 'P0002';
  end if;

  return changed_at;
end;
$$;

revoke all on function public.set_leaderboard_published(boolean) from public;
grant execute on function public.set_leaderboard_published(boolean)
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
  if (select auth.uid()) is null
    or not public.has_role(array['operator']::public.user_role[]) then
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
grant execute on function public.set_certificates_published(boolean)
  to authenticated;