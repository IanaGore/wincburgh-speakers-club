# Enquiries & Signup Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the contact form to persist messages to Supabase, add public-facing links to the RSVP signup flow, and replace the separate admin Messages + RSVPs pages with a single unified Enquiries page.

**Architecture:** Three independent tasks — a one-line server action fix, two CTA/nav link changes, and a new `/admin/enquiries` page that embeds the existing messages and RSVP UIs under URL-driven tabs. The old `/admin/messages` and `/admin/signups` routes are kept but removed from the nav.

**Tech Stack:** Next.js 16 App Router, Supabase (@supabase/ssr), vanilla CSS with design tokens, lucide-react

---

## Task 1: Fix contact form — save to Supabase

**Files:**
- Modify: `src/app/contact/actions.ts`

The `contact_messages` table schema (from migration `20260502180000_contact_and_venue.sql`):
```sql
id uuid, created_at timestamptz, name text, email text, message text, is_read boolean
```
Note: no `phone`, `topic`, or `sms_ok` columns — those are collected by the form but not persisted yet.

- [ ] **Step 1: Read the current action**

Read `src/app/contact/actions.ts`.

- [ ] **Step 2: Replace console.log with Supabase insert**

Replace the entire file content with:

```ts
'use server'
import { createClient } from '@/utils/supabase/server'

// TODO: Also send notification email via Resend/Edge Function before launch
export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, message })

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /path/to/project && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/contact/actions.ts
git commit -m "fix: contact form now saves messages to Supabase contact_messages table"
```

---

## Task 2: Link the RSVP signup flow from public site

**Files:**
- Modify: `src/app/page.tsx` (two Button hrefs)
- Modify: `src/components/Navbar.tsx` (add Attend link)

Current state: both homepage CTAs point to `/contact`. The signup flow at `/signup` has no public entry point.

- [ ] **Step 1: Read homepage and navbar**

Read `src/app/page.tsx` lines 55–70 and 235–250. Read `src/components/Navbar.tsx`.

- [ ] **Step 2: Update homepage primary CTA**

In `src/app/page.tsx`, change the hero primary button (around line 61):
```tsx
// Before:
<Button href="/contact" variant="primary">Come to a meeting</Button>

// After:
<Button href="/signup" variant="primary">Come to a meeting</Button>
```

Also update the CTA strip primary button (around line 244):
```tsx
// Before:
<Button href="/contact" variant="primary">Come to a meeting</Button>

// After:
<Button href="/signup" variant="primary">Come to a meeting</Button>
```

Leave the secondary buttons ("Get in touch", "What happens?") unchanged — they correctly point to `/contact` and `/#about`.

- [ ] **Step 3: Add Attend link to public navbar**

In `src/components/Navbar.tsx`, find the public nav links array (the links shown to non-admin, non-member users). Add an "Attend" link pointing to `/signup`. It should appear before or after "Contact" — place it before Contact as it is the primary action:

```tsx
// In the public nav links section, add:
<Link href="/signup">Attend</Link>
```

Follow the exact same pattern as the other nav links in that section (same className, activeStyle call, etc.).

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/Navbar.tsx
git commit -m "feat: link signup RSVP flow from homepage CTAs and public navbar"
```

---

## Task 3: Unified /admin/enquiries page

**Files:**
- Create: `src/app/admin/enquiries/page.tsx`
- Modify: `src/components/PortalNav.tsx` (replace Messages + RSVPs with Enquiries)

**Approach:** A single server component that accepts a `tab` search param (`messages` | `rsvps`, default `messages`). It fetches data for both tabs in parallel and renders the active tab's content. Tab switching is via `<a href="?tab=...">` links — no client JS needed.

The messages UI is lifted directly from `/admin/messages/page.tsx`. The RSVPs UI is lifted from `/admin/signups/page.tsx` (which itself accepts a `status` search param). Both tabs import their existing action components (`DeleteMessageButton`, `MarkAttendedButton`, `InviteButton`).

- [ ] **Step 1: Read existing pages and actions**

Read:
- `src/app/admin/messages/page.tsx` (full file — contains messages UI)
- `src/app/admin/messages/actions.ts` (markAsRead action)
- `src/app/admin/messages/DeleteMessageButton.tsx`
- `src/app/admin/signups/RSVPActions.tsx` (MarkAttendedButton, InviteButton)

- [ ] **Step 2: Create `src/app/admin/enquiries/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import { markAsRead } from '../messages/actions'
import DeleteMessageButton from '../messages/DeleteMessageButton'
import { MarkAttendedButton, InviteButton } from '../signups/RSVPActions'

