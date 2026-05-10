-- ── Invite safeguards on signups ──────────────────────────────────────────
alter table public.signups
  add column if not exists invite_sent_at  timestamptz,
  add column if not exists invite_count    integer not null default 0;

-- ── site_settings: about + meeting_time columns ───────────────────────────
alter table public.site_settings
  add column if not exists about_mission text default 'We are a friendly public speaking club that helps members build confidence and communication skills.',
  add column if not exists about_body     text default 'We meet regularly to practise speeches, give and receive feedback, and support each other to grow. Whether you are completely new to public speaking or want to sharpen existing skills, you are welcome here.',
  add column if not exists meeting_time   text default '7:00 PM';

-- ── media table ───────────────────────────────────────────────────────────
create table if not exists public.media (
  key          text primary key,
  storage_path text not null,
  alt_text     text,
  updated_at   timestamptz default now()
);

alter table public.media enable row level security;

drop policy if exists "Public can read media" on public.media;
create policy "Public can read media"
  on public.media for select
  using (true);

drop policy if exists "Admins can manage media" on public.media;
create policy "Admins can manage media"
  on public.media for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
