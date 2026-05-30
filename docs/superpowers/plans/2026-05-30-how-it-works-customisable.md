# Customisable "How it works" Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let non-technical admins edit the homepage "How it works" section (eyebrow, heading, and a variable list of drag-orderable steps) without a code change.

**Architecture:** Steps live in a new `how_it_works_steps` table (public read, admin write via RLS); the section header lives in three new `site_settings` columns. The `/admin/settings` page gains the header fields (existing server-action form) and a `HowItWorksManager` client component using native HTML5 drag-and-drop. The homepage reads both from Supabase and renders with the existing CSS classes.

**Tech Stack:** Next.js 16 (App Router, Server Components + server actions), Supabase (`@supabase/ssr`, RLS), vanilla CSS. No new dependencies. **No test framework is configured** — verification is `npx tsc --noEmit` plus explicit manual steps.

**Spec:** `docs/superpowers/specs/2026-05-30-how-it-works-customisable-design.md`

---

## File Structure

- **Create** `supabase/migrations/20260530100000_how_it_works.sql` — new table, RLS, grants, `site_settings` columns, seed data.
- **Modify** `src/app/admin/settings/actions.ts` — extend `updateSettings`; add `addStep`, `updateStep`, `deleteStep`, `reorderSteps`.
- **Create** `src/app/admin/settings/HowItWorksManager.tsx` — client component (drag-reorder + add/edit/delete).
- **Modify** `src/app/admin/settings/page.tsx` — add header fields to the form; fetch steps; render `HowItWorksManager`.
- **Modify** `src/app/page.tsx` — fetch steps + header fields; render section from data.

---

## Task 1: Database migration (table, RLS, grants, seed)

**Files:**
- Create: `supabase/migrations/20260530100000_how_it_works.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260530100000_how_it_works.sql` with exactly this content:

```sql
-- Issue #28: customisable "How it works" homepage section.

-- 1. Steps table -----------------------------------------------------------
create table if not exists public.how_it_works_steps (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  sort_order int  not null,
  created_at timestamptz not null default now()
);

create index if not exists how_it_works_steps_sort_order_idx
  on public.how_it_works_steps(sort_order);

-- 2. RLS -------------------------------------------------------------------
alter table public.how_it_works_steps enable row level security;

-- Public read (anon homepage + authenticated)
do $$ begin
  create policy "public read how_it_works_steps"
    on public.how_it_works_steps for select
    using (true);
exception when duplicate_object then null; end $$;

-- Admin-only insert
do $$ begin
  create policy "admins insert how_it_works_steps"
    on public.how_it_works_steps for insert
    with check (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- Admin-only update
do $$ begin
  create policy "admins update how_it_works_steps"
    on public.how_it_works_steps for update
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- Admin-only delete
do $$ begin
  create policy "admins delete how_it_works_steps"
    on public.how_it_works_steps for delete
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- 3. PostgREST grants (required since Supabase May 30 2026 change) ----------
grant select on public.how_it_works_steps to anon, authenticated;
grant insert, update, delete on public.how_it_works_steps to authenticated;

-- 4. Section header columns on site_settings -------------------------------
alter table public.site_settings
  add column if not exists how_it_works_eyebrow    text,
  add column if not exists how_it_works_heading     text,
  add column if not exists how_it_works_heading_em  text;

-- 5. Seed current content (only if not already set / empty) ----------------
update public.site_settings
  set how_it_works_eyebrow   = coalesce(how_it_works_eyebrow,   'How it works'),
      how_it_works_heading    = coalesce(how_it_works_heading,    'We keep it simple.'),
      how_it_works_heading_em = coalesce(how_it_works_heading_em, 'You keep your seat.')
  where id = 1;

insert into public.how_it_works_steps (title, body, sort_order)
select v.title, v.body, v.sort_order
from (values
  ('Just turn up',
   'No booking needed for your first three visits. The kettle goes on at half six. Meeting starts at seven. Someone will meet you at the door.',
   1),
  ('Watch and listen',
   'You won''t be asked to speak until you''re ready. Watch how it works, ask questions, eat a biscuit. There''s absolutely no pressure.',
   2),
  ('Find your pace',
   'When you''re ready, take a role. Give a speech. Get feedback. We follow the Pathways programme — or we can just be your Tuesday-night practice ground.',
   3)
) as v(title, body, sort_order)
where not exists (select 1 from public.how_it_works_steps);
```

- [ ] **Step 2: Verify the SQL parses (dry run against local schema if available)**

