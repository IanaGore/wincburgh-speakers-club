# Speech Features Design — 2026-06-19

## Overview

Two related features for the member Speech Tracker page (`/member/speeches`):

1. **Remove Session Speech** — let members delete a scheduled session speech if the session didn't happen
2. **Pathway Tracker** — visual checklist for F1–F5 (Foundation) and A1–A5 (Advanced) pathway progress, auto-ticked from logged speeches with manual fallback

---

## Feature 1: Remove Session Speech

### Problem

When a session is cancelled, members have speech entries in the "Session Speeches" section with no way to remove them. These persist indefinitely and clutter the tracker.

### Behaviour

- Each card in the "Session Speeches" section gets a "Remove" button.
- Clicking shows a browser confirm dialog: _"Remove this speech from your tracker? The slot will become available again."_
- On confirm, the `meeting_assignments` row is deleted entirely — the slot is freed for re-claiming. If the session is rescheduled, members volunteer fresh.
- Only assignments where `speech_title IS NOT NULL` show the button (prevents accidentally removing pure role slots like Chairperson).

### Implementation

**Server action** — reuse the existing `dropRole` action from `src/app/member/dashboard/actions.ts`. It already nulls out `member_id`, `speech_title`, `speech_level`, and `speech_length` on the assignment row, then revalidates `/member/dashboard`. We need to also revalidate `/member/speeches` — add `revalidatePath('/member/speeches')` to `dropRole`.

No new action needed. The existing UPDATE RLS policy (`auth.uid() = member_id`) covers this.

**Client component** — `RemoveSessionSpeechButton.tsx` in `src/app/member/speeches/`:
- Imports `dropRole` from `@/app/member/dashboard/actions`
- Form with hidden `assignmentId` input
- `onSubmit` confirm dialog: _"Remove this speech from your tracker? The slot will become available again."_

**No migration needed** — existing `meeting_assignments` table, grant, and UPDATE RLS policy are sufficient.

---

## Feature 2: Pathway Tracker

### Pathways

| Code | Name | Series |
|------|------|--------|
| F1 | Public Speaking Cheat Sheet | Foundation |
| F2 | Speech Construction Guidance | Foundation |
| F3 | Mean What You Say | Foundation |
| F4 | Body Talk | Foundation |
| F5 | Vocal Impact | Foundation |
| A1 | Using Language Creatively | Advanced |
| A2 | Telling the Story | Advanced |
| A3 | Beyond the Jokes | Advanced |
| A4 | Speak and Connect | Advanced |
| A5 | Showcase Speech | Advanced |

Members may complete speeches out of order — the tracker does not enforce sequence.

### UI Layout (Option A — Checklist with details)

A new section on `/member/speeches` between "Session Speeches" and "Manually Logged Speeches":

- Two sub-sections: **Foundation Pathway** and **Advanced Pathway**
- Each item is a compact row: checkbox + code + name
- Ticked items show speech title and date inline (or just a tick if no detail stored)
- Progress bar per section (e.g. "2 of 5 complete")
- Unticked items show a small inline "Mark complete" affordance (opens a mini-form: optional title, optional date)

### Data Model

New table `speech_pathway_progress`:

```sql
create table public.speech_pathway_progress (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references profiles(id) on delete cascade,
  pathway_code  text not null check (pathway_code in ('F1','F2','F3','F4','F5','A1','A2','A3','A4','A5')),
  completed     boolean not null default false,
  completed_at  date,
  speech_title  text,
  unique (member_id, pathway_code)
);
```

RLS:
- Members can read, insert, and update their own rows (`member_id = auth.uid()`)
- Admins can read all rows

### Auto-tick Logic

Two trigger points:

1. **`logSpeech` action** — if `pathway` field matches a valid code (case-insensitive, e.g. "f2" → "F2"), upsert into `speech_pathway_progress` with `completed = true`, `completed_at = speech_date`, `speech_title = title`. Uses `onConflict('member_id,pathway_code')` with merge.

2. **Session speech details** — when a member fills in speech details for a session assignment (`speech_level` column on `meeting_assignments`), if `speech_level` matches a pathway code, upsert the same way. This trigger fires in the existing volunteer/speech-details server action.

If a row already exists and is already marked complete, the upsert does not overwrite existing data (use `ignoreDuplicates` or conditional merge).

### Manual Tick

For speeches not logged through the portal (historical entries):
- Each uncompleted pathway row has a "Mark complete" button
- Clicking opens an inline form with: optional speech title (text input), optional date (date input), and a confirm button
- Submits to a `markPathwayComplete` server action that upserts into `speech_pathway_progress`
- Members can also un-tick a completed item (sets `completed = false`, clears title/date) via an "Undo" affordance on completed rows

### Server Actions (new, in `actions.ts`)

- `markPathwayComplete(formData)` — upserts pathway progress row with `completed = true`
- `unmarkPathwayComplete(formData)` — sets `completed = false`, clears `completed_at` and `speech_title`

---

## What's Not In Scope

- Admin visibility of member pathway progress (future feature)
- Notifications or badges on pathway completion
- Enforcing pathway order (members may complete out of order)
- Linking pathway progress to specific `speeches` table rows (title/date stored denormalised in progress table for simplicity)
