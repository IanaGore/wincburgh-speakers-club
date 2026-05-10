# Phase 2 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire email delivery (invite, RSVP, contact), build a photo upload system, add public `/about` and `/meetings` pages, and redesign `/member/speeches` with design tokens.

**Architecture:** Resend npm package called from existing server actions via a shared `src/lib/email.ts` utility. Photo uploads go to a Supabase Storage bucket `site-media` with metadata in a new `media` DB table. Public pages read `site_settings` for editable copy. Speeches page is a pure CSS/markup rebuild — no logic changes.

**Tech Stack:** Next.js 16 App Router, Supabase (supabase-ssr), Resend npm, Vanilla CSS, lucide-react

---

## File Map

### New files
- `src/lib/email.ts` — typed Resend send functions
- `src/app/admin/media/page.tsx` — photo upload admin UI
- `src/app/admin/media/MediaUploader.tsx` — client component for file input + upload
- `src/app/admin/media/actions.ts` — server actions: upload to Storage, upsert media row
- `src/app/admin/media/media.css` — styles for admin media page
- `src/app/about/page.tsx` — public /about page
- `src/app/about/about.css` — styles
- `src/app/meetings/page.tsx` — public /meetings page
- `src/app/meetings/meetings.css` — styles
- `src/app/member/speeches/speeches.css` — replaces all inline styles in speeches page
- `supabase/migrations/20260510230000_phase2_schema.sql` — media table, invite safeguards, site_settings columns

### Modified files
- `src/app/admin/signups/actions.ts` — add safeguard checks + email send to `sendConversionInvite`
- `src/app/signup/actions.ts` — add RSVP confirmation email after insert
- `src/app/contact/actions.ts` — add contact notification email after insert
- `src/components/ui/PhotoSlot.tsx` — add optional `mediaKey` prop + real `<img>` render path
- `src/components/Navbar.tsx` — add About and Meetings links
- `src/app/member/speeches/page.tsx` — replace all inline styles with CSS classes

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260510230000_phase2_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- ── Invite safeguards on signups ──────────────────────────────────────────
alter table public.signups
  add column if not exists invite_sent_at  timestamptz,
  add column if not exists invite_count    integer not null default 0;

-- ── site_settings: about + meeting_time columns ───────────────────────────
alter table public.site_settings
  add column if not exists about_mission text default 'We are a friendly public speaking club that helps members build confidence and communication skills.',
  add column if not exists about_body     text default 'We meet regularly to practise speeches, give and receive feedback, and support each other to grow. Whether you are completely new to public speaking or want to sharpen existing skills, you are welcome here.',
  add column if not exists meeting_time   text default '7:00 PM';

-- ── media table ───────────────────────────────────────────────────────────
create table if not exists public.media (
  key          text primary key,
  storage_path text not null,
  alt_text     text,
  updated_at   timestamptz default now()
);

alter table public.media enable row level security;

create policy "Public can read media"
  on public.media for select
  using (true);

create policy "Admins can manage media"
  on public.media for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
```

- [ ] **Step 2: Apply migration**

Option A — Supabase CLI:
```bash
cd /path/to/speakers-club-portal
npx supabase db push
```

Option B — Paste into Supabase SQL Editor and run.

Verify: in Supabase dashboard, `signups` table has `invite_sent_at` and `invite_count` columns; `media` table exists; `site_settings` has `about_mission`, `about_body`, `meeting_time`.

- [ ] **Step 3: Create Supabase Storage bucket**

In Supabase dashboard → Storage → New bucket:
- Name: `site-media`
- Public: ✅ (public read)
- Allowed MIME types: `image/jpeg, image/png, image/webp`
- Max file size: 5 MB

Then add a Storage policy: "Admins can upload to site-media"
```sql
-- In Storage → Policies → site-media bucket → New policy
-- For INSERT and UPDATE operations:
(auth.uid() in (
  select id from public.profiles where is_admin = true
))
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260510230000_phase2_schema.sql
git commit -m "feat: phase 2 schema — invite safeguards, media table, site_settings columns"
```

---

## Task 2: Email Utility

**Files:**
- Create: `src/lib/email.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Add env vars**

