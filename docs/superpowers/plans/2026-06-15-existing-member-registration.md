# Existing Member Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give existing club members two paths to get a website account — self-service via the login page (admin approves + sends invite), and admin direct-invite from the members panel (invite sent immediately).

**Architecture:** A single `source` column on `signups` distinguishes the three entry points (`rsvp`, `existing_member`, `admin_invite`). Both new paths reuse the existing `/join?token=` conversion flow. No new pages. Self-reg uses a `<details>` expand on the login page; admin invite uses a `<details>` expand on the members page — consistent with the existing "Manage Club Positions" pattern in that page.

**Tech Stack:** Next.js 16 App Router (server actions, server components), Supabase, Resend via `src/lib/email.ts`, vanilla CSS.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/migrations/20260615100000_signups_source.sql` | Create | Add nullable `source` column to `signups` |
| `src/app/signup/actions.ts` | Modify | Add `source: 'rsvp'` to insert |
| `src/lib/email.ts` | Modify | Add `sendMemberRequestNotification` |
| `src/app/login/actions.ts` | Create | `requestMemberAccess` server action |
| `src/app/login/page.tsx` | Modify | Read `registered` searchParam; render self-reg `<details>` + confirmation states |
| `src/app/login/login.css` | Modify | Add `.login-member-request` styles |
| `src/app/admin/enquiries/page.tsx` | Modify | Select `source`; show "Existing member" tag; show InviteButton for existing_member+pending |
| `src/app/admin/members/actions.ts` | Modify | Add `inviteMember` server action |
| `src/app/admin/members/page.tsx` | Modify | Accept `searchParams`; show invite form + banners |

---

## Task 1: Migration + tag rsvp source

**Files:**
- Create: `supabase/migrations/20260615100000_signups_source.sql`
- Modify: `src/app/signup/actions.ts`

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/20260615100000_signups_source.sql` with this exact content:

```sql
-- Add source column to distinguish how a signup was created.
-- Nullable: existing rows are unaffected (implicitly treated as 'rsvp').
alter table public.signups
  add column if not exists source text
    check (source in ('rsvp', 'existing_member', 'admin_invite'));
```

- [ ] **Step 2: Tag the existing RSVP insert with source**

In `src/app/signup/actions.ts`, find the `supabase.from('signups').insert({...})` call (line 54). Add `source: 'rsvp'` to the insert object:

```ts
  const { error } = await supabase.from('signups').insert({
    first_name: firstName,
    last_name: data.lastName?.trim().slice(0, 100) || null,
    email,
    phone: data.phone?.trim().slice(0, 30) || null,
    heard_from: data.heard?.trim().slice(0, 200) || null,
    experience: data.experience,
    hopes,
    meeting_id: data.meetingId || null,
    notes: data.notes?.trim().slice(0, 2000) || null,
    status: 'pending',
    source: 'rsvp',
  })
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Run grants guard**

```bash
npm run check:migrations
```

Expected: passes (no new tables, no new grants needed).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260615100000_signups_source.sql src/app/signup/actions.ts
git commit -m "feat(signups): add source column; tag rsvp flow"
```

---

## Task 2: Email notification for self-registration

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Add `sendMemberRequestNotification` to `email.ts`**

Append this function after `sendRsvpConfirmation` (after line 81):

```ts
export async function sendMemberRequestNotification(
  adminEmail: string,
  firstName: string,
  lastName: string | null,
  email: string
): Promise<void> {
  const adminUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Member registration request from ${esc(fullName)}`,
    html: `
      <p>${esc(fullName)} (${esc(email)}) has requested access to the member portal.</p>
      <p>They have identified themselves as an existing club member.</p>
      <p><a href="${esc(adminUrl)}/admin/enquiries?tab=rsvps">Review and send invite →</a></p>
    `,
  })
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat(email): add sendMemberRequestNotification"
```

---

## Task 3: Self-registration on the login page

**Files:**
- Create: `src/app/login/actions.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login.css`

- [ ] **Step 1: Create `src/app/login/actions.ts`**

```ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { sendMemberRequestNotification } from '@/lib/email'

