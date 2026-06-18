# Communications Hub — Design Spec

## Overview

Admins can compose and send emails to a mixed recipient list (active members, past enquirers/signups, and free-text external addresses). Replies route back into the portal via the existing inbound webhook and appear as threaded conversations.

---

## Data Model

### `communications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `subject` | text | email subject line |
| `body` | text | plain text body |
| `sender_title` | text | cosmetic From display name (e.g. "President") |
| `sent_by` | uuid | → `auth.users.id` |
| `sent_at` | timestamptz | null until send completes |
| `status` | text | `'draft'` or `'sent'` |
| `attachment_urls` | text[] | Supabase Storage URLs |

### `communication_recipients`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `communication_id` | uuid | → `communications.id` |
| `email` | text | recipient email |
| `name` | text | display name |
| `recipient_type` | text | `'member'` \| `'signup'` \| `'external'` |
| `source_id` | uuid nullable | profile or signup UUID (for members/signups) |

### `communication_replies`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `communication_id` | uuid | → `communications.id` |
| `from_email` | text | sender's email |
| `from_name` | text | sender's display name from email headers |
| `body` | text | stripped reply body |
| `received_at` | timestamptz | default `now()` |

---

## Inbound Reply Routing

Plus-address convention: `reply+comm-{communication_id}@winchburghspeakersclub.uk`

The existing webhook at `/api/email/inbound/route.ts` is extended:

- `extractEnquiryId()` is renamed `extractRoutingId()` and returns `{ type: 'enquiry' | 'communication', id: string } | null`
- Regex matches both `reply+{uuid}@...` (enquiry) and `reply+comm-{uuid}@...` (communication)
- On `type === 'communication'`: fetch body via `resend.emails.receiving.get()`, strip quoted reply, insert into `communication_replies`

---

## UI

### Navigation

"Communications" added to the admin sidebar between Enquiries and Media.

### `/admin/communications` — List page

Table of sent communications:

| Subject | Sender title | Recipients | Sent | Replies |
|---------|-------------|------------|------|---------|
| ... | President | 24 | 18 Jun 2026 | 3 |

"Compose" button top-right.

### `/admin/communications/compose` — Compose page

Fields:

- **Subject** — text input, required
- **Sender title** — dropdown: President, Vice President, Education Director, Club Secretary, Social Secretary, Development Manager, Treasurer
- **Body** — plain textarea, required
- **Recipients** — recipient picker component (see below)
- **Attachments** — media library picker + new file upload

### Recipient Picker (client component)

Three-panel approach:

1. **Group selector** — checkboxes: "All active members", "Past enquirers", "Past signups". Selecting a group populates the resolved list.
2. **Resolved list** — individual entries with ×-remove. Each entry shows name + email + type badge.
3. **Add external** — name + email inputs, "Add" button appends to the resolved list.

The resolved list (email + name + type + optional source_id) is serialised and submitted with the form.

### `/admin/communications/[id]` — Detail page

- Communication metadata (subject, sender title, sent date)
- Recipient list (collapsible, shows count)
- Reply thread — same bubble UI style as enquiry threads; inbound bubbles left-aligned, sender identified by `from_name`/`from_email`

---

## Sending Logic

Server action in `src/app/admin/communications/actions.ts`:

1. Insert `communications` row (`status: 'draft'`)
2. Insert all `communication_recipients` rows
3. For each recipient, call `resend.emails.send()`:
   - `from`: `{sender_title} · Winchburgh Speakers Club <noreply@winchburghspeakersclub.uk>`
   - `replyTo`: `reply+comm-{communication_id}@winchburghspeakersclub.uk`
   - `to`: recipient email
   - Attachments: fetched from `attachment_urls` and passed as Resend attachment objects
4. Update `communications.status` to `'sent'`, set `sent_at`

Sending is sequential per recipient (appropriate for club-scale broadcasts of tens of recipients).

---

## Attachments

- **From media library**: reuse existing Supabase Storage URLs directly
- **New uploads on compose**: uploaded to the existing media bucket via a pre-signed URL before the send action runs; URLs stored in `attachment_urls`

---

## Supabase Migrations

```sql
-- communications
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

-- communication_recipients
create table communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  email text not null,
  name text not null,
  recipient_type text not null,
  source_id uuid
);

-- communication_replies
create table communication_replies (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  from_email text not null,
  from_name text not null,
  body text not null,
  received_at timestamptz not null default now()
);

-- RLS: admin-only reads/writes (service role bypasses for webhook inserts)
alter table communications enable row level security;
alter table communication_recipients enable row level security;
alter table communication_replies enable row level security;

create policy "admin read communications" on communications
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admin write communications" on communications
  for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admin read recipients" on communication_recipients
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admin write recipients" on communication_recipients
  for all using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "admin read replies" on communication_replies
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
```

---

## Files Touched

| File | Action |
|------|--------|
| `supabase/migrations/YYYYMMDD_communications.sql` | Create — three new tables + RLS |
| `src/app/api/email/inbound/route.ts` | Modify — extend routing to handle `comm-` prefix |
| `src/app/admin/communications/page.tsx` | Create — list page |
| `src/app/admin/communications/compose/page.tsx` | Create — compose page |
| `src/app/admin/communications/compose/RecipientPicker.tsx` | Create — recipient picker client component |
| `src/app/admin/communications/actions.ts` | Create — send server action |
| `src/app/admin/communications/[id]/page.tsx` | Create — detail + reply thread page |
| `src/components/AdminNav.tsx` (or equivalent nav file) | Modify — add Communications nav entry |
| `src/lib/email.ts` | Modify — add `sendCommunication()` helper |
