# Generic Bottom CTA — Design Spec

**Date:** 2026-05-30
**Issue:** #31 (make bottom CTA on front page generic)
**Status:** Ready

## Problem

The homepage CTA strip (`page.tsx:265`) and the signup confirmation (`SignupFlow.tsx:218`)
both name a specific person: "Margaret, our president, will drop you a quick hello". This has
to be edited whenever the role-holder changes.

## Goal

De-personalise the CTA so it reads generically (e.g. "a member of the committee will reach
out") and make the homepage version admin-editable.

## Data Model

`site_settings` new column:

| Column | Purpose | Seed |
|--------|---------|------|
| `cta_body` | Homepage CTA paragraph text | "No booking needed for your first visit. A member of the committee will reach out to say hello in the next day or two." |

## Threading Targets

| File | Change |
|------|--------|
| `src/app/page.tsx` | CTA paragraph reads `cta_body` instead of hardcoded text |
| `src/app/signup/SignupFlow.tsx` | Confirmation line de-personalised to generic **static** copy (see below) |

The signup confirmation sentence wraps the user's email
("We'll be in touch soon at {email}. …"), so it stays static generic copy rather than reading
`cta_body` — coupling that client flow to a homepage setting would be awkward, and it is a
different surface. It is de-personalised but not admin-editable.

## Admin UI (`/admin/settings`)

Add a "Homepage CTA text" textarea (`cta_body`) to the homepage customisation block; extend
`updateSettings` (already `checkAdmin()`-gated).

## Out of Scope

- CTA eyebrow / heading ("Ready when you are" / "Come and try us") — unchanged.

## Acceptance Criteria

- [ ] Homepage CTA shows generic, de-personalised wording by default.
- [ ] Admin can edit the homepage CTA text in `/admin/settings`.
- [ ] Signup confirmation no longer names a specific person.

## Verification (manual)

1. Load the homepage; confirm the CTA no longer names a person.
2. Edit the CTA text in `/admin/settings`; confirm the homepage updates.
3. Complete a signup; confirm the confirmation message is de-personalised.