export async function requestMemberAccess(formData: FormData) {
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!firstName || !email || !/\S+@\S+\.\S+/.test(email)) {
    redirect('/login?registered=error')
  }

  const supabase = await createClient()

  // Guard: email already has an account
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('contact_email', email)
    .maybeSingle()

  if (existing) {
    redirect('/login?registered=duplicate')
  }

  await supabase.from('signups').insert({
    first_name: firstName.slice(0, 100),
    last_name: lastName ? lastName.slice(0, 100) : null,
    email: email.slice(0, 254),
    source: 'existing_member',
    status: 'pending',
  })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      await sendMemberRequestNotification(adminEmail, firstName, lastName, email)
    } catch (err) {
      console.error('[requestMemberAccess] notification email failed:', err)
    }
  }

  redirect('/login?registered=1')
}
```

- [ ] **Step 2: Update `src/app/login/page.tsx`**

Change the function signature to read the `registered` searchParam. Replace the opening of `LoginPage`:

```tsx
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const params = await searchParams
```

Then at the bottom of the file, add the import for the new action and update the right panel. The full updated right panel (replace the `<div className="login-right">` block):

```tsx
      {/* Right: form */}
      <div className="login-right">
        <p className="login-right__new-here">
          New here?{' '}
          <a href="/get-started?intent=ask">Get in touch</a>
        </p>
        <LoginForm error={params.error} />

        {params.registered === '1' ? (
          <div className="login-member-request login-member-request--confirm">
            <p><strong>Thanks — we&apos;ll send your invite link shortly.</strong></p>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Keep an eye on your inbox over the next day or two.</p>
          </div>
        ) : params.registered === 'duplicate' ? (
          <div className="login-member-request login-member-request--confirm">
            <p>Looks like you already have an account — try logging in above or <a href="/forgot-password">reset your password</a>.</p>
          </div>
        ) : (
          <details className="login-member-request">
            <summary>Already a club member but not on the website yet?</summary>
            <form action={requestMemberAccess} className="login-member-request__form">
              <div>
                <label className="wsc-label" htmlFor="mreg-fname">First name *</label>
                <input id="mreg-fname" name="first_name" type="text" required className="wsc-input" placeholder="Your first name" />
              </div>
              <div>
                <label className="wsc-label" htmlFor="mreg-lname">Last name <span style={{ color: 'var(--ink-4)' }}>(optional)</span></label>
                <input id="mreg-lname" name="last_name" type="text" className="wsc-input" placeholder="Your last name" />
              </div>
              <div>
                <label className="wsc-label" htmlFor="mreg-email">Email address *</label>
                <input id="mreg-email" name="email" type="email" required className="wsc-input" placeholder="you@example.com" />
              </div>
              <button type="submit" className="wsc-btn wsc-btn-primary" style={{ width: '100%', marginTop: 4 }}>
                Request access
              </button>
            </form>
          </details>
        )}
      </div>
```

Add the import for `requestMemberAccess` at the top of the file alongside the other imports:

```tsx
import { requestMemberAccess } from './actions'
```

- [ ] **Step 3: Add CSS for the self-reg section**

Append to `src/app/login/login.css` (before the `@media` block at the bottom):

```css
/* Existing member self-registration */
.login-member-request {
  margin-top: 24px;
  border-top: 1px solid var(--rule);
  padding-top: 16px;
  max-width: 420px;
}