If the Supabase CLI + local DB are available:
Run: `npx supabase db reset --debug` (local only) **or** review-only if no local DB.
Expected: migration applies with no syntax errors. If no local DB is configured, skip and rely on CI (`supabase-deploy.yml` uses `--include-all`); visually confirm the `do $$ ... end $$;` blocks and doubled single-quotes (`''`) in the seed strings are intact.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260530100000_how_it_works.sql
git commit -m "feat: how_it_works_steps table + site_settings header cols (#28)"
```

---

## Task 2: Server actions

**Files:**
- Modify: `src/app/admin/settings/actions.ts`

- [ ] **Step 1: Extend `updateSettings` to save the three header fields**

In `src/app/admin/settings/actions.ts`, replace the body of `updateSettings` so it also reads and writes the new columns. The full updated function:

```ts
export async function updateSettings(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const hero_title = formData.get('hero_title') as string
  const hero_subtitle = formData.get('hero_subtitle') as string
  const about_text = formData.get('about_text') as string
  const venue_name = formData.get('venue_name') as string
  const venue_address = formData.get('venue_address') as string
  const how_it_works_eyebrow = formData.get('how_it_works_eyebrow') as string
  const how_it_works_heading = formData.get('how_it_works_heading') as string
  const how_it_works_heading_em = formData.get('how_it_works_heading_em') as string

  const { error } = await supabase
    .from('site_settings')
    .update({
      hero_title, hero_subtitle, about_text, venue_name, venue_address,
      how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em,
    })
    .eq('id', 1)

  if (error) {
    console.error(error)
    throw new Error("Failed to update settings")
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 2: Add the four step actions**

Append to the same file:

```ts
export async function addStep() {
  await checkAdmin()
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from('how_it_works_steps')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { error } = await supabase
    .from('how_it_works_steps')
    .insert({ title: 'New step', body: 'Describe this step.', sort_order: nextOrder })

  if (error) {
    console.error(error)
    throw new Error('Failed to add step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function updateStep(id: string, title: string, body: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('how_it_works_steps')
    .update({ title, body })
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to update step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function deleteStep(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('how_it_works_steps')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to delete step')
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}

export async function reorderSteps(orderedIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('how_it_works_steps')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])

    if (error) {
      console.error(error)
      throw new Error('Failed to reorder steps')
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`addStep`/`updateStep`/`deleteStep`/`reorderSteps` are exported async server actions in a `'use server'` file — all args are serialisable primitives/arrays, which is required for client→server action calls.)

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/actions.ts
git commit -m "feat: server actions for how-it-works header + steps CRUD (#28)"
```

---

## Task 3: Admin UI — `HowItWorksManager` + settings page wiring

**Files:**
- Create: `src/app/admin/settings/HowItWorksManager.tsx`
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Create the client component**

Create `src/app/admin/settings/HowItWorksManager.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addStep, updateStep, deleteStep, reorderSteps } from './actions'

type Step = { id: string; title: string; body: string }

export default function HowItWorksManager({ initialSteps }: { initialSteps: Step[] }) {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function editField(id: string, field: 'title' | 'body', value: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  function handleSave(step: Step) {
    startTransition(async () => {
      await updateStep(step.id, step.title, step.body)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteStep(id)
      router.refresh()
    })
  }

  function handleAdd() {
    startTransition(async () => {
      await addStep()
      router.refresh()
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...steps]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setSteps(next)
    setDragIndex(null)
    startTransition(async () => {
      await reorderSteps(next.map((s) => s.id))
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {steps.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          No steps yet. Add one below.
        </p>
      )}

      {steps.map((step, i) => (
        <div
          key={step.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          className="wsc-card"
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            opacity: dragIndex === i ? 0.5 : 1,
            cursor: 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden style={{ color: 'var(--ink-3)', cursor: 'grab' }}>⠿</span>
            <span style={{ fontWeight: 600, color: 'var(--ink-3)', fontSize: 13 }}>
              Step {String(i + 1).padStart(2, '0')}
            </span>
          </div>

          <label className="wsc-label" htmlFor={`title-${step.id}`}>Title</label>
          <input
            id={`title-${step.id}`}
            className="wsc-input"
            value={step.title}
            onChange={(e) => editField(step.id, 'title', e.target.value)}
          />

          <label className="wsc-label" htmlFor={`body-${step.id}`}>Body</label>
          <textarea
            id={`body-${step.id}`}
            className="wsc-input"
            rows={3}
            value={step.body}
            onChange={(e) => editField(step.id, 'body', e.target.value)}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="wsc-btn wsc-btn-primary"
              disabled={isPending}
              onClick={() => handleSave(step)}
            >
              Save
            </button>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleDelete(step.id)}
              style={{ color: 'var(--clay)' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          className="wsc-btn"
          disabled={isPending}
          onClick={handleAdd}
        >
          + Add step
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire header fields + manager into the settings page**

In `src/app/admin/settings/page.tsx`:

(a) Add imports at the top (after the existing `import { updateSettings }` line):

```tsx
import HowItWorksManager from './HowItWorksManager'
```

(b) After the existing `site_settings` query, add a steps query. Replace:

```tsx
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()
```

with:

```tsx
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const { data: steps } = await supabase
    .from('how_it_works_steps')
    .select('id, title, body')
    .order('sort_order', { ascending: true })
```

(c) Inside the existing `<form action={updateSettings}>`, immediately before the closing
submit `<div>` that contains the "Save Changes" button, add the three header fields:

```tsx
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>How It Works — Header</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_eyebrow" className="wsc-label">Eyebrow Label</label>
            <input type="text" id="how_it_works_eyebrow" name="how_it_works_eyebrow" defaultValue={settings?.how_it_works_eyebrow ?? ''} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_heading" className="wsc-label">Heading</label>
            <input type="text" id="how_it_works_heading" name="how_it_works_heading" defaultValue={settings?.how_it_works_heading ?? ''} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_heading_em" className="wsc-label">Heading Accent (shown in italics)</label>
            <input type="text" id="how_it_works_heading_em" name="how_it_works_heading_em" defaultValue={settings?.how_it_works_heading_em ?? ''} className="wsc-input" />
          </div>
```

(d) After the closing `</form>` of the settings form (still inside the `wsc-card` is fine, or as a sibling card), add a steps section. Insert immediately after `</form>`:

```tsx
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '2rem 0 1rem', color: 'var(--ink)' }}>How It Works — Steps</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 1rem' }}>
          Drag the cards to reorder. Step numbers update automatically.
        </p>
        <HowItWorksManager initialSteps={steps ?? []} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (admin)**

