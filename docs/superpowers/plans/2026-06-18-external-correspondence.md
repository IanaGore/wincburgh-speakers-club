# External Correspondence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture emails sent to `president@winchburghspeakersclub.uk` into the admin portal so the secretary can review, reply, and track them by status (open / in_progress / closed).

**Architecture:** Extend the existing inbound webhook to recognise `president@` and `reply+corr-{uuid}@` addresses, storing threads in two new Supabase tables. Admin UI follows the established list + detail pattern used by Communications.

**Tech Stack:** Next.js 16 App Router (server components + server actions), Supabase (RLS, service-role client in webhook), Resend (send from `president@`, reply-to threading), Vanilla CSS (`wsc-` classes).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| Supabase SQL | Create | `external_correspondence` + `correspondence_messages` tables + RLS |
| `src/lib/email.ts` | Modify | Add `sendCorrespondenceReply` |
| `src/app/api/email/inbound/route.ts` | Modify | Extend `RoutingResult` type + `extractRoutingId` + POST handler |
| `src/app/admin/correspondence/actions.ts` | Create | `sendCorrespondenceReplyAction`, `updateCorrespondenceStatus` |
| `src/app/admin/correspondence/[id]/StatusButtons.tsx` | Create | Form-based status transition buttons (server component) |
| `src/app/admin/correspondence/[id]/ReplyForm.tsx` | Create | `'use client'` reply textarea + `useActionState` |
| `src/app/admin/correspondence/[id]/page.tsx` | Create | Thread detail page (server component) |
| `src/app/admin/correspondence/page.tsx` | Create | Filterable list page (server component) |
| `src/components/PortalNav.tsx` | Modify | Add Correspondence nav link |

---

## Task 1: Database Migration

**Files:**
- Run SQL in Supabase dashboard → SQL Editor

- [ ] **Step 1: Open Supabase SQL Editor and run the following migration**

```sql
-- ── external_correspondence ──────────────────────────────────────────
create table external_correspondence (
  id          uuid        primary key default gen_random_uuid(),
  subject     text        not null,
  from_email  text        not null,
  from_name   text        not null default '',
  status      text        not null default 'open'
                          check (status in ('open', 'in_progress', 'closed')),
  received_at timestamptz not null default now()
);

-- ── correspondence_messages ───────────────────────────────────────────
create table correspondence_messages (
  id                  uuid        primary key default gen_random_uuid(),
  correspondence_id   uuid        not null
                                  references external_correspondence(id)
                                  on delete cascade,
  direction           text        not null check (direction in ('inbound', 'outbound')),
  body                text        not null,
  from_email          text        not null,
  from_name           text        not null default '',
  sent_at             timestamptz not null default now(),
  sent_by             uuid        references auth.users(id) on delete set null
);

create index on correspondence_messages(correspondence_id);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table external_correspondence  enable row level security;
alter table correspondence_messages  enable row level security;

create policy "admin_all" on external_correspondence
  for all to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_all" on correspondence_messages
  for all to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
```

- [ ] **Step 2: Verify tables exist**

In Supabase Table Editor, confirm `external_correspondence` and `correspondence_messages` appear with the correct columns.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add external_correspondence and correspondence_messages tables"
```

---

## Task 2: Email Helper

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add `sendCorrespondenceReply` at the bottom of `src/lib/email.ts`**

```typescript
export async function sendCorrespondenceReply({
  to,
  toName,
  subject,
  body,
  correspondenceId,
}: {
  to: string
  toName: string
  subject: string
  body: string
  correspondenceId: string
}): Promise<void> {
  await resend.emails.send({
    from: 'Winchburgh Speakers Club <president@winchburghspeakersclub.uk>',
    replyTo: `reply+corr-${correspondenceId}@winchburghspeakersclub.uk`,
    to,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    html: `
      <p>Hi ${esc(toName || 'there')},</p>
      <p>${esc(body).replace(/\n/g, '<br/>')}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:13px">
        Winchburgh Speakers Club ·
        <a href="https://winchburghspeakersclub.uk" style="color:#94a3b8">winchburghspeakersclub.uk</a>
      </p>
    `,
  })
}
```

- [ ] **Step 2: Confirm TypeScript compiles cleanly**

```bash
cd speakers-club-portal && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add sendCorrespondenceReply email helper"
```

---

## Task 3: Extend Inbound Webhook

**Files:**
- Modify: `src/app/api/email/inbound/route.ts`

- [ ] **Step 1: Replace the `RoutingResult` type and `extractRoutingId` function**

Replace lines 34–59 of `src/app/api/email/inbound/route.ts` with:

```typescript
type RoutingResult =
  | { type: 'enquiry'; id: string }
  | { type: 'communication'; id: string }
  | { type: 'correspondence_new' }
  | { type: 'correspondence_reply'; id: string }
  | null

