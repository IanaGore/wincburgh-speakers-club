# Spec: Customisable "How it works" section

**Issue:** #28 — Make the "how it works" section customisable
**Date:** 2026-05-30
**Status:** Design approved, ready for implementation plan

## Problem

The homepage "How it works" section (eyebrow, heading, and three numbered steps) is
hardcoded in `src/app/page.tsx`. The club wants non-technical admins to be able to edit
this content directly, without waiting for a code change and site release, since the
club's described process can occasionally change.

## Goals

- A non-technical admin can edit the section's eyebrow, heading, and steps.
- Admins can add, remove, edit, and reorder steps (variable count, not fixed at 3).
- Changes are reflected on the public homepage.
- The homepage's visual design is unchanged.

## Non-goals

- Versioning / history of edits.
- Editing other homepage sections (hero, pull-quote, news, CTA) — already covered or out of scope.
- WYSIWYG/rich-text editing — plain text only (with one structured italic-accent field on the heading).
- Per-step imagery or icons.

## Decisions (from brainstorming)

- **Variable steps** stored in a new table (add/remove/reorder), not fixed columns.
- **Section header is editable**, including the italic accent clause, preserving the brand styling.
- **Native HTML5 drag-and-drop** for reordering — no new dependency (codebase is vanilla
  CSS + server actions; AGENTS.md forbids Tailwind and favours a lean stack). Touch support
  is weak but acceptable for a rarely-used desktop admin task.
- Admin UI lives on the existing `/admin/settings` page (already titled "Customize Public
  Homepage") — no new nav entry.

## Architecture

### Data model

**New table `how_it_works_steps`:**

| column       | type                          | notes                                   |
|--------------|-------------------------------|-----------------------------------------|
| `id`         | uuid PK, default `gen_random_uuid()` |                                  |
| `title`      | text not null                 | e.g. "Just turn up"                     |
| `body`       | text not null                 | the step paragraph                      |
| `sort_order` | int not null                  | drives display order + the "Step 0N" label |
| `created_at` | timestamptz default `now()`   |                                         |

The "Step 01 / 02 / 03" label is **derived from position** (`index + 1`, zero-padded to
two digits) — admins never manage step numbers directly.

**New columns on `site_settings`** (single row, `id = 1`, matching the existing pattern):

- `how_it_works_eyebrow` text — e.g. "How it works"
- `how_it_works_heading` text — main heading, e.g. "We keep it simple."
- `how_it_works_heading_em` text — italic accent clause, e.g. "You keep your seat.",
  rendered inside `<em>` to preserve the brand styling.

### RLS (new table)

- RLS enabled.
- **Public `SELECT`** (anon + authenticated) so the anonymous homepage can read.
- **`INSERT` / `UPDATE` / `DELETE` restricted to `profiles.is_admin = true`** via a subquery
  on `profiles`. This does the new table "right" per the roadmap's RLS-lockdown goal.
- `checkAdmin()` in the server actions is the second gate.

`site_settings` already has its own policies; the new columns inherit them (no RLS change).

### Migration & seeding

A single migration:
1. Creates `how_it_works_steps` with the RLS policies above.
2. Adds the three `site_settings` columns.
3. **Seeds current content** so the live homepage is identical immediately after deploy:
   - Three steps matching the current hardcoded copy (Just turn up / Watch and listen /
     Find your pace), `sort_order` 1–3.
   - `how_it_works_eyebrow = 'How it works'`,
     `how_it_works_heading = 'We keep it simple.'`,
     `how_it_works_heading_em = 'You keep your seat.'`.

### Admin UI (`/admin/settings`)

- The existing settings `<form>` gains the three header fields (eyebrow, heading,
  heading-accent), saved by the existing `updateSettings` action (extended).
- Below it, a new **"How it works steps"** section rendered by a client component
  `HowItWorksManager`:
  - Each step is a draggable card with an editable **title** input, **body** textarea, a
    **Save** button, a **Delete** button, and a drag handle.
  - An **"Add step"** button appends a blank step.
  - Drag to reorder (native HTML5 DnD); on drop, the new order auto-saves via `reorderSteps`.

### Server actions (`src/app/admin/settings/actions.ts`, all gated by `checkAdmin()`)

- `updateSettings` — extended to also write the three header columns.
- `addStep()` — inserts a blank step with `sort_order = max + 1`.
- `updateStep(id, title, body)` — updates one step.
- `deleteStep(id)` — deletes one step.
- `reorderSteps(orderedIds: string[])` — rewrites `sort_order` to match the new order.

Each step-mutating action calls `revalidatePath('/')` and `revalidatePath('/admin/settings')`,
mirroring `updateSettings`.

### Homepage rendering (`src/app/page.tsx`)

- Fetch steps from `how_it_works_steps` ordered by `sort_order`.
- Read the three header fields from the existing `site_settings` query.
- Render with the **existing CSS classes** (`home-how`, `home-how__step`,
  `home-how__step-num`, etc.) so the visual design is unchanged.
- The "Step 0N" label is computed from position (`index + 1`).
- The heading renders as `{heading} <em>{heading_em}</em>`.
- If there are zero steps, the `home-how__steps` grid is omitted (graceful empty state).

## Testing

No test framework is configured in this repo, so verification is a manual test plan plus a
type/build check:

1. `npm run build` (or `tsc`) passes — no type errors.
2. Admin: add a step, edit title/body and save, delete a step, drag to reorder — each
   persists after reload.
3. Edit eyebrow + heading + accent; confirm the homepage reflects all changes.
4. Confirm the "Step 0N" numbering stays sequential after add/delete/reorder.
5. Delete all steps — confirm the homepage omits the steps grid without erroring.
6. Confirm a logged-out homepage still renders the seeded content (public SELECT works).

## Risks / notes

- Native HTML5 DnD touch support is weak — acceptable for desktop admin use; revisit with
  `dnd-kit` only if mobile editing becomes a real need.
- The migration must seed content before the homepage switches to DB-driven rendering, or
  the section would briefly go blank on existing environments.
