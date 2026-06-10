# Venue & Meeting Details Customisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make venue, meeting day/time, and facilities a single admin-edited source of truth that every public surface renders from, fixing the #32 wiring bug and the existing postcode/name/time drift.

**Architecture:** Add the missing meeting fields + a `facilities` table to `site_settings` via one migration (mirroring the `how_it_works_steps` pattern: RLS + explicit PostgREST grants + idempotent seed). A new pure-function module `src/lib/venue.ts` centralises all formatting so navbar, homepage, contact, meetings, login, signup, and metadata render consistently from the same fields. Admin edits via extended `updateSettings` + a `FacilitiesManager` client component mirroring `HowItWorksManager`.

**Testing strategy (Tier 0+1+2 — decided 2026-06-05):** This project's recurring failures are integration/config/visual, not pure-logic, so we skip formal unit-TDD and instead target the actual failure modes:
- **Tier 0 (gates):** `npx tsc --noEmit`, `npm run lint`, `npm run build` run per task.
- **Tier 1 (e2e smoke):** a Playwright suite asserting public surfaces render DB values — Task 0a sets up the harness; Task 13 adds the #32 regression test (homepage shows the venue values from `site_settings`). This is the layer that maps to the #32 wiring-gap class of bug.
- **Tier 2 (migration guard):** a script (Task 0b) that fails CI/local if a migration creating a table lacks an explicit `grant`, killing the recurring "forgot PostgREST grants" footgun. The Task 1 facilities migration must pass it.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase (`@/utils/supabase/server`), vanilla CSS, `@playwright/test` for e2e smoke. No unit runner is added (pure helpers in `venue.ts` stay trivially unit-testable later if wanted).

**Issues:** #32 (venue wiring bug), #33 (day/frequency/times customisable), #34 (facilities customisable).

**Spec:** `docs/superpowers/specs/2026-05-30-venue-meeting-details-customisation-design.md`

**Branch:** `feat/issue-32-venue-details` (off `main`).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/migrations/20260605120000_venue_meeting_details.sql` | New `site_settings` columns, `facilities` table + RLS + grants + seed, normalise drifted values | Create |
| `src/lib/venue.ts` | Pure formatting helpers + `VenueSettings` type | Create |
| `src/app/admin/settings/actions.ts` | Extend `updateSettings`; add `addFacility`/`updateFacility`/`deleteFacility`/`reorderFacilities` | Modify |
| `src/app/admin/settings/FacilitiesManager.tsx` | Client manager (mirror of `HowItWorksManager`) | Create |
| `src/app/admin/settings/page.tsx` | New venue/meeting fields + Facilities section | Modify |
| `src/app/page.tsx` | Venue block, schedule line, times line, facilities, directions read from helpers/table | Modify |
| `src/app/contact/page.tsx` | Fetch settings + facilities; venue card + directions from helpers | Modify |
| `src/app/meetings/page.tsx` | Realign defaults to helpers | Modify |
| `src/app/login/page.tsx` | `· 7pm` detail line → start time | Modify |
| `src/app/signup/SignupFlow.tsx` | Metadata line, doors text, calendar location, directions | Modify |
| `src/components/Navbar.tsx` | Top ribbon → `formatMeetingShort()` | Modify |
| `src/app/layout.tsx` | Metadata description from settings | Modify |
| `playwright.config.ts` | E2e harness config (webServer + baseURL) | Create |
| `e2e/venue.spec.ts` | #32 regression: homepage renders venue from settings | Create |
| `scripts/check-migration-grants.mjs` | Tier-2 guard: fail if a `create table` migration lacks `grant` | Create |
| `package.json` | `test:e2e` + `check:migrations` scripts | Modify |

**Out of scope (per spec):** the decorative SVG "village map" labels in `page.tsx`; brand-voice prose baking in "Tuesday" (hero + login quote prose + signup hero copy); the `meetings` table / Session Planner. The login *quote* and CTA *person-mention* belong to #30/#31 (separate plan) — do not touch them here.

---

## Task 0a: Playwright e2e harness (Tier 1 setup)

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `.gitignore`

This harness is reused by all future work, not just #32. It runs the built app and hits it like a browser.

- [ ] **Step 1: Install Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium`
Expected: installs the package and the Chromium browser.

- [ ] **Step 2: Add `playwright.config.ts`**

The `webServer` block builds + starts the real app so e2e exercises production rendering (catches Server-Component-only failures). Requires `.env.local` with the project's Supabase keys (already present for `next dev`).

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 3: Add scripts and ignore artifacts**

In `package.json` `scripts`, add:

```json
    "test:e2e": "playwright test",
    "check:migrations": "node scripts/check-migration-grants.mjs"
```

Append to `.gitignore`:

