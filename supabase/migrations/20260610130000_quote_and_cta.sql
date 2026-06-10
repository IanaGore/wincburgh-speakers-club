-- Issues #30/#31: president's quote + homepage CTA as editable settings.

-- 1. New columns on site_settings -------------------------------------------
alter table public.site_settings
  add column if not exists president_quote         text,
  add column if not exists president_name_fallback text,
  add column if not exists cta_body                text;

-- 2. Seed (idempotent) -------------------------------------------------------
--    president_quote seeds from the current homepage pull-quote; per the #30
--    spec one setting drives both the homepage and the login page (whose old
--    hardcoded quote text is superseded).
update public.site_settings
  set president_quote         = coalesce(president_quote,
        'You don''t need to be confident. You don''t need to have anything to say. You just need to turn up.'),
      president_name_fallback = coalesce(president_name_fallback, 'Margaret'),
      cta_body                = coalesce(cta_body,
        'No booking needed for your first visit. A member of the committee will reach out to say hello in the next day or two.')
  where id = 1;

-- 3. Public president-name lookup --------------------------------------------
--    profiles is behind RLS and the homepage/login run as anon, so the name is
--    derived via SECURITY DEFINER (mirrors get_member_directory).
create or replace function public.get_president_name()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select full_name
       from public.profiles
      where 'President' = any(club_roles)
        and full_name is not null
        and is_active = true
      order by full_name
      limit 1),
    (select president_name_fallback from public.site_settings where id = 1)
  );
$$;

-- Unlike get_member_directory (authenticated-only), this serves public pages.
grant execute on function public.get_president_name() to anon, authenticated;
