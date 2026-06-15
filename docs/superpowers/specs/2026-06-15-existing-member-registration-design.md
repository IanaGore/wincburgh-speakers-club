# Existing Member Registration — Design Spec

**Date:** 2026-06-15
**Goal:** Give existing club members two paths to get a website account — self-service via the login page, and admin direct-invite from the members panel.

---

## Problem

The only current path to a member account is:
1. Submit a visitor RSVP via `/get-started`
2. Admin sends a conversion invite from `/admin/enquiries → RSVPs`

Existing members (who are already attending meetings but don't have a website login) have no suitable entry point. The RSVP flow is designed for new visitors and asks irrelevant questions.

---

## Solution Overview

Two complementary paths, both feeding into the existing `/join?token=` conversion flow:

| Path | Who uses it | Admin action needed |
|------|-------------|-------------------|
| Self-registration on `/login` | Member submits name + email themselves | Yes — admin sends invite from RSVPs tab |
| Direct invite from `/admin/members` | Admin enters name + email | No — invite sent immediately |

---

## Schema Change

**Migration:** `supabase/migrations/20260615100000_signups_source.sql`

Add a nullable `source` column to `signups`:

```sql
alter table public.signups
  add column if not exists source text
    check (source in ('rsvp', 'existing_member', 'admin_invite'));
```

- Nullable — existing rows unaffected (implicitly `'rsvp'`)
- The get-started server action (`src/app/get-started/GetStartedClient.tsx` → `src/app/signup/actions.ts`) will be updated to write `source = 'rsvp'`
- Self-registration writes `source = 'existing_member'`
- Admin direct-invite writes `source = 'admin_invite'`

---

## Feature 1 — Self-Registration on Login Page

### UI

Below the `<LoginForm>` on `/login`, add a subtle "Already a club member?" section:

```
Already a club member but not on the website yet?
[Request access →]
```

Clicking expands an inline form (no page navigation):
- First name (required)
- Last name (optional)
- Email address (required)

Submit button: "Request access"

On success: redirect to `/login?registered=1`, which renders a confirmation banner:
> "Thanks — we'll send your invite link shortly."

### Server Action — `requestMemberAccess`

**File:** `src/app/login/actions.ts` (new file)

1. Read `first_name`, `last_name`, `email` from FormData
2. Check `profiles` table — if email already exists, redirect to `/login?registered=duplicate` (shows "Looks like you already have an account — try logging in or use Forgot password")
3. Insert into `signups`: `{ first_name, last_name, email, source: 'existing_member', status: 'pending' }`
4. Call `sendMemberRequestNotification(adminEmail, { first_name, last_name, email })` — fires and doesn't throw on failure (log only)
5. Redirect to `/login?registered=1`

### New Email Function — `sendMemberRequestNotification`

**File:** `src/lib/email.ts`

```
Subject: Member registration request from {first_name} {last_name}
Body: {first_name} {last_name} ({email}) has requested access to the member portal.
      They've identified themselves as an existing club member.
      Log in to send them an invite: {adminUrl}/admin/enquiries?tab=rsvps
```

`adminEmail` comes from `process.env.ADMIN_EMAIL` (already set in `.env.local`).

### Client Component — `MemberRegisterForm`

**File:** `src/app/login/MemberRegisterForm.tsx` (new)

Client component that manages the expand/collapse of the self-reg form. Uses `useFormState` / `useActionState` pattern consistent with the rest of the codebase. Shows inline validation (required fields). The `registered` and `duplicate` states are read from `searchParams` in the server component (`login/page.tsx`) and passed as props.

### Admin — Enquiries RSVPs Tab

**File:** `src/app/admin/enquiries/page.tsx`

Self-registered entries have `source = 'existing_member'`. In the RSVPs tab, render an additional tag next to the status badge:

```
[Existing member]   [pending]
```

Tag uses `wsc-tag-sage` variant. No other changes to the enquiries flow — admin sends the invite as normal.

---

## Feature 2 — Admin Direct Invite from `/admin/members`

### UI

At the top of `/admin/members`, above the member list, add a collapsible "Invite a member directly" section (collapsed by default, toggled by a button). When expanded:

- First name (required)
- Last name (optional)
- Email address (required)
- Submit: "Send invite"

On success: reload to `/admin/members?invited={first_name}` — banner at top of page:
> "Invite sent to {first_name}."

On duplicate (email already in `profiles`): reload to `/admin/members?invite_error=duplicate` — banner:
> "An account already exists for that email address."

### Server Action — `inviteMember`

**File:** `src/app/admin/members/actions.ts` (add to existing file)

1. `checkAdmin()`
2. Read `first_name`, `last_name`, `email` from FormData
3. Check `profiles` — if email already exists, redirect with `?invite_error=duplicate`
4. Insert into `signups`: `{ first_name, last_name, email, source: 'admin_invite', status: 'pending' }`
5. Generate `token = randomUUID()`, `expiresAt = now + 7 days`
6. Update signups row: `{ conversion_token: token, conversion_token_expires_at: expiresAt, invite_sent_at: now, invite_count: 1 }`
7. Call `sendInviteEmail(email, first_name, joinUrl, expiresAt)` (existing function)
8. Redirect to `/admin/members?invited={first_name}`

### Client Component — `InviteMemberForm`

**File:** `src/app/admin/members/InviteMemberForm.tsx` (new)

Client component managing expand/collapse of the invite form. Mirrors the `MemberRegisterForm` pattern.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/migrations/20260615100000_signups_source.sql` | Create | Add `source` column |
| `src/app/signup/actions.ts` | Modify | Write `source: 'rsvp'` on insert |
| `src/lib/email.ts` | Modify | Add `sendMemberRequestNotification` |
| `src/app/login/page.tsx` | Modify | Read `registered` searchParam; render `MemberRegisterForm` and confirmation state |
| `src/app/login/actions.ts` | Create | `requestMemberAccess` server action |
| `src/app/login/MemberRegisterForm.tsx` | Create | Expand/collapse self-reg form |
| `src/app/admin/enquiries/page.tsx` | Modify | Show "Existing member" tag when `source = 'existing_member'` |
| `src/app/admin/members/page.tsx` | Modify | Read `invited`/`invite_error` searchParams; render `InviteMemberForm` and banners |
| `src/app/admin/members/actions.ts` | Modify | Add `inviteMember` server action |
| `src/app/admin/members/InviteMemberForm.tsx` | Create | Expand/collapse admin invite form |

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| Email already has a `profiles` row (self-reg) | Redirect to `/login?registered=duplicate` — "Looks like you already have an account" |
| Email already has a `profiles` row (admin invite) | Redirect to `/admin/members?invite_error=duplicate` — banner message |
| `sendMemberRequestNotification` fails | Log error, do NOT surface to member — they still get confirmation |
| `sendInviteEmail` fails (admin invite) | Throw — admin sees error, can retry |
| Self-reg email already in `signups` but no account | Allow duplicate (admin can handle via enquiries) |

---

## Out of Scope

- Deduplication of `signups` rows (multiple self-reg attempts with same email are allowed)
- Member-facing status page ("your request is pending")
- Automatic invite on self-registration (deliberate — admin approval is the intended flow)
