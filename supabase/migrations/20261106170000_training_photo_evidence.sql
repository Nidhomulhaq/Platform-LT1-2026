alter table public.training_logs
  alter column evidence_url drop not null,
  add column evidence_path text,
  add column evidence_deleted_at timestamptz,
  add constraint training_logs_evidence_source_check
    check ((evidence_url is not null) <> (evidence_path is not null)),
  add constraint training_logs_evidence_path_check
    check (
      evidence_path is null
      or evidence_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-evidence',
  'training-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Training evidence readable by related users"
on storage.objects for select to authenticated
using (
  bucket_id = 'training-evidence'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
      public.has_role(array['operator']::public.user_role[])
      or public.is_team_member(((storage.foldername(name))[1])::uuid)
      or public.can_access_companion_team(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "Assigned companions upload training evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'training-evidence'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.can_access_companion_team(((storage.foldername(name))[1])::uuid)
    else false
  end
);

create policy "Related users clean up or operators delete confirmed evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'training-evidence'
  and case
    when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
      (
        public.has_role(array['operator']::public.user_role[])
        and exists (
          select 1
          from public.training_logs as log
          where log.evidence_path = storage.objects.name
            and log.confirmed_at is not null
            and log.evidence_deleted_at is null
        )
      )
      or (
        public.can_access_companion_team(((storage.foldername(name))[1])::uuid)
        and not exists (
          select 1
          from public.training_logs as log
          where log.evidence_path = storage.objects.name
        )
      )
    else false
  end
);

create policy "Operators mark confirmed training evidence deleted"
on public.training_logs for update to authenticated
using (
  public.has_role(array['operator']::public.user_role[])
  and confirmed_at is not null
  and evidence_path is not null
  and evidence_deleted_at is null
)
with check (
  public.has_role(array['operator']::public.user_role[])
  and confirmed_at is not null
  and evidence_path is not null
  and evidence_deleted_at is not null
);

grant update (evidence_deleted_at) on public.training_logs to authenticated;
