# Enquiry Inbound Replies — Design Spec

**Issue:** #63
**Date:** 2026-06-17
**Status:** Approved

## Summary

When an admin sends a reply to an enquirer, the enquirer can reply back via email. Those replies are captured by Resend's inbound email feature, delivered to a webhook, and stored as `inbound` rows in `enquiry_messages`. They appear in the conversation thread on the admin's enquiry card automatically, alongside outbound messages already built in #62.

---

## How It Fits Together

Issue #62 built the outbound half:
- Admin sends a message → stored as `direction: 'outbound'` in `enquiry_messages`
- `Reply-To` header is currently set to `replies@winchburghspeakersclub.uk`

Issue #63 closes the loop:
- Enquirer hits reply in their email client → email goes to `reply+{enquiry_id}@winchburghspeakersclub.uk`
- Resend receives it via MX, fires webhook to `/api/email/inbound`
- Webhook parses the enquiry ID from the address, stores `direction: 'inbound'`
- Thread on the enquiry card updates on next page load

---

## Resend Setup (one-time, manual)

Before the webhook handler can be wired up, these steps must be done in the Resend dashboard:

1. **Navigate to Emails → Receiving** (separate from the Domains page)
2. Click the more options button → **"Inbound address"** → select `winchburghspeakersclub.uk` as the custom domain (MX records already added to Cloudflare)
3. Navigate to **Webhooks** → **Add Webhook**:
   - Endpoint URL: `https://winchburghspeakersclub.uk/api/email/inbound`
   - Event: `email.received`

That is the entirety of the Resend configuration. All routing logic lives in the webhook handler.

---

## Email Change: Plus Addressing in Reply-To

The current `sendEnquiryReply` function sets:
```ts
replyTo: 'replies@winchburghspeakersclub.uk'
```

This needs to change to encode the enquiry ID:
```ts
replyTo: `reply+${enquiryId}@winchburghspeakersclub.uk`
```

### Signature change

```ts
export async function sendEnquiryReply(
  to: string,
  enquirerName: string,
  adminName: string,
  body: string,
  originalMessage: string,
  enquiryId: string,   // NEW — used to build reply-to address
): Promise<void>
```

### Call-site change in `sendEnquiryMessage` action

```ts
await sendEnquiryReply(enquiry.email, enquiry.name, adminName, body, enquiry.message, enquiryId)
```

No other changes to `email.ts` or the action. The thread display already renders inbound rows (left-aligned, neutral background) — that was built speculatively in #62.

---

## Webhook Handler

### Route

`src/app/api/email/inbound/route.ts` — Next.js App Router API route.

### Security

Resend signs all webhook payloads. Verify the signature before processing:

```ts
import { Webhook } from 'svix'

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
wh.verify(rawBody, headers)   // throws on invalid signature
```

`RESEND_WEBHOOK_SECRET` is obtained from the Resend dashboard when creating the webhook. Add it to `.env.local` and Vercel env vars.

### Processing logic

```
1. Read raw body as text (needed for signature verification)
2. Verify svix signature — return 400 if invalid
3. Parse JSON payload
4. If event type is not 'email.received', return 200 (no-op — Resend may send other event types)
5. Extract the 'to' address(es) from the payload
6. Find the address matching the pattern: reply+<uuid>@winchburghspeakersclub.uk
7. If no matching address found, return 200 (email sent to wrong address, ignore gracefully)
8. Extract the UUID — validate it's a valid UUID format, return 200 if not
9. Verify the enquiry exists in contact_messages (use service role — no auth context in webhook)
10. If not found, return 200 (deleted enquiry, ignore gracefully)
11. Extract plain text body from payload — trim quoted reply content (see below)
12. Insert into enquiry_messages: { enquiry_id, direction: 'inbound', body, sent_by: null }
13. Return 200
```

### Quoted reply stripping

Email clients append the previous message as a quoted block (e.g., `> On 17 Jun, Admin wrote:`). We strip this to keep stored messages clean:

```ts
function stripQuotedReply(text: string): string {
  // Most clients use one of these markers
  const markers = [
    /\r?\n[-]{2,}\r?\nOn .+ wrote:/m,      // Gmail / Outlook "On DATE, NAME wrote:"
    /\r?\n>[ ]?.+/m,                        // Bare quote lines starting with >
    /\r?\nFrom:[ ].+/m,                     // Forwarded / Outlook header
  ]
  for (const marker of markers) {
    const idx = text.search(marker)
    if (idx !== -1) return text.slice(0, idx).trim()
  }
  return text.trim()
}
```

If stripping produces an empty string (edge case: enquirer replied only with quoted text), store the full body instead of discarding the message.

### Payload shape (Resend `email.received` event)

```ts
type InboundPayload = {
  type: 'email.received'
  data: {
    from: string          // "Jane Smith <jane@example.com>"
    to: string[]          // ["reply+<uuid>@winchburghspeakersclub.uk"]
    subject: string
    text: string | null   // plain text body
    html: string | null   // HTML body (not stored)
  }
}
```

Use `data.text` as the body source. If `text` is null, fall back to a brief note (`"[No plain-text body]"`) rather than parsing HTML.

---

## Data Layer

No schema changes. The `enquiry_messages` table already has:
- `direction text check (direction in ('outbound', 'inbound'))`
- `sent_by uuid references auth.users(id)` — nullable, so `null` is correct for inbound rows

The service role client must be used in the webhook (no auth session in API routes called by Resend).

---

## UI

No UI changes required. `EnquiryMessageForm` already renders inbound messages:
- Left-aligned
- Neutral `--paper-2` background
- Shows `profiles?.full_name ?? 'Winchburgh Speakers Club'` as sender name

For inbound rows `sent_by` is `null`, so `profiles` join returns `null`, and the fallback renders as `"Winchburgh Speakers Club"` — acceptable for now. A future improvement could show the enquirer's name, but that's out of scope here.

---

## Environment Variables

| Variable | Where | Value |
|---|---|---|
| `RESEND_WEBHOOK_SECRET` | `.env.local` + Vercel | From Resend dashboard → Webhooks → signing secret |

---

## Dependencies

`svix` is Resend's recommended library for webhook signature verification. It is also used by Clerk; check if it's already installed before adding it.

```bash
npm install svix
```

---

## Scope Boundaries

- No email-to-email threading (we don't reply back to the enquirer automatically on inbound)
- No push notification or badge on inbound receipt — admin sees it on next page load
- No deduplication of webhook retries — Resend retries on non-2xx; inserting a duplicate message is acceptable at this volume (no unique constraint needed)
- No HTML body parsing — plain text only
- No admin notification email on inbound reply — could be added later, not in scope

---

## Pre-requisites for Implementation

1. Resend dashboard: configure receiving domain + webhook (manual step, see "Resend Setup" above)
2. Obtain `RESEND_WEBHOOK_SECRET` and add to `.env.local` + Vercel
3. Verify `svix` is available or install it
