alter table public.training_logs
  add column confirmed_at timestamptz,
  add column confirmed_by uuid references public.profiles(id) on delete set null;

alter policy "Assigned companions create their team's training logs"
  on public.training_logs
  with check (
    public.can_access_companion_team(team_id)
    and created_by = (select auth.uid())
    and training_date = (now() at time zone 'Asia/Jakarta')::date
    and confirmed_at is null
    and confirmed_by is null
  );

create policy "Operators read all training logs"
  on public.training_logs for select to authenticated
  using (public.has_role(array['operator']::public.user_role[]));

create policy "Operators confirm training logs"
  on public.training_logs for update to authenticated
  using (
    public.has_role(array['operator']::public.user_role[])
    and confirmed_at is null
  )
  with check (
    public.has_role(array['operator']::public.user_role[])
    and confirmed_at is not null
    and confirmed_by = (select auth.uid())
  );

grant update (confirmed_at, confirmed_by) on public.training_logs
  to authenticated;

create or replace function public.confirm_training_log(target_log_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  confirmation_time timestamptz := now();
begin
  if not public.has_role(array['operator']::public.user_role[]) then
    raise exception 'Only operators can confirm training logs'
      using errcode = '42501';
  end if;

  update public.training_logs
  set confirmed_at = confirmation_time,
      confirmed_by = (select auth.uid())
  where id = target_log_id
    and confirmed_at is null;

  if not found then
    raise exception 'Training log is missing or already confirmed'
      using errcode = 'P0002';
  end if;

  return confirmation_time;
end;
$$;

revoke all on function public.confirm_training_log(uuid) from public;
grant execute on function public.confirm_training_log(uuid) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'training_logs'
  ) then
    alter publication supabase_realtime add table public.training_logs;
  end if;
end;
$$;