```
/test-results/
/playwright-report/
/playwright/.cache/
```

- [ ] **Step 4: Smoke test to prove the harness**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBeLessThan(400)
  await expect(page.locator('body')).toBeVisible()
})
```

- [ ] **Step 5: Run it**

Run: `npm run test:e2e`
Expected: 1 passed. (If it fails because `.env.local` lacks Supabase keys, stop and resolve env before continuing — every later e2e depends on it.)

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/smoke.spec.ts package.json package-lock.json .gitignore
git commit -m "test: add Playwright e2e smoke harness (Tier 1)"
```

---

## Task 0b: Migration grants-guard (Tier 2 setup)

**Files:**
- Create: `scripts/check-migration-grants.mjs`

Fails if any migration that runs `create table public.<x>` does not also contain a `grant ... on public.<x>` for that table — the recurring PostgREST footgun.

- [ ] **Step 1: Write the guard**

```js
#!/usr/bin/env node
// Tier-2 guard: every migration that creates a table must also grant on it.
// Catches the recurring "forgot PostgREST grants" Supabase footgun.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const dir = 'supabase/migrations'
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql'))
const failures = []

for (const file of files) {
  const sql = (await readFile(path.join(dir, file), 'utf8')).toLowerCase()
  const created = [...sql.matchAll(/create table(?:\s+if not exists)?\s+public\.(\w+)/g)].map((m) => m[1])
  for (const table of created) {
    const granted = new RegExp(`grant\\s+[\\w, ]+\\s+on\\s+public\\.${table}\\b`).test(sql)
    if (!granted) failures.push(`${file}: creates public.${table} but has no grant on it`)
  }
}

if (failures.length) {
  console.error('Migration grants-guard FAILED:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`Migration grants-guard OK (${files.length} files checked).`)
```

- [ ] **Step 2: Run against existing migrations**

Run: `node scripts/check-migration-grants.mjs`
Expected: passes. If any *pre-existing* migration legitimately creates a table without needing anon/auth grants and trips the guard, add an inline allow-comment convention — extend the script to skip a table when the file contains `-- grants-guard: skip <table>`. Document any skip in the commit message.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-migration-grants.mjs
git commit -m "test: add migration grants-guard script (Tier 2)"
```

---

## Task 1: Migration — columns, facilities table, seed, normalise

**Files:**
- Create: `supabase/migrations/20260605120000_venue_meeting_details.sql`

Mirrors `20260530100000_how_it_works.sql` exactly for table/RLS/grants/seed structure.

- [ ] **Step 1: Write the migration**

```sql
-- Issues #32/#33/#34: venue & meeting details as a single source of truth.

-- 1. New meeting-detail columns on site_settings ---------------------------
alter table public.site_settings
  add column if not exists meeting_day        text,
  add column if not exists meeting_frequency  text,
  add column if not exists meeting_doors_time text,
  add column if not exists meeting_end_time   text;

-- 2. Normalise existing values + seed the new ones -------------------------
--    Fixes drift: venue-name typo, postcode, time format. Canonical postcode
--    EH52 6QF (homepage value). coalesce so we only fill blanks for the new
--    nullable columns but hard-set the drifted ones to canonical values.
update public.site_settings
  set venue_name         = 'Winchburgh Community Centre',
      venue_address      = 'Main Street, Winchburgh, EH52 6QF',
      meeting_time       = '7:00pm',
      meeting_day        = coalesce(meeting_day,        'Tuesday'),
      meeting_frequency  = coalesce(meeting_frequency,  '1st & 3rd of the month'),
      meeting_doors_time = coalesce(meeting_doors_time, '6:30pm'),
      meeting_end_time   = coalesce(meeting_end_time,   null)
  where id = 1;

