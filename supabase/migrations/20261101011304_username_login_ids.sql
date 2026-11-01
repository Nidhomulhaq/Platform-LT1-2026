alter table public.profiles
  add column login_id text,
  add constraint profiles_login_id_format
    check (
      login_id is null
      or login_id ~ '^[a-z0-9]+([.-][a-z0-9]+)*$'
    );

create unique index profiles_login_id_unique
  on public.profiles (login_id)
  where login_id is not null;

revoke update on public.profiles from authenticated;
grant update (full_name, phone_number, avatar_url)
  on public.profiles to authenticated;

grant select, insert, update
  on public.profiles, public.schools, public.teams, public.team_members
  to service_role;