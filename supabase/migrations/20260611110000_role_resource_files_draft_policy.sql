-- Issue #36 follow-up: hide draft resources' attachment metadata from non-admin
-- members (the original policy let any member enumerate file rows directly via
-- PostgREST even when the parent resource was unpublished).

drop policy if exists "members read resource files" on public.role_resource_files;

do $$ begin
  create policy "members read resource files" on public.role_resource_files
    for select using (
      auth.uid() is not null and exists (
        select 1 from role_resources rr
        where rr.id = resource_id
          and (
            rr.is_published
            or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
          )
      )
    );
exception when duplicate_object then null; end $$;