-- 3. Facilities table ------------------------------------------------------
create table if not exists public.facilities (
  id         uuid primary key default gen_random_uuid(),
  icon       text not null,
  label      text not null,
  sort_order int  not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilities_sort_order_idx
  on public.facilities(sort_order);

-- 4. RLS -------------------------------------------------------------------
alter table public.facilities enable row level security;

do $$ begin
  create policy "public read facilities"
    on public.facilities for select
    using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins insert facilities"
    on public.facilities for insert
    with check (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins update facilities"
    on public.facilities for update
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "admins delete facilities"
    on public.facilities for delete
    using (
      exists (select 1 from profiles
              where profiles.id = auth.uid() and profiles.is_admin = true)
    );
exception when duplicate_object then null; end $$;

-- 5. PostgREST grants (required since Supabase May 30 2026 change) ----------
grant select on public.facilities to anon, authenticated;
grant insert, update, delete on public.facilities to authenticated;

-- 6. Seed current three facilities -----------------------------------------
insert into public.facilities (icon, label, sort_order)
select v.icon, v.label, v.sort_order
from (values
  ('♿', 'Step-free access', 1),
  ('🔊', 'Hearing loop',     2),
  ('🚗', 'Free parking on-site', 3)
) as v(icon, label, sort_order)
where not exists (select 1 from public.facilities);
```

- [ ] **Step 2: Verify migration SQL is well-formed and passes the grants-guard**

Run: `grep -c "create policy" supabase/migrations/20260605120000_venue_meeting_details.sql`
Expected: `4`

Run: `npm run check:migrations`
Expected: passes (the new `facilities` table has its `grant select/insert/update/delete` — Tier-2 guard green).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260605120000_venue_meeting_details.sql
git commit -m "feat(venue): migration for meeting fields + facilities table (#32 #33 #34)"
```

> **Note:** Migration is applied to the live DB by the GitHub Actions `supabase-deploy.yml` workflow (uses `--include-all`) on merge, not locally. Do not run `supabase db push` by hand.

---

## Task 2: `src/lib/venue.ts` composition helpers

**Files:**
- Create: `src/lib/venue.ts`

- [ ] **Step 1: Write the module**

```ts
// Single source of truth for formatting venue & meeting details.
// All public surfaces render from these helpers so copy never drifts.

export type VenueSettings = {
  venue_name: string | null
  venue_address: string | null
  meeting_day: string | null
  meeting_frequency: string | null
  meeting_doors_time: string | null
  meeting_time: string | null      // canonical START time
  meeting_end_time: string | null  // optional
}

// Defaults match the migration seed so server components degrade gracefully
// if a column is unexpectedly null.
const D = {
  venue_name: 'Winchburgh Community Centre',
  venue_address: 'Main Street, Winchburgh, EH52 6QF',
  meeting_day: 'Tuesday',
  meeting_frequency: '1st & 3rd of the month',
  meeting_doors_time: '6:30pm',
  meeting_time: '7:00pm',
}

function val<K extends keyof typeof D>(s: Partial<VenueSettings>, key: K): string {
  const v = s[key as keyof VenueSettings]
  return (v && String(v).trim()) || D[key]
}

/** Short navbar ribbon: "Tuesday meetings · 7:00pm · Winchburgh Community Centre" */
export function formatMeetingShort(s: Partial<VenueSettings>): string {
  return `${val(s, 'meeting_day')} meetings · ${val(s, 'meeting_time')} · ${val(s, 'venue_name')}`
}

/** Schedule line: "1st & 3rd Tuesday of the month" (frequency + day woven together). */
export function formatScheduleLine(s: Partial<VenueSettings>): string {
  const freq = val(s, 'meeting_frequency')
  const day = val(s, 'meeting_day')
  // "1st & 3rd of the month" + "Tuesday" -> "1st & 3rd Tuesday of the month"
  if (freq.includes('of the month')) {
    return freq.replace(/\s+of the month$/, ` ${day} of the month`)
  }
  return `${freq} · ${day}`
}

/** Times line: "Doors 6:30pm · Meeting 7:00pm" (+ " · Finish 9:00pm" if end set). */
export function formatTimesLine(s: Partial<VenueSettings>): string {
  let line = `Doors ${val(s, 'meeting_doors_time')} · Meeting ${val(s, 'meeting_time')}`
  const end = s.meeting_end_time && String(s.meeting_end_time).trim()
  if (end) line += ` · Finish ${end}`
  return line
}

/** Google Maps directions URL from venue name + address. */
export function mapsUrl(s: Partial<VenueSettings>): string {
  const q = encodeURIComponent(`${val(s, 'venue_name')}, ${val(s, 'venue_address')}`)
  return `https://maps.google.com/?q=${q}`
}

/** The list of settings columns every venue-consuming page should select. */
export const VENUE_COLUMNS =
  'venue_name, venue_address, meeting_day, meeting_frequency, meeting_doors_time, meeting_time, meeting_end_time'
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/lib/venue.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/venue.ts
git commit -m "feat(venue): add venue.ts formatting helpers"
```

---

## Task 3: Server actions — extend `updateSettings`, add facility CRUD

**Files:**
- Modify: `src/app/admin/settings/actions.ts`

- [ ] **Step 1: Extend `updateSettings` to read the new columns**

Replace the body of `updateSettings` (lines 6–34) with the version below (adds the four meeting fields; `meeting_end_time` is optional so it may be empty string):

```ts
export async function updateSettings(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const hero_title = formData.get('hero_title') as string
  const hero_subtitle = formData.get('hero_subtitle') as string
  const about_text = formData.get('about_text') as string
  const venue_name = formData.get('venue_name') as string
  const venue_address = formData.get('venue_address') as string
  const meeting_day = formData.get('meeting_day') as string
  const meeting_frequency = formData.get('meeting_frequency') as string
  const meeting_doors_time = formData.get('meeting_doors_time') as string
  const meeting_time = formData.get('meeting_time') as string
  const meeting_end_time = (formData.get('meeting_end_time') as string) || null
  const how_it_works_eyebrow = formData.get('how_it_works_eyebrow') as string
  const how_it_works_heading = formData.get('how_it_works_heading') as string
  const how_it_works_heading_em = formData.get('how_it_works_heading_em') as string

  const { error } = await supabase
    .from('site_settings')
    .update({
      hero_title, hero_subtitle, about_text, venue_name, venue_address,
      meeting_day, meeting_frequency, meeting_doors_time, meeting_time, meeting_end_time,
      how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em,
    })
    .eq('id', 1)

  if (error) {
    console.error(error)
    throw new Error("Failed to update settings")
  }

  revalidatePath('/')
  revalidatePath('/contact')
  revalidatePath('/meetings')
  revalidatePath('/login')
  revalidatePath('/signup')
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 2: Append facility CRUD actions at the end of the file**

These mirror `addStep`/`updateStep`/`deleteStep`/`reorderSteps`. `addFacility` returns the inserted row for optimistic add. All revalidate the public surfaces that show facilities (`/` and `/contact`).

```ts
export async function addFacility() {
  await checkAdmin()
  const supabase = await createClient()

  const { data: maxRow } = await supabase
    .from('facilities')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('facilities')
    .insert({ icon: '✨', label: 'New facility', sort_order: nextOrder })
    .select('id, icon, label')
    .single()

  if (error || !data) {
    console.error(error)
    throw new Error('Failed to add facility')
  }

  revalidatePath('/')
  revalidatePath('/contact')
  revalidatePath('/admin/settings')
  return data
}

export async function updateFacility(id: string, icon: string, label: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('facilities')
    .update({ icon, label, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to update facility')
  }

  revalidatePath('/')
  revalidatePath('/contact')
  revalidatePath('/admin/settings')
}

export async function deleteFacility(id: string) {
  await checkAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('facilities')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Failed to delete facility')
  }

  revalidatePath('/')
  revalidatePath('/contact')
  revalidatePath('/admin/settings')
}

export async function reorderFacilities(orderedIds: string[]) {
  await checkAdmin()
  const supabase = await createClient()

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('facilities')
      .update({ sort_order: i + 1 })
      .eq('id', orderedIds[i])

    if (error) {
      console.error(error)
      throw new Error('Failed to reorder facilities')
    }
  }

  revalidatePath('/')
  revalidatePath('/contact')
  revalidatePath('/admin/settings')
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/actions.ts
git commit -m "feat(venue): meeting fields + facility CRUD server actions"
```

---

## Task 4: `FacilitiesManager` client component

**Files:**
- Create: `src/app/admin/settings/FacilitiesManager.tsx`

Direct mirror of `HowItWorksManager.tsx` with `title/body` → `icon/label` and a narrow icon input beside a wide label input.

- [ ] **Step 1: Write the component**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addFacility, updateFacility, deleteFacility, reorderFacilities } from './actions'

type Facility = { id: string; icon: string; label: string }

export default function FacilitiesManager({ initialFacilities }: { initialFacilities: Facility[] }) {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function editField(id: string, field: 'icon' | 'label', value: string) {
    setFacilities((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  function handleSave(f: Facility) {
    startTransition(async () => {
      try {
        await updateFacility(f.id, f.icon, f.label)
        router.refresh()
      } catch {
        setError('Could not save that facility. Please try again.')
      }
    })
  }

  function handleDelete(id: string) {
    setFacilities((prev) => prev.filter((f) => f.id !== id))
    startTransition(async () => {
      try {
        await deleteFacility(id)
        router.refresh()
      } catch {
        setError('Could not delete that facility. Please reload and try again.')
      }
    })
  }

  function handleAdd() {
    startTransition(async () => {
      try {
        const newFacility = await addFacility()
        setFacilities((prev) => [...prev, newFacility])
        router.refresh()
      } catch {
        setError('Could not add a facility. Please try again.')
      }
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...facilities]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setFacilities(next)
    setDragIndex(null)
    startTransition(async () => {
      try {
        await reorderFacilities(next.map((f) => f.id))
        router.refresh()
      } catch {
        setError('Could not save the new order. Please reload and try again.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <p role="alert" style={{ color: 'var(--clay)', margin: 0, fontSize: 14 }}>
          {error}
        </p>
      )}
      {facilities.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          No facilities yet. Add one below.
        </p>
      )}

      {facilities.map((f, i) => (
        <div
          key={f.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => setDragIndex(null)}
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
              Facility {String(i + 1).padStart(2, '0')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: 80 }}>
              <label className="wsc-label" htmlFor={`icon-${f.id}`}>Icon</label>
              <input
                id={`icon-${f.id}`}
                className="wsc-input"
                value={f.icon}
                maxLength={4}
                style={{ textAlign: 'center' }}
                onChange={(e) => editField(f.id, 'icon', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <label className="wsc-label" htmlFor={`label-${f.id}`}>Label</label>
              <input
                id={`label-${f.id}`}
                className="wsc-input"
                value={f.label}
                onChange={(e) => editField(f.id, 'label', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="wsc-btn wsc-btn-primary"
              disabled={isPending}
              onClick={() => handleSave(f)}
            >
              Save
            </button>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleDelete(f.id)}
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
          + Add facility
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/settings/FacilitiesManager.tsx
git commit -m "feat(venue): FacilitiesManager admin component"
```

---

## Task 5: Admin settings page — new fields + Facilities section

**Files:**
- Modify: `src/app/admin/settings/page.tsx`

- [ ] **Step 1: Import FacilitiesManager and fetch facilities**

Change the imports (lines 1–3) to add the manager:

```tsx
import { createClient } from '@/utils/supabase/server'
import { updateSettings } from './actions'
import HowItWorksManager from './HowItWorksManager'
import FacilitiesManager from './FacilitiesManager'
```

After the `steps` fetch (currently lines 14–17), add a facilities fetch:

```tsx
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
    .order('sort_order', { ascending: true })
```

- [ ] **Step 2: Add the meeting-detail fields inside the Venue Details panel**

Immediately after the `venue_address` field block (currently ends line 52, the closing `</div>` of that field), insert these fields — before the `How It Works — Header` `<h2>`:

```tsx
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_day" className="wsc-label">Meeting Day</label>
            <input type="text" id="meeting_day" name="meeting_day" defaultValue={settings?.meeting_day ?? ''} className="wsc-input" placeholder="Tuesday" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_frequency" className="wsc-label">Meeting Frequency</label>
            <input type="text" id="meeting_frequency" name="meeting_frequency" defaultValue={settings?.meeting_frequency ?? ''} className="wsc-input" placeholder="1st & 3rd of the month" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_doors_time" className="wsc-label">Doors Open</label>
            <input type="text" id="meeting_doors_time" name="meeting_doors_time" defaultValue={settings?.meeting_doors_time ?? ''} className="wsc-input" placeholder="6:30pm" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_time" className="wsc-label">Meeting Start Time</label>
            <input type="text" id="meeting_time" name="meeting_time" defaultValue={settings?.meeting_time ?? ''} className="wsc-input" placeholder="7:00pm" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_end_time" className="wsc-label">Meeting End Time <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" id="meeting_end_time" name="meeting_end_time" defaultValue={settings?.meeting_end_time ?? ''} className="wsc-input" placeholder="9:00pm" />
          </div>
```

> Note: `meeting_time` previously had no admin field (it was only seeded). It is now editable here. Do not mark these `required` — `meeting_end_time` is optional and the others have DB defaults.

- [ ] **Step 3: Add the Facilities manager section**

After the `HowItWorksManager` render (currently line 80, `<HowItWorksManager initialSteps={steps ?? []} />`), before the closing `</div>` of the card, add:

```tsx
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '2rem 0 1rem', color: 'var(--ink)' }}>Facilities</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 1rem' }}>
          Shown on the homepage and contact page. Drag to reorder.
        </p>
        <FacilitiesManager initialFacilities={facilities ?? []} />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/settings/page.tsx
git commit -m "feat(venue): admin fields for meeting details + facilities"
```

---

## Task 6: Homepage threading

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import helpers and extend the settings fetch + fetch facilities**

Add to the top imports:

```tsx
import { formatScheduleLine, formatTimesLine, mapsUrl, VENUE_COLUMNS } from '@/lib/venue'
```

Extend the `site_settings` select (currently lines 50–54) to include the venue columns:

```tsx
  const { data: settings } = await supabase
    .from('site_settings')
    .select(`how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em, ${VENUE_COLUMNS}`)
    .eq('id', 1)
    .single()
```

After the `steps` fetch (currently lines 56–59), add:

```tsx
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
    .order('sort_order', { ascending: true })
```

- [ ] **Step 2: Replace the hardcoded venue info block**

In the `home-venue__info` div, replace the hardcoded venue name/address, schedule, times, facilities, and directions (currently lines ~234–253). Keep the eyebrow + the `<h2>` brand-voice heading unchanged (the "Tuesday" in the heading is out-of-scope prose). New body:

```tsx
    <div className="home-venue__info">
      <EyebrowLabel tone="clay">Find us</EyebrowLabel>
      <h2>It is the warmest room in Winchburgh on a Tuesday. <em>Honest.</em></h2>
      <div className="home-venue__detail">
        <div className="home-venue__detail-icon">📍</div>
        <div>
          <strong>{settings?.venue_name}</strong><br />
          {settings?.venue_address}
        </div>
      </div>
      <div className="home-venue__detail">
        <div className="home-venue__detail-icon">🕖</div>
        <div>
          <strong>{formatScheduleLine(settings ?? {})}</strong><br />
          {formatTimesLine(settings ?? {})}
        </div>
      </div>
      {facilities && facilities.length > 0 && (
        <div className="home-venue__access">
          {facilities.map((f, i) => (
            <span key={f.id}>
              {i > 0 && <>&nbsp;·&nbsp;</>}
              {f.icon} {f.label}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 28 }}>
        <Button href={mapsUrl(settings ?? {})} variant="ghost">
          Get directions →
        </Button>
      </div>
    </div>
```

> The SVG map block above it is unchanged (out of scope). Only the `home-venue__info` div changes.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(venue): homepage reads venue/schedule/facilities from settings (#32 #33 #34)"
```

---

## Task 7: Contact page threading

**Files:**
- Modify: `src/app/contact/page.tsx`

The contact page currently does NOT fetch settings. Confirm whether it's already an async Server Component (it should be — check for `export default async function`). If it is not async, make it async.

- [ ] **Step 1: Add imports + fetch settings and facilities**

Add imports:

```tsx
import { createClient } from '@/utils/supabase/server'
import { mapsUrl, VENUE_COLUMNS } from '@/lib/venue'
```

Inside the component body (top), add:

```tsx
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
    .order('sort_order', { ascending: true })
```

> If the existing component is not `async`, change `export default function ContactPage(` → `export default async function ContactPage(`.

- [ ] **Step 2: Replace the venue card body**

Replace the hardcoded venue card (currently lines ~20–35) with values from settings. The address line is split on the comma so the postcode keeps its own line, matching the original two-line `<address>`:

```tsx
<div className="contact-find-us wsc-card" id="find-us">
  <EyebrowLabel>Find us</EyebrowLabel>
  <h2>{settings?.venue_name}</h2>
  <address>
    <p>{settings?.venue_address}</p>
  </address>
  {facilities && facilities.length > 0 && (
    <p className="contact-find-us__access">
      {facilities.map((f) => (
        <span key={f.id} style={{ display: 'block' }}>{f.icon} {f.label}</span>
      ))}
    </p>
  )}
  <a href={mapsUrl(settings ?? {})} target="_blank" rel="noopener noreferrer" className="wsc-btn wsc-btn-ghost wsc-btn-sm contact-find-us__link">
    Get directions
  </a>
</div>
```

> This intentionally drops the old prose "Parking: Free parking on site / Step-free: Yes / Hearing loop: Available" in favour of the shared facilities list, so contact + homepage never drift. The full address (incl. postcode) now renders on one line from `venue_address`; this fixes the `EH52 6RP` vs `6QF` drift since both pages read the same field.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/contact/page.tsx
git commit -m "feat(venue): contact page reads venue + facilities from settings (fixes postcode drift)"
```

---

## Task 8: Meetings page realignment

**Files:**
- Modify: `src/app/meetings/page.tsx`

- [ ] **Step 1: Correct the fallback defaults**

The page already reads `venue_name`/`meeting_time` (lines 20–27). Only the hardcoded fallback defaults are wrong (typo + old time format). Update lines 25–26:

```tsx
  const venueName  = settings?.venue_name  ?? 'Winchburgh Community Centre'
  const meetingTime = settings?.meeting_time ?? '7:00pm'
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/meetings/page.tsx
git commit -m "fix(venue): correct meetings page fallback defaults"
```

---

## Task 9: Login page — start-time detail line

**Files:**
- Modify: `src/app/login/page.tsx`

The login page is a Server Component that already fetches `nextMeeting`. Confirm whether it fetches `site_settings`; if not, add a fetch. **Do not touch the blockquote/cite** (that is #30's quote work).

- [ ] **Step 1: Fetch settings (if not already) and replace the hardcoded "7pm"**

If the component does not already fetch settings, add near the existing data fetch:

```tsx
  const { data: settings } = await supabase
    .from('site_settings')
    .select('meeting_time')
    .eq('id', 1)
    .single()
```

Replace the detail line (currently line 61):

```tsx
<div className="detail">{formatDate(nextMeeting.meeting_date)} · {settings?.meeting_time ?? '7:00pm'}</div>
```

> If `supabase` isn't already in scope on this page, use the existing client variable name from the file (it fetches `nextMeeting`, so a client already exists — reuse it). Do NOT import venue.ts here; a single field read is enough.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat(venue): login meeting time from settings"
```

---

## Task 10: SignupFlow threading

**Files:**
- Modify: `src/app/signup/SignupFlow.tsx`

`SignupFlow` is a client component receiving `meeting`/data as props. The cleanest approach: have its parent Server Component (`src/app/signup/page.tsx`) pass a `venue` prop built from settings. First inspect `src/app/signup/page.tsx` to see what it already passes.

- [ ] **Step 1: Pass venue settings from the signup server page**

In `src/app/signup/page.tsx`, fetch settings and pass them to `SignupFlow`:

```tsx
import { VENUE_COLUMNS } from '@/lib/venue'
// ...
  const { data: venue } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()
// ...
  return <SignupFlow meetings={meetings} venue={venue ?? null} /* ...existing props... */ />
```

> Match the existing prop-passing style in that file; keep all current props.

- [ ] **Step 2: Accept the prop and use helpers in SignupFlow**

Add to the props type and import helpers:

```tsx
import { formatTimesLine, mapsUrl, type VenueSettings } from '@/lib/venue'
```

Add `venue: VenueSettings | null` to the component's props type/signature.

Replace the metadata line (currently line 182):

```tsx
<span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--ink-4)'}}>{venue?.meeting_time ?? '7:00pm'} · {venue?.venue_name ?? 'Community Centre'}</span>
```

Replace the "What to Expect" doors string inside the array (currently line 241) — change the second item:

```tsx
`Doors open at ${venue?.meeting_doors_time ?? '6:30pm'}, kettle on, meeting starts at ${venue?.meeting_time ?? '7:00pm'}`
```

Replace the directions Button (currently line 235):

```tsx
<Button variant="ghost-light" href={mapsUrl(venue ?? {})}>Get directions</Button>
```

- [ ] **Step 3: Use venue in the calendar URL**

The `calendarUrl(meeting)` helper (lines 26–33) hardcodes the location and 19:00/21:00 times. Keep the time logic as-is (start/end times here are calendar event times derived from a fixed format and not in spec scope for parsing), but parametrise the location. Change its signature to accept a venue and use it:

```tsx
function calendarUrl(meeting: Meeting, venue: VenueSettings | null) {
  const date = meeting.meeting_date.replace(/-/g, '')
  const start = `${date}T190000`
  const end = `${date}T210000`
  const title = encodeURIComponent(`Winchburgh Speakers Club — ${meeting.theme || 'Open session'}`)
  const venueName = venue?.venue_name ?? 'Winchburgh Community Centre'
  const venueAddress = venue?.venue_address ?? 'Main Street, Winchburgh, EH52 6QF'
  const location = encodeURIComponent(`${venueName}, ${venueAddress}`)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}`
}
```

Update every call site of `calendarUrl(...)` in the file to pass `venue`: `calendarUrl(meeting, venue)`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (If `formatTimesLine` ends up unused, remove it from the import to satisfy lint — only `mapsUrl` and the type are strictly required by the edits above.)

- [ ] **Step 5: Commit**

```bash
git add src/app/signup/SignupFlow.tsx src/app/signup/page.tsx
git commit -m "feat(venue): signup flow venue details from settings"
```

---

## Task 11: Navbar ribbon

**Files:**
- Modify: `src/components/Navbar.tsx`

`Navbar` renders a static ribbon. Check whether it's a Server Component or receives props from a server wrapper (`NavbarServer` exists per project notes). The ribbon must show `formatMeetingShort(settings)`.

- [ ] **Step 1: Source settings for the ribbon**

Inspect `src/components/Navbar.tsx` and its server wrapper `NavbarServer` (referenced in MEMORY). Determine which one can fetch from Supabase. In the server-side one, fetch:

```tsx
import { formatMeetingShort, VENUE_COLUMNS } from '@/lib/venue'
// ...
  const { data: settings } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()
```

Pass `meetingShort={formatMeetingShort(settings ?? {})}` down to `Navbar` as a prop (add it to `Navbar`'s props type).

- [ ] **Step 2: Replace the ribbon text**

Replace the first ribbon span (currently line 16):

```tsx
<span>{meetingShort} · First three visits free</span>
```

> Or keep "First three visits free" as the existing second span and set the first span to `{meetingShort}`. Preserve the existing two-span layout; just feed the first from the prop.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx src/components/NavbarServer.tsx
git commit -m "feat(venue): navbar ribbon from formatMeetingShort()"
```

---

## Task 12: Page metadata

**Files:**
- Modify: `src/app/layout.tsx`

`layout.tsx` exports a static `metadata` object (line 31). Town/venue mention. Per spec this should reflect settings, but `layout.tsx`'s static `metadata` export can't read async data without `generateMetadata`. Keep this minimal: the description mentions only the town ("Winchburgh, West Lothian"), which is stable and not an admin-edited field. Converting the whole root layout to `generateMetadata` for one stable noun is YAGNI.

- [ ] **Step 1: Leave the description as-is OR generalise the venue noun**

The current description — `'A friendly community of speakers in Winchburgh, West Lothian.'` — contains no drifting venue/time data (no postcode, no day, no time). **No change required.** Mark this task done after confirming the description contains no hardcoded venue name / postcode / meeting time.

- [ ] **Step 2: Confirm**

Run: `grep -nE "EH52|7pm|7:00|Community Centre|Village Hall" src/app/layout.tsx`
Expected: no matches (description is town-only, nothing to thread).

> If a future change adds venue specifics to metadata, convert `metadata` to `export async function generateMetadata()` and read `site_settings` then. Out of scope now.

---

## Task 13: #32 e2e regression test (Tier 1)

**Files:**
- Create: `e2e/venue.spec.ts`

Pins the #32 fix: the homepage must render the venue values that live in `site_settings` (after the Task 1 migration seeds them to canonical values). Asserts against the seeded defaults, which are stable known strings.

> **Sequencing:** this test asserts the *deployed* DB state. Run it only after the Task 1 migration has been applied to the DB the dev app points at (locally: apply the migration to your dev Supabase; in CI it runs post-deploy). If the migration isn't applied yet, the assertions for new fields will fail — that's expected; gate this test behind migration application.

- [ ] **Step 1: Write the regression test**

```ts
import { test, expect } from '@playwright/test'

test.describe('#32 venue details render from site_settings', () => {
  test('homepage shows the canonical venue name and address', async ({ page }) => {
    await page.goto('/')
    const venue = page.locator('.home-venue__info')
    await expect(venue).toContainText('Winchburgh Community Centre')
    await expect(venue).toContainText('EH52 6QF')
  })

  test('homepage shows schedule and times lines', async ({ page }) => {
    await page.goto('/')
    const venue = page.locator('.home-venue__info')
    await expect(venue).toContainText('Tuesday')
    await expect(venue).toContainText('Doors 6:30pm')
    await expect(venue).toContainText('Meeting 7:00pm')
  })

  test('homepage shows at least one facility from the facilities table', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.home-venue__access')).toContainText('Step-free access')
  })

  test('navbar ribbon shows the meeting day from settings', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.nav-ribbon')).toContainText('Tuesday')
  })

  test('contact page no longer shows the old drifted postcode', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.locator('#find-us')).toContainText('EH52 6QF')
    await expect(page.locator('#find-us')).not.toContainText('EH52 6RP')
  })
})
```

- [ ] **Step 2: Run e2e (post-migration)**

Run: `npm run test:e2e`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/venue.spec.ts
git commit -m "test(venue): e2e regression for #32 venue rendering"
```

---

## Final Verification (after all tasks)

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run check:migrations` — passes (Tier 2)
- [ ] `npm run test:e2e` — passes (Tier 1, post-migration)
- [ ] `grep -rnE "EH52 6RP|Wincburgh|7pm\b" src/` — no remaining drift (old postcode, typo'd venue, bare "7pm"). The brand-voice "on a Tuesday" prose in hero/heading is intentionally retained (out of scope).
- [ ] Manual (per spec §Verification): in `/admin/settings` edit venue name/address, day, frequency, doors/start/end, and a facility; confirm homepage venue section + navbar ribbon, contact page, meetings page, login page, signup flow all reflect changes; add/delete/reorder a facility and confirm homepage + contact update; log out and confirm public pages show updated values.

---

## Self-Review notes (author)

- **Spec coverage:** #32 (Task 6 homepage reads settings) ✅; #33 day/frequency/times (Tasks 1–3, 5, 6, 9, 10, 11) ✅; #34 facilities table + manager + render (Tasks 1, 3, 4, 5, 6, 7) ✅; drift elimination (Task 1 normalise + Tasks 6–8 single-source reads) ✅; RLS + grants (Task 1) ✅; helpers (Task 2) ✅; admin UI (Task 5) ✅.
- **Type consistency:** `VenueSettings`, `VENUE_COLUMNS`, `formatMeetingShort`, `formatScheduleLine`, `formatTimesLine`, `mapsUrl` are defined in Task 2 and used with those exact names in Tasks 6–11. Facility actions `addFacility/updateFacility/deleteFacility/reorderFacilities` defined in Task 3, consumed in Task 4. ✅
- **Known unknowns to resolve during execution (inspect-then-edit, instructions given in-task):** exact async-ness of `contact/page.tsx`, `login/page.tsx`; signup parent prop-passing style; Navbar vs NavbarServer split. Each task says to inspect the file first.
