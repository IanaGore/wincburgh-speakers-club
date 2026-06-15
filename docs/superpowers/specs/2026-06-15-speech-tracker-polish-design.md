# Speech Tracker Polish — Design Spec

**Issue:** #45  
**Date:** 2026-06-15  
**Branch:** `feat/issue-45-speech-tracker-polish`

## Overview

Four targeted improvements to the existing Speech Tracker page (`/member/speeches`). The page is functionally complete but has a missing date field for historical entries, no post-submit feedback, and an untested mobile layout.

## 1. Database Migration

**File:** `supabase/migrations/20260615000000_speech_date.sql`

Add a nullable `speech_date date` column to `speeches`:

```sql
alter table speeches add column if not exists speech_date date;
```

No RLS changes — existing policies cover the new column automatically. Nullable so existing rows are unaffected.

## 2. Log a Historical Speech — Form Changes

**File:** `src/app/member/speeches/page.tsx` (sidebar form)  
**File:** `src/app/member/speeches/actions.ts` (`logSpeech` action)

### Form field order (revised)

1. **Title** (required) — unchanged
2. **Date** (required, new) — `<input type="date">` labelled "Speech Date"
3. **Link to a session (optional)** — existing meeting picker, label updated from "Meeting"
4. **Pathway** — unchanged
5. **Project** — unchanged
6. **Evaluator** — unchanged

### Behaviour

- `speech_date` is always required and always saved
- `meeting_id` is optional; selecting one saves both fields (both are preserved)
- `speech_date` is the primary source of truth for display; `meeting_id` remains an optional enrichment link

### Server action changes (`logSpeech`)

- Read `speech_date` from `formData`
- Validate it is present (return early with error if missing)
- Include in the Supabase insert alongside existing fields
- On success: redirect to `/member/speeches?logged=<encoded-title>` instead of the current page reload

## 3. Inline Confirmation (Post-Submit)

The page is a Server Component — no client JS required. The confirmation is driven by a URL search param.

### Flow

1. `logSpeech` action redirects to `/member/speeches?logged=The+Art+of+Persuasion` on success
2. `SpeechesPage` reads `searchParams.logged`
3. If `logged` is present, the sidebar renders a confirmation state instead of the form:
   - Green checkmark icon
   - "Speech logged!" heading
   - Speech title echoed back: `"The Art of Persuasion" added to your tracker`
   - "Log another →" link pointing to `/member/speeches` (clears param, restores form)
4. If `logged` is absent, the sidebar renders the form as normal

### Error handling

If the server action fails (Supabase error), it redirects to `/member/speeches?error=1`. The sidebar shows a brief red error message with a "Try again" link back to the form. This covers the same no-JS path.

## 4. Speech Card Date Display

**File:** `src/app/member/speeches/page.tsx` (card rendering)

Update the `fmtDate` call in the "Manually Logged Speeches" section to use a priority fallback:

```
1. speech.speech_date       → fmtDate(speech.speech_date)
2. speech.meeting?.meeting_date → fmtDate(speech.meeting.meeting_date)
3. "No date"
```

`fmtDate` helper is reused unchanged. The Supabase select query gains `speech_date` in the column list.

## 5. Mobile Layout

**File:** `src/app/member/speeches/speeches.css`

Add a `@media (max-width: 768px)` block:

- `.speeches-layout`: switch from side-by-side grid to single column (`grid-template-columns: 1fr`)
- `.speeches-main`: renders first (natural DOM order — no reordering needed, main content is already first in JSX)
- `.speeches-sidebar`: renders below main content, full width

No component changes. CSS only.

## Out of Scope

- Evaluator dropdown: keep as-is (all profiles). Members at this club know each other; restricting to past-evaluators adds complexity with no clear gain at this scale.
- Pathway/project autocomplete — free text is sufficient for v1
- Admin view of all member speeches — post-launch
- Speech statistics / progress charts — post-launch

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260615000000_speech_date.sql` | New migration — add `speech_date` column |
| `src/app/member/speeches/actions.ts` | Read + save `speech_date`; redirect with `?logged=` on success |
| `src/app/member/speeches/page.tsx` | Form field order; sidebar confirmation state; date display priority; `searchParams` prop |
| `src/app/member/speeches/speeches.css` | Mobile responsive layout |

## Testing

- [ ] Log a speech with a date but no meeting — card shows the date
- [ ] Log a speech with a meeting selected — card shows `speech_date` (not meeting date)
- [ ] Submit without a date — form rejects (required field)
- [ ] Confirmation state appears after submit, echoes title
- [ ] "Log another" resets to form
- [ ] Error state appears if Supabase insert fails
- [ ] Mobile: content stacks correctly below 768px, form at bottom
- [ ] Existing session speeches and manual speeches from before migration still display correctly
