revoke execute on function public.confirm_training_log(uuid)
  from public, anon;
grant execute on function public.confirm_training_log(uuid)
  to authenticated;
