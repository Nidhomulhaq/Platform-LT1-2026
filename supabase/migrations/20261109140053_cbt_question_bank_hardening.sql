drop index public.competitions_current_question_set_id_idx;
create index competitions_current_question_set_id_idx
  on public.competitions(current_question_set_id, id)
  where current_question_set_id is not null;

drop index public.cbt_attempts_question_set_id_idx;
create index cbt_attempts_question_set_competition_idx
  on public.cbt_attempts(question_set_id, competition_id);

drop index public.submissions_cbt_attempt_id_idx;
create index submissions_cbt_attempt_id_idx
  on public.submissions(cbt_attempt_id, competition_id, team_id)
  where cbt_attempt_id is not null;

create policy "Deny direct CBT attempt access"
  on public.cbt_attempts for all to authenticated
  using (false)
  with check (false);