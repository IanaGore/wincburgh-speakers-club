# Merge Attend & Contact Pages — Design Spec

**Date:** 2026-05-30
**Issue:** #35 (merge attend and contact pages)
**Status:** Ready

## Problem

The public site has two separate entry points — `/signup` (4-step RSVP to attend a meeting)
and `/contact` (general enquiry form). Guests must self-select the right page before they
know which fits their need. #35 asks for a single page that branches by enquiry type, plus a
unified backend "queries" view.

## Current State (important)

The **admin backend is already largely unified**: `/admin/enquiries` is a tabbed inbox
(Messages | RSVPs) reading both `contact_messages` and `signups`, with status filtering,
mark-as-read, mark-attended, and invite actions. `/admin/signups` and `/admin/messages` are
older standalone duplicates. So #35's "unified queries page" and "track attendance" asks are
mostly satisfied server-side already; the bulk of the remaining work is the **public merge**,
plus closing a data gap and deepening follow-up tracking.

Data gap: the contact form collects `phone` + `topic`, but `sendContactMessage` only persists
`name`/`email`/`message` to `contact_messages` (phone/topic are emailed then dropped).

## Goals

- Single public page that branches by enquiry type (#35: single page, workflow branches).
- Unified backend queries view (#35) — consolidate onto the existing `/admin/enquiries`.
- Follow-up + attendance tracking (#35 open question).

## Public Page

New route **`/get-started`** (name is easily swapped, e.g. `/visit`).

- **Step 0 — intent chooser:** two cards — "Come to a meeting" (attend) and "Ask a question" (ask).
- `intent === 'attend'` → render the existing 4-step `SignupFlow` (preserved as-is).
- `intent === 'ask'` → render the existing `ContactForm`.
- `?intent=attend|ask` deep-links skip the chooser and land directly in a branch.
- Supporting content retained on the page: the Find-Us card (venue info — now driven by the
  venue/meeting-details spec, #32–34) and the FAQ accordions.

### Redirects & link updates

- `/signup` → `/get-started?intent=attend`
- `/contact` → `/get-started?intent=ask`
  (route-level `redirect()` / config redirects — safety net for bookmarks and external links.)
- Update primary CTAs to deep-link directly: `src/app/page.tsx` (hero + CTA strip),
  `src/app/about/page.tsx`, `src/app/meetings/page.tsx`, `src/components/Footer.tsx`,
  `src/app/login/page.tsx` + `LoginForm.tsx`, and the navbar.

## Backend

### 1. Fix data gap

Add `phone text` and `topic text` to `contact_messages`; persist them in `sendContactMessage`.

### 2. Retire duplicate admin routes

- `/admin/signups` and `/admin/messages` become redirects to `/admin/enquiries`.
- Admin sidebar shows a single "Enquiries" link.
- Keep shared modules `admin/signups/RSVPActions` and `admin/messages/actions` — `enquiries`
  imports them.

### 3. Deeper follow-up tracking

Migration adds columns (defaults preserve existing rows); RLS already admin-only on these
tables (anon may insert to `contact_messages`/`signups` only).

- `signups`: extend `status` workflow → `pending → contacted → attended / no_show / joined`;
  add `contacted_at timestamptz`, `admin_notes text`.
- `contact_messages`: add `status` (`new → replied → closed`), `handled_at timestamptz`,
  `admin_notes text` (alongside existing `is_read`).
- `/admin/enquiries` gains per-item status controls + a notes field, with new
  `checkAdmin()`-gated actions to update status/notes. Status presentation unified across both tabs.

## Out of Scope

- Full CRM (assignment to a person, automated reminders, email-thread tracking). This is
  lightweight status + notes only.
- Reworking the internals of `SignupFlow` or `ContactForm` beyond mounting them under the new
  route and wiring the deep-link.

## Acceptance Criteria

- [ ] `/get-started` shows an intent chooser branching into the RSVP flow or the contact form.
- [ ] `?intent=attend|ask` deep-links work; old `/signup` and `/contact` URLs redirect correctly.
- [ ] Contact submissions persist phone + topic.
- [ ] `/admin/enquiries` is the single inbox; `/admin/signups` and `/admin/messages` redirect to it.
- [ ] Admins can set follow-up status and notes on both RSVPs and messages.
- [ ] Non-admins cannot read enquiries or change status (RLS + `checkAdmin()`).

## Verification (manual)

1. Visit `/get-started`; choose each intent; confirm the right flow renders.
2. Hit `/get-started?intent=attend` and `?intent=ask` directly; confirm chooser is skipped.
3. Visit old `/signup` and `/contact`; confirm redirects.
4. Submit a contact message with phone + topic; confirm both persist and appear in `/admin/enquiries`.
5. As admin, change status + add a note on an RSVP and a message; reload and confirm persistence.
6. Confirm `/admin/signups` and `/admin/messages` redirect to `/admin/enquiries`.