export const metadata = { title: 'Enquiries | Admin' }

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>
}) {
  const { tab = 'messages', status = 'pending' } = await searchParams
  const supabase = await createClient()

  const [{ data: messages }, { data: signups }] = await Promise.all([
    supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('signups')
      .select('*, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
  ])

  const unreadCount = messages?.filter(m => !m.is_read).length ?? 0

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
          Messages{unreadCount > 0 && (
            <span className="wsc-tag wsc-tag-clay" style={{ marginLeft: 8 }}>{unreadCount}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!messages?.length ? (
            <div className="wsc-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-3)', borderStyle: 'dashed' }}>
              No messages yet.
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="wsc-card" style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderColor: msg.is_read ? 'var(--rule)' : 'var(--clay)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--serif)', fontWeight: 500, margin: '0 0 0.2rem', color: 'var(--ink)' }}>{msg.name}</h3>
                    <a href={`mailto:${msg.email}`} style={{ color: 'var(--clay)', fontSize: '0.9rem' }}>{msg.email}</a>
                  </div>
                  <div style={{ color: 'var(--ink-4)', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {new Date(msg.created_at).toLocaleString()}
                    {!msg.is_read && <span className="wsc-tag wsc-tag-clay">New</span>}
                  </div>
                </div>
                <div style={{ background: 'var(--paper-2)', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', lineHeight: '1.5', border: '1px solid var(--rule-soft)' }}>
                  {msg.message}
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  {!msg.is_read && (
                    <form action={markAsRead}>
                      <input type="hidden" name="message_id" value={msg.id} />
                      <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Mark as Read</button>
                    </form>
                  )}
                  <DeleteMessageButton messageId={msg.id} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RSVPs tab */}
      {tab === 'rsvps' && (
        <div>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {['pending', 'attended', 'converted'].map(s => (
              <a key={s} href={`?tab=rsvps&status=${s}`}
                className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </a>
            ))}
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                  {['Name', 'Email', 'Meeting', 'Heard from', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups?.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                    <td style={{ padding: '12px', color: 'var(--ink)', fontWeight: 500 }}>{s.first_name} {s.last_name}</td>
                    <td style={{ padding: '12px', color: 'var(--ink-2)' }}>{s.email}</td>
                    <td style={{ padding: '12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                      {s.meetings ? new Date(s.meetings.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--ink-3)', fontSize: 13 }}>{s.heard_from || '—'}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`wsc-tag${s.status === 'attended' ? ' wsc-tag-sage' : s.status === 'converted' ? ' wsc-tag-clay' : ' wsc-tag-gold'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {s.status === 'pending' && <MarkAttendedButton signupId={s.id} />}
                        {s.status === 'attended' && <InviteButton signupId={s.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!signups || signups.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 13 }}>
                      No {status} RSVPs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update PortalNav — replace Messages + RSVPs with Enquiries**

In `src/components/PortalNav.tsx`, find the admin nav section. Replace:
```tsx
<Link href="/admin/signups" style={activeStyle(pathname, '/admin/signups')}>RSVPs</Link>
...
<Link href="/admin/messages" style={activeStyle(pathname, '/admin/messages')}>Messages</Link>
```
With a single link (position it where Messages was, after News):
```tsx
<Link href="/admin/enquiries" style={activeStyle(pathname, '/admin/enquiries')}>Enquiries</Link>
```
Remove the RSVPs link entirely.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/enquiries/ src/components/PortalNav.tsx
git commit -m "feat: unified /admin/enquiries page with Messages and RSVPs tabs"
```

---

*End of plan.*
