# Speech Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add (1) a "Remove" button on session speeches so members can clear a slot when a session is cancelled, and (2) a pathway progress tracker (F1–F5, A1–A5) with auto-tick from logged speeches and manual fallback.

**Architecture:** Feature 1 reuses the existing `dropRole` server action (minor addition of `revalidatePath`). Feature 2 adds a `speech_pathway_progress` table, auto-upserts in the log/update speech flows, and a new `PathwayTracker` client component on the speeches page.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`@supabase/ssr`), Pure CSS (no Tailwind — use CSS variables only), TypeScript.

**Key rule:** No Tailwind. CSS only via `speeches.css` and CSS variables (`var(--primary)`, `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`, `var(--ink-4)`, `var(--serif)`, `var(--mono)`, `var(--r-md)`, `var(--error)`, `var(--success)`).

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/pathways.ts` |
| Create | `supabase/migrations/20260619000000_speech_pathway_progress.sql` |
| Modify | `src/app/member/dashboard/actions.ts` |
| Create | `src/app/member/speeches/RemoveSessionSpeechButton.tsx` |
| Modify | `src/app/member/speeches/page.tsx` |
| Modify | `src/app/member/speeches/actions.ts` |
| Create | `src/app/member/speeches/PathwayTracker.tsx` |
| Modify | `src/app/member/speeches/speeches.css` |

---

## Task 1: Shared Pathway Constants

**Files:**
- Create: `src/lib/pathways.ts`

- [ ] **Create `src/lib/pathways.ts`:**

```typescript
export const VALID_PATHWAY_CODES = ['F1','F2','F3','F4','F5','A1','A2','A3','A4','A5'] as const
export type PathwayCode = typeof VALID_PATHWAY_CODES[number]

export const PATHWAY_DEFINITIONS = {
  foundation: [
    { code: 'F1', name: 'Public Speaking Cheat Sheet' },
    { code: 'F2', name: 'Speech Construction Guidance' },
    { code: 'F3', name: 'Mean What You Say' },
    { code: 'F4', name: 'Body Talk' },
    { code: 'F5', name: 'Vocal Impact' },
  ],
  advanced: [
    { code: 'A1', name: 'Using Language Creatively' },
    { code: 'A2', name: 'Telling the Story' },
    { code: 'A3', name: 'Beyond the Jokes' },
    { code: 'A4', name: 'Speak and Connect' },
    { code: 'A5', name: 'Showcase Speech' },
  ],
} as const
```

- [ ] **Commit:**

```bash
git add src/lib/pathways.ts
git commit -m "feat: add shared pathway constants"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260619000000_speech_pathway_progress.sql`

- [ ] **Create the migration file:**

```sql
create table if not exists public.speech_pathway_progress (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.profiles(id) on delete cascade,
  pathway_code  text not null check (pathway_code in ('F1','F2','F3','F4','F5','A1','A2','A3','A4','A5')),
  completed     boolean not null default false,
  completed_at  date,
  speech_title  text,
  unique (member_id, pathway_code)
);

alter table public.speech_pathway_progress enable row level security;

create policy "Members can read own pathway progress"
  on public.speech_pathway_progress for select
  using (auth.uid() = member_id);

create policy "Members can insert own pathway progress"
  on public.speech_pathway_progress for insert
  with check (auth.uid() = member_id);

create policy "Members can update own pathway progress"
  on public.speech_pathway_progress for update
  using (auth.uid() = member_id);

create policy "Admins can read all pathway progress"
  on public.speech_pathway_progress for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create index if not exists speech_pathway_progress_member_id_idx
  on public.speech_pathway_progress(member_id);