Add to `.env.local`:
```
RESEND_API_KEY=re_your_key_here
ADMIN_EMAIL=your-admin@example.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

For production, add these same vars to your Vercel/hosting environment.

- [ ] **Step 3: Create `src/lib/email.ts`**

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'West Lothian Speakers Club <noreply@your-domain.com>'

export async function sendInviteEmail(
  to: string,
  firstName: string,
  joinUrl: string,
  expiresAt: Date
): Promise<void> {
  const expiry = expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your invitation to join West Lothian Speakers Club',
    html: `
      <p>Hi ${firstName},</p>
      <p>You've been invited to create your member account at West Lothian Speakers Club.</p>
      <p><a href="${joinUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Set up your account</a></p>
      <p>This link expires on <strong>${expiry}</strong>.</p>
      <p>If you weren't expecting this, you can ignore it safely.</p>
    `,
  })
}

export interface ContactPayload {
  name: string
  email: string
  phone?: string
  topic?: string
  message: string
}

export async function sendContactNotification(
  adminEmail: string,
  payload: ContactPayload
): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `New contact message from ${payload.name}`,
    html: `
      <p><strong>From:</strong> ${payload.name} (${payload.email})</p>
      ${payload.phone ? `<p><strong>Phone:</strong> ${payload.phone}</p>` : ''}
      ${payload.topic ? `<p><strong>Topic:</strong> ${payload.topic}</p>` : ''}
      <hr/>
      <p>${payload.message.replace(/\n/g, '<br/>')}</p>
    `,
  })
}

export async function sendRsvpConfirmation(
  to: string,
  firstName: string,
  meetingDate: string,
  venue: string
): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your RSVP is confirmed — West Lothian Speakers Club',
    html: `
      <p>Hi ${firstName},</p>
      <p>You're confirmed for our meeting on <strong>${meetingDate}</strong> at <strong>${venue}</strong>.</p>
      <p>Your first three visits are free — just turn up and introduce yourself.</p>
      <p>We look forward to meeting you!</p>
      <p><a href="${siteUrl}">West Lothian Speakers Club</a></p>
    `,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts package.json package-lock.json
git commit -m "feat: email utility via Resend (invite, RSVP confirmation, contact notification)"
```

---

## Task 3: Wire Invite Email + Safeguards

**Files:**
- Modify: `src/app/admin/signups/actions.ts`

- [ ] **Step 1: Replace `sendConversionInvite`**

Open `src/app/admin/signups/actions.ts` and replace the entire file with:

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'

export async function markAttended(signupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('signups').update({ status: 'attended' }).eq('id', signupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/signups')
}

export async function sendConversionInvite(signupId: string) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Admin access required')

  // Load signup
  const { data: signup, error: fetchError } = await supabase
    .from('signups')
    .select('id, email, first_name, invite_count, invite_sent_at')
    .eq('id', signupId)
    .single()
  if (fetchError || !signup) throw new Error('Signup not found')

  // Safeguard: max 3 invites
  if ((signup.invite_count ?? 0) >= 3) {
    throw new Error('Maximum invites reached for this signup (3). Contact support if needed.')
  }

  // Safeguard: 24-hour cooldown
  if (signup.invite_sent_at) {
    const hoursSince = (Date.now() - new Date(signup.invite_sent_at).getTime()) / 36e5
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince)
      throw new Error(`Please wait ${hoursLeft} more hour${hoursLeft === 1 ? '' : 's'} before resending.`)
    }
  }

  // Generate token
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { error: updateError } = await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expiresAt.toISOString(),
    conversion_token_used_at: null,
    invite_sent_at: new Date().toISOString(),
    invite_count: (signup.invite_count ?? 0) + 1,
  }).eq('id', signupId)
  if (updateError) throw new Error(updateError.message)

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`

  try {
    await sendInviteEmail(signup.email, signup.first_name, joinUrl, expiresAt)
  } catch (emailError) {
    console.error('Invite email failed:', emailError)
    throw new Error('Invite saved but email failed to send. Check server logs.')
  }

  revalidatePath('/admin/signups')
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `admin/signups/actions.ts` or `lib/email.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/signups/actions.ts
git commit -m "feat: invite email via Resend with 24h cooldown and 3-invite cap"
```

---

## Task 4: Wire RSVP Confirmation Email

**Files:**
- Modify: `src/app/signup/actions.ts`

- [ ] **Step 1: Update `submitSignup` to send confirmation**

Open `src/app/signup/actions.ts`. After the successful `supabase.from('signups').insert(...)`, add the email send. Replace the full file:

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { sendRsvpConfirmation } from '@/lib/email'

export type SignupData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  heard: string
  experience: 'none' | 'some' | 'lots'
  hopes: string[]
  meetingId: string
  notes: string
}

export async function submitSignup(data: SignupData) {
  const firstName = data.firstName?.trim()
  if (!firstName || firstName.length > 100) throw new Error('Invalid first name')

  const email = data.email?.trim().toLowerCase()
  if (!email || !/\S+@\S+\.\S+/.test(email) || email.length > 254) throw new Error('Invalid email address')

  const validExperience = ['none', 'some', 'lots']
  if (!validExperience.includes(data.experience)) throw new Error('Invalid experience value')

  const hopes = Array.isArray(data.hopes) ? data.hopes.slice(0, 20).map(h => String(h).slice(0, 200)) : []

  const supabase = await createClient()

  // Fetch meeting date + venue for confirmation email
  let meetingDateStr = ''
  let venueName = ''
  if (data.meetingId) {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('meeting_date')
      .eq('id', data.meetingId)
      .single()
    if (meeting) {
      meetingDateStr = new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    }
  }
  const { data: settings } = await supabase
    .from('site_settings')
    .select('venue_name, meeting_time')
    .eq('id', 1)
    .single()
  venueName = settings?.venue_name ?? 'our venue'
  if (settings?.meeting_time) venueName = `${venueName} at ${settings.meeting_time}`

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
  })

  if (error) throw new Error(error.message)

  // Send confirmation — non-blocking, don't fail the RSVP on email error
  try {
    const dateDisplay = meetingDateStr || 'our next meeting'
    await sendRsvpConfirmation(email, firstName, dateDisplay, venueName)
  } catch (emailError) {
    console.error('RSVP confirmation email failed:', emailError)
  }

  return { success: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/signup/actions.ts
git commit -m "feat: RSVP confirmation email on signup submit"
```

