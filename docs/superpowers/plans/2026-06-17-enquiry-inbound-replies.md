# Enquiry Inbound Replies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture email replies from enquirers and store them as inbound messages in the conversation thread, closing the loop on the two-way messaging feature built in #62.

**Architecture:** Resend receives the email via MX, fires a webhook to `/api/email/inbound`. The handler verifies the svix signature, parses the enquiry ID from the plus-addressed `to` field, strips quoted reply content, and inserts an `inbound` row into `enquiry_messages`. The UI already renders inbound rows — no UI changes needed.

**Tech Stack:** Next.js App Router API route, Supabase service role client, Resend inbound webhook, svix signature verification

**Spec:** `docs/superpowers/specs/2026-06-17-enquiry-inbound-replies-design.md`

---

### Task 1: Install svix and add RESEND_WEBHOOK_SECRET to .env.local

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install svix**

```bash
npm install svix
```

Expected: `svix` appears in `package.json` dependencies.

- [ ] **Step 2: Add the webhook secret to .env.local**

Open `.env.local` and add:

```
RESEND_WEBHOOK_SECRET=your_signing_secret_from_resend_dashboard
```

The signing secret is found in the Resend dashboard under Webhooks → the webhook you created → Signing Secret.

Note: This value is already in Vercel env vars (user confirmed). It only needs to be in `.env.local` for local development testing.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install svix for webhook signature verification"
```

Do not commit `.env.local`.

---

### Task 2: Update sendEnquiryReply to use plus addressing

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add `enquiryId` parameter to `sendEnquiryReply`**

Current signature (lines 36–58 of `src/lib/email.ts`):

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
    replyTo: 'replies@winchburghspeakersclub.uk',
    ...
  })
}
```

Replace with:

```ts
export async function sendEnquiryReply(
  to: string,
  enquirerName: string,
  adminName: string,
  body: string,
  originalMessage: string,
  enquiryId: string,
): Promise<void> {
  await resend.emails.send({
    from: `${esc(adminName)} · Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>`,
    replyTo: `reply+${enquiryId}@winchburghspeakersclub.uk`,
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

- [ ] **Step 2: Update the call-site in `src/app/admin/enquiries/actions.ts`**

Find the `sendEnquiryReply` call (inside `sendEnquiryMessage`):

```ts
await sendEnquiryReply(enquiry.email, enquiry.name, adminName, body, enquiry.message)
```

Replace with:

```ts
await sendEnquiryReply(enquiry.email, enquiry.name, adminName, body, enquiry.message, enquiryId)
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts src/app/admin/enquiries/actions.ts
git commit -m "feat: encode enquiry ID in reply-to address for inbound routing"
```

---

### Task 3: Create the inbound webhook handler

**Files:**
- Create: `src/app/api/email/inbound/route.ts`

- [ ] **Step 1: Create the directory and file**

Create `src/app/api/email/inbound/route.ts` with the following content:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/utils/supabase/service'

const RECEIVING_DOMAIN = 'winchburghspeakersclub.uk'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function stripQuotedReply(text: string): string {
  const markers = [
    /\r?\n[-]{2,}\r?\nOn .+ wrote:/m,
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

function extractEnquiryId(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    // addr may be "Name <reply+uuid@domain>" or just "reply+uuid@domain"
    const match = addr.match(/reply\+([^@]+)@(.+)/)
    if (!match) continue
    const [, id, domain] = match
    if (domain !== RECEIVING_DOMAIN) continue
    if (!UUID_RE.test(id)) continue
    return id
  }
  return null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[inbound] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  try {
    const wh = new Webhook(secret)
    wh.verify(rawBody, headers)
  } catch {
    console.warn('[inbound] signature verification failed')
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody) as {
    type: string
    data?: {
      to?: string[]
      text?: string | null
    }
  }

  if (payload.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const toAddresses = payload.data?.to ?? []
  const enquiryId = extractEnquiryId(toAddresses)

  if (!enquiryId) {
    console.info('[inbound] no matching plus-address found in:', toAddresses)
    return NextResponse.json({ ok: true })
  }

  const supabase = createServiceClient()

  const { data: enquiry, error: enquiryError } = await supabase
    .from('contact_messages')
    .select('id')
    .eq('id', enquiryId)
    .single()

  if (enquiryError || !enquiry) {
    console.info('[inbound] enquiry not found:', enquiryId)
    return NextResponse.json({ ok: true })
  }

  const rawText = payload.data?.text ?? null
  const body = rawText ? stripQuotedReply(rawText) : '[No plain-text body]'

  const { error: insertError } = await supabase
    .from('enquiry_messages')
    .insert({
      enquiry_id: enquiryId,
      direction: 'inbound',
      body,
      sent_by: null,
    })

  if (insertError) {
    console.error('[inbound] insert failed:', insertError)
    return NextResponse.json({ error: 'insert failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Verify that `createServiceClient` exists at `@/utils/supabase/service`**

```bash
find /Users/iangore/Documents/Claude/Projects/Speakers\ Club/Website/speakers-club-portal/src -name "service.ts" | head -5
```

If the file does not exist, check what the service role client import path is in `src/app/admin/enquiries/actions.ts` and use that same import in the route. If it exports a function that requires `await`, add `await` to the `createServiceClient()` call in the route.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/email/inbound/route.ts
git commit -m "feat: add inbound email webhook handler for enquiry replies"
```

---

### Task 4: Smoke test and PR

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify TypeScript build is clean**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test the outbound path**

1. Open `/admin/enquiries` in the browser
2. Send a message to a test enquiry
3. Check the email received — verify `Reply-To` header is `reply+{uuid}@winchburghspeakersclub.uk` (check email headers in the client or Resend dashboard Logs)

- [ ] **Step 4: Test the webhook handler locally (optional)**

Use the Resend CLI or ngrok to forward a test `email.received` webhook event to `localhost:3000/api/email/inbound`. Alternatively, deploy to Vercel and test via the real domain.

- [ ] **Step 5: Open a PR and merge**

```bash
git checkout -b feat/issue-63-enquiry-inbound-replies
gh pr create \
  --title "feat: capture inbound email replies from enquirers (#63)" \
  --body "$(cat <<'EOF'
## Summary
- Installs svix for Resend webhook signature verification
- Updates `sendEnquiryReply` to encode the enquiry ID in the Reply-To address (`reply+{uuid}@domain`)
- Adds `/api/email/inbound` webhook handler: verifies signature, parses plus address, strips quoted reply text, inserts `inbound` row into `enquiry_messages`
- No DB changes — table already supports `inbound` direction
- No UI changes — thread already renders inbound bubbles left-aligned

## Test plan
- [ ] Send a message from admin panel, verify Reply-To header contains enquiry UUID
- [ ] Trigger a test inbound webhook event and verify row appears in `enquiry_messages`
- [ ] Verify inbound message appears in admin thread on next page load
- [ ] Verify invalid signature returns 400
- [ ] Verify unknown enquiry ID returns 200 silently

Closes #63
EOF
)"
gh pr merge --squash --delete-branch
```

- [ ] **Step 6: Close the issue**

```bash
gh issue close 63
```
