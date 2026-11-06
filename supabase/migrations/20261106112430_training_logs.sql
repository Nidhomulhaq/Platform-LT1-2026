create table public.training_logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  training_date date not null
    default ((now() at time zone 'Asia/Jakarta')::date),
  evidence_url text not null
    check (
      evidence_url ~* '^https://(drive\.google\.com|docs\.google\.com)(/|[?#]|$)'
    ),
  created_at timestamptz not null default now()
);

create index training_logs_team_training_date_idx
  on public.training_logs (team_id, training_date desc);

alter table public.training_logs enable row level security;

revoke all on public.training_logs from public, anon, authenticated;
grant select, insert on public.training_logs to authenticated;

create policy "Participants read their team's training logs"
  on public.training_logs for select to authenticated
  using (
    public.has_role(array['peserta']::public.user_role[])
    and public.is_team_member(team_id)
  );

create policy "Assigned companions read their team's training logs"
  on public.training_logs for select to authenticated
  using (public.can_access_companion_team(team_id));

create policy "Assigned companions create their team's training logs"
  on public.training_logs for insert to authenticated
  with check (
    public.can_access_companion_team(team_id)
    and created_by = (select auth.uid())
  );
