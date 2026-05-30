-- Grant Data API access for all tables missing explicit grants.
-- Required as of Supabase's May 30 2026 change: tables are no longer
-- auto-exposed to PostgREST — grants must be explicit.
-- RLS policies still control row-level access; these grants are the
-- table-level door that lets PostgREST/supabase-js see the table at all.

-- Core tables (created directly in Supabase before migration tracking)
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.meetings to anon, authenticated;
grant insert, update, delete on public.meetings to authenticated;

grant select on public.meeting_assignments to anon, authenticated;
grant insert, update, delete on public.meeting_assignments to authenticated;

grant select on public.news_posts to anon, authenticated;
grant insert, update, delete on public.news_posts to authenticated;

grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;

-- contact_messages (20260502180000) — anon insert (contact form), admin reads via RLS
grant insert on public.contact_messages to anon;
grant select, insert, update, delete on public.contact_messages to authenticated;

-- payment_periods (20260502220000 / 20260502230000)
grant select on public.payment_periods to authenticated;
grant insert, update, delete on public.payment_periods to authenticated;

-- member_payments (20260502220000 / 20260502230000)
grant select on public.member_payments to authenticated;
grant insert, update, delete on public.member_payments to authenticated;

-- meeting_attendance (20260503000000)
grant select on public.meeting_attendance to authenticated;
grant insert, update, delete on public.meeting_attendance to authenticated;

-- signups (20260510220000) — anon insert (RSVP form), admin reads via RLS
grant insert on public.signups to anon;
grant select, insert, update, delete on public.signups to authenticated;

-- media (20260510230000) — public reads (site images), authenticated writes
grant select on public.media to anon, authenticated;
grant insert, update, delete on public.media to authenticated;

-- speeches (20260514000000)
grant select on public.speeches to authenticated;
grant insert, update, delete on public.speeches to authenticated;
