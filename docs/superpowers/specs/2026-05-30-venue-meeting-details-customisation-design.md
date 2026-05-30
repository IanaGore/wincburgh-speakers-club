# Venue & Meeting Details Customisation — Design Spec

**Date:** 2026-05-30
**Issues:** #32 (bug: location not reflecting admin panel), #33 (day & frequency customisable), #34 (facilities customisable)
**Status:** Ready

## Problem

Venue, meeting day/time, and facilities are hardcoded across the public site, and the
copies have already drifted out of sync:

- **Postcode mismatch:** homepage `EH52 6QF` (`page.tsx:237`) vs contact page `EH52 6RP` (`contact/page.tsx:25`).
- **Venue name drift:** "Winchburgh Community Centre" (homepage) vs settings default "Wincburgh Village Hall" (typo, `meetings/page.tsx:26`) vs "Community Centre" (navbar).
- **Time format drift:** "7pm" / "7:00pm" / "7:00 PM".

`site_settings` already has `venue_name`, `venue_address`, `meeting_time` columns and the
admin settings form already edits venue name/address — but the homepage venue section
never reads them (the wiring was never connected). That is the #32 bug.

This spec makes venue/meeting details a single source of truth, edited once in the admin
panel and reflected everywhere.

## Goals

- Fix #32: homepage venue section reads venue name/address from `site_settings`.
- #33: meeting day, frequency, and times are admin-editable and update **all mentions** across the site.
- #34: the facilities list is admin-editable via a repeatable manager.
- Eliminate the existing postcode / name / time inconsistencies as a side effect.

## Data Model

### `site_settings` columns

Reuse existing where present; add the rest via migration with sensible defaults.

| Column | Status | Example |
|--------|--------|---------|
| `venue_name` | exists | "Winchburgh Community Centre" |
| `venue_address` | exists (multiline, incl. postcode) | "Main Street, Winchburgh, EH52 6QF" |
| `meeting_time` | exists — canonical **start time** | "7:00pm" |
| `meeting_day` | **new** | "Tuesday" |
| `meeting_frequency` | **new** (free text — too varied to enum) | "1st & 3rd of the month" |
| `meeting_doors_time` | **new** | "6:30pm" |
| `meeting_end_time` | **new**, optional (shown only if set) | "9:00pm" |

Migration seeds the new columns with the current homepage copy and normalises
`venue_name`/`venue_address`/`meeting_time` to the correct, consistent values
(canonical postcode chosen by admin/user — default to `EH52 6QF`).

### `facilities` table

Mirrors the `how_it_works_steps` pattern.

```
facilities (
  id          uuid primary key default gen_random_uuid(),
  icon        text not null,        -- emoji, e.g. "♿"
  label       text not null,        -- e.g. "Step-free access"
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)
```

- RLS: public read (`anon`, `authenticated`), admin-only write.
- **Explicit grants required** (`grant select ... to anon, authenticated`, etc.) per the
  May-30 PostgREST change — RLS alone is not sufficient.
- Seeded with the current three: ✅ Step-free access · 🔊 Hearing loop · 🚗 Free parking on-site.

## Composition Layer

New `src/lib/venue.ts` centralises formatting so every consumer renders consistently from
the same fields:

- `formatMeetingShort(settings)` → "Tuesday meetings · 7:00pm · Community Centre" (navbar ribbon)
- `formatScheduleLine(settings)` → "1st & 3rd Tuesday of the month"
- `formatTimesLine(settings)` → "Doors 6:30pm · Meeting 7:00pm" (appends "· Finish 9:00pm" if `meeting_end_time` set)
- `mapsUrl(settings)` → Google Maps directions URL from venue name + address

All hardcoded equivalents are replaced by calls to these helpers.

## Threading Targets

Each location stops hardcoding and reads from `site_settings` / `facilities` / helpers:

| File | What changes |
|------|--------------|
| `src/app/page.tsx` | Venue detail block (name/address), schedule line, times line, facilities list (from table), directions link |
| `src/app/contact/page.tsx` | Venue card name/address/postcode, facilities, directions link (fixes `6RP`/`6QF`) |
| `src/app/meetings/page.tsx` | Already reads `venue_name`/`meeting_time`; realign to helpers + correct defaults |
| `src/app/login/page.tsx` | "7pm" → start time; venue prose |
| `src/app/signup/SignupFlow.tsx` | Meeting metadata line, "Doors open at 6:30", calendar `location`, directions link |
| `src/components/Navbar.tsx` | Top ribbon → `formatMeetingShort()` |
| `src/app/layout.tsx` | Metadata description (town/venue) |

## Admin UI (`/admin/settings`)

- Extend the existing **Venue Details** panel with fields: `meeting_day`, `meeting_frequency`,
  `meeting_doors_time`, `meeting_time` (start), `meeting_end_time` (optional).
- Add a **Facilities** section with a `FacilitiesManager` client component mirroring
  `HowItWorksManager`: add / edit / delete / reorder rows, each an emoji + label, with
  optimistic local state (`router.refresh()` does not resync `useState` — known lesson).
- Server actions in `settings/actions.ts`, all `checkAdmin()`-gated:
  - extend `updateSettings` for the new columns,
  - `addFacility` (returns inserted row for optimistic add), `updateFacility`,
    `deleteFacility`, `reorderFacilities`.

## Out of Scope

- The stylised SVG "village map" labels (`page.tsx:211–227`) — decorative illustration, not a real map.
- Brand-voice prose that bakes in the day ("the warmest room in Winchburgh **on a Tuesday**"
  — hero `page.tsx:76`, `login/page.tsx:68`, signup copy). Auto-templating reads awkwardly;
  these are **flagged for manual review** if the meeting day ever changes, not parametrised.
- Actual scheduled meeting dates (the `meetings` table / Session Planner) — unchanged; this
  spec covers descriptive copy only.

## Acceptance Criteria

- [ ] Editing venue name/address in `/admin/settings` updates the homepage venue section (#32).
- [ ] Editing meeting day, frequency, doors/start/end times updates every mention site-wide (#33).
- [ ] Facilities can be added, edited, deleted, and reordered by admins; the homepage and
      contact page reflect changes (#34).
- [ ] Postcode, venue name, and time format are consistent everywhere (no drift).
- [ ] Non-admins cannot write to `site_settings` or `facilities` (RLS + `checkAdmin()`).

## Verification (manual)

1. Change venue name, address, day, frequency, doors/start/end time, and a facility in `/admin/settings`.
2. Confirm changes appear on: homepage venue section + navbar ribbon, contact page, meetings page, login page, signup flow, page metadata.
3. Add / delete / reorder a facility; confirm homepage + contact reflect it.
4. Log out; confirm public pages show the updated values.
