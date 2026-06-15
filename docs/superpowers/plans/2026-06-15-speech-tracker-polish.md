# Speech Tracker Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `speech_date` field for historical speeches, inline post-submit confirmation, and fix the mobile layout on `/member/speeches`.

**Architecture:** Pure server-component approach — no new client components. The confirmation state is driven by a `?logged=<title>` URL search param that the server action sets on redirect. The CSS breakpoint fix removes an `order: -1` that was putting the form first on mobile.

**Tech Stack:** Next.js 16 App Router (server actions, server components), Supabase, vanilla CSS.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/migrations/20260615000000_speech_date.sql` | Create | Add nullable `speech_date date` column to `speeches` |
| `src/app/member/speeches/actions.ts` | Modify | Read + save `speech_date`; redirect with `?logged=` / `?error=1` |
| `src/app/member/speeches/page.tsx` | Modify | `searchParams` prop; date field in form; confirmation/error sidebar; date display priority |
| `src/app/member/speeches/speeches.css` | Modify | Remove `order: -1` from mobile breakpoint (puts form at bottom, not top) |

---

## Task 1: Create branch and database migration

**Files:**
- Create: `supabase/migrations/20260615000000_speech_date.sql`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull
git checkout -b feat/issue-45-speech-tracker-polish
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260615000000_speech_date.sql` with this exact content:

```sql
-- Add speech_date for historical speeches not linked to a session meeting.
-- Nullable: existing rows are unaffected. Table-level grants in
-- 20260530000000_grant_table_access.sql already cover this column.
alter table public.speeches
  add column if not exists speech_date date;
```

- [ ] **Step 3: Run the migration grants check**

```bash
npm run check:migrations
```

Expected: passes (no new grants needed — existing table grants cover the column).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260615000000_speech_date.sql
git commit -m "feat(speeches): add speech_date column for historical entries"
```

---

## Task 2: Update `logSpeech` server action

**Files:**
- Modify: `src/app/member/speeches/actions.ts`

The action currently uses `revalidatePath` and throws on error. Replace with redirect-based flow so the page can show a confirmation or error state via search params.

- [ ] **Step 1: Rewrite `logSpeech` in `src/app/member/speeches/actions.ts`**

Replace the entire `logSpeech` function (lines 6–32) with:

```ts
export async function logSpeech(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const title = formData.get('title') as string
  const speech_date = formData.get('speech_date') as string
  const meeting_id = formData.get('meeting_id') as string || null
  const pathway = formData.get('pathway') as string
  const project = formData.get('project') as string
  const evaluator_id = formData.get('evaluator_id') as string || null

  if (!speech_date) {
    redirect('/member/speeches?error=1')
  }

  const { error } = await supabase.from('speeches').insert({
    member_id: user.id,
    title,
    speech_date,
    meeting_id,
    pathway,
    project,
    evaluator_id,
  })

  if (error) {
    redirect('/member/speeches?error=1')
  }

  redirect(`/member/speeches?logged=${encodeURIComponent(title)}`)
}
```

Also add `redirect` to the import at the top of the file:

```ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
```

The `revalidatePath` import can be removed (no longer used by `logSpeech`; check that `deleteSpeech` and `addFeedback` still use it — they do, so keep it).

Full file after changes:

```ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function logSpeech(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const title = formData.get('title') as string
  const speech_date = formData.get('speech_date') as string
  const meeting_id = formData.get('meeting_id') as string || null
  const pathway = formData.get('pathway') as string
  const project = formData.get('project') as string
  const evaluator_id = formData.get('evaluator_id') as string || null

  if (!speech_date) {
    redirect('/member/speeches?error=1')
  }

  const { error } = await supabase.from('speeches').insert({
    member_id: user.id,
    title,
    speech_date,
    meeting_id,
    pathway,
    project,
    evaluator_id,
  })

  if (error) {
    redirect('/member/speeches?error=1')
  }

  redirect(`/member/speeches?logged=${encodeURIComponent(title)}`)
}

export async function deleteSpeech(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  const speechId = formData.get('speechId') as string
  await supabase.from('speeches').delete().eq('id', speechId).eq('member_id', user.id)
  revalidatePath('/member/speeches')
}