---

## Task 5: Wire Contact Form Notification Email

**Files:**
- Modify: `src/app/contact/actions.ts`

- [ ] **Step 1: Update `sendContactMessage`**

Replace the full file:

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { sendContactNotification } from '@/lib/email'

export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
) {
  const name    = (formData.get('name')    as string | null)?.trim() ?? ''
  const email   = (formData.get('email')   as string | null)?.trim() ?? ''
  const phone   = (formData.get('phone')   as string | null)?.trim() ?? ''
  const topic   = (formData.get('topic')   as string | null)?.trim() ?? ''
  const message = (formData.get('message') as string | null)?.trim() ?? ''

  if (!name || !email || !message) {
    return { success: false, error: 'Name, email and message are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, message })

  if (error) return { success: false, error: error.message }

  // Notify admin — non-blocking
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      await sendContactNotification(adminEmail, { name, email, phone, topic, message })
    } catch (emailError) {
      console.error('Contact notification email failed:', emailError)
    }
  }

  return { success: true, error: null }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/contact/actions.ts
git commit -m "feat: contact form admin notification email via Resend"
```

---

## Task 6: Photo Upload — Admin UI

**Files:**
- Create: `src/app/admin/media/actions.ts`
- Create: `src/app/admin/media/MediaUploader.tsx`
- Create: `src/app/admin/media/media.css`
- Create: `src/app/admin/media/page.tsx`

The admin can navigate to `/admin/media` and upload images for defined photo slots.

- [ ] **Step 1: Create `src/app/admin/media/actions.ts`**

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadMediaPhoto(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Admin access required')

  const key     = formData.get('key') as string
  const altText = (formData.get('alt_text') as string | null) ?? ''
  const file    = formData.get('file') as File | null

  if (!key) throw new Error('Missing media key')
  if (!file || file.size === 0) throw new Error('No file provided')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPEG, PNG and WebP images are accepted')
  if (file.size > MAX_BYTES) throw new Error('File must be under 5 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `${key}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })
  if (uploadError) throw new Error(uploadError.message)

  const { error: dbError } = await supabase.from('media').upsert({
    key,
    storage_path: storagePath,
    alt_text: altText,
    updated_at: new Date().toISOString(),
  })
  if (dbError) throw new Error(dbError.message)

  revalidatePath('/admin/media')
}
```

- [ ] **Step 2: Create `src/app/admin/media/MediaUploader.tsx`**

```tsx
'use client'
import { useRef, useState } from 'react'
import { uploadMediaPhoto } from './actions'

const MEDIA_SLOTS = [
  { key: 'homepage_hero', label: 'Homepage Hero' },
  { key: 'about_hero',    label: 'About Page Hero' },
  { key: 'meetings_hero', label: 'Meetings Page Hero' },
]

interface MediaRow {
  key: string
  storage_path: string
  alt_text: string | null
}

interface Props {
  existing: MediaRow[]
  bucketUrl: string
}

