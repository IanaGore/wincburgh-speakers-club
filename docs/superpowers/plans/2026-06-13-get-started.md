# Get Started Page (Issue #35) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the `/signup` (RSVP) and `/contact` (enquiry) pages into a single `/get-started` intent-chooser; fix data gaps; deepen admin follow-up tracking.

**Architecture:** A new `/get-started` server page reads `?intent=` from searchParams and pre-fetches venue/meetings data; it passes everything to a client component (`GetStartedClient`) that renders an intent chooser or the appropriate branch. Old routes become redirects. Admin enquiries page gains phone/topic display and per-item status+notes controls via new server actions.

**Tech Stack:** Next.js 16 App Router, vanilla CSS, Supabase (`@supabase/ssr`), `checkAdmin()` for all admin mutations.

**Branch:** `feat/issue-35-get-started`

---

## File Map

**Create:**
- `supabase/migrations/20260613100000_get_started.sql` — DB schema: phone/topic on contact_messages, status/notes on both tables
- `src/app/get-started/page.tsx` — server component: data fetch + pass to client
- `src/app/get-started/GetStartedClient.tsx` — client component: intent chooser + branch rendering
- `src/app/get-started/get-started.css` — styles
- `src/app/admin/enquiries/actions.ts` — new server actions for status/notes updates
- `e2e/get-started.spec.ts` — e2e smoke test

**Modify:**
- `src/app/contact/actions.ts` — add `phone` + `topic` to the DB insert
- `src/app/admin/enquiries/page.tsx` — show phone/topic; add status/notes controls per item
- `src/app/signup/page.tsx` → redirect to `/get-started?intent=attend`
- `src/app/contact/page.tsx` → redirect to `/get-started?intent=ask`
- `src/app/admin/signups/page.tsx` → redirect to `/admin/enquiries?tab=rsvps`
- `src/app/admin/messages/page.tsx` → redirect to `/admin/enquiries?tab=messages`
- `src/components/Navbar.tsx` — `/signup` → `/get-started?intent=attend`, `/contact` → `/get-started?intent=ask`
- `src/app/page.tsx` — update CTA hrefs
- `src/components/Footer.tsx` — update link hrefs
- `src/app/about/page.tsx` — update CTA href
- `src/app/meetings/page.tsx` — update RSVP href
- `src/app/login/page.tsx` — update contact href
- `src/app/login/LoginForm.tsx` — update contact href

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260613100000_get_started.sql`

- [ ] **Step 1: Write the migration**

```sql
-- #35: get-started merge — data gap fix + deeper follow-up tracking

-- 1. Add phone + topic to contact_messages (fix data gap)
alter table public.contact_messages
  add column if not exists phone text,
  add column if not exists topic text;

-- 2. Add status + follow-up tracking to contact_messages
alter table public.contact_messages
  add column if not exists status text not null default 'new',
  add column if not exists handled_at timestamptz,
  add column if not exists admin_notes text;

do $$ begin
  alter table public.contact_messages
    add constraint contact_messages_status_check
      check (status in ('new', 'replied', 'closed'));
exception when duplicate_object then null; end $$;

-- 3. Extend signups status to include new workflow steps
alter table public.signups
  drop constraint if exists signups_status_check;

alter table public.signups
  add constraint signups_status_check
    check (status in ('pending', 'contacted', 'attended', 'no_show', 'joined', 'converted'));

-- 4. Add follow-up tracking columns to signups
alter table public.signups
  add column if not exists contacted_at timestamptz,
  add column if not exists admin_notes text;

-- No new tables → no new PostgREST grants needed.
-- contact_messages: anon can insert (existing policy), admin can select/update/delete (existing).
-- signups: admin-only read/update (existing).
```

- [ ] **Step 2: Apply the migration to the remote DB**

```bash
npx supabase db push --include-all
```

Expected: Migration applied, no errors. If `supabase` CLI is unavailable use:
```bash
npx supabase migration up --include-all
```

- [ ] **Step 3: Run grants-guard to confirm no new tables missed**

```bash
npm run check:migrations
```

Expected: No errors (no new tables in this migration).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260613100000_get_started.sql
git commit -m "feat(db): phone/topic on contact_messages; status/notes on signups + messages (#35)"
```

---

### Task 2: Fix contact data gap

**Files:**
- Modify: `src/app/contact/actions.ts`