Run: `npm run dev`, log in as an admin, open `/admin/settings`.
Expected:
- Header fields show the seeded values ("How it works", "We keep it simple.", "You keep your seat.").
- Three step cards appear under "How It Works — Steps".
- Editing a step title/body + **Save** persists after a page reload.
- **+ Add step** adds a new card; **Delete** removes one.
- Dragging a card to a new position reorders it; after reload the new order and the
  "Step 0N" labels are sequential.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/settings/HowItWorksManager.tsx src/app/admin/settings/page.tsx
git commit -m "feat: admin UI to edit how-it-works header + steps (#28)"
```

---

## Task 4: Homepage rendering from data

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Fetch the steps and header on the homepage**

In `src/app/page.tsx`, the component already fetches `events`, `news`, etc. Add a
`site_settings` fetch (the homepage does not currently read it) and a steps fetch. Insert
after the `memberCount` query (around line 49), before `const nextMeeting = events?.[0]`:

```tsx
  const { data: settings } = await supabase
    .from('site_settings')
    .select('how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em')
    .eq('id', 1)
    .single()

  const { data: howItWorksSteps } = await supabase
    .from('how_it_works_steps')
    .select('id, title, body')
    .order('sort_order', { ascending: true })
```

- [ ] **Step 2: Replace the hardcoded section with data-driven rendering**

Replace the entire `{/* How it works */}` `<section>` block (currently lines 116–149) with:

```tsx
        {/* How it works */}
        <section className="home-how" id="about">
          <div className="home-how__inner">
            <div className="home-how__header">
              <EyebrowLabel tone="clay">{settings?.how_it_works_eyebrow ?? 'How it works'}</EyebrowLabel>
              <h2>
                {settings?.how_it_works_heading ?? 'We keep it simple.'}{' '}
                {settings?.how_it_works_heading_em && <em>{settings.how_it_works_heading_em}</em>}
              </h2>
            </div>
            {howItWorksSteps && howItWorksSteps.length > 0 && (
              <div className="home-how__steps">
                {howItWorksSteps.map((step, i) => (
                  <div key={step.id} className="home-how__step">
                    <div className="home-how__step-num">Step {String(i + 1).padStart(2, '0')}</div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (public homepage)**

Run: `npm run dev`, open `/` while logged out.
Expected:
- The "How it works" section looks identical to before (eyebrow, heading with italic
  accent, three steps numbered Step 01–03).
- Edit a step + header in `/admin/settings`, reload `/` — the changes appear.
- In `/admin/settings`, delete all steps, reload `/` — the section header still renders and
  the steps grid is omitted (no error).
- Re-add the three steps (or restore via DB) before finishing.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render how-it-works section from database (#28)"
```

---

## Final verification

- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run build` succeeds.
- [ ] Full manual pass: admin edits header + steps, adds, deletes, reorders; homepage
  reflects every change; logged-out homepage renders seeded content; empty-steps state
  degrades gracefully.
- [ ] Comment on issue #28 that it's ready for manual testing (do **not** close — per
  workflow, the user signs off UX work after testing).

---

## Notes for the implementer

- **No test runner exists** in this repo — do not invent one or add a test dependency.
  Verification is `npx tsc --noEmit`, `npm run build`, and the manual steps above.
- All server actions live in a `'use server'` file and are gated by `checkAdmin()`; never
  trust the client for authorisation.
- Keep using the existing `wsc-*` CSS classes and CSS variables (`var(--ink)`, `var(--ink-3)`,
  `var(--clay)`). **Do not add Tailwind** (AGENTS.md).
- The admin settings page renders on a light (`--paper`) background, so `var(--ink)` /
  `var(--ink-3)` are correct there (per project memory).