```

- [ ] **Push the migration to Supabase:**

```bash
npx supabase db push
```

Expected: migration applies cleanly with no errors. If you see "already exists" errors on the table, run:

```bash
npx supabase migration repair --status applied --linked 20260619000000
```

- [ ] **Verify in Supabase dashboard:** Table `speech_pathway_progress` appears under Table Editor with the correct columns and RLS enabled.

- [ ] **Commit:**

```bash
git add supabase/migrations/20260619000000_speech_pathway_progress.sql
git commit -m "feat: add speech_pathway_progress migration"
```

---

## Task 3: Extend dropRole to Revalidate Speeches Page

**Files:**
- Modify: `src/app/member/dashboard/actions.ts`

The existing `dropRole` action at the bottom of this file calls `revalidatePath('/member/dashboard')` but not `/member/speeches`. The Remove Session Speech button on the speeches page will call this same action, so it also needs to invalidate the speeches route.

- [ ] **In `src/app/member/dashboard/actions.ts`, add a second revalidatePath call inside `dropRole`:**

Find this block (around line 111):
```typescript
  revalidatePath('/member/dashboard')
}
```

Replace with:
```typescript
  revalidatePath('/member/dashboard')
  revalidatePath('/member/speeches')
}
```

The full `dropRole` function after the change:

```typescript
export async function dropRole(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('meeting_assignments')
    .update({ 
      member_id: null,
      speech_title: null,
      speech_level: null,
      speech_length: null
    })
    .eq('id', assignmentId)
    .eq('member_id', user.id)

  if (error) {
    console.error(error)
    throw new Error("Failed to drop role")
  }
  
  revalidatePath('/member/dashboard')
  revalidatePath('/member/speeches')
}
```

- [ ] **Commit:**

```bash
git add src/app/member/dashboard/actions.ts
git commit -m "feat: revalidate speeches page after dropRole"
```

---

## Task 4: RemoveSessionSpeechButton and Wire into Speeches Page

**Files:**
- Create: `src/app/member/speeches/RemoveSessionSpeechButton.tsx`
- Modify: `src/app/member/speeches/page.tsx`

- [ ] **Create `src/app/member/speeches/RemoveSessionSpeechButton.tsx`:**

```tsx
'use client'

import { dropRole } from '@/app/member/dashboard/actions'

export default function RemoveSessionSpeechButton({ assignmentId }: { assignmentId: string }) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm('Remove this speech from your tracker? The slot will become available again.')) {
      e.preventDefault()
    }
  }

  return (
    <form action={dropRole} onSubmit={handleSubmit}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button type="submit" className="speech-delete-btn">Remove</button>
    </form>
  )
}
```

- [ ] **In `src/app/member/speeches/page.tsx`, import the new component at the top:**

Add alongside the existing imports:
```tsx
import RemoveSessionSpeechButton from './RemoveSessionSpeechButton'
```

- [ ] **In `src/app/member/speeches/page.tsx`, add the button to each session speech card.**

Find this block inside the `sortedSessionSpeeches.map(...)`:
```tsx
                <div key={s.id} className="wsc-card speech-card">
                  <div className="speech-card__body">
                    <h3 className="speech-card__title">{s.speech_title}</h3>
                    <div className="speech-card__meta">
                      {s.speech_level && <span className="wsc-tag wsc-tag-gold">{s.speech_level}</span>}
                      {s.speech_length && <span>{s.speech_length}</span>}
                    </div>
                  </div>
                  <span className="speech-card__date">
                    {s.meetings?.meeting_date ? fmtDate(s.meetings.meeting_date) : 'No date'}
                  </span>
                </div>
```

Replace with:
```tsx
                <div key={s.id} className="wsc-card speech-card">
                  <div className="speech-card__body">
                    <h3 className="speech-card__title">{s.speech_title}</h3>
                    <div className="speech-card__meta">
                      {s.speech_level && <span className="wsc-tag wsc-tag-gold">{s.speech_level}</span>}
                      {s.speech_length && <span>{s.speech_length}</span>}
                    </div>
                  </div>
                  <div className="speech-card__actions">
                    <span className="speech-card__date">
                      {s.meetings?.meeting_date ? fmtDate(s.meetings.meeting_date) : 'No date'}
                    </span>
                    <RemoveSessionSpeechButton assignmentId={s.id} />
                  </div>
                </div>