.login-member-request > summary {
  font-size: 13px;
  color: var(--ink-3);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.login-member-request > summary::after {
  content: ' →';
}

.login-member-request[open] > summary::after {
  content: ' ↓';
}

.login-member-request__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.login-member-request--confirm {
  font-size: 14px;
  color: var(--ink-2);
  line-height: 1.5;
}

.login-member-request--confirm a {
  color: var(--clay);
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/actions.ts src/app/login/page.tsx src/app/login/login.css
git commit -m "feat(login): existing member self-registration form"
```

---

## Task 4: Show source tag + InviteButton in enquiries RSVPs

**Files:**
- Modify: `src/app/admin/enquiries/page.tsx`

- [ ] **Step 1: Add `source` to the signups query**

Find the signups query (around line 42):

```tsx
    supabase
      .from('signups')
      .select('*, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
```

Change to:

```tsx
    supabase
      .from('signups')
      .select('*, source, meetings(meeting_date, theme)')
      .eq('status', status)
      .order('created_at', { ascending: false }),
```

- [ ] **Step 2: Add "Existing member" tag and fix InviteButton logic**

In the RSVPs tab, find the block that renders the status tag and the action buttons (lines ~162–184). Replace it with:

```tsx
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: 13 }}>
                    {s.meetings && (
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-3)', fontSize: 12 }}>
                        {new Date((s.meetings as Record<string, string>).meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {s.heard_from && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>via {s.heard_from as string}</span>}
                    {(s.source as string) === 'existing_member' && (
                      <span className="wsc-tag wsc-tag-sage">Existing member</span>
                    )}
                    {(s.source as string) === 'admin_invite' && (
                      <span className="wsc-tag wsc-tag-sage">Admin invite</span>
                    )}
                    <span className={statusTag(s.status as string)}>{(s.status as string).replace('_', ' ')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <form action={updateSignupStatus} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="hidden" name="signup_id" value={s.id as string} />
                    <label className="wsc-label" style={{ margin: 0, fontSize: 13 }}>Status:</label>
                    <select name="status" defaultValue={s.status as string} className="wsc-input" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: 13 }}>
                      {SIGNUP_STATUSES.map(st => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                    </select>
                    <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Update</button>
                  </form>
                  {(s.status as string) === 'pending' && (s.source as string) !== 'existing_member' && (s.source as string) !== 'admin_invite' && (
                    <MarkAttendedButton signupId={s.id as string} />
                  )}
                  {((s.status as string) === 'attended' ||
                    ((s.status as string) === 'pending' && (s.source as string) === 'existing_member')) && (
                    <InviteButton signupId={s.id as string} />
                  )}
                </div>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/enquiries/page.tsx
git commit -m "feat(enquiries): show source tag; InviteButton for existing_member pending signups"
```

---

## Task 5: Admin direct invite from members page

**Files:**
- Modify: `src/app/admin/members/actions.ts`
- Modify: `src/app/admin/members/page.tsx`

- [ ] **Step 1: Add `inviteMember` to `src/app/admin/members/actions.ts`**

Add these imports at the top of the file (alongside the existing imports):

```ts
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'
import { redirect } from 'next/navigation'
```

Then append `inviteMember` at the end of the file:

```ts
export async function inviteMember(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!firstName || !email || !/\S+@\S+\.\S+/.test(email)) {
    redirect('/admin/members?invite_error=invalid')
  }

  // Guard: account already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('contact_email', email)
    .maybeSingle()

  if (existing) {
    redirect('/admin/members?invite_error=duplicate')
  }

  // Create signups row
  const { data: signup, error: insertError } = await supabase
    .from('signups')
    .insert({
      first_name: firstName.slice(0, 100),
      last_name: lastName ? lastName.slice(0, 100) : null,
      email: email.slice(0, 254),
      source: 'admin_invite',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !signup) {
    redirect('/admin/members?invite_error=failed')
  }

  // Generate token and send invite immediately
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const joinUrl = `${siteUrl}/join?token=${token}`

  await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expiresAt.toISOString(),
    invite_sent_at: new Date().toISOString(),
    invite_count: 1,
  }).eq('id', signup.id)

  await sendInviteEmail(email, firstName, joinUrl, expiresAt)

  redirect(`/admin/members?invited=${encodeURIComponent(firstName)}`)
}
```

- [ ] **Step 2: Update `src/app/admin/members/page.tsx`**

Add `inviteMember` to the imports line at the top:

```tsx
import { toggleAdmin, updateMemberRoles, toggleActive, inviteMember } from './actions'
```

Update the page signature to accept `searchParams`:

```tsx
export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; invite_error?: string }>
}) {
  const { invited, invite_error: inviteError } = await searchParams
  const supabase = await createClient()
```

Then, inside the returned JSX, add the invite form and banners immediately after the `<h1>` and before the members/guests sections. Replace the line:

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
```

with:

```tsx
      {invited && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.93 0.06 160)', border: '1px solid oklch(0.70 0.12 160)', borderRadius: 8, color: 'oklch(0.30 0.10 160)', fontSize: 14, marginBottom: 16 }}>
          Invite sent to {decodeURIComponent(invited)}.
        </div>
      )}
      {inviteError === 'duplicate' && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25)', borderRadius: 8, color: 'oklch(0.40 0.15 25)', fontSize: 14, marginBottom: 16 }}>
          An account already exists for that email address.
        </div>
      )}
      {(inviteError === 'invalid' || inviteError === 'failed') && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25)', borderRadius: 8, color: 'oklch(0.40 0.15 25)', fontSize: 14, marginBottom: 16 }}>
          Something went wrong. Please check the details and try again.
        </div>
      )}

      <details style={{ marginBottom: '1.5rem', background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--rule)', padding: '1rem 1.25rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem', userSelect: 'none' }}>
          + Invite a member directly
        </summary>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, marginBottom: 16 }}>
          Send an invite link to someone who is already a club member. They will receive an email to set up their account.
        </p>
        <form action={inviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
          <div>
            <label className="wsc-label" htmlFor="inv-fname">First name *</label>
            <input id="inv-fname" name="first_name" type="text" required className="wsc-input" placeholder="First name" />
          </div>
          <div>
            <label className="wsc-label" htmlFor="inv-lname">Last name <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></label>
            <input id="inv-lname" name="last_name" type="text" className="wsc-input" placeholder="Last name" />
          </div>
          <div>
            <label className="wsc-label" htmlFor="inv-email">Email address *</label>
            <input id="inv-email" name="email" type="email" required className="wsc-input" placeholder="member@example.com" />
          </div>
          <div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Send invite</button>
          </div>
        </form>
      </details>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/members/actions.ts src/app/admin/members/page.tsx
git commit -m "feat(members): admin direct-invite form with immediate token + email"
```

---

## Task 6: Gate checks and open PR

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

Expected: no new errors beyond the pre-existing ~76-error baseline.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build completes without error.

- [ ] **Step 3: Apply migration**

```bash
npx supabase db push --include-all
```

Expected: migration applies cleanly.

- [ ] **Step 4: Push branch and open PR**

```bash
git checkout -b feat/existing-member-registration
git push -u origin feat/existing-member-registration
gh pr create \
  --title "feat: existing member registration — self-service + admin direct invite" \
  --body "$(cat <<'EOF'
## Summary

- Existing club members can now request portal access from the login page — a collapsible form collects their name and email, creates a `signups` row with `source = existing_member`, and emails the admin a notification link to the RSVPs tab
- Admin can directly invite a member from the Members page — a new "Invite a member directly" form generates a token and sends the invite email immediately
- `signups.source` column added (`rsvp | existing_member | admin_invite`) — existing RSVP flow tagged as `rsvp`
- RSVPs tab shows "Existing member" / "Admin invite" tags; existing-member signups show the Invite button at `pending` status (no "Mark Attended" step needed)

## Migration

`supabase/migrations/20260615100000_signups_source.sql` — nullable `source text` column on `signups`.

## Test plan

- [ ] On `/login`, expand "Already a club member?" — form appears with first name, last name, email fields
- [ ] Submit with a new email → redirected to `/login?registered=1`, confirmation message shown
- [ ] Submit with an email that already has a `profiles` row → `/login?registered=duplicate`, account-exists message
- [ ] Admin receives notification email with link to enquiries RSVPs
- [ ] In `/admin/enquiries?tab=rsvps`, existing-member entry shows "Existing member" tag and Invite button at `pending` status
- [ ] Clicking Invite sends the standard `/join?token=` invite email
- [ ] In `/admin/members`, expand "Invite a member directly" — form appears
- [ ] Submit with a new email → banner "Invite sent to [name]", member receives invite email
- [ ] Member clicks email link → `/join?token=` page → sets password → redirected to `/member/dashboard`
- [ ] Submit admin invite with existing email → "An account already exists" banner

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Manual verification checklist (post-merge)

- [ ] Log out, visit `/login`, expand "Already a club member?" and submit a real email — confirm admin gets notified, entry appears in RSVPs with "Existing member" tag and Invite button shows immediately
- [ ] From `/admin/members`, expand "Invite a member directly", submit a name + email — confirm invite email arrives and `/join?token=` link works end-to-end
- [ ] Confirm existing `/get-started` RSVP flow still works (new signups get `source = rsvp`)