export async function addFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const speech_id = formData.get('speech_id') as string
  const feedback_notes = formData.get('feedback_notes') as string

  const { error } = await supabase
    .from('speeches')
    .update({ feedback_notes })
    .eq('id', speech_id)
    .eq('evaluator_id', user.id)

  if (error) {
    throw new Error('Failed to add feedback: ' + error.message)
  }

  revalidatePath('/member/speeches')
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/member/speeches/actions.ts
git commit -m "feat(speeches): redirect with ?logged= / ?error=1 after logSpeech"
```

---

## Task 3: Update `SpeechesPage`

**Files:**
- Modify: `src/app/member/speeches/page.tsx`

Three changes in this file:
1. Accept `searchParams` prop and read `logged` / `error` values
2. Add `speech_date` to the Supabase query + update date display priority on cards
3. Revise the sidebar: date field first, confirmation/error states

- [ ] **Step 1: Update the page signature and read searchParams**

Change the opening of `SpeechesPage` from:

```tsx
export default async function SpeechesPage() {
```

to:

```tsx
export default async function SpeechesPage({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string; error?: string }>
}) {
  const { logged, error: logError } = await searchParams
```

Note: the local variable is named `logError` to avoid shadowing the Supabase `error` variables used later.

- [ ] **Step 2: Add `speech_date` to the mySpeeches query**

Find the `mySpeeches` query (currently selects `'*, meeting:meetings(meeting_date), evaluator:...'`). Add `speech_date` to the select:

```tsx
const { data: mySpeeches } = await supabase
  .from('speeches')
  .select('*, speech_date, meeting:meetings(meeting_date), evaluator:profiles!speeches_evaluator_id_fkey(full_name)')
  .eq('member_id', user.id)
  .order('created_at', { ascending: false })
```

- [ ] **Step 3: Update date display on manually logged speech cards**

Find the `speech-card__date` span inside the "Manually Logged Speeches" section:

```tsx
<span className="speech-card__date">
  {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
</span>
```

Replace with:

```tsx
<span className="speech-card__date">
  {speech.speech_date
    ? fmtDate(speech.speech_date)
    : speech.meeting?.meeting_date
      ? fmtDate(speech.meeting.meeting_date)
      : 'No date'}
</span>
```

- [ ] **Step 4: Revise the sidebar (form fields + confirmation/error states)**

Replace the entire `<aside className="speeches-sidebar wsc-card">` block with:

```tsx
<aside className="speeches-sidebar wsc-card">
  {logged ? (
    <div className="speeches-confirm">
      <div className="speeches-confirm__icon">✓</div>
      <h2>Speech logged!</h2>
      <p className="speeches-sidebar__hint">
        &ldquo;{decodeURIComponent(logged)}&rdquo; added to your tracker.
      </p>
      <a href="/member/speeches" className="speeches-confirm__link">+ Log another</a>
    </div>
  ) : logError ? (
    <div className="speeches-error">
      <p className="speeches-error__message">Something went wrong saving your speech.</p>
      <a href="/member/speeches" className="speeches-confirm__link">Try again</a>
    </div>
  ) : (
    <>
      <h2>Log a Historical Speech</h2>
      <p className="speeches-sidebar__hint">For speeches not recorded through the session dashboard.</p>
      <form action={logSpeech} className="speeches-form">
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-title">Title *</label>
          <input id="speech-title" type="text" name="title" required className="wsc-input" />
        </div>
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-date">Speech Date *</label>
          <input id="speech-date" type="date" name="speech_date" required className="wsc-input" />
        </div>
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-meeting">Link to a session (optional)</label>
          <select id="speech-meeting" name="meeting_id" className="wsc-input">
            <option value="">Select a meeting…</option>
            {meetings?.map(m => (
              <option key={m.id} value={m.id}>{fmtDate(m.meeting_date)}</option>
            ))}
          </select>
        </div>
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-pathway">Pathway</label>
          <input id="speech-pathway" type="text" name="pathway" placeholder="e.g. Dynamic Leadership" className="wsc-input" />
        </div>
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-project">Project</label>
          <input id="speech-project" type="text" name="project" placeholder="e.g. Ice Breaker" className="wsc-input" />
        </div>
        <div className="speeches-form__field">
          <label className="wsc-label" htmlFor="speech-evaluator">Evaluator</label>
          <select id="speech-evaluator" name="evaluator_id" className="wsc-input">
            <option value="">Select evaluator…</option>
            {evaluatorOptions.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="wsc-btn wsc-btn-primary">Log Speech</button>
      </form>
    </>
  )}
</aside>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/member/speeches/page.tsx
git commit -m "feat(speeches): date field, confirmation state, date display priority"
```

---

## Task 4: Add confirmation/error CSS + fix mobile layout

**Files:**
- Modify: `src/app/member/speeches/speeches.css`

Two changes:
1. Add styles for `.speeches-confirm` and `.speeches-error`
2. Fix the mobile breakpoint — remove `order: -1` so sidebar (form) stays below main content on mobile

- [ ] **Step 1: Add confirmation and error styles**

Append to `speeches.css` (before the existing `@media` block):

```css
/* Confirmation / error states in sidebar */
.speeches-confirm,
.speeches-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.speeches-confirm__icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  border: 2px solid rgba(16, 185, 129, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #10b981;
  margin-bottom: 0.25rem;
}

.speeches-confirm h2,
.speeches-error h2 {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.speeches-confirm__link {
  font-size: 0.875rem;
  color: var(--primary);
  text-decoration: underline;
  margin-top: 0.25rem;
}

.speeches-error__message {
  font-size: 0.875rem;
  color: var(--error, #ef4444);
  margin: 0;
}
```

- [ ] **Step 2: Fix the mobile breakpoint**

Find the existing `@media (max-width: 767px)` block at the bottom of `speeches.css`:

```css
@media (max-width: 767px) {
  .speeches-layout {
    grid-template-columns: 1fr;
  }

  .speeches-sidebar {
    position: static;
    order: -1;
  }
}
```

Remove `order: -1` — the sidebar is second in DOM order (after `.speeches-main`), so without `order: -1` it naturally appears below the content, which is what we want.

Replace with:

```css
@media (max-width: 767px) {
  .speeches-layout {
    grid-template-columns: 1fr;
  }

  .speeches-sidebar {
    position: static;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/member/speeches/speeches.css
git commit -m "feat(speeches): confirmation/error styles + fix mobile sidebar order"
```

---

## Task 5: Gate checks and open PR

- [ ] **Step 1: Run tsc**

```bash
npx tsc --noEmit
```

Expected: no errors (or same pre-existing baseline as main).

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no new errors beyond the pre-existing baseline on main (~76 errors in untouched files).

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Run migration grants check**

```bash
npm run check:migrations
```

Expected: passes.

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/issue-45-speech-tracker-polish
gh pr create \
  --title "feat(speeches): date field, confirmation state, mobile fix (#45)" \
  --body "$(cat <<'EOF'
## Summary

- Adds `speech_date` (required) to the Log Speech form — speeches no longer depend on a meeting link for their date
- Meeting picker demoted to optional "Link to a session" field
- Post-submit confirmation replaces the form in-place, echoes the speech title back, and offers "Log another" to reset
- Error state shown if Supabase insert fails (redirects to \`?error=1\`)
- Mobile layout fixed: sidebar (form) now correctly appears below speech history, not above it

## Migration

\`supabase/migrations/20260615000000_speech_date.sql\` — adds nullable \`speech_date date\` column to \`speeches\`. Applied on merge via CI.

## Test plan

- [ ] Log a speech with a date but no meeting → card shows the typed date
- [ ] Log a speech with a meeting selected → card shows \`speech_date\` (not the meeting date)
- [ ] Submit without filling the date field → browser rejects (required field)
- [ ] After successful submit → confirmation state shows with title echoed back
- [ ] Click "Log another" → returns to blank form
- [ ] Resize browser to < 768px → speech history appears above the form
- [ ] Existing speech cards (no \`speech_date\`) still show date via meeting fallback

Closes #45

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Manual verification checklist (post-merge)

After CI deploys the migration:

- [ ] Log in as a member, go to `/member/speeches`
- [ ] Log a historical speech with only a date (no meeting) — confirm card shows the date
- [ ] Log a speech with both a date and a meeting — confirm card shows the typed date, not the meeting date
- [ ] Attempt submit with no date — browser validation blocks it
- [ ] View on a phone-sized screen — history first, form below
- [ ] Confirm existing logged speeches still display correctly
