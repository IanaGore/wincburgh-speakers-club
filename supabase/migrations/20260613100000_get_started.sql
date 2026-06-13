-- #35: get-started merge — data gap fix + deeper follow-up tracking

-- 1. Add phone + topic to contact_messages (fix data gap)
alter table public.contact_messages
  add column if not exists phone text,
  add column if not exists topic text;

-- 2. Add status + follow-up tracking to contact_messages
alter table public.contact_messages
  add column if not exists status text not null default 'new',
  add column if not exists handled_at timestamptz,
  add column if not exists admin_notes text;

do $$ begin
  alter table public.contact_messages
    add constraint contact_messages_status_check
      check (status in ('new', 'replied', 'closed'));
exception when duplicate_object then null; end $$;

-- 3. Extend signups status to include new workflow steps
alter table public.signups
  drop constraint if exists signups_status_check;

alter table public.signups
  add constraint signups_status_check
    check (status in ('pending', 'contacted', 'attended', 'no_show', 'joined', 'converted'));

-- 4. Add follow-up tracking columns to signups
alter table public.signups
  add column if not exists contacted_at timestamptz,
  add column if not exists admin_notes text;

-- No new tables → no new PostgREST grants needed.
