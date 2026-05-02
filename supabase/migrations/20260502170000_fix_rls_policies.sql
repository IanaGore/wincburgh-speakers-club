-- Allow members to drop out of their assigned roles (setting member_id to null)
create policy "Members can drop out of their role"
  on public.meeting_assignments for update
  using ( auth.uid() = member_id );
