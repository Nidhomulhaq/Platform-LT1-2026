create table public.event_schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 150),
  responsible_person text not null
    check (length(btrim(responsible_person)) between 1 and 150),
  event_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_schedules_valid_time
    check (end_time > start_time),
  constraint event_schedules_no_overlap
    exclude using gist (
      tsrange(event_date + start_time, event_date + end_time, '[)') with &&
    )
);

create index event_schedules_order_idx
  on public.event_schedules(event_date, start_time);

alter table public.event_schedules enable row level security;

revoke all on public.event_schedules from anon, authenticated;
grant select, insert, update, delete
  on public.event_schedules to authenticated;

create policy "Event roles can view schedules"
  on public.event_schedules for select to authenticated
  using (
    public.has_role(
      array['operator', 'panitia', 'peserta', 'pendamping_regu']::public.user_role[]
    )
  );

create policy "Event staff manage schedules"
  on public.event_schedules for all to authenticated
  using (
    public.has_role(array['operator', 'panitia']::public.user_role[])
  )
  with check (
    public.has_role(array['operator', 'panitia']::public.user_role[])
  );

create trigger event_schedules_set_updated_at
  before update on public.event_schedules
  for each row execute function public.set_updated_at();
