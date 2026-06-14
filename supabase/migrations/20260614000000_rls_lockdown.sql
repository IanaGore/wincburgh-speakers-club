-- RLS lockdown: close direct-API write bypass on four tables.
-- All admin server actions already call checkAdmin() at the app layer;
-- this migration enforces the same constraint at the database layer.

-- ── Helper: drop all non-SELECT policies on a table ──────────────────────
-- Used for tables whose original policies were created outside migrations
-- and whose exact names are unknown.

-- ── 1. meetings ───────────────────────────────────────────────────────────
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'meetings'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.meetings', p.policyname);
  end loop;
end $$;

create policy "Admins can manage meetings"
  on public.meetings for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 2. news_posts ─────────────────────────────────────────────────────────
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'news_posts'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.news_posts', p.policyname);
  end loop;
end $$;

create policy "Admins can manage news posts"
  on public.news_posts for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 3. site_settings ──────────────────────────────────────────────────────
-- Singleton row — only UPDATE is needed (no INSERT/DELETE in the application).
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.site_settings', p.policyname);
  end loop;
end $$;

create policy "Admins can update site settings"
  on public.site_settings for update
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 4. meeting_assignments ────────────────────────────────────────────────
-- Clears both the permissive policies AND the member UPDATE policies
-- (which were created in 20260503020000_fix_assignment_rls.sql).
-- Both sets are re-created below.
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'meeting_assignments'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.meeting_assignments', p.policyname);
  end loop;
end $$;

-- Admins: full control (INSERT roles when creating/editing meetings, DELETE, UPDATE any assignment)
create policy "Admins can manage meeting assignments"
  on public.meeting_assignments for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Members: claim an unassigned role (volunteer for self or assign another member)
-- Verbatim copy from 20260503020000_fix_assignment_rls.sql
create policy "Members can volunteer for roles"
  on public.meeting_assignments for update
  using (member_id is null)
  with check (auth.uid() is not null);

-- Members: edit speech details or drop out from their own assigned role
-- Verbatim copy from 20260503020000_fix_assignment_rls.sql
create policy "Members can manage their own role"
  on public.meeting_assignments for update
  using (auth.uid() = member_id)
  with check (true);