- [ ] **Step 1: Add phone + topic to the DB insert**

Replace the existing insert in `sendContactMessage`:

```ts
// Before:
const { error } = await supabase
  .from('contact_messages')
  .insert({ name, email, message })

// After:
const { error } = await supabase
  .from('contact_messages')
  .insert({ name, email, phone: phone || null, topic: topic || null, message })
```

- [ ] **Step 2: Commit**

```bash
git add src/app/contact/actions.ts
git commit -m "fix(contact): persist phone + topic to contact_messages (#35)"
```

---

### Task 3: New `/get-started` page

**Files:**
- Create: `src/app/get-started/page.tsx`
- Create: `src/app/get-started/GetStartedClient.tsx`
- Create: `src/app/get-started/get-started.css`

The server component pre-fetches meetings + venue + facilities (needed by SignupFlow and the Find-Us card). It reads `searchParams.intent` and passes it as `initialIntent` to the client component.

- [ ] **Step 1: Create `src/app/get-started/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import { VENUE_COLUMNS } from '@/lib/venue'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import GetStartedClient from './GetStartedClient'
import './get-started.css'

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>
}) {
  const { intent } = await searchParams
  const validIntent = intent === 'attend' || intent === 'ask' ? intent : null

  const supabase = await createClient()

  const [{ data: meetings }, { data: venue }, { data: facilities }] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, meeting_date, theme, meeting_type')
      .gte('meeting_date', new Date().toISOString().split('T')[0])
      .order('meeting_date', { ascending: true })
      .limit(5),
    supabase
      .from('site_settings')
      .select(VENUE_COLUMNS)
      .eq('id', 1)
      .single(),
    supabase
      .from('facilities')
      .select('id, icon, label')
      .order('sort_order', { ascending: true }),
  ])

  return (
    <>
      <NavbarServer />
      <main className="get-started-page">
        <GetStartedClient
          initialIntent={validIntent}
          meetings={meetings ?? []}
          venue={venue ?? null}
          facilities={facilities ?? []}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Create `src/app/get-started/GetStartedClient.tsx`**

```tsx
'use client'

import { useState } from 'react'
import SignupFlow from '@/app/signup/SignupFlow'
import ContactForm from '@/app/contact/ContactForm'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import { mapsUrl, venueName, venueAddress } from '@/lib/venue'

type Meeting = { id: string; meeting_date: string; theme: string | null; meeting_type: string | null }
type VenueSettings = Parameters<typeof venueName>[0]
type Facility = { id: string; icon: string; label: string }

interface Props {
  initialIntent: 'attend' | 'ask' | null
  meetings: Meeting[]
  venue: VenueSettings | null
  facilities: Facility[]
}

