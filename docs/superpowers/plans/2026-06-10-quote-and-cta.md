# President's Quote + Generic CTA (#30, #31) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the president's pull-quote (homepage + login) and the homepage CTA paragraph admin-editable via `site_settings`, with the attributed name derived from whichever member holds the President club role; de-personalise the signup confirmation.

**Architecture:** One migration adds three nullable text columns to the single-row `site_settings` (id=1) plus a `SECURITY DEFINER` function `get_president_name()` (public pages run as `anon` and cannot read `profiles` under RLS). Two small lib modules (`src/lib/president.ts`, `src/lib/cta.ts`) mirror the established `src/lib/venue.ts` pattern: seed-matching defaults, trim-or-fallback accessors, exported `*_COLUMNS` select strings. Pages thread the settings through existing markup; the admin settings form and `updateSettings` action gain three fields.

**Tech Stack:** Next.js 16 App Router (server components), Supabase (`@supabase/ssr`, anon-key server client), vanilla CSS (no Tailwind), Playwright e2e.

**Specs:** `docs/superpowers/specs/2026-05-30-president-quote-customisation-design.md` (#30), `docs/superpowers/specs/2026-05-30-generic-cta-design.md` (#31).

**Testing strategy:** Tier 0+1+2 per project decision (tsc/lint/build gates + Playwright e2e regression + migration grants-guard). NOT unit-TDD.

---

## Key facts the implementer must know (from code survey)

- The repo's `SECURITY DEFINER` precedent is `public.get_member_directory()` in `supabase/migrations/20260503010000_member_directory_function.sql` (the spec calls it `get_active_members` — that function does not exist). **Critical difference:** it grants EXECUTE only to `authenticated`; `get_president_name()` serves PUBLIC pages and must be granted to `anon, authenticated`.
- `scripts/check-migration-grants.mjs` only checks `create table` grants — it will NOT catch a missing `grant execute`. The grant is on you.
- `site_settings` is a single row `id = 1`; it already has `anon` select + `authenticated` insert/update grants (no new table grants needed). Use `where id = 1` (not the spec sketch's `limit 1`).
- `profiles.club_roles` is `text[]` (default `'{}'`); the stored role string is exactly `President`. Match with `'President' = any(club_roles)`. Filter `is_active = true` like `get_member_directory` does (a departed president must not be attributed).
- The homepage quote (`page.tsx:162`) and login quote (`login/page.tsx:74`) are currently DIFFERENT texts. Per the #30 spec, ONE `president_quote` setting drives both, seeded from the HOMEPAGE text — the login quote copy visibly changes. (The similar "warmest room" line at `page.tsx:238` is the venue-section heading — leave it alone.)
- Pages pass `settings ?? {}` into lib helpers (see `page.tsx:242-250` venue usage) so unreadable settings degrade to defaults.
- `updateSettings`'s `revalidatePath` list already covers `/`, `/login`, `/signup` — no new paths needed.
- The admin settings page selects `*` from `site_settings` — new columns need no select change there.
- `SignupFlow.tsx` is `'use client'`; the #31 confirmation change is a static text edit, no new props.
- Latest migration is `20260605120000_*`; the new one must sort after it.
- e2e hits the real remote Supabase DB via the dev server's `.env.local`. New seed-value assertions stay red until the migration is applied to that DB (Task 4 applies it — additive and invisible until the code deploys).
- Machine is slow: `npx tsc --noEmit` ~2-3 min; start `npx next dev -p 3100` yourself before e2e (`reuseExistingServer` picks it up; cold Turbopack start can take ~11 min).

## File structure

- Create: `supabase/migrations/20260610130000_quote_and_cta.sql` — columns + seeds + function + grant
- Create: `src/lib/president.ts` — quote/name helpers (#30)
- Create: `src/lib/cta.ts` — CTA body helper (#31)
- Modify: `src/app/page.tsx` — select + pull-quote (157-166) + CTA paragraph (277-279)
- Modify: `src/app/login/page.tsx` — select (39-43) + quote block (72-77)
- Modify: `src/app/signup/SignupFlow.tsx` — confirmation line (220-222), static edit
- Modify: `src/app/admin/settings/page.tsx` — three new form fields after `meeting_end_time` (~line 83)
- Modify: `src/app/admin/settings/actions.ts` — three new keys in `updateSettings`
- Create: `e2e/quote-cta.spec.ts` — Tier-2 regression

---

### Task 1: Migration + lib helpers (data layer, #30 + #31)

**Files:**
- Create: `supabase/migrations/20260610130000_quote_and_cta.sql`
- Create: `src/lib/president.ts`
- Create: `src/lib/cta.ts`

- [ ] **Step 1: Write the migration**

```sql
-- Issues #30/#31: president's quote + homepage CTA as editable settings.

-- 1. New columns on site_settings -------------------------------------------
alter table public.site_settings
  add column if not exists president_quote         text,
  add column if not exists president_name_fallback text,
  add column if not exists cta_body                text;

-- 2. Seed (idempotent) -------------------------------------------------------
--    president_quote seeds from the current homepage pull-quote; per the #30
--    spec one setting drives both the homepage and the login page (whose old
--    hardcoded quote text is superseded).
update public.site_settings
  set president_quote         = coalesce(president_quote,
        'You don''t need to be confident. You don''t need to have anything to say. You just need to turn up.'),
      president_name_fallback = coalesce(president_name_fallback, 'Margaret'),
      cta_body                = coalesce(cta_body,
        'No booking needed for your first visit. A member of the committee will reach out to say hello in the next day or two.')
  where id = 1;

-- 3. Public president-name lookup --------------------------------------------
--    profiles is behind RLS and the homepage/login run as anon, so the name is
--    derived via SECURITY DEFINER (mirrors get_member_directory).
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
        and is_active = true
      order by full_name
      limit 1),
    (select president_name_fallback from public.site_settings where id = 1)
  );
$$;

-- Unlike get_member_directory (authenticated-only), this serves public pages.
grant execute on function public.get_president_name() to anon, authenticated;
```

- [ ] **Step 2: Write `src/lib/president.ts`**

```ts
// Single source of truth for the president's pull-quote and attributed name.
// Public surfaces render from these helpers so copy never drifts.

import type { SupabaseClient } from '@supabase/supabase-js'

export type PresidentSettings = {
  president_quote: string | null
  president_name_fallback: string | null
}

// Defaults match the migration seed so server components degrade gracefully
// if a column is unexpectedly null.
const D = {
  president_quote:
    "You don't need to be confident. You don't need to have anything to say. You just need to turn up.",
  president_name_fallback: 'Margaret',
}

function val<K extends keyof typeof D>(s: Partial<PresidentSettings>, key: K): string {
  const v = s[key as keyof PresidentSettings]
  return (v && String(v).trim()) || D[key]
}

/** The quote text, falling back to the seed copy if unset/unreadable. */
export function presidentQuote(s: Partial<PresidentSettings>): string {
  return val(s, 'president_quote')
}

/**
 * Name of the member currently holding the President club role, via the
 * SECURITY DEFINER rpc (anon cannot read profiles directly). Falls back to
 * president_name_fallback when no one holds the role or the rpc is
 * unavailable (e.g. migration not yet applied).
 */
export async function getPresidentName(
  supabase: SupabaseClient,
  s: Partial<PresidentSettings> = {},
): Promise<string> {
  const { data, error } = await supabase.rpc('get_president_name')
  if (!error && data && String(data).trim()) return String(data).trim()
  return val(s, 'president_name_fallback')
}

/** The list of settings columns every quote-consuming page should select. */
export const PRESIDENT_COLUMNS = 'president_quote, president_name_fallback'
```

- [ ] **Step 3: Write `src/lib/cta.ts`**

```ts
// Single source of truth for the homepage CTA paragraph (#31).

export type CtaSettings = {
  cta_body: string | null
}

// Default matches the migration seed so the homepage degrades gracefully.
const DEFAULT_CTA_BODY =
  'No booking needed for your first visit. A member of the committee will reach out to say hello in the next day or two.'

/** The CTA paragraph, falling back to the seed copy if unset/unreadable. */
export function ctaBody(s: Partial<CtaSettings>): string {
  const v = s.cta_body
  return (v && v.trim()) || DEFAULT_CTA_BODY
}

/** The settings column every CTA-consuming page should select. */
export const CTA_COLUMNS = 'cta_body'
```

- [ ] **Step 4: Run the grants-guard and typecheck**

Run: `npm run check:migrations`
Expected: exits 0, no output about `20260610130000` (no new tables; the function grant is included anyway).

Run: `npx tsc --noEmit` (~2-3 min)
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260610130000_quote_and_cta.sql src/lib/president.ts src/lib/cta.ts
git commit -m "feat(settings): president quote + CTA columns, get_president_name(), lib helpers (#30 #31)"
```

---

### Task 2: Thread public surfaces (homepage, login, signup)

**Files:**
- Modify: `src/app/page.tsx` (imports ~line 1-18; select 51-55; pull-quote 157-166; CTA 277-279)
- Modify: `src/app/login/page.tsx` (imports; select 39-43; quote 72-77)
- Modify: `src/app/signup/SignupFlow.tsx` (220-222)

- [ ] **Step 1: Homepage — imports, select, fetch the name**

In `src/app/page.tsx`, next to the existing `@/lib/venue` import add:

```ts
import { presidentQuote, getPresidentName, PRESIDENT_COLUMNS } from '@/lib/president'
import { ctaBody, CTA_COLUMNS } from '@/lib/cta'
```

Extend the settings select (lines 51-55):

```ts
  const { data: settings } = await supabase
    .from('site_settings')
    .select(`how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em, ${VENUE_COLUMNS}, ${PRESIDENT_COLUMNS}, ${CTA_COLUMNS}`)
    .eq('id', 1)
    .single()
```

Directly after the settings fetch add:

```ts
  const presidentName = await getPresidentName(supabase, settings ?? {})
```

- [ ] **Step 2: Homepage — pull-quote block (lines 157-166)**

Replace the hardcoded quote and attribution, keeping all markup/classes:

```tsx
        {/* Pull-quote */}
        <section className="home-quote">
          <div className="home-quote__inner">
            <span className="home-quote__mark">&ldquo;</span>
            <blockquote>
              {presidentQuote(settings ?? {})}
            </blockquote>
            <p className="home-quote__attribution">— {presidentName}, Club President</p>
          </div>
        </section>
```

- [ ] **Step 3: Homepage — CTA paragraph (lines 277-279)**

Only the `<p>` changes; eyebrow, heading and buttons stay:

```tsx
            <p>
              {ctaBody(settings ?? {})}
            </p>
```

- [ ] **Step 4: Login page — select + quote block**

In `src/app/login/page.tsx` add the import:

```ts
import { presidentQuote, getPresidentName, PRESIDENT_COLUMNS } from '@/lib/president'
```

Widen the select (lines 39-43):

```ts
  const { data: settings } = await supabase
    .from('site_settings')
    .select(`meeting_time, ${PRESIDENT_COLUMNS}`)
    .eq('id', 1)
    .single()
```

After the settings fetch add:

```ts
  const presidentName = await getPresidentName(supabase, settings ?? {})
```

Replace the quote block (lines 72-77), keeping the `<cite>` markup:

```tsx
          <div className="login-left__quote">
            <blockquote>
              {presidentQuote(settings ?? {})}
            </blockquote>
            <cite>— {presidentName}, Club President</cite>
          </div>
```

Note: the login quote text changes from "It is the warmest room in Winchburgh on a Tuesday. Honest." to the homepage quote — intentional, per the #30 spec (one setting drives both).

- [ ] **Step 5: Signup confirmation — static de-personalisation (lines 220-222)**

In `src/app/signup/SignupFlow.tsx` replace the paragraph (keep the email interpolation, no new props):

```tsx
          <p style={{color:'var(--ink-2)',maxWidth:480}}>
            We&apos;ll be in touch soon at <strong>{form.email}</strong>. A member of the committee will reach out to say hello in the next day or two.
          </p>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/app/login/page.tsx src/app/signup/SignupFlow.tsx
git commit -m "feat(quote,cta): thread homepage/login quote and CTA from settings; de-personalise signup (#30 #31)"
```

---

### Task 3: Admin settings UI + action

**Files:**
- Modify: `src/app/admin/settings/page.tsx` (insert after the `meeting_end_time` field div, ~line 83, before the "How It Works — Header" `<h2>`)
- Modify: `src/app/admin/settings/actions.ts` (`updateSettings`)

- [ ] **Step 1: Add the form fields**

Insert between the `meeting_end_time` field's closing `</div>` and the `How It Works — Header` `<h2>` (match the existing inline-style/markup conventions exactly):

```tsx
          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>President&apos;s Quote</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="president_quote" className="wsc-label">Quote</label>
            <textarea id="president_quote" name="president_quote" defaultValue={settings?.president_quote ?? ''} rows={3} className="wsc-input" placeholder="You don't need to be confident…" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="president_name_fallback" className="wsc-label">Fallback Name <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(used if no member is assigned the President role)</span></label>
            <input type="text" id="president_name_fallback" name="president_name_fallback" defaultValue={settings?.president_name_fallback ?? ''} className="wsc-input" placeholder="Margaret" />
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>Homepage Call to Action</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="cta_body" className="wsc-label">CTA Text</label>
            <textarea id="cta_body" name="cta_body" defaultValue={settings?.cta_body ?? ''} rows={3} className="wsc-input" placeholder="No booking needed for your first visit…" />
          </div>
```

All three are optional (no `required`): blanking a field falls back to the seeded default copy via the lib helpers.

- [ ] **Step 2: Extend `updateSettings` in `actions.ts`**

Add with the other extractions (use the nullable pattern — blank reverts to default):

```ts
  const president_quote = (formData.get('president_quote') as string) || null
  const president_name_fallback = (formData.get('president_name_fallback') as string) || null
  const cta_body = (formData.get('cta_body') as string) || null
```

Add the three keys to the `.update({...})` object:

```ts
      hero_title, hero_subtitle, about_text, venue_name, venue_address,
      meeting_day, meeting_frequency, meeting_doors_time, meeting_time, meeting_end_time,
      how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em,
      president_quote, president_name_fallback, cta_body,
```

No `revalidatePath` changes — `/`, `/login`, `/signup` are already revalidated.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx src/app/admin/settings/actions.ts
git commit -m "feat(admin): president quote and CTA fields in site settings (#30 #31)"
```

---

### Task 4: e2e regression + apply migration

**Files:**
- Create: `e2e/quote-cta.spec.ts`

- [ ] **Step 1: Write the e2e spec**

```ts
import { test, expect } from '@playwright/test'

// #30/#31 regression: the pull-quote, its attribution, and the CTA paragraph must
// render from `site_settings` (president_quote / president_name_fallback / cta_body)
// and the get_president_name() rpc — not hardcoded copy. Asserts against the
// migration's canonical seed values. REQUIRES the 20260610130000 migration to be
// applied to the DB the app points at. Until then these fail — expected, not a defect.

test.describe('#30 president quote renders from site_settings', () => {
  test('homepage shows the seeded quote with a derived attribution', async ({ page }) => {
    await page.goto('/')
    const quote = page.locator('.home-quote')
    await expect(quote).toContainText('You just need to turn up')
    // The name depends on which profile holds the President club role in the
    // live DB, so assert the stable suffix rather than a specific person.
    await expect(quote.locator('.home-quote__attribution')).toContainText(', Club President')
  })

  test('login page shows the same seeded quote', async ({ page }) => {
    await page.goto('/login')
    const quote = page.locator('.login-left__quote')
    await expect(quote).toContainText('You just need to turn up')
    await expect(quote.locator('cite')).toContainText(', Club President')
  })
})

test.describe('#31 homepage CTA is generic and settings-driven', () => {
  test('CTA shows the seeded generic copy, not a named person', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('.home-cta')
    await expect(cta).toContainText('A member of the committee will reach out')
    await expect(cta).not.toContainText('Margaret, our president')
  })
})
```

The signup step-4 confirmation is intentionally NOT e2e-tested — completing the flow writes a real signup row and sends email. It is a static copy change covered by review + manual test.

- [ ] **Step 2: Apply the migration to the remote DB**

Run: `supabase db push --include-all`
Expected: lists and applies `20260610130000_quote_and_cta.sql`. (Additive and invisible to the live site until the code merges; same early-apply approach used for the venue migration. CI's deploy on merge then finds nothing new — that is fine.)

- [ ] **Step 3: Run the full e2e suite**

Start the dev server first (in another shell/background): `npx next dev -p 3100`, wait for ready.
Run: `npm run test:e2e`
Expected: all tests pass, including the 6 pre-existing (venue/smoke) and the 3 new ones.

- [ ] **Step 4: Commit**

```bash
git add e2e/quote-cta.spec.ts
git commit -m "test(e2e): #30/#31 quote + CTA regression"
```

---

### Task 5: Tier 0 gates + branch finish

- [ ] **Step 1: Full gates on the branch**

Run: `npx tsc --noEmit` — expected: exit 0.
Run: `npx eslint src/app/page.tsx src/app/login/page.tsx src/app/signup/SignupFlow.tsx src/app/admin/settings/page.tsx src/app/admin/settings/actions.ts src/lib/president.ts src/lib/cta.ts e2e/quote-cta.spec.ts` — expected: no NEW errors (repo-wide baseline ~76 pre-existing errors in untouched files is out of scope).
Run: `npm run build` — expected: success.
Run: `npm run check:migrations` — expected: exit 0.

- [ ] **Step 2: Code review + PR**

Multi-agent adversarial review of the full branch diff; fix confirmed findings; push branch; open PR titled "President's quote + generic CTA from site settings (#30 #31)" with body `Closes #30, Closes #31`, a manual test plan, and a note that the migration is already applied to the remote DB. Comment on both issues: ready for manual testing. Do NOT merge — user sign-off required.

---

## Self-review notes

- Spec coverage: #30 criteria (editable quote ✓ Task 3, derived name ✓ Task 1 fn + Task 2 threading, surfaces update ✓ Task 2 + existing revalidatePath; anon-callable fn ✓ Task 1 grant). #31 criteria (generic default ✓ seed, admin-editable ✓ Task 3, signup de-personalised ✓ Task 2 Step 5). Out-of-scope items (other officers, CTA eyebrow/heading) untouched.
- Deviations from spec, deliberate: `where id = 1` instead of `limit 1` (house convention); `is_active = true` filter added (mirrors `get_member_directory`; a departed president must not be attributed).
- Type consistency: `PresidentSettings`/`CtaSettings` keys match migration columns and form `name` attributes; `PRESIDENT_COLUMNS`/`CTA_COLUMNS` match the select usage in Task 2.
