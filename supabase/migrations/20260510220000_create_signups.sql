-- Create signups table for guest RSVPs (pre-auth visitors)
create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  heard_from text,
  experience text check (experience in ('none', 'some', 'lots')),
  hopes text[] default '{}',
  meeting_id uuid references public.meetings(id) on delete set null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'attended', 'converted')),
  conversion_token uuid unique,
  conversion_token_expires_at timestamptz,
  conversion_token_used_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table public.signups enable row level security;

-- Anyone (including anon) can insert a new signup
do $$ begin
  create policy "Anyone can create a signup"
    on public.signups for insert
    with check (true);
exception when duplicate_object then null; end $$;

-- Only admins can read/update signups
do $$ begin
  create policy "Admins can view all signups"
    on public.signups for select
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_admin = true
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins can update signups"
    on public.signups for update
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.is_admin = true
      )
    );
exception when duplicate_object then null; end $$;

-- Index for admin queries
create index if not exists signups_status_idx on public.signups (status);
create index if not exists signups_meeting_id_idx on public.signups (meeting_id);
create index if not exists signups_email_idx on public.signups (email);
create index if not exists signups_conversion_token_idx on public.signups (conversion_token) where conversion_token is not null;