function extractRoutingId(toAddresses: string[]): RoutingResult {
  for (const addr of toAddresses) {
    // Communication replies: reply+comm-{uuid}@domain
    const commMatch = addr.match(/reply\+comm-([^@]+)@(.+)/)
    if (commMatch) {
      const [, id, domain] = commMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'communication', id }
      }
    }

    // Correspondence replies: reply+corr-{uuid}@domain  (must precede generic reply+ check)
    const corrMatch = addr.match(/reply\+corr-([^@]+)@(.+)/)
    if (corrMatch) {
      const [, id, domain] = corrMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'correspondence_reply', id }
      }
    }

    // Enquiry replies: reply+{uuid}@domain
    const enquiryMatch = addr.match(/reply\+([^@]+)@(.+)/)
    if (enquiryMatch) {
      const [, id, domain] = enquiryMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'enquiry', id }
      }
    }

    // New external correspondence: president@domain
    if (addr.toLowerCase() === `president@${RECEIVING_DOMAIN}`) {
      return { type: 'correspondence_new' }
    }
  }
  return null
}
```

- [ ] **Step 2: Add correspondence handling to the POST handler**

After the existing `} else {` block that handles `communication` replies (ends around line 188), add the following two blocks. The complete routing section of the POST handler should read:

```typescript
  if (routing.type === 'enquiry') {
    // ... existing enquiry block unchanged ...
  } else if (routing.type === 'communication') {
    // ... existing communication block unchanged ...
  } else if (routing.type === 'correspondence_new') {
    const rawFrom: string = email.from ?? ''
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : ''
    const subject: string = (email.subject as string | null) ?? '(No subject)'

    const { data: corr, error: corrError } = await supabase
      .from('external_correspondence')
      .insert({ subject, from_email: fromEmail, from_name: fromName })
      .select('id')
      .single()

    if (corrError || !corr) {
      console.error('[inbound] correspondence insert failed:', corrError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }

    const { error: msgError } = await supabase
      .from('correspondence_messages')
      .insert({
        correspondence_id: corr.id,
        direction: 'inbound',
        body,
        from_email: fromEmail,
        from_name: fromName,
      })

    if (msgError) {
      console.error('[inbound] correspondence message insert failed:', msgError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  } else if (routing.type === 'correspondence_reply') {
    const { data: corr, error: corrError } = await supabase
      .from('external_correspondence')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (corrError || !corr) {
      console.info('[inbound] correspondence not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    const rawFrom: string = email.from ?? ''
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : ''

    const { error: msgError } = await supabase
      .from('correspondence_messages')
      .insert({
        correspondence_id: routing.id,
        direction: 'inbound',
        body,
        from_email: fromEmail,
        from_name: fromName,
      })

    if (msgError) {
      console.error('[inbound] correspondence reply insert failed:', msgError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  }
```

- [ ] **Step 3: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/email/inbound/route.ts
git commit -m "feat: extend inbound webhook to capture president@ correspondence"
```

---

## Task 4: Server Actions

**Files:**
- Create: `src/app/admin/correspondence/actions.ts`

- [ ] **Step 1: Create `src/app/admin/correspondence/actions.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendCorrespondenceReply } from '@/lib/email'

const VALID_STATUSES = ['open', 'in_progress', 'closed'] as const

export async function sendCorrespondenceReplyAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await checkAdmin()
  const supabase = await createClient()

  const correspondenceId = (formData.get('correspondence_id') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!correspondenceId) return { error: 'Invalid correspondence ID.', success: false }
  if (!body) return { error: 'Reply cannot be empty.', success: false }

  const { data: corr, error: corrError } = await supabase
    .from('external_correspondence')
    .select('from_email, from_name, subject')
    .eq('id', correspondenceId)
    .single()

  if (corrError || !corr) return { error: 'Correspondence not found.', success: false }

  try {
    await sendCorrespondenceReply({
      to: corr.from_email as string,
      toName: corr.from_name as string,
      subject: corr.subject as string,
      body,
      correspondenceId,
    })
  } catch (err) {
    console.error('[corr reply] send failed:', err)
    return { error: 'Failed to send email. Check Resend logs.', success: false }
  }

  const { error: insertError } = await supabase
    .from('correspondence_messages')
    .insert({
      correspondence_id: correspondenceId,
      direction: 'outbound',
      body,
      from_email: 'president@winchburghspeakersclub.uk',
      from_name: 'Winchburgh Speakers Club',
      sent_by: user.id,
    })

  if (insertError) {
    console.error('[corr reply] message insert failed:', insertError)
    return { error: 'Email sent but failed to save to thread.', success: false }
  }

  revalidatePath(`/admin/correspondence/${correspondenceId}`)
  return { error: null, success: true }
}

export async function updateCorrespondenceStatus(formData: FormData): Promise<void> {
  await checkAdmin()
  const supabase = await createClient()

  const id = (formData.get('correspondence_id') as string)?.trim()
  const status = formData.get('status') as string

  if (!id || !(VALID_STATUSES as readonly string[]).includes(status)) return

  await supabase
    .from('external_correspondence')
    .update({ status })
    .eq('id', id)

  revalidatePath(`/admin/correspondence/${id}`)
  revalidatePath('/admin/correspondence')
}
```

- [ ] **Step 2: Confirm TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/correspondence/actions.ts
git commit -m "feat: add correspondence server actions (reply + status update)"
```

---

## Task 5: StatusButtons Component

**Files:**
- Create: `src/app/admin/correspondence/[id]/StatusButtons.tsx`

- [ ] **Step 1: Create `src/app/admin/correspondence/[id]/StatusButtons.tsx`**

```typescript
import { updateCorrespondenceStatus } from '../actions'

export default function StatusButtons({ id, status }: { id: string; status: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {status === 'open' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="in_progress" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Mark In Progress</button>
        </form>
      )}
      {status !== 'closed' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="closed" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Close</button>
        </form>
      )}
      {status !== 'open' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="open" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Reopen</button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/correspondence/[id]/StatusButtons.tsx
git commit -m "feat: add StatusButtons component for correspondence status transitions"
```

---

## Task 6: ReplyForm Component

**Files:**
- Create: `src/app/admin/correspondence/[id]/ReplyForm.tsx`

- [ ] **Step 1: Create `src/app/admin/correspondence/[id]/ReplyForm.tsx`**

```typescript
'use client'
import { useActionState, useRef, useEffect } from 'react'
import { sendCorrespondenceReplyAction } from '../actions'

const initial = { error: null as string | null, success: false }

export default function ReplyForm({ correspondenceId }: { correspondenceId: string }) {
  const [state, formAction, pending] = useActionState(sendCorrespondenceReplyAction, initial)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (state.success && textareaRef.current) {
      textareaRef.current.value = ''
    }
  }, [state.success])

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8, letterSpacing: '0.04em' }}>
        REPLY <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>· sending as president@winchburghspeakersclub.uk</span>
      </div>
      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="hidden" name="correspondence_id" value={correspondenceId} />
        <textarea
          ref={textareaRef}
          name="body"
          className="wsc-input wsc-textarea"
          rows={5}
          required
          placeholder="Write your reply…"
        />
        {state.error && (
          <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
        )}
        {state.success && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>Reply sent.</p>
        )}
        <div>
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" disabled={pending}>
            {pending ? 'Sending…' : 'Send Reply'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/correspondence/[id]/ReplyForm.tsx
git commit -m "feat: add ReplyForm client component for correspondence"
```

---

## Task 7: List Page

**Files:**
- Create: `src/app/admin/correspondence/page.tsx`

- [ ] **Step 1: Create `src/app/admin/correspondence/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Correspondence | Admin' }

const STATUSES = ['open', 'in_progress', 'closed', 'all'] as const

function statusClass(status: string) {
  const map: Record<string, string> = {
    open: 'wsc-tag-clay',
    in_progress: 'wsc-tag-gold',
    closed: 'wsc-tag-sage',
  }
  return `wsc-tag ${map[status] ?? ''}`
}

function statusLabel(status: string) {
  if (status === 'in_progress') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function CorrespondencePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'open' } = await searchParams
  const supabase = await createClient()

  const query = supabase
    .from('external_correspondence')
    .select('id, subject, from_email, from_name, status, received_at')
    .order('received_at', { ascending: false })

  const { data: items } = status === 'all' ? await query : await query.eq('status', status)
  const rows = items ?? []

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>
        External Correspondence
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {STATUSES.map(s => (
          <a
            key={s}
            href={`?status=${s}`}
            className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}
          >
            {statusLabel(s)}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-3)' }}>No {status === 'all' ? '' : statusLabel(status).toLowerCase()} correspondence.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Subject</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>From</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Received</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id as string} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/admin/correspondence/${row.id}`} style={{ color: 'var(--clay)', fontWeight: 500 }}>
                    {row.subject as string}
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {(row.from_name as string) || (row.from_email as string)}
                  {(row.from_name as string) && (
                    <span style={{ color: 'var(--ink-4)', marginLeft: 6, fontSize: 12 }}>
                      {row.from_email as string}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {new Date(row.received_at as string).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={statusClass(row.status as string)}>
                    {statusLabel(row.status as string)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the page renders**

Start the dev server (`npm run dev`) and visit `http://localhost:3000/admin/correspondence`. Expected: page loads with status filter buttons, empty table (no data yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/correspondence/page.tsx
git commit -m "feat: add external correspondence list page"
```

---

## Task 8: Detail Page

**Files:**
- Create: `src/app/admin/correspondence/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/admin/correspondence/[id]/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import StatusButtons from './StatusButtons'
import ReplyForm from './ReplyForm'

export const metadata = { title: 'Correspondence | Admin' }

function statusClass(status: string) {
  const map: Record<string, string> = {
    open: 'wsc-tag-clay',
    in_progress: 'wsc-tag-gold',
    closed: 'wsc-tag-sage',
  }
  return `wsc-tag ${map[status] ?? ''}`
}

function statusLabel(status: string) {
  if (status === 'in_progress') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default async function CorrespondenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: corr, error: corrError }, { data: messages }] = await Promise.all([
    supabase
      .from('external_correspondence')
      .select('id, subject, from_email, from_name, status, received_at')
      .eq('id', id)
      .single(),
    supabase
      .from('correspondence_messages')
      .select('id, direction, body, from_email, from_name, sent_at')
      .eq('correspondence_id', id)
      .order('sent_at', { ascending: true }),
  ])

  if (corrError || !corr) notFound()

  const messageList = messages ?? []
  const isOutbound = (direction: string) => direction === 'outbound'

  return (
    <div style={{ maxWidth: 760 }}>
      <EyebrowLabel>
        Admin · <Link href="/admin/correspondence">Correspondence</Link>
      </EyebrowLabel>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, margin: '8px 0 4px' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, margin: 0 }}>
          {corr.subject as string}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={statusClass(corr.status as string)}>
            {statusLabel(corr.status as string)}
          </span>
          <StatusButtons id={id} status={corr.status as string} />
        </div>
      </div>

      <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
        From: <strong>{(corr.from_name as string) || (corr.from_email as string)}</strong>
        {corr.from_name && <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>&lt;{corr.from_email as string}&gt;</span>}
        {' · '}
        {new Date(corr.received_at as string).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule-soft)', marginBottom: 24 }} />

      {/* Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {messageList.map(msg => {
          const outbound = isOutbound(msg.direction as string)
          return (
            <div
              key={msg.id as string}
              style={{
                alignSelf: outbound ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: outbound ? 'right' : 'left' }}>
                {outbound ? 'You (President)' : ((msg.from_name as string) || (msg.from_email as string))}
                {' · '}
                {new Date(msg.sent_at as string).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              <div
                style={{
                  background: outbound ? 'color-mix(in srgb, var(--clay) 15%, var(--paper-2))' : 'var(--paper-2)',
                  border: outbound ? '1px solid color-mix(in srgb, var(--clay) 30%, transparent)' : '1px solid var(--rule-soft)',
                  borderRadius: outbound ? '8px 0 8px 8px' : '0 8px 8px 8px',
                  padding: '10px 14px',
                }}
              >
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                  {msg.body as string}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--rule-soft)', marginBottom: 24 }} />

      {/* Reply form */}
      <ReplyForm correspondenceId={id} />
    </div>
  )
}
```

- [ ] **Step 2: Verify the page compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/correspondence/[id]/page.tsx
git commit -m "feat: add correspondence thread detail page with reply form"
```

---

## Task 9: PortalNav Update

**Files:**
- Modify: `src/components/PortalNav.tsx`

- [ ] **Step 1: Add the Correspondence link after the Communications link in `PortalNav.tsx`**

In the admin links section (around line 30), after:
```tsx
<Link href="/admin/communications" style={activeStyle(pathname, '/admin/communications')}>Communications</Link>
```

Add:
```tsx
<Link href="/admin/correspondence" style={activeStyle(pathname, '/admin/correspondence')}>Correspondence</Link>
```

- [ ] **Step 2: Verify nav renders with the new link**

Visit `http://localhost:3000/admin/meetings` and confirm "Correspondence" appears in the nav between "Communications" and "Media".

- [ ] **Step 3: Commit**

```bash
git add src/components/PortalNav.tsx
git commit -m "feat: add Correspondence link to admin nav"
```

---

## Task 10: End-to-End Smoke Test

- [ ] **Step 1: Test new correspondence capture**

Send a test email to `president@winchburghspeakersclub.uk` from any external email address (e.g. your personal Gmail). Wait ~30 seconds for Resend to deliver the webhook.

- [ ] **Step 2: Verify it appears in the portal**

Visit `/admin/correspondence`. The email should appear as a row with status "open". Click through to the thread detail and confirm the message body is visible.

- [ ] **Step 3: Test status transition**

On the detail page, click "Mark In Progress". Confirm the badge updates to "In Progress" and the button set changes (Reopen + Close).

- [ ] **Step 4: Test reply**

Type a reply in the reply form and click "Send Reply". Confirm:
- "Reply sent." message appears below the form
- The reply appears in the thread (right-aligned)
- The external sender receives the email from `president@winchburghspeakersclub.uk`

- [ ] **Step 5: Test reply threading**

Reply to the email you just sent from the external inbox. Confirm the reply appears in the portal thread (left-aligned, direction: inbound).

- [ ] **Step 6: Test Close**

Click "Close" on the thread. Confirm status updates to "Closed" and the item no longer appears in the default "Open" list view.

- [ ] **Step 7: Confirm existing features not broken**

Visit `/admin/enquiries` and confirm enquiry reply threading still works. Visit `/admin/communications` and confirm the Communications page loads correctly.
