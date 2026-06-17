# Enquiry Outbound Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compose panel and conversation thread to each enquiry card so admins can send emails to enquirers directly from the portal, with messages stored in a new `enquiry_messages` table.

**Architecture:** New `enquiry_messages` table with RLS. Server action verifies admin, sends via Resend, inserts the row, and auto-updates enquiry status. The messages fetch is joined into the existing enquiry query. A client component (`EnquiryMessageForm`) handles compose state with `useActionState`.

**Tech Stack:** Next.js App Router server actions, Supabase (anon client with RLS), Resend, React `useActionState`

**Spec:** `docs/superpowers/specs/2026-06-17-enquiry-outbound-messages-design.md`

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260617120000_enquiry_messages.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260617120000_enquiry_messages.sql

create table public.enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_messages(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  body text not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id)
);

alter table public.enquiry_messages enable row level security;

create policy "Admins only"
  on public.enquiry_messages
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
```

- [ ] **Step 2: Apply the migration**

```bash
cd speakers-club-portal
npx supabase db push
```

Expected: migration applies cleanly, `enquiry_messages` table visible in Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260617120000_enquiry_messages.sql
git commit -m "feat: add enquiry_messages table with RLS"
```

---

### Task 2: Fix FROM constant and add sendEnquiryReply to email.ts

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Fix the FROM constant (line 4)**

Change:
```ts
const FROM = 'West Lothian Speakers Club <noreply@winchburghspeakersclub.uk>'
```
To:
```ts
const FROM = 'Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>'
```

- [ ] **Step 2: Add sendEnquiryReply after the existing sendInviteEmail function**

```ts
export async function sendEnquiryReply(
  to: string,
  enquirerName: string,
  adminName: string,
  body: string,
  originalMessage: string,
): Promise<void> {
  await resend.emails.send({
    from: `${esc(adminName)} · Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>`,
    reply_to: 'replies@winchburghspeakersclub.uk',
    to,
    subject: 'Re: Your message to Winchburgh Speakers Club',
    html: `
      <p>Hi ${esc(enquirerName)},</p>
      <p>${esc(body).replace(/\n/g, '<br/>')}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:13px">Your original message:</p>
      <blockquote style="border-left:3px solid #e2e8f0;margin:0;padding:0 0 0 16px;color:#64748b;font-size:13px">
        ${esc(originalMessage).replace(/\n/g, '<br/>')}
      </blockquote>
    `,
  })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: fix club name in FROM and add sendEnquiryReply"
```

---

### Task 3: Add sendEnquiryMessage server action

**Files:**
- Modify: `src/app/admin/enquiries/actions.ts`

- [ ] **Step 1: Add the import for sendEnquiryReply at the top of actions.ts**

The file already imports `checkAdmin` and `createClient`. Add `sendEnquiryReply` to the email import:

```ts
import { sendEnquiryReply } from '@/lib/email'
```

Also ensure `revalidatePath` is imported (it already is via the existing actions).

- [ ] **Step 2: Add sendEnquiryMessage at the bottom of the file**

```ts
export async function sendEnquiryMessage(
  prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  await checkAdmin()
  const supabase = await createClient()

  const enquiryId = formData.get('enquiry_id') as string
  const body = (formData.get('body') as string)?.trim()

  if (!body) return { error: 'Message cannot be empty.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: enquiry } = await supabase
    .from('contact_messages')
    .select('name, email, message, status')
    .eq('id', enquiryId)
    .single()

  if (!enquiry) return { error: 'Enquiry not found.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminName = profile?.full_name ?? 'Winchburgh Speakers Club'

  try {
    await sendEnquiryReply(enquiry.email, enquiry.name, adminName, body, enquiry.message)
  } catch (err) {
    console.error('[sendEnquiryMessage] email failed:', err)
    return { error: 'Failed to send email. Please try again.' }
  }

  const { error: insertError } = await supabase
    .from('enquiry_messages')
    .insert({
      enquiry_id: enquiryId,
      direction: 'outbound',
      body,
      sent_by: user.id,
    })

  if (insertError) {
    console.error('[sendEnquiryMessage] insert failed:', insertError)
    return { error: 'Email sent but message could not be saved. Contact support.' }
  }

  if (enquiry.status === 'new') {
    await supabase
      .from('contact_messages')
      .update({ status: 'replied', handled_at: new Date().toISOString(), is_read: true })
      .eq('id', enquiryId)
  }

  revalidatePath('/admin/enquiries')
  return { error: null }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/enquiries/actions.ts
git commit -m "feat: add sendEnquiryMessage server action"
```

---

### Task 4: Create EnquiryMessageForm client component

