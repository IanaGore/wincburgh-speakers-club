# Communications Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin Communications section that lets admins compose and send emails to members, past enquirers, and external addresses, with replies routing back into a threaded portal view.

**Architecture:** New `/admin/communications` section with list, compose, and detail pages. Three new Supabase tables (`communications`, `communication_recipients`, `communication_replies`). The existing inbound webhook at `/api/email/inbound` is extended to route `reply+comm-{id}@...` addresses into `communication_replies`. Sending uses Resend per-recipient with a plus-addressed Reply-To so all replies are tied to the originating communication.

**Tech Stack:** Next.js 16 App Router, Supabase SSR + service role (RLS bypass for webhook), Resend SDK v6, pure CSS (NO Tailwind), TypeScript.

---

## Codebase context (read before every task)

- **No Tailwind.** Style with inline styles using CSS variables: `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`, `var(--ink-4)`, `var(--paper)`, `var(--paper-2)`, `var(--clay)`, `var(--clay-soft)`, `var(--rule)`, `var(--rule-soft)`, `var(--serif)`, `var(--sans)`. See `src/app/globals.css` for reference.
- **Admin auth:** Import `checkAdmin` from `@/utils/supabase/auth-helpers` — call it at the top of every server action.
- **Service role client:** `createClient(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })` imported from `@supabase/supabase-js` directly (not the SSR wrapper). Used to bypass RLS for webhook inserts.
- **Server components:** Use `createClient` from `@/utils/supabase/server` for reads in page components.
- **Storage bucket:** `site-media` at `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`.
- **Email sender address:** `noreply@winchburghspeakersclub.uk`; receiving domain: `winchburghspeakersclub.uk`.
- **Profiles fields:** `id, full_name, contact_email, phone, is_admin, is_active, club_roles`.
- **Signups fields:** `id, first_name, last_name, email, status` (relevant statuses: `pending`, `contacted`, `attended`).
- **Contact messages (enquiries) fields:** `id, name, email, status`.

---

## File map

| File | Action | Responsibility |
|------|--------|---------------|
| `supabase/migrations/20260618000000_communications.sql` | Create | Three new tables + RLS |
| `src/app/api/email/inbound/route.ts` | Modify | Extend routing for `comm-` prefix |
| `src/lib/email.ts` | Modify | Add `sendCommunicationEmail()` helper |
| `src/app/admin/communications/actions.ts` | Create | Server actions: upload attachment, send communication |
| `src/components/PortalNav.tsx` | Modify | Add "Communications" nav link |
| `src/app/admin/communications/page.tsx` | Create | List page |
| `src/app/admin/communications/compose/page.tsx` | Create | Server wrapper: fetches data, renders ComposeForm |
| `src/app/admin/communications/compose/ComposeForm.tsx` | Create | Client component: recipient picker, attachments, submit |
| `src/app/admin/communications/[id]/page.tsx` | Create | Detail + reply thread |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260618000000_communications.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260618000000_communications.sql

create table communications (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  sender_title text not null,
  sent_by uuid references auth.users(id),
  sent_at timestamptz,
  status text not null default 'draft',
  attachment_urls text[] not null default '{}'
);

create table communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  email text not null,
  name text not null,
  recipient_type text not null,
  source_id uuid
);

create table communication_replies (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  from_email text not null,
  from_name text not null,
  body text not null,
  received_at timestamptz not null default now()
);

alter table communications enable row level security;
alter table communication_recipients enable row level security;
alter table communication_replies enable row level security;

create policy "admin_all_communications" on communications
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_all_communication_recipients" on communication_recipients
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_read_communication_replies" on communication_replies
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
```

- [ ] **Step 2: Apply the migration**

```bash
cd /Users/iangore/Documents/Claude/Projects/Speakers\ Club/Website/speakers-club-portal
npx supabase db push
```

Expected: migration applies without errors.

- [ ] **Step 3: Verify in Supabase Studio**

Open Supabase Studio → Table Editor. Confirm `communications`, `communication_recipients`, and `communication_replies` tables exist with the correct columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260618000000_communications.sql
git commit -m "feat: add communications, communication_recipients, communication_replies tables"
```

---

## Task 2: Extend inbound webhook routing

**Files:**
- Modify: `src/app/api/email/inbound/route.ts`

