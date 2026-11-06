create index training_logs_created_by_idx
  on public.training_logs (created_by);
create index training_logs_confirmed_by_idx
  on public.training_logs (confirmed_by);
create index training_logs_date_created_at_idx
  on public.training_logs (training_date desc, created_at desc);
