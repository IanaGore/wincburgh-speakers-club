-- Add speech_date for historical speeches not linked to a session meeting.
-- Nullable: existing rows are unaffected. Table-level grants in
-- 20260530000000_grant_table_access.sql already cover this column.
alter table public.speeches
  add column if not exists speech_date date;
