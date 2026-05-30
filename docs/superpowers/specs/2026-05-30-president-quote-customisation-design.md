# President's Quote Customisation — Design Spec

**Date:** 2026-05-30
**Issue:** #30 (make the president's quote section customisable)
**Status:** Ready

## Problem

The homepage pull-quote (`page.tsx:155–158`) and the login page quote (`login/page.tsx:66–70`)
are hardcoded — both the quote text and "— Margaret, Club President". When the quote or the
person holding the President role changes, the copy has to be edited by hand in code.

## Goals

- Admin can edit the quote text from the admin panel (#30 criterion 1).
- The attributed name is derived from whichever member currently holds the President role
  (#30 criterion 2).
- The homepage (and login page) show the new quote and correct name (#30 criterion 3).

## Data Model

`site_settings` new columns (migration with seeded defaults):

| Column | Purpose | Seed |
|--------|---------|------|
| `president_quote` | The quote text | current homepage quote |
| `president_name_fallback` | Name shown when no member holds the President role | "Margaret" |

Attribution renders as `— {name}, Club President`.

### Name derivation

Members hold club roles in `profiles.club_roles text[]` (added in
`20260502213000_member_profiles.sql`); "President" is one of the standard roles.

The public homepage is served to `anon`, but `profiles` is behind RLS, so anon cannot read a
member's `full_name` directly. Mirror the existing `get_active_members` `SECURITY DEFINER`
pattern:

```sql
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
      order by full_name
      limit 1),
    (select president_name_fallback from public.site_settings limit 1)
  );
$$;
-- grant execute to anon, authenticated
```

- Deterministic if multiple members hold the role (`order by full_name`, first wins).
- Falls back to `president_name_fallback` when no one is assigned.

Wrapped in `src/lib/president.ts` → `getPresidentName(supabase)`. **Reused by the #31 CTA
spec** (the "a member of the committee will reach out" work).

## Threading Targets

| File | Change |
|------|--------|
| `src/app/page.tsx` | Pull-quote: text from `president_quote`, attribution `— {getPresidentName()}, Club President` |
| `src/app/login/page.tsx` | Same quote text + derived attribution |

## Admin UI (`/admin/settings`)

New **President's Quote** block:
- Quote textarea (`president_quote`).
- Fallback-name field (`president_name_fallback`), labelled "used if no member is assigned the President role".
- Extend `updateSettings` (already `checkAdmin()`-gated).

## Out of Scope

- Generalising "every person-mention derives from their role" (the issue's open question).
  Only President is handled now; the `get_president_name()` DEFINER function + `president.ts`
  helper are the reusable groundwork for doing the same with other officers later.
- The CTA line "Margaret, our president, will drop you a quick hello" (`page.tsx:265`,
  `signup/SignupFlow.tsx:218`) — that is issue #31 (separate spec, reuses `getPresidentName()`).

## Acceptance Criteria

- [ ] Admin can edit the quote in `/admin/settings`; homepage and login page reflect it.
- [ ] Attributed name is the member holding the President role; when none, the fallback name shows.
- [ ] Non-admins cannot edit the quote (RLS + `checkAdmin()`); `get_president_name()` is callable by anon.

## Verification (manual)

1. Edit the quote and fallback name in `/admin/settings`; confirm homepage + login update.
2. Assign "President" in `club_roles` to a member with a full name; confirm the attribution shows that name.
3. Remove the role from everyone; confirm the fallback name shows.