```

- [ ] **Manually verify Feature 1:**
  1. Start dev server: `npm run dev`
  2. Log in as a member who has a session speech assigned
  3. Go to `/member/speeches`
  4. Confirm a "Remove" button appears on each session speech card
  5. Click Remove → confirm dialog appears
  6. Confirm → card disappears from the list
  7. Check the dashboard — the slot should now be unassigned (open to volunteer)

- [ ] **Commit:**

```bash
git add src/app/member/speeches/RemoveSessionSpeechButton.tsx src/app/member/speeches/page.tsx
git commit -m "feat: allow members to remove session speeches"
```

---

## Task 5: Pathway Server Actions

**Files:**
- Modify: `src/app/member/speeches/actions.ts`

Add `markPathwayComplete` and `unmarkPathwayComplete` to the existing actions file.

- [ ] **Add the following imports at the top of `src/app/member/speeches/actions.ts`** (after existing imports):

```typescript
import { VALID_PATHWAY_CODES } from '@/lib/pathways'
```

- [ ] **Append `markPathwayComplete` and `unmarkPathwayComplete` to the end of `src/app/member/speeches/actions.ts`:**

```typescript
export async function markPathwayComplete(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const pathwayCode = (formData.get('pathwayCode') as string)?.toUpperCase()
  const speechTitle = (formData.get('speechTitle') as string)?.trim() || null
  const completedAt = (formData.get('completedAt') as string) || null

  if (!VALID_PATHWAY_CODES.includes(pathwayCode as any)) throw new Error('Invalid pathway code')

  await supabase.from('speech_pathway_progress').upsert({
    member_id: user.id,
    pathway_code: pathwayCode,
    completed: true,
    completed_at: completedAt || null,
    speech_title: speechTitle || null,
  }, { onConflict: 'member_id,pathway_code' })

  revalidatePath('/member/speeches')
}

export async function unmarkPathwayComplete(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')

  const pathwayCode = (formData.get('pathwayCode') as string)?.toUpperCase()

  if (!VALID_PATHWAY_CODES.includes(pathwayCode as any)) throw new Error('Invalid pathway code')

  await supabase
    .from('speech_pathway_progress')
    .update({ completed: false, completed_at: null, speech_title: null })
    .eq('member_id', user.id)
    .eq('pathway_code', pathwayCode)

  revalidatePath('/member/speeches')
}
```

- [ ] **Commit:**

```bash
git add src/app/member/speeches/actions.ts
git commit -m "feat: add markPathwayComplete and unmarkPathwayComplete actions"
```

---

## Task 6: Auto-Tick From logSpeech

**Files:**
- Modify: `src/app/member/speeches/actions.ts`

When a member logs a historical speech via the sidebar form and the `pathway` field matches a valid code, auto-upsert the pathway progress. This uses `ignoreDuplicates: true` so an already-completed entry is never overwritten.

- [ ] **In `src/app/member/speeches/actions.ts`, add the import (if not already there from Task 5):**

```typescript
import { VALID_PATHWAY_CODES } from '@/lib/pathways'
```

- [ ] **In `logSpeech`, after the successful insert and before the final redirect, add the auto-tick block.**

Find the block in `logSpeech`:
```typescript
  if (error) {
    redirect('/member/speeches?error=1')
  }

  redirect(`/member/speeches?logged=${encodeURIComponent(title)}`)
```

Replace with:
```typescript
  if (error) {
    redirect('/member/speeches?error=1')
  }

  const normalizedCode = pathway?.trim().toUpperCase()
  if (normalizedCode && (VALID_PATHWAY_CODES as readonly string[]).includes(normalizedCode)) {
    await supabase.from('speech_pathway_progress').upsert({
      member_id: user.id,
      pathway_code: normalizedCode,
      completed: true,
      completed_at: speech_date,
      speech_title: title,
    }, { onConflict: 'member_id,pathway_code', ignoreDuplicates: true })
  }

  redirect(`/member/speeches?logged=${encodeURIComponent(title)}`)
