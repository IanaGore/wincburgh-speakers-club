-- Issue #28: customisable "How it works" homepage section.

-- 1. Steps table -----------------------------------------------------------
create table if not exists public.how_it_works_steps (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  sort_order int  not null,
  created_at timestamptz not null default now()
);

create index if not exists how_it_works_steps_sort_order_idx
  on public.how_it_works_steps(sort_order);

-- 2. RLS -------------------------------------------------------------------
alter table public.how_it_works_steps enable row level security;

-- Public read (anon homepage + authenticated)
do $$ begin
  create policy "public read how_it_works_steps"
    on public.how_it_works_steps for select
    using (true);
exception when duplicate_object then null; end $$;

-- Admin-only insert
do $$ begin
  create policy "admins insert how_it_works_steps"
    on public.how_it_works_steps for insert
    with check (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- Admin-only update
do $$ begin
  create policy "admins update how_it_works_steps"
    on public.how_it_works_steps for update
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- Admin-only delete
do $$ begin
  create policy "admins delete how_it_works_steps"
    on public.how_it_works_steps for delete
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- 3. PostgREST grants (required since Supabase May 30 2026 change) ----------
grant select on public.how_it_works_steps to anon, authenticated;
grant insert, update, delete on public.how_it_works_steps to authenticated;

-- 4. Section header columns on site_settings -------------------------------
alter table public.site_settings
  add column if not exists how_it_works_eyebrow    text,
  add column if not exists how_it_works_heading     text,
  add column if not exists how_it_works_heading_em  text;

-- 5. Seed current content (only if not already set / empty) ----------------
update public.site_settings
  set how_it_works_eyebrow   = coalesce(how_it_works_eyebrow,   'How it works'),
      how_it_works_heading    = coalesce(how_it_works_heading,    'We keep it simple.'),
      how_it_works_heading_em = coalesce(how_it_works_heading_em, 'You keep your seat.')
  where id = 1;

insert into public.how_it_works_steps (title, body, sort_order)
select v.title, v.body, v.sort_order
from (values
  ('Just turn up',
   'No booking needed for your first three visits. The kettle goes on at half six. Meeting starts at seven. Someone will meet you at the door.',
   1),
  ('Watch and listen',
   'You won''t be asked to speak until you''re ready. Watch how it works, ask questions, eat a biscuit. There''s absolutely no pressure.',
   2),
  ('Find your pace',
   'When you''re ready, take a role. Give a speech. Get feedback. We follow the Pathways programme — or we can just be your Tuesday-night practice ground.',
   3)
) as v(title, body, sort_order)
where not exists (select 1 from public.how_it_works_steps);
