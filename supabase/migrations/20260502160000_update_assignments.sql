-- Add new columns for Speech Details when someone volunteers for a speech role
alter table public.meeting_assignments 
add column if not exists speech_level text,
add column if not exists speech_title text,
add column if not exists speech_length text default '6 - 8 minutes';
