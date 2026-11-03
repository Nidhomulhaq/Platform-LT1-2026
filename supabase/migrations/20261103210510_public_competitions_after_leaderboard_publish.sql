drop policy if exists "Active competitions are public" on public.competitions;
create policy "Active competitions are public"
  on public.competitions for select to anon, authenticated
  using (
    (
      is_active
      and (
        (select auth.uid()) is null
        or public.has_role(array['peserta']::public.user_role[])
      )
    )
    or public.has_role(array['operator']::public.user_role[])
    or exists (
      select 1
      from public.panitia_assignments as pa
      where pa.competition_id = competitions.id
        and pa.panitia_id = (select auth.uid())
    )
    or public.can_judge_competition(id)
    or exists (
      select 1
      from public.event_settings as es
      where es.id and es.leaderboard_published
    )
  );
