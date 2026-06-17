# Enquiry Outbound Messages — Design Spec

**Issue:** #62
**Date:** 2026-06-17
**Status:** Approved

## Summary

Add a compose panel and conversation thread to each enquiry card in `/admin/enquiries`. Admins can type and send a message to an enquirer directly from the portal. The message is delivered via Resend and stored in a new `enquiry_messages` table. The enquiry status auto-updates to `replied` on first send.

---

## Data Layer

### New table: `enquiry_messages`

```sql
create table public.enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_messages(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  body text not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id)
);

alter table public.enquiry_messages enable row level security;
create policy "Admins only" on public.enquiry_messages
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
```

- `direction` is constrained to `outbound` or `inbound`. Inbound rows are reserved for issue #63.
- `sent_by` is nullable to accommodate future inbound rows where there is no admin sender.
- Cascade delete ensures messages are removed if the parent enquiry is deleted.

### Query change in `admin/enquiries/page.tsx`

The existing `contact_messages` select gains a sub-select:

```ts
.select('*, enquiry_messages(id, direction, body, sent_at, profiles(full_name))')
.order('sent_at', { ascending: true, referencedTable: 'enquiry_messages' })
```

Messages load with the card — no second round-trip.

---

## Email

### Sender name fix

The `FROM` constant in `lib/email.ts` is corrected from:
```
West Lothian Speakers Club <noreply@winchburghspeakersclub.uk>
```
to:
```
Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>
```

This fixes the sender display name on all outgoing emails (invite, RSVP confirmation, contact notification).

### New function: `sendEnquiryReply`

```ts
sendEnquiryReply(
  to: string,           // enquirer email
  enquirerName: string, // enquirer first name
  adminName: string,    // full_name from profiles
  body: string,         // admin's message
  originalMessage: string // enquirer's original message body
): Promise<void>
```

- **From:** `{adminName} · Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>`
- **Reply-To:** `replies@winchburghspeakersclub.uk` (inbound plumbing for #63)
- **Subject:** `Re: Your message to Winchburgh Speakers Club`
- **Body:** Admin's message, followed by a quoted block (`> `) of the enquirer's original message

---

## Server Action

### `sendEnquiryMessage(enquiryId, body)` in `admin/enquiries/actions.ts`

Steps:
1. Verify admin via `checkAdmin()`
2. Load the enquiry — `name`, `email`, `message`, `status` — from `contact_messages`
3. Load the sending admin's `full_name` from `profiles`
4. Call `sendEnquiryReply`
5. Insert row into `enquiry_messages` with `direction: 'outbound'`, `sent_by: user.id`
6. If enquiry `status` is `'new'`, update to `'replied'`
7. `revalidatePath('/admin/enquiries')`

Email failure throws and surfaces to the UI — the message is not stored if the email fails, keeping the DB and email state in sync.

---

## UI

### Thread display

Above the compose form, render `enquiry_messages` in chronological order (oldest first). Each message:

- **Outbound:** right-aligned, clay-tinted background, shows admin name + timestamp
- **Inbound:** left-aligned, neutral background (layout ready for #63, no rows yet)
- Body rendered as `white-space: pre-wrap`
- Empty state: nothing rendered (compose form appears without preamble)

### Compose form: `EnquiryMessageForm` (client component)

- `<textarea>` for message body (4 rows, `wsc-input wsc-textarea`)
- "Send message" submit button (`wsc-btn wsc-btn-primary`)
- Uses `useActionState` for pending/error state
- Button shows "Sending…" and disables while pending
- Inline error message on failure
- Textarea clears on success

### Placement

Below the existing notes form on each message card in the Messages tab. Separated by a top border rule. Always visible (no toggle needed — the flow is short enough that hiding it adds friction).

---

## Scope Boundaries

- Inbound reply capture (webhook, parsing, storage) is issue #63 — not in scope here
- Thread display is ready for inbound rows structurally, but no inbound rows will exist until #63
- No pagination on the thread — not needed at this volume
- No rich text / markdown — plain text only

## Pre-requisites for Issue #63

No Resend configuration is needed for this issue — the `Reply-To` header is set regardless of whether the mailbox exists. When #63 is built, the following setup is required before the webhook can be wired up:

1. **MX records** — add Resend's inbound MX records to `winchburghspeakersclub.uk` at the DNS provider
2. **Resend inbound route** — configure `replies@winchburghspeakersclub.uk` → webhook URL (`/api/email/inbound`) in the Resend dashboard
3. **Webhook handler** — Next.js API route that parses the inbound payload, matches by sender email to an open enquiry, and inserts an `inbound` row into `enquiry_messages`