**Files:**
- Create: `src/app/admin/enquiries/EnquiryMessageForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useActionState, useState, useEffect, useRef } from 'react'
import { sendEnquiryMessage } from './actions'

type Message = {
  id: string
  direction: string
  body: string
  sent_at: string
  profiles: { full_name: string } | null
}

const initial = { error: null }

export default function EnquiryMessageForm({
  enquiryId,
  messages,
}: {
  enquiryId: string
  messages: Message[]
}) {
  const [state, formAction, pending] = useActionState(sendEnquiryMessage, initial)
  const [successKey, setSuccessKey] = useState(0)
  const prevPending = useRef(false)

  useEffect(() => {
    if (prevPending.current && !pending && !state.error) {
      setSuccessKey(k => k + 1)
    }
    prevPending.current = pending
  }, [pending, state.error])

  return (
    <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1rem', marginTop: '0.5rem' }}>
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: msg.direction === 'outbound' ? 'var(--clay-soft)' : 'var(--paper-2)',
                border: '1px solid var(--rule-soft)',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-4)', marginBottom: 4 }}>
                <span>{msg.profiles?.full_name ?? 'Winchburgh Speakers Club'}</span>
                <span>·</span>
                <span>
                  {new Date(msg.sent_at).toLocaleString('en-GB', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--ink-2)' }}>
                {msg.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <form key={successKey} action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="hidden" name="enquiry_id" value={enquiryId} />
        <label className="wsc-label" htmlFor={`msg-${enquiryId}`}>Send a message</label>
        <textarea
          id={`msg-${enquiryId}`}
          name="body"
          className="wsc-input wsc-textarea"
          rows={4}
          placeholder="Type your message…"
          required
        />
        {state.error && (
          <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
        )}
        <div>
          <button type="submit" disabled={pending} className="wsc-btn wsc-btn-primary wsc-btn-sm">
            {pending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/enquiries/EnquiryMessageForm.tsx
git commit -m "feat: add EnquiryMessageForm client component"
```

---

### Task 5: Update enquiries page query and render

**Files:**
- Modify: `src/app/admin/enquiries/page.tsx`

- [ ] **Step 1: Add the EnquiryMessageForm import at the top of page.tsx**

```ts
import EnquiryMessageForm from './EnquiryMessageForm'
```

- [ ] **Step 2: Add a Message type near the top of the file (after the imports)**

```ts
type EnquiryMessage = {
  id: string
  direction: string
  body: string
  sent_at: string
  profiles: { full_name: string } | null
}
```

- [ ] **Step 3: Update the contact_messages query to join enquiry_messages**

In `page.tsx`, inside the `Promise.all([...])`, replace:

```ts
supabase
  .from('contact_messages')
  .select('*')
  .eq('status', mstatus)
  .order('created_at', { ascending: false }),
```

With:

```ts
supabase
  .from('contact_messages')
  .select('*, enquiry_messages(id, direction, body, sent_at, profiles(full_name))')
  .eq('status', mstatus)
  .order('created_at', { ascending: false }),
```

- [ ] **Step 4: Render EnquiryMessageForm inside each message card**

Inside `messages.map(...)`, after this closing tag:

```tsx
                  <div><button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Save notes</button></div>
                </form>
```

Add:

```tsx
<EnquiryMessageForm
  enquiryId={msg.id}
  messages={(
    ((msg.enquiry_messages as unknown as EnquiryMessage[]) ?? [])
      .slice()
      .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
  )}
/>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/enquiries/page.tsx
git commit -m "feat: join enquiry_messages in query and render compose panel"
```

---

### Task 6: Smoke test and PR

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Open `/admin/enquiries` and verify the Messages tab**

- Each message card has a "Send a message" textarea at the bottom
- Submit a test message — verify the button shows "Sending…" while in flight
- After send: textarea clears, no error shown
- The sent message appears in the thread above the compose form with the admin's name and timestamp
- If the enquiry was `new`, its status badge updates to `replied`

- [ ] **Step 3: Verify the email**

Check the inbox of the test enquirer email. Verify:
- From shows `{Admin Name} · Winchburgh Speakers Club`
- Subject is `Re: Your message to Winchburgh Speakers Club`
- Body contains the admin's message
- Original enquiry is quoted below a divider
- Reply-To is `replies@winchburghspeakersclub.uk`

- [ ] **Step 4: Open a PR and merge**

```bash
git checkout -b feat/issue-62-enquiry-outbound-messages
# (cherry-pick or rebase the feature commits onto this branch if needed)
gh pr create --title "feat: send outbound messages to enquirers from admin (#62)" \
  --body "Closes #62"
gh pr merge --squash --delete-branch
```