```

- [ ] **Manually verify:** Log a historical speech with pathway "F3". Navigate to the Pathway Tracker section — F3 should now be ticked, showing the speech title and date.

- [ ] **Commit:**

```bash
git add src/app/member/speeches/actions.ts
git commit -m "feat: auto-tick pathway progress when logging a speech"
```

---

## Task 7: Auto-Tick From updateSpeechDetails

**Files:**
- Modify: `src/app/member/dashboard/actions.ts`

When a member fills in speech details for a session slot and `speech_level` is a valid pathway code, auto-upsert pathway progress (no date — session date not available in this action).

- [ ] **Add the import at the top of `src/app/member/dashboard/actions.ts`:**

```typescript
import { VALID_PATHWAY_CODES } from '@/lib/pathways'
```

- [ ] **In `updateSpeechDetails`, add the auto-tick block after the successful update.** Find:

```typescript
  if (error) {
    console.error(error)
    throw new Error("Failed to update speech details")
  }

  revalidatePath('/member/dashboard')
```

Replace with:
```typescript
  if (error) {
    console.error(error)
    throw new Error("Failed to update speech details")
  }

  const normalizedCode = speech_level?.trim().toUpperCase()
  if (normalizedCode && (VALID_PATHWAY_CODES as readonly string[]).includes(normalizedCode)) {
    const supabaseForProgress = await createClient()
    const { data: { user } } = await supabaseForProgress.auth.getUser()
    if (user) {
      await supabaseForProgress.from('speech_pathway_progress').upsert({
        member_id: user.id,
        pathway_code: normalizedCode,
        completed: true,
        completed_at: null,
        speech_title: speech_title || null,
      }, { onConflict: 'member_id,pathway_code', ignoreDuplicates: true })
    }
  }

  revalidatePath('/member/dashboard')
  revalidatePath('/member/speeches')
```

Note: `supabase` is already in scope from the volunteer/update flow — reuse it directly rather than calling `createClient()` twice. The snippet above creates a second client because `user` may not be in scope; adjust to reuse the existing `supabase` and `user` variables if they are already defined earlier in the function.

**Corrected version using existing `supabase` and `user` variables (check that both are defined before this block):**

```typescript
  if (error) {
    console.error(error)
    throw new Error("Failed to update speech details")
  }

  const normalizedCode = speech_level?.trim().toUpperCase()
  if (normalizedCode && (VALID_PATHWAY_CODES as readonly string[]).includes(normalizedCode)) {
    await supabase.from('speech_pathway_progress').upsert({
      member_id: user.id,
      pathway_code: normalizedCode,
      completed: true,
      completed_at: null,
      speech_title: speech_title || null,
    }, { onConflict: 'member_id,pathway_code', ignoreDuplicates: true })
  }

  revalidatePath('/member/dashboard')
  revalidatePath('/member/speeches')
```

- [ ] **Manually verify:** Go to the member dashboard, volunteer for a speech slot, and set speech level to "F1". Go to `/member/speeches` — F1 should now appear ticked in the pathway tracker.

- [ ] **Commit:**

```bash
git add src/app/member/dashboard/actions.ts
git commit -m "feat: auto-tick pathway progress when updating session speech details"
```

---

## Task 8: PathwayTracker Component and CSS

**Files:**
- Create: `src/app/member/speeches/PathwayTracker.tsx`
- Modify: `src/app/member/speeches/speeches.css`

- [ ] **Create `src/app/member/speeches/PathwayTracker.tsx`:**

```tsx
'use client'

import { useState } from 'react'
import { markPathwayComplete, unmarkPathwayComplete } from './actions'
import { PATHWAY_DEFINITIONS } from '@/lib/pathways'

type ProgressEntry = {
  pathway_code: string
  completed: boolean
  completed_at: string | null
  speech_title: string | null
}

