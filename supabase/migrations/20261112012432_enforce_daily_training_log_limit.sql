create or replace function public.enforce_daily_training_log_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.team_id::text || ':' || new.training_date::text,
      0
    )
  );

  if exists (
    select 1
    from public.training_logs as existing
    where existing.team_id = new.team_id
      and existing.training_date = new.training_date
  ) then
    raise exception using
      errcode = '23505',
      message = 'Regu ini sudah mencatat aktivitas latihan hari ini. Pencatatan dibuka kembali pukul 00.00 WIB.',
      constraint = 'training_logs_team_training_date_key';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_daily_training_log_limit()
  from public, anon, authenticated;

create trigger training_logs_enforce_daily_limit
  before insert on public.training_logs
  for each row
  execute function public.enforce_daily_training_log_limit();