export default function MediaUploader({ existing, bucketUrl }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<Record<string, boolean>>({})
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({})

  async function handleUpload(key: string, form: HTMLFormElement) {
    setUploading(key)
    setErrors(prev => ({ ...prev, [key]: '' }))
    setSuccess(prev => ({ ...prev, [key]: false }))
    try {
      const fd = new FormData(form)
      await uploadMediaPhoto(fd)
      setSuccess(prev => ({ ...prev, [key]: true }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [key]: e instanceof Error ? e.message : 'Upload failed' }))
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="media-grid">
      {MEDIA_SLOTS.map(slot => {
        const row = existing.find(r => r.key === slot.key)
        const imgUrl = row ? `${bucketUrl}/${row.storage_path}` : null

        return (
          <div key={slot.key} className="media-card wsc-card">
            <h3 className="media-card__label">{slot.label}</h3>
            <div className="media-card__preview">
              {imgUrl
                ? <img src={imgUrl} alt={row?.alt_text ?? slot.label} className="media-card__img" />
                : <span className="media-card__empty">No image set</span>
              }
            </div>
            <form
              ref={el => { formRefs.current[slot.key] = el }}
              onSubmit={e => { e.preventDefault(); if (formRefs.current[slot.key]) handleUpload(slot.key, formRefs.current[slot.key]!) }}
              className="media-card__form"
            >
              <input type="hidden" name="key" value={slot.key} />
              <div className="media-card__field">
                <label className="wsc-label" htmlFor={`alt-${slot.key}`}>Alt text</label>
                <input
                  id={`alt-${slot.key}`}
                  name="alt_text"
                  type="text"
                  defaultValue={row?.alt_text ?? ''}
                  className="wsc-input"
                  placeholder={slot.label}
                />
              </div>
              <div className="media-card__field">
                <label className="wsc-label" htmlFor={`file-${slot.key}`}>Image (JPEG / PNG / WebP, max 5 MB)</label>
                <input
                  id={`file-${slot.key}`}
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="wsc-input"
                  required
                />
              </div>
              <button
                type="submit"
                className="wsc-btn wsc-btn-primary wsc-btn-sm"
                disabled={uploading === slot.key}
              >
                {uploading === slot.key ? 'Uploading…' : 'Upload'}
              </button>
              {errors[slot.key] && <p className="media-card__error">{errors[slot.key]}</p>}
              {success[slot.key] && <p className="media-card__success">Uploaded ✓</p>}
            </form>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/admin/media/media.css`**

```css
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.media-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.media-card__label {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.media-card__preview {
  aspect-ratio: 16 / 9;
  background: var(--surface-2, oklch(0.18 0.01 250));
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-card__empty {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.media-card__form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.media-card__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.media-card__error {
  font-size: 0.85rem;
  color: var(--error, #ef4444);
  margin: 0;
}

.media-card__success {
  font-size: 0.85rem;
  color: var(--success, #10b981);
  margin: 0;
}
```

- [ ] **Step 4: Create `src/app/admin/media/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import MediaUploader from './MediaUploader'
import './media.css'

export const metadata = { title: 'Media | Admin' }

export default async function AdminMediaPage() {
  const supabase = await createClient()
  const { data: existing } = await supabase.from('media').select('key, storage_path, alt_text')

  const bucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 8px' }}>
        Media
      </h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 0 }}>
        Upload photos for public-facing pages. Changes take effect immediately.
      </p>
      <MediaUploader existing={existing ?? []} bucketUrl={bucketUrl} />
    </div>
  )
}
```

- [ ] **Step 5: Add Media link to admin portal nav**

Open `src/components/PortalNav.tsx` (or wherever admin nav links are defined). Find the admin nav items array and add:

```ts
{ href: '/admin/media', label: 'Media' }
```

Place it after Settings or alongside other admin content links.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/media/
git commit -m "feat: /admin/media photo upload UI with Supabase Storage"
```

---

## Task 7: Update PhotoSlot Component

**Files:**
- Modify: `src/components/ui/PhotoSlot.tsx`

`PhotoSlot` gains an optional `mediaKey` prop. When provided, it fetches the image URL from the `media` table and renders a real `<img>`. When absent, it renders the existing placeholder. Because this needs a DB fetch, it becomes an async server component.

- [ ] **Step 1: Update `src/components/ui/PhotoSlot.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import './PhotoSlot.css'

interface PhotoSlotProps {
  width?: number | string
  height?: number | string
  label?: string
  className?: string
  style?: React.CSSProperties
  mediaKey?: string
}

export default async function PhotoSlot({
  width = '100%',
  height = 200,
  label = 'photo',
  className = '',
  style,
  mediaKey,
}: PhotoSlotProps) {
  if (mediaKey) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('media')
      .select('storage_path, alt_text')
      .eq('key', mediaKey)
      .single()

    if (data) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/${data.storage_path}`
      return (
        <div className={`photo-slot ${className}`} style={{ width, height, ...style }}>
          <img
            src={url}
            alt={data.alt_text ?? label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )
    }
  }

  return (
    <div
      className={`photo-slot ${className}`}
      style={{ width, height, ...style }}
    >
      <span className="photo-slot__label">{label}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Any existing `<PhotoSlot />` usages without `mediaKey` continue to render the placeholder unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PhotoSlot.tsx
git commit -m "feat: PhotoSlot renders real image when mediaKey matches media table row"
```

---

## Task 8: Public `/about` Page

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/about/about.css`

- [ ] **Step 1: Create `src/app/about/about.css`**

```css
.about-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.about-hero {
  position: relative;
  height: 360px;
  overflow: hidden;
}

.about-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, oklch(0.08 0.02 270 / 0.5), oklch(0.08 0.02 270 / 0.85));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  gap: 1.5rem;
}

.about-hero__title {
  font-family: var(--serif);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.about-hero__mission {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  color: var(--ink-2);
  max-width: 640px;
  margin: 0;
  line-height: 1.6;
}

.about-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.about-body {
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--ink-2);
  margin: 0 0 2.5rem;
}

.about-cta {
  display: flex;
  justify-content: center;
  padding: 3rem 1.5rem;
  background: var(--surface-2, oklch(0.14 0.015 265));
}

.about-cta__inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.about-cta__heading {
  font-family: var(--serif);
  font-size: 1.75rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}
```

- [ ] **Step 2: Create `src/app/about/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import Link from 'next/link'
import './about.css'

export const metadata = { title: 'About | West Lothian Speakers Club' }

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('about_mission, about_body')
    .eq('id', 1)
    .single()

  const mission = settings?.about_mission ?? 'A friendly public speaking club helping members build confidence.'
  const body    = settings?.about_body    ?? 'We meet regularly to practise speeches and support each other to grow.'

  return (
    <div className="about-page">
      <Navbar />
      <main>
        <section className="about-hero">
          <PhotoSlot mediaKey="about_hero" width="100%" height="100%" label="about hero" style={{ position: 'absolute', inset: 0 }} />
          <div className="about-hero__overlay">
            <h1 className="about-hero__title">West Lothian Speakers Club</h1>
            <p className="about-hero__mission">{mission}</p>
            <Link href="/signup" className="wsc-btn wsc-btn-primary">Come to a meeting</Link>
          </div>
        </section>

        <section className="about-content">
          <p className="about-body">{body}</p>
        </section>

        <section className="about-cta">
          <div className="about-cta__inner">
            <h2 className="about-cta__heading">Ready to give it a try?</h2>
            <p style={{ color: 'var(--ink-3)', margin: 0 }}>Your first three visits are free.</p>
            <Link href="/signup" className="wsc-btn wsc-btn-primary wsc-btn-lg">RSVP for a meeting</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/about/
git commit -m "feat: public /about page with editable mission + body from site_settings"
```

---

## Task 9: Public `/meetings` Page + Navbar Update

**Files:**
- Create: `src/app/meetings/page.tsx`
- Create: `src/app/meetings/meetings.css`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Create `src/app/meetings/meetings.css`**

```css
.meetings-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.meetings-hero {
  position: relative;
  height: 280px;
  overflow: hidden;
}

.meetings-hero__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, oklch(0.08 0.02 270 / 0.4), oklch(0.08 0.02 270 / 0.8));
  display: flex;
  align-items: flex-end;
  padding: 2.5rem;
}

.meetings-hero__title {
  font-family: var(--serif);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.meetings-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  width: 100%;
}

.meetings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.meeting-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
  flex-wrap: wrap;
}

.meeting-card__date-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 120px;
}

.meeting-card__day {
  font-family: var(--mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-4);
}

.meeting-card__date {
  font-family: var(--serif);
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--ink);
}

.meeting-card__meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meeting-card__venue {
  font-size: 0.9rem;
  color: var(--ink-3);
}

.meetings-empty {
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .meeting-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: Create `src/app/meetings/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import Link from 'next/link'
import './meetings.css'

export const metadata = { title: 'Meetings | West Lothian Speakers Club' }

export default async function MeetingsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, meeting_date, theme')
    .gte('meeting_date', today)
    .order('meeting_date', { ascending: true })

  const { data: settings } = await supabase
    .from('site_settings')
    .select('venue_name, meeting_time')
    .eq('id', 1)
    .single()

  const venueName  = settings?.venue_name  ?? 'Wincburgh Village Hall'
  const meetingTime = settings?.meeting_time ?? '7:00 PM'

  return (
    <div className="meetings-page">
      <Navbar />
      <main>
        <section className="meetings-hero">
          <PhotoSlot mediaKey="meetings_hero" width="100%" height="100%" label="meetings hero" style={{ position: 'absolute', inset: 0 }} />
          <div className="meetings-hero__overlay">
            <h1 className="meetings-hero__title">Upcoming Meetings</h1>
          </div>
        </section>

        <section className="meetings-content">
          {meetings && meetings.length > 0 ? (
            <ul className="meetings-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {meetings.map(m => {
                const d = new Date(m.meeting_date)
                const dayName = d.toLocaleDateString('en-GB', { weekday: 'long' })
                const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                return (
                  <li key={m.id}>
                    <div className="meeting-card wsc-card">
                      <div className="meeting-card__date-block">
                        <span className="meeting-card__day">{dayName}</span>
                        <span className="meeting-card__date">{dateStr}</span>
                      </div>
                      <div className="meeting-card__meta">
                        <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{meetingTime}</span>
                        <span className="meeting-card__venue">{venueName}</span>
                        {m.theme && <span style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.2rem' }}>{m.theme}</span>}
                      </div>
                      <Link href="/signup" className="wsc-btn wsc-btn-primary wsc-btn-sm">
                        RSVP
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="meetings-empty">No meetings scheduled yet — check back soon.</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 3: Add About and Meetings to Navbar**

Open `src/components/Navbar.tsx`. Find the nav links array:

```ts
{[['/', 'Home'], ['/news', 'News'], ['/signup', 'Attend'], ['/contact', 'Contact']].map(...)}
```

Replace with:

```ts
{[['/', 'Home'], ['/about', 'About'], ['/meetings', 'Meetings'], ['/news', 'News'], ['/signup', 'Attend'], ['/contact', 'Contact']].map(...)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/meetings/ src/components/Navbar.tsx
git commit -m "feat: public /meetings page + About and Meetings links in Navbar"
```

---

## Task 10: `/member/speeches` Redesign

**Files:**
- Create: `src/app/member/speeches/speeches.css`
- Modify: `src/app/member/speeches/page.tsx`

All inline styles replaced with CSS classes. Layout updated to two-column matching the dashboard.

- [ ] **Step 1: Create `src/app/member/speeches/speeches.css`**

```css
.speeches-page {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.speeches-header {
  margin-bottom: 2rem;
}

.speeches-header h1 {
  font-family: var(--serif);
  font-size: 2rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
}

.speeches-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  align-items: start;
}

.speeches-main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.speeches-section h2 {
  font-family: var(--serif);
  font-size: 1.4rem;
  font-weight: 500;
  margin-bottom: 1rem;
  color: var(--ink);
}

.speeches-section--evals h2 {
  color: var(--success, #10b981);
}

.speeches-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.speech-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.speech-card__body {
  flex: 1;
}

.speech-card__title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.25rem;
}

.speech-card__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--ink-3);
  flex-wrap: wrap;
}

.speech-card__date {
  font-family: var(--mono);
  font-size: 0.85rem;
  color: var(--ink-3);
  white-space: nowrap;
}

.speech-card__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.speech-card--eval-border {
  border-left: 3px solid var(--success, #10b981);
}

.speech-card__details {
  font-size: 0.9rem;
  color: var(--ink-2);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin: 0.75rem 0;
}

.speech-card__feedback {
  background: oklch(0.12 0.01 260 / 0.6);
  padding: 1rem;
  border-radius: var(--r-md);
  border-left: 3px solid var(--primary);
}

.speech-card__feedback-heading {
  font-family: var(--mono);
  font-size: 0.75rem;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 0.5rem;
}

.speech-card__feedback-body {
  white-space: pre-wrap;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--ink-2);
  margin: 0;
}

.speech-card__empty {
  text-align: center;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 0.85rem;
}

.speech-delete-btn {
  background: none;
  border: none;
  color: var(--error, #ef4444);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

/* Sidebar */
.speeches-sidebar {
  position: sticky;
  top: 80px;
  padding: 1.5rem;
}

.speeches-sidebar h2 {
  font-family: var(--serif);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--ink);
  margin: 0 0 0.25rem;
}

.speeches-sidebar__hint {
  font-size: 0.78rem;
  color: var(--ink-4);
  margin: 0 0 1rem;
}

.speeches-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.speeches-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

@media (max-width: 767px) {
  .speeches-layout {
    grid-template-columns: 1fr;
  }

  .speeches-sidebar {
    position: static;
    order: -1;
  }
}
```

- [ ] **Step 2: Rewrite `src/app/member/speeches/page.tsx`**

Replace the entire file with:

```tsx
import { createClient } from '@/utils/supabase/server'
import { logSpeech, deleteSpeech } from './actions'
import FeedbackForm from './FeedbackForm'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import './speeches.css'

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SpeechesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const sortByDate = (a: any, b: any) =>
    (b.meetings?.meeting_date ?? '').localeCompare(a.meetings?.meeting_date ?? '')

  const { data: sessionSpeeches } = await supabase
    .from('meeting_assignments')
    .select('id, role_name, speech_title, speech_level, speech_length, meeting_id, meetings ( meeting_date )')
    .like('role_name', 'Speech%')
    .eq('member_id', user.id)
    .not('speech_title', 'is', null)
  const sortedSessionSpeeches = (sessionSpeeches ?? []).sort(sortByDate)

  const { data: sessionEvals } = await supabase
    .from('meeting_assignments')
    .select('id, role_name, meeting_id, meetings ( meeting_date )')
    .like('role_name', 'Evaluator%')
    .eq('member_id', user.id)
  const sortedSessionEvals = (sessionEvals ?? []).sort(sortByDate)

  const { data: mySpeeches } = await supabase
    .from('speeches')
    .select('*, meeting:meetings(meeting_date), evaluator:profiles!evaluator_id(full_name)')
    .eq('member_id', user.id)
    .order('created_at', { ascending: false })

  const { data: evaluatingSpeeches } = await supabase
    .from('speeches')
    .select('*, meeting:meetings(meeting_date), speaker:profiles!member_id(full_name)')
    .eq('evaluator_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profiles } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const { data: meetings } = await supabase.from('meetings').select('id, meeting_date').order('meeting_date', { ascending: false })
  const evaluatorOptions = (profiles ?? []).filter(p => p.id !== user.id)

  return (
    <main className="speeches-page">
      <header className="speeches-header">
        <EyebrowLabel>Member</EyebrowLabel>
        <h1>Speech Tracker</h1>
      </header>

      <div className="speeches-layout">
        <div className="speeches-main">

          {/* Session Speeches */}
          <section className="speeches-section">
            <h2>Session Speeches</h2>
            <div className="speeches-list">
              {sortedSessionSpeeches.length > 0 ? sortedSessionSpeeches.map((s: any) => (
                <div key={s.id} className="wsc-card speech-card">
                  <div className="speech-card__body">
                    <h3 className="speech-card__title">{s.speech_title}</h3>
                    <div className="speech-card__meta">
                      {s.speech_level && <span className="wsc-tag wsc-tag-gold">{s.speech_level}</span>}
                      {s.speech_length && <span>{s.speech_length}</span>}
                    </div>
                  </div>
                  <span className="speech-card__date">
                    {s.meetings?.meeting_date ? fmtDate(s.meetings.meeting_date) : 'No date'}
                  </span>
                </div>
              )) : (
                <div className="wsc-card speech-card__empty">
                  No session speeches yet — volunteer for a speech slot on the dashboard.
                </div>
              )}
            </div>
          </section>

          {/* Session Evaluations */}
          {sortedSessionEvals.length > 0 && (
            <section className="speeches-section speeches-section--evals">
              <h2>Session Evaluations</h2>
              <div className="speeches-list">
                {sortedSessionEvals.map((e: any) => (
                  <div key={e.id} className="wsc-card speech-card speech-card--eval-border">
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.role_name}</span>
                    <span className="speech-card__date">
                      {e.meetings?.meeting_date ? fmtDate(e.meetings.meeting_date) : 'No date'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Manually Logged Speeches */}
          <section className="speeches-section">
            <h2>Manually Logged Speeches</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-4)', marginBottom: '1rem', marginTop: 0 }}>
              For speeches not recorded through the dashboard (e.g. historical entries).
            </p>
            <div className="speeches-list">
              {mySpeeches && mySpeeches.length > 0 ? mySpeeches.map(speech => (
                <div key={speech.id} className="wsc-card">
                  <div className="speech-card">
                    <div className="speech-card__body">
                      <h3 className="speech-card__title">{speech.title}</h3>
                    </div>
                    <div className="speech-card__actions">
                      <span className="speech-card__date">
                        {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
                      </span>
                      <form action={deleteSpeech} onSubmit={e => { if (!confirm('Delete this speech entry?')) e.preventDefault() }}>
                        <input type="hidden" name="speechId" value={speech.id} />
                        <button type="submit" className="speech-delete-btn">Delete</button>
                      </form>
                    </div>
                  </div>
                  <div className="speech-card__details">
                    <span><strong>Pathway:</strong> {speech.pathway || '—'}</span>
                    <span><strong>Project:</strong> {speech.project || '—'}</span>
                    <span><strong>Evaluator:</strong> {speech.evaluator?.full_name || 'Unassigned'}</span>
                  </div>
                  {speech.feedback_notes && (
                    <div className="speech-card__feedback">
                      <h4 className="speech-card__feedback-heading">Evaluator Feedback</h4>
                      <p className="speech-card__feedback-body">{speech.feedback_notes}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="wsc-card speech-card__empty">
                  No manually logged speeches. Use the form to add historical entries.
                </div>
              )}
            </div>
          </section>

          {/* Evaluations I'm Assigned */}
          {evaluatingSpeeches && evaluatingSpeeches.length > 0 && (
            <section className="speeches-section speeches-section--evals">
              <h2>Evaluating (Logged Speeches)</h2>
              <div className="speeches-list">
                {evaluatingSpeeches.map(speech => (
                  <div key={speech.id} className="wsc-card speech-card--eval-border" style={{ padding: '1.5rem' }}>
                    <div className="speech-card">
                      <div className="speech-card__body">
                        <h3 className="speech-card__title">{speech.title}</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--ink-2)', margin: '0.2rem 0 0.75rem' }}>
                          <strong>Speaker:</strong> {speech.speaker?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <span className="speech-card__date">
                        {speech.meeting?.meeting_date ? fmtDate(speech.meeting.meeting_date) : 'No date'}
                      </span>
                    </div>
                    <FeedbackForm speechId={speech.id} defaultValue={speech.feedback_notes || ''} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar: Log Speech Form */}
        <aside className="speeches-sidebar wsc-card">
          <h2>Log a Historical Speech</h2>
          <p className="speeches-sidebar__hint">For speeches not recorded through the session dashboard.</p>
          <form action={logSpeech} className="speeches-form">
            <div className="speeches-form__field">
              <label className="wsc-label" htmlFor="speech-title">Title *</label>
              <input id="speech-title" type="text" name="title" required className="wsc-input" />
            </div>
            <div className="speeches-form__field">
              <label className="wsc-label" htmlFor="speech-meeting">Meeting</label>
              <select id="speech-meeting" name="meeting_id" className="wsc-input">
                <option value="">Select a meeting…</option>
                {meetings?.map(m => (
                  <option key={m.id} value={m.id}>{fmtDate(m.meeting_date)}</option>
                ))}
              </select>
            </div>
            <div className="speeches-form__field">
              <label className="wsc-label" htmlFor="speech-pathway">Pathway</label>
              <input id="speech-pathway" type="text" name="pathway" placeholder="e.g. Dynamic Leadership" className="wsc-input" />
            </div>
            <div className="speeches-form__field">
              <label className="wsc-label" htmlFor="speech-project">Project</label>
              <input id="speech-project" type="text" name="project" placeholder="e.g. Ice Breaker" className="wsc-input" />
            </div>
            <div className="speeches-form__field">
              <label className="wsc-label" htmlFor="speech-evaluator">Evaluator</label>
              <select id="speech-evaluator" name="evaluator_id" className="wsc-input">
                <option value="">Select evaluator…</option>
                {evaluatorOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Log Speech</button>
          </form>
        </aside>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. The data fetching, `logSpeech`, `deleteSpeech`, and `FeedbackForm` are unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/app/member/speeches/speeches.css src/app/member/speeches/page.tsx
git commit -m "feat: speeches page redesign — design tokens + two-column layout"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Email system (Tasks 2–5) ✓, invite safeguards DB columns (Task 1) ✓, media table + Storage (Tasks 1, 6) ✓, PhotoSlot upgrade (Task 7) ✓, `/about` (Task 8) ✓, `/meetings` (Task 9) ✓, Navbar links (Task 9) ✓, speeches redesign (Task 10) ✓, admin media nav link (Task 6) ✓, `site_settings` columns (Task 1) ✓
- [x] **No placeholders:** All steps contain actual code
- [x] **Type consistency:** `ContactPayload` defined in Task 2 and referenced in Task 5 ✓; `MediaRow` defined in Task 6 component matches `media` table shape ✓; `sendInviteEmail` / `sendRsvpConfirmation` / `sendContactNotification` signatures consistent across Tasks 2–5 ✓
