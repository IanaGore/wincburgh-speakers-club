# External Correspondence — Design Spec

**Date:** 2026-06-18
**Status:** Approved for implementation

## Overview

Capture emails sent to `president@winchburghspeakersclub.uk` into the admin portal so the secretary can review, reply, and track them through a workflow. Replies go out from `president@winchburghspeakersclub.uk` and thread back into the portal automatically.

AGM reporting is out of scope for this phase.

---

## Data Model

### `external_correspondence`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `subject` | text NOT NULL | email subject line |
| `from_email` | text NOT NULL | sender email address |
| `from_name` | text NOT NULL DEFAULT '' | sender display name |
| `status` | text NOT NULL DEFAULT 'open' | CHECK IN ('open', 'in_progress', 'closed') |
| `received_at` | timestamptz NOT NULL DEFAULT now() | time of first inbound email |

### `correspondence_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `correspondence_id` | UUID NOT NULL FK → `external_correspondence.id` ON DELETE CASCADE | |
| `direction` | text NOT NULL | CHECK IN ('inbound', 'outbound') |
| `body` | text NOT NULL | plain-text message body, quoted reply stripped |
| `from_email` | text NOT NULL | sender address (inbound: original sender; outbound: president@) |
| `from_name` | text NOT NULL DEFAULT '' | display name |
| `sent_at` | timestamptz NOT NULL DEFAULT now() | |
| `sent_by` | UUID nullable FK → `auth.users.id` | populated for outbound only |

RLS: admin-only read/write on both tables (same policy pattern as `communications`).

---

## Inbound Routing

No Resend configuration changes are required. The existing domain-level catch-all already delivers every email to `winchburghspeakersclub.uk` to the webhook at `/api/email/inbound/route.ts`.

The webhook's `extractRoutingId` function gains two new match arms (checked before existing `reply+` patterns):

1. **New thread** — `to` contains `president@winchburghspeakersclub.uk`
   - Returns `{ type: 'correspondence_new' }`
   - Webhook creates a new `external_correspondence` row and a first `correspondence_messages` row (`direction: 'inbound'`)

2. **Reply to existing thread** — `to` contains `reply+corr-{uuid}@winchburghspeakersclub.uk`
   - Returns `{ type: 'correspondence_reply', id: uuid }`
   - Webhook appends a new `correspondence_messages` row (`direction: 'inbound'`) to the existing thread

The full email body is fetched via `resend.emails.receiving.get(email_id)` (existing pattern). Quoted reply text is stripped with the existing `stripQuotedReply` helper.

---

## Outbound Replies

A new server action `sendCorrespondenceReply(correspondenceId, body)`:

1. Looks up the `external_correspondence` row to get `from_email`, `from_name`, `subject`
2. Sends via Resend:
   - `from`: `Winchburgh Speakers Club <president@winchburghspeakersclub.uk>`
   - `to`: original sender
   - `subject`: `Re: {original subject}`
   - `reply_to`: `reply+corr-{correspondence_id}@winchburghspeakersclub.uk`
3. Inserts an outbound `correspondence_messages` row with the authenticated admin's `sent_by`

---

## Admin UI

### `/admin/correspondence` — List page

- Filterable by status: All / Open / In Progress / Closed (tab strip, same pattern as enquiries)
- Table columns: Subject, From, Received, Status badge
- Rows sorted by `received_at` descending
- Nav link added to `PortalNav.tsx` (alongside Communications)

### `/admin/correspondence/[id]` — Thread detail page

- Header: subject, from name + email, received date, current status badge
- Status action buttons: contextual based on current status
  - Open → "Mark In Progress" | "Close"
  - In Progress → "Reopen" | "Close"
  - Closed → "Reopen"
- Status changes via a server action `updateCorrespondenceStatus(id, status)`
- Thread: chronological list of `correspondence_messages`
  - Inbound: left-aligned, dark background
  - Outbound: right-aligned, accent background
- Reply form at bottom: textarea + Send button, labelled "sending as president@winchburghspeakersclub.uk"

---

## Files Changed / Created

| File | Change |
|------|--------|
| `src/app/api/email/inbound/route.ts` | Extend `extractRoutingId` + add correspondence routing logic |
| `src/app/admin/correspondence/page.tsx` | New list page |
| `src/app/admin/correspondence/[id]/page.tsx` | New thread detail page |
| `src/app/admin/correspondence/[id]/StatusButtons.tsx` | Client component for status controls |
| `src/app/admin/correspondence/actions.ts` | `sendCorrespondenceReply`, `updateCorrespondenceStatus` |
| `src/components/PortalNav.tsx` | Add Correspondence nav link |
| Supabase migration | `external_correspondence` + `correspondence_messages` tables + RLS |

---

## Out of Scope (This Phase)

- AGM reporting
- Email notifications to secretary on new correspondence
- Multiple receiving addresses (e.g. `secretary@`, `info@`)
- Attachment support