export default function GetStartedClient({ initialIntent, meetings, venue, facilities }: Props) {
  const [intent, setIntent] = useState<'attend' | 'ask' | null>(initialIntent)

  if (!intent) {
    return (
      <div className="gs-chooser">
        <EyebrowLabel tone="clay">Get started</EyebrowLabel>
        <h1>How can we help?</h1>
        <p className="gs-chooser__intro">Choose what best fits what you&apos;re looking for.</p>
        <div className="gs-chooser__cards">
          <button className="gs-chooser__card" onClick={() => setIntent('attend')}>
            <span className="gs-chooser__icon" aria-hidden>🎙️</span>
            <strong>Come to a meeting</strong>
            <span>Reserve your spot for an upcoming session — your first three visits are free.</span>
          </button>
          <button className="gs-chooser__card" onClick={() => setIntent('ask')}>
            <span className="gs-chooser__icon" aria-hidden>✉️</span>
            <strong>Ask a question</strong>
            <span>Send us a message and we&apos;ll get back to you soon.</span>
          </button>
        </div>
      </div>
    )
  }

  if (intent === 'attend') {
    return (
      <div className="gs-attend">
        <button className="gs-back" onClick={() => setIntent(null)}>← Back</button>
        <SignupFlow meetings={meetings} venue={venue ?? null} />
      </div>
    )
  }

  // intent === 'ask'
  return (
    <div className="gs-ask">
      <button className="gs-back" onClick={() => setIntent(null)}>← Back</button>
      <div className="gs-ask__inner">
        <div className="gs-ask__left">
          <EyebrowLabel tone="clay">Get in touch</EyebrowLabel>
          <h1>We&apos;d love to hear from you</h1>
          <p className="gs-ask__intro">Whether you&apos;re curious about visiting, have a question, or just want to say hello — drop us a message and we&apos;ll get back to you soon.</p>
          <ContactForm />
        </div>
        <aside className="gs-ask__right">
          <div className="gs-find-us wsc-card" id="find-us">
            <EyebrowLabel>Find us</EyebrowLabel>
            <h2>{venueName(venue ?? {})}</h2>
            <address>
              <p>{venueAddress(venue ?? {})}</p>
            </address>
            {facilities.length > 0 && (
              <p className="gs-find-us__access">
                {facilities.map((f) => (
                  <span key={f.id} style={{ display: 'block' }}>{f.icon} {f.label}</span>
                ))}
              </p>
            )}
            <a href={mapsUrl(venue ?? {})} target="_blank" rel="noopener noreferrer" className="wsc-btn wsc-btn-ghost wsc-btn-sm gs-find-us__link">
              Get directions
            </a>
          </div>
          <div className="gs-faqs">
            <EyebrowLabel>Common questions</EyebrowLabel>
            <details className="gs-faq">
              <summary>Do I need to book?</summary>
              <p>No booking needed for your first three visits. Just turn up. If you&apos;d like to let us know you&apos;re coming, you can use the form above — but it&apos;s not required.</p>
            </details>
            <details className="gs-faq">
              <summary>Will I have to speak?</summary>
              <p>Not on your first visit — or your second, or your third. You&apos;re welcome to just watch until you feel ready. Nobody will put you on the spot.</p>
            </details>
            <details className="gs-faq">
              <summary>What does it cost?</summary>
              <p>Your first three visits are completely free. After that, membership is £3 per meeting. No hidden costs, no annual fee.</p>
            </details>
          </div>
        </aside>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/get-started/get-started.css`**

```css
/* get-started page */
.get-started-page {
  min-height: 80vh;
  padding: var(--section-v) var(--section-h);
  max-width: 1100px;
  margin: 0 auto;
}

/* Intent chooser */
.gs-chooser {
  max-width: 600px;
  margin: 4rem auto;
  text-align: center;
}

.gs-chooser h1 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin: 0.5rem 0;
  color: var(--foreground);
}

.gs-chooser__intro {
  color: var(--foreground-muted, var(--ink-3));
  margin-bottom: 2.5rem;
}

.gs-chooser__cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  text-align: left;
}

@media (max-width: 560px) {
  .gs-chooser__cards {
    grid-template-columns: 1fr;
  }
}

.gs-chooser__card {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.8rem 1.5rem;
  border-radius: var(--radius, 12px);
  border: 1.5px solid var(--rule);
  background: var(--glass-bg, rgba(255,255,255,0.04));
  transition: border-color 0.15s, transform 0.15s;
}

.gs-chooser__card:hover,
.gs-chooser__card:focus-visible {
  border-color: var(--clay);
  transform: translateY(-2px);
}

.gs-chooser__icon {
  font-size: 2rem;
}

.gs-chooser__card strong {
  font-size: 1.15rem;
  font-family: var(--serif);
  font-weight: 500;
  color: var(--foreground);
}

.gs-chooser__card span:last-child {
  font-size: 0.9rem;
  color: var(--foreground-muted, var(--ink-3));
  line-height: 1.5;
}

/* Back button */
.gs-back {
  all: unset;
  cursor: pointer;
  color: var(--clay);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  display: inline-block;
}

.gs-back:hover {
  text-decoration: underline;
}

/* Attend branch */
.gs-attend {
  display: flex;
  flex-direction: column;
}

/* Ask branch (mirrors contact layout) */
.gs-ask {
  display: flex;
  flex-direction: column;
}

.gs-ask__inner {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 3rem;
  align-items: start;
}

@media (max-width: 860px) {
  .gs-ask__inner {
    grid-template-columns: 1fr;
  }
}

.gs-ask__left h1 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  margin: 0.5rem 0;
  color: var(--foreground);
}

.gs-ask__intro {
  color: var(--foreground-muted, var(--ink-3));
  margin-bottom: 1.5rem;
}