interface PathwayTrackerProps {
  progress: ProgressEntry[]
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function PathwayItem({
  code,
  name,
  entry,
}: {
  code: string
  name: string
  entry: ProgressEntry | undefined
}) {
  const [showForm, setShowForm] = useState(false)
  const done = entry?.completed ?? false

  return (
    <div className={`pathway-item${done ? ' pathway-item--done' : ''}`}>
      <div className="pathway-item__left">
        <span className={`pathway-item__check${done ? ' pathway-item__check--done' : ''}`}>
          {done ? '✓' : ''}
        </span>
        <div className="pathway-item__text">
          <span className="pathway-item__code">{code}</span>
          <span className="pathway-item__name">{name}</span>
          {done && (entry?.speech_title || entry?.completed_at) && (
            <span className="pathway-item__detail">
              {entry?.speech_title && `"${entry.speech_title}"`}
              {entry?.speech_title && entry?.completed_at && ' · '}
              {entry?.completed_at && fmtDate(entry.completed_at)}
            </span>
          )}
        </div>
      </div>
      <div className="pathway-item__right">
        {done ? (
          <form action={unmarkPathwayComplete}>
            <input type="hidden" name="pathwayCode" value={code} />
            <button type="submit" className="pathway-item__undo">Undo</button>
          </form>
        ) : (
          <button
            type="button"
            className="pathway-item__mark-btn"
            onClick={() => setShowForm(s => !s)}
          >
            {showForm ? 'Cancel' : 'Mark done'}
          </button>
        )}
      </div>
      {showForm && !done && (
        <form action={markPathwayComplete} className="pathway-item__form">
          <input type="hidden" name="pathwayCode" value={code} />
          <input
            type="text"
            name="speechTitle"
            placeholder="Speech title (optional)"
            className="wsc-input pathway-item__form-input"
          />
          <input
            type="date"
            name="completedAt"
            className="wsc-input pathway-item__form-input"
          />
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm">
            Confirm
          </button>
        </form>
      )}
    </div>
  )
}

function PathwaySection({
  title,
  items,
  progress,
}: {
  title: string
  items: readonly { code: string; name: string }[]
  progress: ProgressEntry[]
}) {
  const progressMap = Object.fromEntries(progress.map(p => [p.pathway_code, p]))
  const doneCount = items.filter(i => progressMap[i.code]?.completed).length

  return (
    <div className="pathway-section">
      <div className="pathway-section__header">
        <span className="pathway-section__title">{title}</span>
        <span className="pathway-section__count">{doneCount} of {items.length}</span>
      </div>
      <div className="pathway-section__bar">
        <div
          className="pathway-section__bar-fill"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>
      <div className="pathway-section__items">
        {items.map(item => (
          <PathwayItem
            key={item.code}
            code={item.code}
            name={item.name}
            entry={progressMap[item.code]}
          />
        ))}
      </div>
    </div>
  )
}

export default function PathwayTracker({ progress }: PathwayTrackerProps) {
  return (
    <section className="speeches-section">
      <h2>Pathway Progress</h2>
      <div className="pathway-tracker">
        <PathwaySection
          title="Foundation"
          items={PATHWAY_DEFINITIONS.foundation}
          progress={progress}
        />
        <PathwaySection
          title="Advanced"
          items={PATHWAY_DEFINITIONS.advanced}
          progress={progress}
        />
      </div>
    </section>
  )
}
```

- [ ] **Append pathway tracker styles to `src/app/member/speeches/speeches.css`:**

```css
/* ── Pathway Tracker ─────────────────────────────────────── */

.pathway-tracker {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.pathway-section__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.pathway-section__title {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}

.pathway-section__count {
  font-family: var(--mono);
  font-size: 0.72rem;
  color: var(--ink-4);
}

.pathway-section__bar {
  height: 3px;
  background: oklch(0.22 0.01 260);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.pathway-section__bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.pathway-section__items {
  display: flex;
  flex-direction: column;
}

.pathway-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid oklch(0.2 0.01 260 / 0.5);
  flex-wrap: wrap;
}

.pathway-item:last-child {
  border-bottom: none;
}

.pathway-item__left {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  flex: 1;
}

.pathway-item__check {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--ink-4);
  flex-shrink: 0;
  margin-top: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.pathway-item__check--done {
  background: var(--primary);
  border-color: var(--primary);
  color: #000;
  font-weight: 700;
}

.pathway-item__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.pathway-item__code {
  font-family: var(--mono);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: 0.04em;
}

.pathway-item__name {
  font-size: 0.9rem;
  color: var(--ink-2);
}

.pathway-item--done .pathway-item__name {
  color: var(--ink-3);
}

.pathway-item__detail {
  font-size: 0.78rem;
  color: var(--ink-4);
  font-family: var(--mono);
  margin-top: 0.1rem;
}

.pathway-item__right {
  margin-left: auto;
  padding-top: 2px;
}

.pathway-item__mark-btn,
.pathway-item__undo {
  background: none;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.pathway-item__mark-btn {
  color: var(--primary);
}

.pathway-item__undo {
  color: var(--ink-4);
}

.pathway-item__form {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  padding-left: calc(18px + 0.75rem);
  margin-top: 0.25rem;
}

.pathway-item__form-input {
  flex: 1;
  min-width: 140px;
  font-size: 0.85rem !important;
  padding: 0.4rem 0.6rem !important;
}
```

- [ ] **Commit:**

```bash
git add src/app/member/speeches/PathwayTracker.tsx src/app/member/speeches/speeches.css
git commit -m "feat: add PathwayTracker component and styles"
```

---

## Task 9: Wire PathwayTracker into the Speeches Page

**Files:**
- Modify: `src/app/member/speeches/page.tsx`

- [ ] **Add import at the top of `src/app/member/speeches/page.tsx`:**

```tsx
import PathwayTracker from './PathwayTracker'
```

- [ ] **Add a query for pathway progress inside `SpeechesPage`, after the existing queries:**

```typescript
  const { data: pathwayProgress } = await supabase
    .from('speech_pathway_progress')
    .select('pathway_code, completed, completed_at, speech_title')
    .eq('member_id', user.id)
```

- [ ] **Add `<PathwayTracker>` to the JSX, between the Session Speeches section and the Manually Logged Speeches section:**

Find this comment in the JSX:
```tsx
          {/* Manually Logged Speeches */}
```

Insert before it:
```tsx
          {/* Pathway Progress */}
          <PathwayTracker progress={pathwayProgress ?? []} />

```

- [ ] **Manually verify the full Feature 2 flow:**
  1. Go to `/member/speeches` — Pathway Progress section appears with Foundation and Advanced checklists, all unticked, progress bars at 0%.
  2. Click "Mark done" on F1 — inline form appears with title and date inputs.
  3. Fill in a title and date, click Confirm — F1 now shows as ticked with the detail inline.
  4. Click "Undo" on F1 — F1 returns to unticked.
  5. Log a historical speech (sidebar form) with pathway "F2" — F2 auto-ticks with title and date.
  6. Go to the dashboard, volunteer for a speech slot, set level to "F3", submit — go to `/member/speeches`, F3 is ticked (no date, since session date is not captured in that flow).
  7. Tick an item with no title or date — only the tick appears, no detail line.

- [ ] **Commit:**

```bash
git add src/app/member/speeches/page.tsx
git commit -m "feat: wire PathwayTracker into speeches page"
```

---

## Done

Both features are complete:

- **Feature 1:** Members can remove a session speech via the "Remove" button on the Session Speeches section. The slot is freed for re-claiming.
- **Feature 2:** Pathway progress tracker shows Foundation (F1–F5) and Advanced (A1–A5) as a checklist. Auto-ticks from logged speeches and session speech details. Manual tick with optional title/date fallback. Undo available on completed items.
