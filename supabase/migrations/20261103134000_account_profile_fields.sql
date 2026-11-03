alter table public.profiles
  add column place_of_birth text not null default ''
    check (length(place_of_birth) <= 120),
  add column date_of_birth date,
  add column motto text not null default ''
    check (length(motto) <= 240);
