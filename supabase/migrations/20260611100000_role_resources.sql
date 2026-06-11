-- Issue #36: member role-resources (roles catalog + resources + attachments).

-- 1. Tables ------------------------------------------------------------------
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  sort_order  int  not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.role_resources (
  id           uuid primary key default gen_random_uuid(),
  role_id      uuid not null references public.roles(id) on delete cascade,
  title        text not null,
  body         text not null default '',
  is_published boolean not null default false,
  sort_order   int  not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.role_resource_files (
  id           uuid primary key default gen_random_uuid(),
  resource_id  uuid not null references public.role_resources(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text not null,
  size         int  not null,
  sort_order   int  not null,
  created_at   timestamptz not null default now()
);

-- 2. RLS ----------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.role_resources enable row level security;
alter table public.role_resource_files enable row level security;

-- Member-gated reads (authenticated only — NOT anon). Drafts visible to admins only.
do $$ begin
  create policy "members read roles" on public.roles
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read published resources" on public.role_resources
    for select using (
      auth.uid() is not null and (
        is_published
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read resource files" on public.role_resource_files
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- Admin-only writes (inline profiles.is_admin check — house pattern).
do $$ begin
  create policy "admins insert roles" on public.roles for insert
    with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins update roles" on public.roles for update
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins delete roles" on public.roles for delete
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins insert role_resources" on public.role_resources for insert
    with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins update role_resources" on public.role_resources for update
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins delete role_resources" on public.role_resources for delete
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins insert role_resource_files" on public.role_resource_files for insert
    with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins update role_resource_files" on public.role_resource_files for update
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins delete role_resource_files" on public.role_resource_files for delete
    using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
exception when duplicate_object then null; end $$;

-- 3. PostgREST grants (required since Supabase May 30 2026 change) ------------
--    Authenticated only — these tables are member-gated, anon gets nothing.
grant select on public.roles to authenticated;
grant insert, update, delete on public.roles to authenticated;
grant select on public.role_resources to authenticated;
grant insert, update, delete on public.role_resources to authenticated;
grant select on public.role_resource_files to authenticated;
grant insert, update, delete on public.role_resource_files to authenticated;

-- 4. Seed the generic roles catalog (idempotent) -------------------------------
insert into public.roles (name, slug, description, sort_order) values
  ('Chairperson',       'chairperson',       'Open the meeting, set the tone, and keep the agenda moving.', 1),
  ('Timekeeper',        'timekeeper',        'Track speech and segment timings and signal speakers.', 2),
  ('Speaker',           'speaker',           'Prepare and deliver a speech from your pathway.', 3),
  ('Evaluator',         'evaluator',         'Give a constructive spoken evaluation of a speech.', 4),
  ('Topics Chair',      'topics-chair',      'Run the impromptu Table Topics segment.', 5),
  ('General Evaluator', 'general-evaluator', 'Evaluate everything outside the speeches — the meeting itself.', 6)
on conflict (slug) do nothing;
