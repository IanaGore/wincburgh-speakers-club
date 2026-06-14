-- Add configurable "free visits" label shown in the navbar ribbon and get-started page.
alter table public.site_settings
  add column if not exists free_visits_label text default 'First three visits free';

-- Update to current policy (first visit only)
update public.site_settings set free_visits_label = 'First visit free' where id = 1;
