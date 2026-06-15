-- Add source column to distinguish how a signup was created.
-- Nullable: existing rows are unaffected (implicitly treated as 'rsvp').
alter table public.signups
  add column if not exists source text
    check (source in ('rsvp', 'existing_member', 'admin_invite'));
