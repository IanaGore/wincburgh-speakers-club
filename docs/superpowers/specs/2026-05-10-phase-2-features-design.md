# Phase 2 Features — Design Spec

**Date:** 2026-05-10  
**Branch:** feat/phase-1-redesign  
**Status:** Approved

## Scope

Four independent feature areas to be implemented as a single plan:

1. Email system (invite, RSVP confirmation, contact form notification)
2. Photo upload system (Supabase Storage + admin UI)
3. Public pages (`/about`, `/meetings`)
4. `/member/speeches` layout redesign

---

## 1. Email System

### Approach

Install the `resend` npm package. Create `src/lib/email.ts` — a shared utility with typed send functions. All three email triggers call this utility from their existing server actions.

### New env vars

| Var | Purpose |
|-----|---------|
| `RESEND_API_KEY` | Resend API authentication |
| `ADMIN_EMAIL` | Destination for contact form notifications |
| `NEXT_PUBLIC_SITE_URL` | Base URL for invite links (already referenced, must be set) |

### Email types

#### 1a. Invite to join

- **Trigger:** Admin clicks "Send Invite" on `/admin/signups`
- **Action:** Calls existing `sendConversionInvite` in `src/app/admin/signups/actions.ts`
- **Content:** Guest's first name, club name, `/join?token=…` link, token expiry date (7 days)
- **Recipient:** `signups.email`

**Abuse safeguards (DB migration required):**

Add to `signups` table:
- `invite_sent_at timestamptz` — timestamp of most recent invite send
- `invite_count integer not null default 0` — total invites sent for this signup

Server-side checks before sending:
1. Confirm calling user `is_admin = true` (double-check beyond RLS)
2. If `invite_count >= 3` → return error "Maximum invites reached for this signup"
3. If `invite_sent_at` is within 24 hours → return error "Please wait 24 hours before resending"
4. On success: increment `invite_count`, set `invite_sent_at = now()`, reset token + expiry

#### 1b. RSVP confirmation

- **Trigger:** Guest submits the signup form (`src/app/signup/actions.ts`)
- **Content:** Guest's first name, meeting date/time, venue address (from `site_settings`), "what to expect" brief, link back to homepage
- **Recipient:** `signups.email`
- **Failure handling:** Log error but do not fail the signup — the RSVP is saved regardless

#### 1c. Contact form notification

- **Trigger:** Contact form submit (`src/app/contact/actions.ts`)
- **Content:** Sender name, email, phone, topic, message body
- **Recipient:** `ADMIN_EMAIL` env var
- **Failure handling:** Log error but do not fail the form submission

### `src/lib/email.ts` interface

```ts
sendInviteEmail(to: string, firstName: string, joinUrl: string, expiresAt: Date): Promise<void>
sendRsvpConfirmation(to: string, firstName: string, meetingDate: string, venue: string): Promise<void>
sendContactNotification(adminEmail: string, payload: ContactPayload): Promise<void>
```

---

## 2. Photo Upload System

### Storage

- Supabase Storage bucket: `site-media`
- Access: public read, admin write (enforced via Storage RLS policy)

### `media` table

```sql
create table public.media (
  key text primary key,           -- e.g. 'homepage_hero'
  storage_path text not null,     -- path within site-media bucket
  alt_text text,
  updated_at timestamptz default now()
);
-- RLS: public select, admin insert/update/delete
```

### `PhotoSlot` component update

Add optional `mediaKey` prop. When provided:
- Server component fetches the URL from `media` table via Supabase
- Renders `<img>` with `alt` from `alt_text`

When absent: renders existing placeholder (no breaking change).

Because PhotoSlot needs a DB fetch, it becomes an async server component. Callers that need client-side rendering should pass a pre-fetched `src` prop instead.

### Admin upload UI — `/admin/media`

- New page in portal nav under Admin section
- Grid of defined photo slots (key + human label)
- Each slot shows: current image (or placeholder), key label, "Upload new photo" file input + button
- Upload flow: client picks file → POST to a server action → upload to Supabase Storage → upsert `media` row → revalidate
- Accepted formats: JPEG, PNG, WebP; max 5 MB (enforced client-side and server-side)

### Initial media keys

| Key | Used on |
|-----|---------|
| `homepage_hero` | Homepage hero section |
| `about_hero` | `/about` page |
| `meetings_hero` | `/meetings` page |

---

## 3. Public Pages

### `/about`

- Layout: `Navbar` + `Footer` (shared)
- `PhotoSlot mediaKey="about_hero"` full-width hero image
- Hero overlay: club name + one-sentence mission (from `site_settings` key `about_mission`)
- Content block: one paragraph (from `site_settings` key `about_body`)
- CTA strip: "Come to a meeting" button → `/signup`
- Added to public `Navbar` once built

### `/meetings`

- Layout: `Navbar` + `Footer` (shared)
- `PhotoSlot mediaKey="meetings_hero"` hero image
- Page heading: "Upcoming Meetings"
- Query: `meetings` table where `meeting_date >= today` ordered ascending
- Each meeting card: formatted date, day of week, time (from `site_settings` key `meeting_time`), venue (from `site_settings` key `venue_name`), "RSVP" button → `/signup`
- Empty state: "No meetings scheduled yet — check back soon"
- Added to public `Navbar` once built

### `site_settings` keys required

| Key | Description |
|-----|-------------|
| `about_mission` | One-sentence mission statement for `/about` |
| `about_body` | Body paragraph for `/about` |
| `meeting_time` | Default meeting time string, e.g. "7:00 PM" |
| `venue_name` | Venue display name for meeting cards |

These can be seeded via SQL or the existing admin settings UI.

---

## 4. `/member/speeches` Redesign

### Layout

Two-column grid matching the member dashboard:
- **Main column (left):** Speech history sections stacked vertically
- **Sidebar (right, sticky top: 80px):** "Log a Historical Speech" form

Mobile (≤767px): sidebar stacks below main content.

### CSS

New `src/app/member/speeches/speeches.css`. All inline styles removed from `page.tsx`.

### Component tokens

| Element | Token / Class |
|---------|---------------|
| Page wrapper | `.speeches-page` |
| Section heading | `EyebrowLabel` component |
| Speech cards | `.wsc-card` with `var(--card-bg)` / `var(--card-border)` |
| Speech level / pathway | `.tag` component |
| Sidebar form | `.speeches-sidebar` (sticky card) |
| Delete button | `.btn-ghost.btn-destructive` text variant |
| Evaluator section border | `border-left: 3px solid var(--success)` |

### Data / logic

No changes. Pure presentation layer rebuild.

---

## Implementation order

1. Email system (unblocks invite flow + contact/RSVP emails)
2. Photo upload system (new infra needed before public pages reference media keys)
3. `/about` and `/meetings` public pages
4. `/member/speeches` redesign (independent, can run in parallel with 3)
