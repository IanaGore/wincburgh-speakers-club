-- Issues #32/#33/#34: venue & meeting details as a single source of truth.

-- 1. New meeting-detail columns on site_settings ---------------------------
alter table public.site_settings
  add column if not exists meeting_day        text,
  add column if not exists meeting_frequency  text,
  add column if not exists meeting_doors_time text,
  add column if not exists meeting_end_time   text;

-- 2. Normalise existing values + seed the new ones -------------------------
--    Fixes drift: venue-name typo, postcode, time format. Canonical postcode
--    EH52 6QF (homepage value).
update public.site_settings
  set venue_name         = 'Winchburgh Community Centre',
      venue_address      = 'Main Street, Winchburgh, EH52 6QF',
      meeting_time       = '7:00pm',
      meeting_day        = coalesce(meeting_day,        'Tuesday'),
      meeting_frequency  = coalesce(meeting_frequency,  '1st & 3rd of the month'),
      meeting_doors_time = coalesce(meeting_doors_time, '6:30pm'),
      meeting_end_time   = coalesce(meeting_end_time,   null)
  where id = 1;

-- 3. Facilities table ------------------------------------------------------
create table if not exists public.facilities (
  id         uuid primary key default gen_random_uuid(),
  icon       text not null,
  label      text not null,
  sort_order int  not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilities_sort_order_idx
  on public.facilities(sort_order);

-- 4. RLS -------------------------------------------------------------------
alter table public.facilities enable row level security;

do $$ begin
  create policy "public read facilities"
    on public.facilities for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins insert facilities"
    on public.facilities for insert
    with check (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins update facilities"
    on public.facilities for update
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins delete facilities"
    on public.facilities for delete
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- 5. PostgREST grants (required since Supabase May 30 2026 change) ----------
grant select on public.facilities to anon, authenticated;
grant insert, update, delete on public.facilities to authenticated;

-- 6. Seed current three facilities -----------------------------------------
insert into public.facilities (icon, label, sort_order)
select v.icon, v.label, v.sort_order
from (values
  ('♿', 'Step-free access', 1),
  ('🔊', 'Hearing loop',     2),
  ('🚗', 'Free parking on-site', 3)
) as v(icon, label, sort_order)
where not exists (select 1 from public.facilities);