/* Find us card (mirrors contact.css) */
.gs-find-us {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gs-find-us h2 {
  font-family: var(--serif);
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0;
  color: var(--ink);
}

.gs-find-us address {
  font-style: normal;
  color: var(--ink-2);
  font-size: 0.95rem;
}

.gs-find-us__access {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-3);
  line-height: 1.8;
}

.gs-find-us__link {
  align-self: flex-start;
}

/* FAQs (mirrors contact.css) */
.gs-faqs {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gs-faq {
  border: 1px solid var(--rule);
  border-radius: 8px;
  overflow: hidden;
}

.gs-faq summary {
  padding: 0.85rem 1rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--ink);
  list-style: none;
  display: flex;
  justify-content: space-between;
}

.gs-faq summary::-webkit-details-marker { display: none; }

.gs-faq summary::after {
  content: '+';
  font-size: 1.1rem;
  color: var(--clay);
}

.gs-faq[open] summary::after { content: '−'; }

.gs-faq p {
  margin: 0;
  padding: 0 1rem 0.85rem;
  color: var(--ink-3);
  font-size: 0.9rem;
  line-height: 1.6;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/get-started/
git commit -m "feat(get-started): new intent-chooser page branching RSVP and contact (#35)"
```

---

### Task 4: Redirect old public routes

**Files:**
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/contact/page.tsx`

- [ ] **Step 1: Convert `src/app/signup/page.tsx` to a redirect**

Replace the entire file content:

```tsx
import { redirect } from 'next/navigation'

export default function SignupPage() {
  redirect('/get-started?intent=attend')
}
```

- [ ] **Step 2: Convert `src/app/contact/page.tsx` to a redirect**

Replace the entire file content:

```tsx
import { redirect } from 'next/navigation'

export default function ContactPage() {
  redirect('/get-started?intent=ask')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/signup/page.tsx src/app/contact/page.tsx
git commit -m "feat(get-started): redirect /signup and /contact to /get-started (#35)"
```

---

### Task 5: Update CTA links across public surfaces

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/meetings/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/LoginForm.tsx`

Rules:
- "Come to a meeting" / "Attend" / "RSVP" → `/get-started?intent=attend`
- "Get in touch" / "Contact" / "Send a message" → `/get-started?intent=ask`
- "Find us" / "Accessibility" sidebar links → `/get-started?intent=ask#find-us` (keep `#find-us` anchor)

- [ ] **Step 1: Update `src/components/Navbar.tsx`**

Change the nav links array:

```tsx
// Before:
[['/', 'Home'], ['/about', 'About'], ['/meetings', 'Meetings'], ['/news', 'News'], ['/signup', 'Attend'], ['/contact', 'Contact']]

// After:
[['/', 'Home'], ['/about', 'About'], ['/meetings', 'Meetings'], ['/news', 'News'], ['/get-started?intent=attend', 'Attend'], ['/get-started?intent=ask', 'Contact']]
```

- [ ] **Step 2: Update `src/app/page.tsx`**

Replace every `/signup` href with `/get-started?intent=attend` and every `/contact` href with `/get-started?intent=ask`. (There are two `<Button href="/signup">` and one `<Button href="/contact">` — read the file to find exact lines.)

- [ ] **Step 3: Update `src/components/Footer.tsx`**

Replace:
- `/contact#find-us` → `/get-started?intent=ask#find-us` (×2)
- `/contact` → `/get-started?intent=ask`

- [ ] **Step 4: Update `src/app/about/page.tsx`**

Replace `/signup` → `/get-started?intent=attend`.

- [ ] **Step 5: Update `src/app/meetings/page.tsx`**

Replace all `/signup` occurrences → `/get-started?intent=attend`.

- [ ] **Step 6: Update `src/app/login/page.tsx` and `src/app/login/LoginForm.tsx`**

Replace `/contact` → `/get-started?intent=ask`.

- [ ] **Step 7: Commit**

```bash
git add src/components/Navbar.tsx src/app/page.tsx src/components/Footer.tsx \
        src/app/about/page.tsx src/app/meetings/page.tsx \
        src/app/login/page.tsx src/app/login/LoginForm.tsx
git commit -m "feat(get-started): update all CTA links to /get-started (#35)"
```

---

### Task 6: Admin enquiries — phone/topic display + status/notes controls

**Files:**
- Create: `src/app/admin/enquiries/actions.ts`
- Modify: `src/app/admin/enquiries/page.tsx`

The enquiries page needs:
1. Messages tab: show `phone` and `topic` if present; show status selector (`new | replied | closed`) + notes textarea with save action; remove per-row mark-as-read form (replace with status change)
2. RSVPs tab: show `contacted_at`, `admin_notes`; status filter extended to include `contacted`, `no_show`, `joined`; add per-row notes textarea

- [ ] **Step 1: Create `src/app/admin/enquiries/actions.ts`**

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

function revalidateEnquiries() {
  revalidatePath('/admin/enquiries')
}

export async function updateMessageStatus(messageId: string, status: string) {
  await checkAdmin()
  const supabase = await createClient()
  const handled_at = status !== 'new' ? new Date().toISOString() : null
  const { error } = await supabase
    .from('contact_messages')
    .update({ status, handled_at, is_read: status !== 'new' })
    .eq('id', messageId)
  if (error) throw new Error('Failed to update message status')
  revalidateEnquiries()
}

export async function updateMessageNotes(messageId: string, notes: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .update({ admin_notes: notes || null })
    .eq('id', messageId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}

export async function updateSignupStatus(signupId: string, status: string) {
  await checkAdmin()
  const supabase = await createClient()
  const contacted_at = status === 'contacted' ? new Date().toISOString() : undefined
  const { error } = await supabase
    .from('signups')
    .update({ status, ...(contacted_at ? { contacted_at } : {}) })
    .eq('id', signupId)
  if (error) throw new Error('Failed to update signup status')
  revalidateEnquiries()
}

export async function updateSignupNotes(signupId: string, notes: string) {
  await checkAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('signups')
    .update({ admin_notes: notes || null })
    .eq('id', signupId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}
```

- [ ] **Step 2: Rewrite `src/app/admin/enquiries/page.tsx`**

Key changes:
- Import the four new actions + existing `deleteMessage`
- Messages tab: show `phone` (if present), `topic` (if present), a `<form action={updateMessageStatus}>` status selector, a `<form action={updateMessageNotes}>` notes form, and the delete button
- RSVPs tab: extend status filter to `['pending', 'contacted', 'attended', 'no_show', 'joined', 'converted']`; add per-row `<form action={updateSignupStatus}>` status selector + `<form action={updateSignupNotes}>` notes form
- The messages query should select `*, status, phone, topic, admin_notes` (the `*` already covers the new columns once migration is applied)

Here is the full rewritten file:

```tsx
import { createClient } from '@/utils/supabase/server'
import DeleteMessageButton from '../messages/DeleteMessageButton'
import { MarkAttendedButton, InviteButton } from '../signups/RSVPActions'
import { updateMessageStatus, updateMessageNotes, updateSignupStatus, updateSignupNotes } from './actions'

export const metadata = { title: 'Enquiries | Admin' }

const MESSAGE_STATUSES = ['new', 'replied', 'closed'] as const
const SIGNUP_STATUSES = ['pending', 'contacted', 'attended', 'no_show', 'joined', 'converted'] as const

function statusTag(status: string) {
  const colours: Record<string, string> = {
    new: 'wsc-tag-clay',
    replied: 'wsc-tag-gold',
    closed: 'wsc-tag-sage',
    pending: 'wsc-tag-gold',
    contacted: 'wsc-tag-gold',
    attended: 'wsc-tag-sage',
    no_show: '',
    joined: 'wsc-tag-sage',
    converted: 'wsc-tag-clay',
  }
  return `wsc-tag ${colours[status] ?? ''}`
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; mstatus?: string }>
}) {
  const { tab = 'messages', status = 'pending', mstatus = 'new' } = await searchParams
  const supabase = await createClient()

  const [{ data: messages }, { data: signups }] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*')
      .eq('status', mstatus)
      .order('created_at', { ascending: false }),
    supabase
      .from('signups')
      .select('*, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
  ])

  const { data: allMessages } = await supabase
    .from('contact_messages')
    .select('status')
  const newCount = allMessages?.filter(m => m.status === 'new').length ?? 0

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>
        Enquiries
      </h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, borderBottom: '1px solid var(--rule)', paddingBottom: 0 }}>
        <a
          href="?tab=messages"
          className={`wsc-btn wsc-btn-sm${tab === 'messages' ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
        >
          Messages{newCount > 0 && (
            <span className="wsc-tag wsc-tag-clay" style={{ marginLeft: 8 }}>{newCount}</span>
          )}
        </a>
        <a
          href="?tab=rsvps"
          className={`wsc-btn wsc-btn-sm${tab === 'rsvps' ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
        >
          RSVPs
        </a>
      </div>

      {/* Messages tab */}
      {tab === 'messages' && (
        <div>
          {/* Message status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {MESSAGE_STATUSES.map(s => (
              <a key={s} href={`?tab=messages&mstatus=${s}`}
                className={`wsc-btn wsc-btn-sm${mstatus === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!messages?.length ? (
              <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
                No {mstatus} messages.
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="wsc-card" style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  borderColor: msg.status === 'new' ? 'var(--clay)' : 'var(--rule)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 0.2rem', color: 'var(--ink)' }}>{msg.name}</h3>
                      <a href={`mailto:${msg.email}`} style={{ color: 'var(--clay)', fontSize: '0.9rem' }}>{msg.email}</a>
                      {msg.phone && <span style={{ marginLeft: 12, color: 'var(--ink-3)', fontSize: '0.85rem' }}>{msg.phone}</span>}
                      {msg.topic && <span style={{ marginLeft: 12, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>Topic: {msg.topic}</span>}
                    </div>
                    <div style={{ color: 'var(--ink-4)', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {new Date(msg.created_at).toLocaleString()}
                      <span className={statusTag(msg.status)}>{msg.status}</span>
                    </div>
                  </div>

                  <div style={{ background: 'var(--paper-2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', lineHeight: '1.5', border: '1px solid var(--rule-soft)' }}>
                    {msg.message}
                  </div>

                  {/* Status control */}
                  <form action={async (fd: FormData) => {
                    'use server'
                    await updateMessageStatus(fd.get('message_id') as string, fd.get('status') as string)
                  }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="hidden" name="message_id" value={msg.id} />
                    <label className="wsc-label" style={{ margin: 0 }}>Status:</label>
                    <select name="status" defaultValue={msg.status} className="wsc-input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: 13 }}>
                      {MESSAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Update</button>
                    <DeleteMessageButton messageId={msg.id} />
                  </form>

                  {/* Notes */}
                  <form action={async (fd: FormData) => {
                    'use server'
                    await updateMessageNotes(fd.get('message_id') as string, fd.get('notes') as string)
                  }} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input type="hidden" name="message_id" value={msg.id} />
                    <label className="wsc-label" htmlFor={`notes-${msg.id}`}>Admin notes</label>
                    <textarea id={`notes-${msg.id}`} name="notes" className="wsc-input" rows={2} defaultValue={msg.admin_notes ?? ''} placeholder="Internal notes…" />
                    <div><button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Save notes</button></div>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* RSVPs tab */}
      {tab === 'rsvps' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {SIGNUP_STATUSES.map(s => (
              <a key={s} href={`?tab=rsvps&status=${s}`}
                className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
                {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {signups?.map(s => (
              <div key={s.id} className="wsc-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{s.first_name} {s.last_name}</strong>
                    <span style={{ marginLeft: 12, color: 'var(--ink-2)', fontSize: 14 }}>{s.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: 13 }}>
                    {s.meetings && (
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date(s.meetings.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {s.heard_from && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>via {s.heard_from}</span>}
                    <span className={statusTag(s.status)}>{s.status.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Status + action row */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <form action={async (fd: FormData) => {
                    'use server'
                    await updateSignupStatus(fd.get('signup_id') as string, fd.get('status') as string)
                  }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="hidden" name="signup_id" value={s.id} />
                    <label className="wsc-label" style={{ margin: 0, fontSize: 13 }}>Status:</label>
                    <select name="status" defaultValue={s.status} className="wsc-input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: 13 }}>
                      {SIGNUP_STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                    </select>
                    <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Update</button>
                  </form>
                  {s.status === 'pending' && <MarkAttendedButton signupId={s.id} />}
                  {s.status === 'attended' && <InviteButton signupId={s.id} />}
                </div>

                {/* Notes */}
                <form action={async (fd: FormData) => {
                  'use server'
                  await updateSignupNotes(fd.get('signup_id') as string, fd.get('notes') as string)
                }} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <input type="hidden" name="signup_id" value={s.id} />
                  <label className="wsc-label" htmlFor={`signup-notes-${s.id}`} style={{ fontSize: 13 }}>Admin notes</label>
                  <textarea id={`signup-notes-${s.id}`} name="notes" className="wsc-input" rows={2} defaultValue={s.admin_notes ?? ''} placeholder="Internal notes…" />
                  <div><button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Save notes</button></div>
                </form>
              </div>
            ))}
            {(!signups || signups.length === 0) && (
              <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-4)', borderStyle: 'dashed' }}>
                No {status.replace('_', ' ')} RSVPs
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

**IMPORTANT NOTE on inline server actions in JSX:** Next.js 16 does NOT support inline `async (fd) => { 'use server'; ... }` arrow functions inside RSC JSX — they must be imported named functions. Since the actions accept the specific IDs (messageId, signupId), use hidden inputs + named `action` bound via `bind()`, or use a wrapper component approach. 

The correct approach is to replace the inline server actions with imported named actions called via a form with hidden inputs. Here's the corrected pattern:

For status update forms, the `updateMessageStatus` and `updateSignupStatus` actions need to be called with FormData. They should use `.bind(null, id)` or accept FormData and extract `message_id`/`signup_id` from hidden inputs.

Change the action signatures to accept FormData:

```ts
// In actions.ts — accept FormData, not direct args:
export async function updateMessageStatus(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const messageId = formData.get('message_id') as string
  const status = formData.get('status') as string
  const handled_at = status !== 'new' ? new Date().toISOString() : null
  const { error } = await supabase
    .from('contact_messages')
    .update({ status, handled_at, is_read: status !== 'new' })
    .eq('id', messageId)
  if (error) throw new Error('Failed to update message status')
  revalidateEnquiries()
}

export async function updateMessageNotes(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const messageId = formData.get('message_id') as string
  const notes = formData.get('notes') as string
  const { error } = await supabase
    .from('contact_messages')
    .update({ admin_notes: notes || null })
    .eq('id', messageId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}

export async function updateSignupStatus(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const signupId = formData.get('signup_id') as string
  const status = formData.get('status') as string
  const contacted_at = status === 'contacted' ? new Date().toISOString() : undefined
  const { error } = await supabase
    .from('signups')
    .update({ status, ...(contacted_at ? { contacted_at } : {}) })
    .eq('id', signupId)
  if (error) throw new Error('Failed to update signup status')
  revalidateEnquiries()
}

export async function updateSignupNotes(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const signupId = formData.get('signup_id') as string
  const notes = formData.get('notes') as string
  const { error } = await supabase
    .from('signups')
    .update({ admin_notes: notes || null })
    .eq('id', signupId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}
```

And in the page, use `<form action={updateMessageStatus}>` with hidden inputs (no inline arrow functions).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/enquiries/
git commit -m "feat(enquiries): status/notes controls + phone/topic display (#35)"
```

---

### Task 7: Redirect duplicate admin routes

**Files:**
- Modify: `src/app/admin/signups/page.tsx`
- Modify: `src/app/admin/messages/page.tsx`

- [ ] **Step 1: Convert `src/app/admin/signups/page.tsx` to a redirect**

Replace the entire file content:

```tsx
import { redirect } from 'next/navigation'

export default function AdminSignupsPage() {
  redirect('/admin/enquiries?tab=rsvps')
}
```

- [ ] **Step 2: Convert `src/app/admin/messages/page.tsx` to a redirect**

Replace the entire file content:

```tsx
import { redirect } from 'next/navigation'

export default function AdminMessagesPage() {
  redirect('/admin/enquiries?tab=messages')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/signups/page.tsx src/app/admin/messages/page.tsx
git commit -m "feat(enquiries): retire /admin/signups and /admin/messages with redirects (#35)"
```

---

### Task 8: e2e test

**Files:**
- Create: `e2e/get-started.spec.ts`

- [ ] **Step 1: Create the e2e test**

```ts
import { test, expect } from '@playwright/test'

// #35: /get-started intent chooser, deep-links, and redirects

test.describe('#35 get-started', () => {
  test('shows intent chooser at /get-started', async ({ page }) => {
    await page.goto('/get-started')
    await expect(page.getByText('Come to a meeting')).toBeVisible()
    await expect(page.getByText('Ask a question')).toBeVisible()
  })

  test('?intent=attend skips chooser and shows signup flow', async ({ page }) => {
    await page.goto('/get-started?intent=attend')
    // SignupFlow starts with a meeting selection step
    await expect(page.getByText('Come to a meeting')).not.toBeVisible()
  })

  test('?intent=ask skips chooser and shows contact form', async ({ page }) => {
    await page.goto('/get-started?intent=ask')
    await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible()
  })

  test('/signup redirects to /get-started', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/get-started/)
  })

  test('/contact redirects to /get-started', async ({ page }) => {
    await page.goto('/contact')
    await expect(page).toHaveURL(/\/get-started/)
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add e2e/get-started.spec.ts
git commit -m "test(e2e): get-started intent chooser + redirect smoke tests (#35)"
```

---

### Task 9: Type-check, lint, build, and e2e gates

Run all Tier 0+1+2 gates centrally.

- [ ] **Step 1: tsc**

```bash
npx tsc --noEmit 2>&1 | tail -20
```

Expected: No new errors (pre-existing ~76 baseline in untouched files is acceptable).

- [ ] **Step 2: Lint changed files**

```bash
npx eslint src/app/get-started/ src/app/contact/actions.ts src/app/admin/enquiries/ \
           src/app/signup/page.tsx src/app/contact/page.tsx \
           src/app/admin/signups/page.tsx src/app/admin/messages/page.tsx \
           src/components/Navbar.tsx src/app/page.tsx src/components/Footer.tsx \
           src/app/about/page.tsx src/app/meetings/page.tsx \
           src/app/login/page.tsx src/app/login/LoginForm.tsx \
           e2e/get-started.spec.ts
```

Expected: No errors.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds.

- [ ] **Step 4: Migration grants guard**

```bash
npm run check:migrations
```

Expected: No errors (migration adds columns only, no new tables).

- [ ] **Step 5: e2e (pre-started dev server required — machine is slow)**

```bash
npm run test:e2e 2>&1 | tail -30
```

Expected: All tests pass including the new get-started suite. If the dev server is not pre-started, start it first with `npm run dev` and wait for it to be ready (~11 min cold on this machine; use `reuseExistingServer: true` in playwright.config.ts).

- [ ] **Step 6: Fix any failures before opening the PR**

---

### Task 10: Open PR and comment on issue

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/issue-35-get-started
```

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --title "feat(get-started): merge attend + contact into single /get-started page (#35)" \
  --body "## Summary
- New \`/get-started\` intent-chooser page that branches into the RSVP flow (\`?intent=attend\`) or contact form (\`?intent=ask\`)
- Deep-link support: \`?intent=attend|ask\` skips the chooser
- Old \`/signup\` and \`/contact\` routes redirect to the new page
- Fixes data gap: \`phone\` + \`topic\` now persisted to \`contact_messages\`
- \`/admin/enquiries\` gains per-item status/notes controls for both messages and RSVPs
- Duplicate admin routes (\`/admin/signups\`, \`/admin/messages\`) redirect to \`/admin/enquiries\`
- All public CTA links updated across Navbar, homepage, footer, about, meetings, login pages

Closes #35

## Test plan
- [ ] Visit \`/get-started\` — see chooser
- [ ] Click \"Come to a meeting\" — RSVP flow loads
- [ ] Click \"Ask a question\" — contact form loads with Find-Us sidebar + FAQs
- [ ] Hit \`/get-started?intent=attend\` directly — chooser skipped
- [ ] Hit \`/get-started?intent=ask\` directly — chooser skipped
- [ ] Visit \`/signup\` — redirected to \`/get-started\`
- [ ] Visit \`/contact\` — redirected to \`/get-started\`
- [ ] Submit contact form with phone + topic — check \`/admin/enquiries\` shows both
- [ ] As admin: change message status + add notes, reload — persists
- [ ] As admin: change signup status + add notes, reload — persists
- [ ] Visit \`/admin/signups\` and \`/admin/messages\` — both redirect
- [ ] All navbar/CTA links land on correct \`/get-started?intent=\` deep-link

🤖 Generated with Claude Code"
```

- [ ] **Step 3: Comment on issue #35**

```bash
gh issue comment 35 --body "PR #(number) is ready for manual testing. See the PR description for the full test plan."
```

(Replace `#(number)` with the actual PR number from the previous step.)