The existing webhook handles `reply+{enquiry_uuid}@winchburghspeakersclub.uk`. We extend it to also handle `reply+comm-{uuid}@winchburghspeakersclub.uk`, inserting into `communication_replies` for the latter.

- [ ] **Step 1: Replace `extractEnquiryId` with `extractRoutingId`**

Replace the current `extractEnquiryId` function and `InboundPayload` type, then update the POST handler. The full updated file:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const RECEIVING_DOMAIN = 'winchburghspeakersclub.uk'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

function stripQuotedReply(text: string): string {
  const markers = [
    /\r?\nOn .+wrote:/m,
    /\r?\n[-]{2,}\r?\n/m,
    /\r?\n>[ ]?.+/m,
    /\r?\nFrom:[ ].+/m,
  ]
  for (const marker of markers) {
    const idx = text.search(marker)
    if (idx !== -1) {
      const stripped = text.slice(0, idx).trim()
      return stripped.length > 0 ? stripped : text.trim()
    }
  }
  return text.trim()
}

type RoutingResult =
  | { type: 'enquiry'; id: string }
  | { type: 'communication'; id: string }
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
    // Enquiry replies: reply+{uuid}@domain
    const enquiryMatch = addr.match(/reply\+([^@]+)@(.+)/)
    if (enquiryMatch) {
      const [, id, domain] = enquiryMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'enquiry', id }
      }
    }
  }
  return null
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type InboundPayload = {
  type: string
  data?: {
    email_id?: string
    to?: string[]
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[inbound] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  try {
    const wh = new Webhook(secret)
    wh.verify(rawBody, svixHeaders)
  } catch {
    console.warn('[inbound] signature verification failed')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody) as InboundPayload

  if (payload.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const toAddresses = payload.data?.to ?? []
  const routing = extractRoutingId(toAddresses)

  if (!routing) {
    console.info('[inbound] no matching plus-address found in:', toAddresses)
    return NextResponse.json({ ok: true })
  }

  const emailId = payload.data?.email_id
  if (!emailId) {
    console.error('[inbound] no email_id in payload')
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchResult = await (resend.emails.receiving as any).get(emailId)
  if (fetchResult.error || !fetchResult.data) {
    console.error('[inbound] fetch failed:', fetchResult.error?.statusCode, fetchResult.error?.message)
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 })
  }
  const email = fetchResult.data

  const rawText: string | null = email.text ?? null
  const rawHtml: string | null = email.html ?? null
  const source = rawText ?? (rawHtml ? htmlToText(rawHtml) : null)
  const body = source ? stripQuotedReply(source) : '[No message body]'

  const supabase = getServiceClient()

  if (routing.type === 'enquiry') {
    const { data: enquiry, error: enquiryError } = await supabase
      .from('contact_messages')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (enquiryError || !enquiry) {
      console.info('[inbound] enquiry not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    const { error: insertError } = await supabase
      .from('enquiry_messages')
      .insert({ enquiry_id: routing.id, direction: 'inbound', body, sent_by: null })

    if (insertError) {
      console.error('[inbound] enquiry insert failed:', insertError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  } else {
    const { data: comm, error: commError } = await supabase
      .from('communications')
      .select('id')
      .eq('id', routing.id)
      .single()

    if (commError || !comm) {
      console.info('[inbound] communication not found:', routing.id)
      return NextResponse.json({ ok: true })
    }

    // email.from may be "Name <addr>" or just "addr" — parse both
    const rawFrom: string = email.from ?? 'unknown@unknown'
    const fromMatch = rawFrom.match(/^(.+?)\s*<([^>]+)>$/)
    const fromEmail: string = fromMatch ? fromMatch[2] : rawFrom
    const fromName: string = fromMatch ? fromMatch[1].trim() : rawFrom

    const { error: insertError } = await supabase
      .from('communication_replies')
      .insert({ communication_id: routing.id, from_email: fromEmail, from_name: fromName, body })

    if (insertError) {
      console.error('[inbound] comm reply insert failed:', insertError)
      return NextResponse.json({ error: 'insert failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/email/inbound/route.ts
git commit -m "feat: extend inbound webhook to route comm replies to communication_replies"
```

---

## Task 3: Email helper

**Files:**
- Modify: `src/lib/email.ts`

Add `sendCommunicationEmail()` at the bottom of the file. Do not modify existing functions.

- [ ] **Step 1: Append to `src/lib/email.ts`**

```typescript
export async function sendCommunicationEmail({
  to,
  toName,
  communicationId,
  senderTitle,
  subject,
  body,
  attachmentUrls,
}: {
  to: string
  toName: string
  communicationId: string
  senderTitle: string
  subject: string
  body: string
  attachmentUrls: string[]
}): Promise<void> {
  await resend.emails.send({
    from: `${esc(senderTitle)} · Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>`,
    replyTo: `reply+comm-${communicationId}@winchburghspeakersclub.uk`,
    to,
    subject,
    html: `
      <p>Hi ${esc(toName)},</p>
      <p>${esc(body).replace(/\n/g, '<br/>')}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:12px">
        Winchburgh Speakers Club · 
        <a href="https://winchburghspeakersclub.uk" style="color:#94a3b8">winchburghspeakersclub.uk</a>
      </p>
    `,
    attachments: attachmentUrls.map(url => ({
      path: url,
      filename: url.split('/').pop() ?? 'attachment',
    })),
  })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add sendCommunicationEmail helper"
```

---

## Task 4: Server actions

**Files:**
- Create: `src/app/admin/communications/actions.ts`

Two actions: `uploadCommAttachment` (returns a public URL) and `sendCommunicationAction` (inserts rows + sends emails).

- [ ] **Step 1: Create `src/app/admin/communications/actions.ts`**

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendCommunicationEmail } from '@/lib/email'

const BUCKET = 'site-media'
const COMMS_PREFIX = 'comms-attachments'

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function uploadCommAttachment(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  await checkAdmin()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { url: null, error: 'No file provided' }
  if (file.size > 10 * 1024 * 1024) return { url: null, error: 'File must be under 10 MB' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${COMMS_PREFIX}/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = getServiceClient()
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return { url: null, error: `Upload failed: ${error.message}` }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
  return { url: publicUrl, error: null }
}

type Recipient = {
  email: string
  name: string
  recipient_type: 'member' | 'signup' | 'external'
  source_id?: string
}

export async function sendCommunicationAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await checkAdmin()
  const supabase = await createClient()

  const subject = (formData.get('subject') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()
  const senderTitle = (formData.get('sender_title') as string)?.trim()
  const recipientsJson = formData.get('recipients') as string
  const attachmentUrlsJson = (formData.get('attachment_urls') as string) || '[]'

  if (!subject) return { error: 'Subject is required.', success: false }
  if (!body) return { error: 'Body is required.', success: false }
  if (!senderTitle) return { error: 'Sender title is required.', success: false }

  let recipients: Recipient[]
  try {
    recipients = JSON.parse(recipientsJson)
  } catch {
    return { error: 'Invalid recipients data.', success: false }
  }

  if (!recipients.length) return { error: 'At least one recipient is required.', success: false }

  let attachmentUrls: string[]
  try {
    attachmentUrls = JSON.parse(attachmentUrlsJson)
  } catch {
    attachmentUrls = []
  }

  // Insert communications row (draft)
  const { data: comm, error: commError } = await supabase
    .from('communications')
    .insert({ subject, body, sender_title: senderTitle, sent_by: user.id, status: 'draft', attachment_urls: attachmentUrls })
    .select('id')
    .single()

  if (commError || !comm) {
    console.error('[sendComm] insert comm failed:', commError)
    return { error: 'Failed to create communication record.', success: false }
  }

  const communicationId: string = comm.id

  // Insert recipients
  const { error: recipError } = await supabase
    .from('communication_recipients')
    .insert(
      recipients.map(r => ({
        communication_id: communicationId,
        email: r.email,
        name: r.name,
        recipient_type: r.recipient_type,
        source_id: r.source_id ?? null,
      }))
    )

  if (recipError) {
    console.error('[sendComm] insert recipients failed:', recipError)
    return { error: 'Failed to save recipients.', success: false }
  }

  // Send emails
  let sendFailed = false
  for (const r of recipients) {
    try {
      await sendCommunicationEmail({
        to: r.email,
        toName: r.name,
        communicationId,
        senderTitle,
        subject,
        body,
        attachmentUrls,
      })
    } catch (err) {
      console.error(`[sendComm] email failed for ${r.email}:`, err)
      sendFailed = true
    }
  }

  // Update status to sent
  const { error: updateError } = await supabase
    .from('communications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', communicationId)

  if (updateError) {
    console.error('[sendComm] status update failed:', updateError)
  }

  revalidatePath('/admin/communications')

  if (sendFailed) {
    return { error: 'Communication saved but some emails failed to send. Check Resend logs.', success: true }
  }

  return { error: null, success: true }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/communications/actions.ts
git commit -m "feat: add communications server actions (upload attachment, send)"
```

---

## Task 5: Nav update

**Files:**
- Modify: `src/components/PortalNav.tsx`

Add "Communications" link between Enquiries and Media in the admin links section.

- [ ] **Step 1: Add the nav link**

In `src/components/PortalNav.tsx`, find this line:

```tsx
<Link href="/admin/media" style={activeStyle(pathname, '/admin/media')}>Media</Link>
```

Add the Communications link immediately before it:

```tsx
<Link href="/admin/communications" style={activeStyle(pathname, '/admin/communications')}>Communications</Link>
<Link href="/admin/media" style={activeStyle(pathname, '/admin/media')}>Media</Link>
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PortalNav.tsx
git commit -m "feat: add Communications link to admin nav"
```

---

## Task 6: Communications list page

**Files:**
- Create: `src/app/admin/communications/page.tsx`

- [ ] **Step 1: Create `src/app/admin/communications/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Communications | Admin' }

export default async function CommunicationsPage() {
  const supabase = await createClient()

  const { data: comms } = await supabase
    .from('communications')
    .select(`
      id, subject, sender_title, status, sent_at,
      communication_recipients(id),
      communication_replies(id)
    `)
    .order('sent_at', { ascending: false, nullsFirst: true })

  const rows = (comms ?? []).map(c => ({
    id: c.id as string,
    subject: c.subject as string,
    senderTitle: c.sender_title as string,
    status: c.status as string,
    sentAt: c.sent_at as string | null,
    recipientCount: (c.communication_recipients as { id: string }[]).length,
    replyCount: (c.communication_replies as { id: string }[]).length,
  }))

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: 0 }}>
          Communications
        </h1>
        <Link href="/admin/communications/compose" className="wsc-btn wsc-btn-primary wsc-btn-sm">
          Compose
        </Link>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ink-3)' }}>No communications sent yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Subject</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>From</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Recipients</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Sent</th>
              <th style={{ padding: '8px 12px', color: 'var(--ink-3)', fontWeight: 500 }}>Replies</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '10px 12px' }}>
                  <Link href={`/admin/communications/${row.id}`} style={{ color: 'var(--clay)', fontWeight: 500 }}>
                    {row.subject}
                  </Link>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.senderTitle}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>{row.recipientCount}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                  {row.sentAt
                    ? new Date(row.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>Draft</span>}
                </td>
                <td style={{ padding: '10px 12px', color: row.replyCount > 0 ? 'var(--clay)' : 'var(--ink-4)' }}>
                  {row.replyCount}
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

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify**

```bash
npm run dev
```

Navigate to `http://localhost:3000/admin/communications`. Expected: page renders with "Communications" heading, "Compose" button, and empty state message.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/communications/page.tsx
git commit -m "feat: add communications list page"
```

---

## Task 7: Recipient picker client component

**Files:**
- Create: `src/app/admin/communications/compose/ComposeForm.tsx`

This is the main compose UI — a client component that handles recipient management, attachment uploads, and form submission via `useActionState`.

- [ ] **Step 1: Create `src/app/admin/communications/compose/ComposeForm.tsx`**

```typescript
'use client'
import { useActionState, useState, useRef } from 'react'
import { sendCommunicationAction, uploadCommAttachment } from '../actions'

const SENDER_TITLES = [
  'President',
  'Vice President',
  'Education Director',
  'Club Secretary',
  'Social Secretary',
  'Development Manager',
  'Treasurer',
]

type RecipientEntry = {
  email: string
  name: string
  recipient_type: 'member' | 'signup' | 'external'
  source_id?: string
}

type MemberOption = { id: string; name: string; email: string }
type SignupOption = { id: string; name: string; email: string }
type EnquirerOption = { id: string; name: string; email: string }
type MediaOption = { key: string; url: string; label: string }

const initial = { error: null, success: false }

export default function ComposeForm({
  members,
  signups,
  enquirers,
  mediaOptions,
}: {
  members: MemberOption[]
  signups: SignupOption[]
  enquirers: EnquirerOption[]
  mediaOptions: MediaOption[]
}) {
  const [state, formAction, pending] = useActionState(sendCommunicationAction, initial)
  const [recipients, setRecipients] = useState<RecipientEntry[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [extName, setExtName] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addGroup(group: 'members' | 'signups' | 'enquirers') {
    const source: RecipientEntry[] =
      group === 'members'
        ? members.map(m => ({ email: m.email, name: m.name, recipient_type: 'member', source_id: m.id }))
        : group === 'signups'
        ? signups.map(s => ({ email: s.email, name: s.name, recipient_type: 'signup', source_id: s.id }))
        : enquirers.map(e => ({ email: e.email, name: e.name, recipient_type: 'external', source_id: e.id }))

    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email))
      return [...prev, ...source.filter(r => !existing.has(r.email))]
    })
  }

  function removeRecipient(email: string) {
    setRecipients(prev => prev.filter(r => r.email !== email))
  }

  function addExternal() {
    const trimEmail = extEmail.trim()
    const trimName = extName.trim() || trimEmail
    if (!trimEmail || !trimEmail.includes('@')) return
    if (recipients.some(r => r.email === trimEmail)) return
    setRecipients(prev => [...prev, { email: trimEmail, name: trimName, recipient_type: 'external' }])
    setExtName('')
    setExtEmail('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadCommAttachment(fd)
    setUploading(false)
    if (result.error || !result.url) {
      setUploadError(result.error ?? 'Upload failed')
      return
    }
    setAttachmentUrls(prev => [...prev, result.url!])
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleMedia(url: string) {
    setSelectedMedia(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const allAttachmentUrls = [...attachmentUrls, ...Array.from(selectedMedia)]

  if (state.success && !state.error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink)', fontSize: 18, fontFamily: 'var(--serif)' }}>Communication sent.</p>
        <a href="/admin/communications" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ marginTop: '1rem', display: 'inline-block' }}>
          View all communications
        </a>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}
    >
      {/* hidden fields */}
      <input type="hidden" name="recipients" value={JSON.stringify(recipients)} />
      <input type="hidden" name="attachment_urls" value={JSON.stringify(allAttachmentUrls)} />

      {/* Subject */}
      <div>
        <label className="wsc-label" htmlFor="comm-subject">Subject</label>
        <input id="comm-subject" name="subject" className="wsc-input" type="text" required placeholder="Email subject line" />
      </div>

      {/* Sender title */}
      <div>
        <label className="wsc-label" htmlFor="comm-title">Sender title</label>
        <select id="comm-title" name="sender_title" className="wsc-input" required>
          <option value="">Select a title…</option>
          {SENDER_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Body */}
      <div>
        <label className="wsc-label" htmlFor="comm-body">Message</label>
        <textarea id="comm-body" name="body" className="wsc-input wsc-textarea" rows={8} required placeholder="Write your message…" />
      </div>

      {/* Recipients */}
      <div>
        <label className="wsc-label">Recipients</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('members')}>
            + All active members ({members.length})
          </button>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('signups')}>
            + Past signups ({signups.length})
          </button>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('enquirers')}>
            + Past enquirers ({enquirers.length})
          </button>
        </div>

        {recipients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--rule-soft)', borderRadius: 6, padding: 8 }}>
            {recipients.map(r => (
              <div key={r.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span>
                  <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{r.name}</span>
                  <span style={{ color: 'var(--ink-4)', marginLeft: 6 }}>{r.email}</span>
                  <span className={`wsc-tag ${r.recipient_type === 'member' ? 'wsc-tag-sage' : r.recipient_type === 'signup' ? 'wsc-tag-gold' : ''}`} style={{ marginLeft: 6 }}>
                    {r.recipient_type}
                  </span>
                </span>
                <button type="button" onClick={() => removeRecipient(r.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="wsc-label" htmlFor="ext-name" style={{ fontSize: 12 }}>Name</label>
            <input id="ext-name" className="wsc-input" value={extName} onChange={e => setExtName(e.target.value)} placeholder="External person" />
          </div>
          <div style={{ flex: 2 }}>
            <label className="wsc-label" htmlFor="ext-email" style={{ fontSize: 12 }}>Email</label>
            <input id="ext-email" className="wsc-input" type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={addExternal} style={{ marginBottom: 1 }}>Add</button>
        </div>

        {recipients.length === 0 && (
          <p style={{ color: 'var(--ink-4)', fontSize: 13, marginTop: 8 }}>No recipients selected.</p>
        )}
        {recipients.length > 0 && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 8 }}>{recipients.length} recipient{recipients.length !== 1 ? 's' : ''} selected.</p>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="wsc-label">Attachments</label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label className="wsc-label" style={{ fontSize: 12 }}>Upload new file (max 10 MB)</label>
            <input ref={fileRef} type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'block' }} />
            {uploading && <p style={{ color: 'var(--ink-4)', fontSize: 13, marginTop: 4 }}>Uploading…</p>}
            {uploadError && <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, marginTop: 4 }}>{uploadError}</p>}
          </div>

          {mediaOptions.length > 0 && (
            <div>
              <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => setShowMedia(v => !v)}>
                {showMedia ? 'Hide' : 'Pick from'} media library ({mediaOptions.length} items)
              </button>
              {showMedia && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {mediaOptions.map(m => (
                    <label key={m.url} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={selectedMedia.has(m.url)} onChange={() => toggleMedia(m.url)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {allAttachmentUrls.length > 0 && (
            <ul style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, paddingLeft: 16 }}>
              {allAttachmentUrls.map(url => (
                <li key={url}>{url.split('/').pop()}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Errors */}
      {state.error && (
        <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
      )}

      <div>
        <button type="submit" className="wsc-btn wsc-btn-primary" disabled={pending || uploading}>
          {pending ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/communications/compose/ComposeForm.tsx
git commit -m "feat: add ComposeForm client component with recipient picker and attachment support"
```

---

## Task 8: Compose page (server wrapper)

**Files:**
- Create: `src/app/admin/communications/compose/page.tsx`

Server component that fetches members, signups, enquirers, and media, then renders ComposeForm.

- [ ] **Step 1: Create `src/app/admin/communications/compose/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Link from 'next/link'
import ComposeForm from './ComposeForm'

export const metadata = { title: 'Compose Communication | Admin' }

export default async function ComposePage() {
  const supabase = await createClient()
  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`

  const [{ data: profiles }, { data: signups }, { data: enquiries }, { data: media }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, contact_email')
      .eq('is_active', true)
      .not('contact_email', 'is', null)
      .order('full_name'),
    supabase
      .from('signups')
      .select('id, first_name, last_name, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_messages')
      .select('id, name, email')
      .not('email', 'is', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('media')
      .select('key, storage_path, alt_text'),
  ])

  const members = (profiles ?? []).map(p => ({
    id: p.id as string,
    name: p.full_name as string,
    email: p.contact_email as string,
  }))

  const signupList = (signups ?? []).map(s => ({
    id: s.id as string,
    name: `${s.first_name as string} ${s.last_name as string ?? ''}`.trim(),
    email: s.email as string,
  }))

  const enquirerList = (enquiries ?? []).map(e => ({
    id: e.id as string,
    name: e.name as string,
    email: e.email as string,
  }))

  const mediaOptions = (media ?? []).map(m => ({
    key: m.key as string,
    url: `${bucketUrl}/${m.storage_path as string}`,
    label: (m.alt_text as string) || (m.key as string),
  }))

  return (
    <div>
      <EyebrowLabel>Admin · <Link href="/admin/communications">Communications</Link></EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>
        New Communication
      </h1>
      <ComposeForm
        members={members}
        signups={signupList}
        enquirers={enquirerList}
        mediaOptions={mediaOptions}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify compose page**

Navigate to `http://localhost:3000/admin/communications/compose`. Expected:
- Form renders with Subject, Sender title dropdown, Message textarea
- "All active members", "Past signups", "Past enquirers" group buttons show correct counts
- Adding external email/name and clicking "Add" adds to the recipient list
- Clicking × removes a recipient

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/communications/compose/page.tsx
git commit -m "feat: add compose page (server wrapper with member/signup/enquirer data)"
```

---

## Task 9: Communication detail page

**Files:**
- Create: `src/app/admin/communications/[id]/page.tsx`

Shows the communication metadata, recipient list, and reply thread.

- [ ] **Step 1: Create `src/app/admin/communications/[id]/page.tsx`**

```typescript
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EyebrowLabel from '@/components/ui/EyebrowLabel'

export const metadata = { title: 'Communication | Admin' }

export default async function CommunicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: comm }, { data: recipients }, { data: replies }] = await Promise.all([
    supabase
      .from('communications')
      .select('id, subject, body, sender_title, sent_at, status, attachment_urls')
      .eq('id', id)
      .single(),
    supabase
      .from('communication_recipients')
      .select('id, name, email, recipient_type')
      .eq('communication_id', id)
      .order('name'),
    supabase
      .from('communication_replies')
      .select('id, from_name, from_email, body, received_at')
      .eq('communication_id', id)
      .order('received_at', { ascending: true }),
  ])

  if (!comm) notFound()

  const attachmentUrls: string[] = (comm.attachment_urls as string[]) ?? []

  return (
    <div style={{ maxWidth: 760 }}>
      <EyebrowLabel>Admin · <Link href="/admin/communications">Communications</Link></EyebrowLabel>

      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 28, margin: '8px 0 4px' }}>
        {comm.subject as string}
      </h1>

      <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 24px' }}>
        From: <strong>{comm.sender_title as string} · Winchburgh Speakers Club</strong>
        {comm.sent_at && (
          <> · {new Date(comm.sent_at as string).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
        )}
      </p>

      {/* Body */}
      <div style={{ background: 'var(--paper-2)', border: '1px solid var(--rule-soft)', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--ink-2)', fontSize: 14 }}>
          {comm.body as string}
        </p>
      </div>

      {/* Attachments */}
      {attachmentUrls.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>Attachments</h2>
          <ul style={{ fontSize: 13, paddingLeft: 16, color: 'var(--clay)' }}>
            {attachmentUrls.map(url => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipients */}
      <details style={{ marginBottom: 24 }}>
        <summary style={{ cursor: 'pointer', fontSize: 14, color: 'var(--ink-3)', marginBottom: 8 }}>
          {(recipients ?? []).length} recipient{(recipients ?? []).length !== 1 ? 's' : ''}
        </summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {(recipients ?? []).map(r => (
            <div key={r.id as string} style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              <strong>{r.name as string}</strong> · {r.email as string}
              <span className={`wsc-tag ${(r.recipient_type as string) === 'member' ? 'wsc-tag-sage' : (r.recipient_type as string) === 'signup' ? 'wsc-tag-gold' : ''}`} style={{ marginLeft: 6 }}>
                {r.recipient_type as string}
              </span>
            </div>
          ))}
        </div>
      </details>

      {/* Reply thread */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
        Replies {(replies ?? []).length > 0 && <span style={{ color: 'var(--clay)' }}>({replies!.length})</span>}
      </h2>

      {(replies ?? []).length === 0 ? (
        <p style={{ color: 'var(--ink-4)', fontSize: 14 }}>No replies yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(replies ?? []).map(r => (
            <div
              key={r.id as string}
              style={{
                alignSelf: 'flex-start',
                maxWidth: '80%',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-4)', marginBottom: 4, flexWrap: 'wrap' }}>
                <span><strong>{r.from_name as string}</strong></span>
                <span>·</span>
                <span>{r.from_email as string}</span>
                <span>·</span>
                <span>
                  {new Date(r.received_at as string).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                {r.body as string}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start dev server and verify end-to-end**

1. Navigate to `/admin/communications/compose`
2. Fill in subject ("Test communication"), select a sender title, write a body
3. Add yourself as an external recipient (use your own email)
4. Click Send — page should show "Communication sent."
5. Navigate to `/admin/communications` — row should appear
6. Click the subject — detail page should show the communication and "No replies yet."
7. Reply to the email you received — reply should appear in the thread after the inbound webhook fires (may take 1-2 minutes via Resend inbound processing)

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/communications/[id]/page.tsx
git commit -m "feat: add communication detail page with recipient list and reply thread"
```

---

## Post-implementation checklist

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] Compose → send to yourself → email received with correct From name and Reply-To
- [ ] Reply to the email → reply appears in the `/admin/communications/[id]` thread
- [ ] List page shows recipient count and reply count correctly
- [ ] Attachment upload works (new file) and attachment appears in received email
- [ ] Media library picker shows existing media items and includes them as attachments
- [ ] Removing recipients with × works before submit
- [ ] External email add validates the `@` character
