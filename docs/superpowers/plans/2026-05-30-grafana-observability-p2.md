# Grafana Faro Browser Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument the Speakers Club Next.js portal with Grafana Faro to capture browser errors, Web Vitals, and key interaction events with authenticated user context.

**Architecture:** Two leaf client components (`FaroInit`, `FaroUserSync`) added to root layout. A `getFaro()` helper exposes the SDK to client components for custom events. Drop role form extracted to a client component to enable event tracking.

**Tech Stack:** `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`, Next.js 16 App Router, Supabase SSR (`@supabase/ssr`)

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/components/observability/FaroInit.tsx` |
| Create | `src/components/observability/FaroUserSync.tsx` |
| Create | `src/lib/faro.ts` |
| Create | `src/app/member/dashboard/DropRoleButton.tsx` |
| Modify | `src/app/layout.tsx` |
| Modify | `src/app/member/dashboard/VolunteerForm.tsx` |
| Modify | `src/app/member/dashboard/page.tsx` |
| Modify | `src/app/member/speeches/FeedbackForm.tsx` |
| Modify | `src/app/login/LoginForm.tsx` |

---

### Task 1: Install packages and add env vars

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install Faro packages**

```bash
npm install @grafana/faro-web-sdk @grafana/faro-web-tracing
```

Expected: packages added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Add env vars to `.env.local`**

Add these two lines to `.env.local` (create the file if it doesn't exist):

```
NEXT_PUBLIC_FARO_URL=https://faro-collector-prod-eu-west-0.grafana.net/collect/<your-app-id>
NEXT_PUBLIC_FARO_APP_NAME=speakers-club-portal
```

To get the real `NEXT_PUBLIC_FARO_URL`: Grafana Cloud → Application Observability → Add new app → Web SDK → copy the collector URL. The `<your-app-id>` segment is embedded in that URL.

- [ ] **Step 3: Verify TypeScript can see the packages**

```bash
npx tsc --noEmit 2>&1 | grep faro
```

Expected: no output (no faro-related type errors).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install Grafana Faro web SDK packages"
```

---

### Task 2: Create `getFaro()` helper

**Files:**
- Create: `src/lib/faro.ts`

This module is the single import point for custom events. It returns `undefined` on the server (SSR) and before the SDK initialises — all callers use optional chaining (`getFaro()?.api.pushEvent(...)`).

- [ ] **Step 1: Create `src/lib/faro.ts`**

```ts
import type { Faro } from '@grafana/faro-web-sdk'

export function getFaro(): Faro | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { __faro?: Faro }).__faro
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/faro.ts
git commit -m "feat: add getFaro() helper for safe Faro SDK access"
```

---

### Task 3: Create `FaroInit` component

**Files:**
- Create: `src/components/observability/FaroInit.tsx`

This component initialises the Faro SDK exactly once per page load. It guards against double-init (Next.js Strict Mode renders twice in dev).

- [ ] **Step 1: Create `src/components/observability/FaroInit.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { initializeFaro, getWebInstrumentations } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

export default function FaroInit() {
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_FARO_URL
    if (!url) return
    // Guard against double-init in React Strict Mode
    if ((window as unknown as { __faro?: unknown }).__faro) return

    initializeFaro({
      url,
      app: {
        name: process.env.NEXT_PUBLIC_FARO_APP_NAME ?? 'speakers-club-portal',
        version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev',
      },
      instrumentations: [
        ...getWebInstrumentations(),
        new TracingInstrumentation(),
      ],
    })
  }, [])

  return null
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/observability/FaroInit.tsx
git commit -m "feat: add FaroInit client component"
```

---

### Task 4: Create `FaroUserSync` component

**Files:**
- Create: `src/components/observability/FaroUserSync.tsx`

This component attaches the authenticated user's ID and role to every subsequent Faro event. It listens to Supabase auth state changes so it updates on sign-in and clears on sign-out.

- [ ] **Step 1: Create `src/components/observability/FaroUserSync.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getFaro } from '@/lib/faro'

export default function FaroUserSync() {
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const faro = getFaro()
        if (!faro) return

        if (!session?.user) {
          faro.api.resetUser()
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single()

        faro.api.setUser({
          id: session.user.id,
          attributes: {
            role: profile?.is_admin ? 'admin' : 'member',
          },
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return null
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/observability/FaroUserSync.tsx
git commit -m "feat: add FaroUserSync — attaches user ID and role to Faro sessions"
```

---

### Task 5: Wire components into root layout

**Files:**
- Modify: `src/app/layout.tsx`

Add `<FaroInit />` and `<FaroUserSync />` as leaf nodes inside `<body>`. The root layout stays a Server Component — these are isolated client leaves.

Current `layout.tsx`:
```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 1: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Newsreader, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import FaroInit from '@/components/observability/FaroInit'
import FaroUserSync from '@/components/observability/FaroUserSync'

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Winchburgh Speakers Club',
  description: 'A friendly community of speakers in Winchburgh, West Lothian.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <FaroInit />
        <FaroUserSync />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Start dev server and check browser console**

```bash
npm run dev
```

Open http://localhost:3000. In browser DevTools → Network tab, filter by `collect`. After ~2 seconds you should see a POST request to the Faro collector URL. If `NEXT_PUBLIC_FARO_URL` is not set yet, no request fires — that's fine, no errors should appear in the console either.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire FaroInit and FaroUserSync into root layout"
```

---

### Task 6: Add `volunteer_claimed` event to `VolunteerForm`

**Files:**
- Modify: `src/app/member/dashboard/VolunteerForm.tsx`

`VolunteerForm` currently calls `actionFn` as a form `action` prop (direct server action). Wrap the call in `useTransition` to detect success and push the Faro event.

- [ ] **Step 1: Update `src/app/member/dashboard/VolunteerForm.tsx`**

Add `useTransition` import and wrap the form submissions. Only the **Volunteer** submission (non-speech default mode and speech expanded form) needs the event — the assign-other flow fires on behalf of another member so omit it there.

Replace the top of the file and the two volunteer form renders:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { getFaro } from '@/lib/faro'

interface Assignment {
  id: string
  role_name: string
  member_id: string | null
  speech_title?: string | null
  speech_level?: string | null
  speech_length?: string | null
}

interface VolunteerFormProps {
  assignment: Assignment
  actionFn: (formData: FormData) => Promise<void>
  members: { id: string; full_name: string }[]
  meetingId: string
  dark?: boolean
}

export default function VolunteerForm({
  assignment,
  actionFn,
  members,
  meetingId,
  dark = false,
}: VolunteerFormProps) {
  const [showSpeechForm, setShowSpeechForm] = useState(false)
  const [showAssignOther, setShowAssignOther] = useState(false)
  const [, startTransition] = useTransition()

  const isSpeech = assignment.role_name.startsWith('Speech') || assignment.role_name.startsWith('Speaker')
  const selectClass = dark ? 'dash-select' : 'wsc-input'
  const inputClass  = dark ? 'dash-input'  : 'wsc-input'

  function handleVolunteer(formData: FormData) {
    startTransition(async () => {
      await actionFn(formData)
      getFaro()?.api.pushEvent('volunteer_claimed', {
        meetingId,
        roleId: assignment.id,
      })
    })
  }

  // ── Non-speech: assign-other mode ─────────────────────────
  if (!isSpeech && showAssignOther) {
    return (
      <form action={actionFn} className="dash-volunteer-form">
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <input type="hidden" name="meetingId" value={meetingId} />
        <select name="target_member_id" required className={selectClass}>
          <option value="">Select member...</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
        <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setShowAssignOther(false)}
          className="dash-btn-ghost-sm"
        >
          Cancel
        </button>
      </form>
    )
  }

  // ── Non-speech: default mode ───────────────────────────────
  if (!isSpeech) {
    return (
      <div className="dash-volunteer-form">
        <form action={handleVolunteer}>
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <input type="hidden" name="meetingId" value={meetingId} />
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%' }}>
            Volunteer
          </button>
        </form>
        <button
          type="button"
          onClick={() => setShowAssignOther(true)}
          className="dash-btn-ghost-sm"
        >
          Assign to member
        </button>
      </div>
    )
  }

  // ── Speech: initial button ─────────────────────────────────
  if (!showSpeechForm) {
    return (
      <button
        onClick={() => setShowSpeechForm(true)}
        className="wsc-btn wsc-btn-primary wsc-btn-sm"
        style={{ width: '100%' }}
      >
        Volunteer
      </button>
    )
  }

  // ── Speech: expanded form ──────────────────────────────────
  return (
    <form action={handleVolunteer} className="dash-volunteer-form">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="meetingId" value={meetingId} />

      <div className="dash-speech-expand">
        <p className="dash-speech-expand__label">Speech Details</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="wsc-label" style={{ fontSize: 11 }}>Volunteering as</label>
          <select name="target_member_id" className={selectClass}>
            <option value="">Myself</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>

        <select name="speech_level" required className={selectClass}>
          <option value="">Select Level...</option>
          <optgroup label="Foundation">
            {['F1', 'F2', 'F3', 'F4', 'F5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
          <optgroup label="Advanced">
            {['A1', 'A2', 'A3', 'A4', 'A5'].map(l => <option key={l} value={l}>{l}</option>)}
          </optgroup>
        </select>
        <input type="text" name="speech_title" placeholder="Speech Title" required className={inputClass} />
        <input type="text" name="speech_length" placeholder="Estimated Length" defaultValue="6 - 8 minutes" required className={inputClass} />
      </div>

      <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ width: '100%', marginTop: 4 }}>
        Confirm Speech
      </button>
      <button
        type="button"
        onClick={() => setShowSpeechForm(false)}
        className="dash-btn-ghost-sm"
      >
        Cancel
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/member/dashboard/VolunteerForm.tsx
git commit -m "feat: push volunteer_claimed Faro event on successful volunteer"
```

---

### Task 7: Extract `DropRoleButton` and add `volunteer_dropped` event

**Files:**
- Create: `src/app/member/dashboard/DropRoleButton.tsx`
- Modify: `src/app/member/dashboard/page.tsx`

The drop form is currently inline in the Server Component `page.tsx`. Extract it to a client component so we can push a Faro event on success.

- [ ] **Step 1: Create `src/app/member/dashboard/DropRoleButton.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { getFaro } from '@/lib/faro'
import { dropRole } from './actions'

interface DropRoleButtonProps {
  assignmentId: string
  meetingId: string
}

export default function DropRoleButton({ assignmentId, meetingId }: DropRoleButtonProps) {
  const [, startTransition] = useTransition()

  function handleDrop(formData: FormData) {
    startTransition(async () => {
      await dropRole(formData)
      getFaro()?.api.pushEvent('volunteer_dropped', {
        meetingId,
        roleId: assignmentId,
      })
    })
  }

  return (
    <form action={handleDrop}>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button type="submit" className="dash-drop-btn">Drop out</button>
    </form>
  )
}
```

- [ ] **Step 2: Update `src/app/member/dashboard/page.tsx` to use `DropRoleButton`**

Find the inline drop form (around line 78):

```tsx
<form action={dropRole}>
  <input type="hidden" name="assignmentId" value={assignment.id} />
  <button type="submit" className="dash-drop-btn">Drop out</button>
</form>
```

Replace it with:

```tsx
<DropRoleButton assignmentId={assignment.id} meetingId={meeting.id} />
```

Add the import at the top of `page.tsx`:

```tsx
import DropRoleButton from './DropRoleButton'
```

Remove the `dropRole` import from `page.tsx` if it is no longer used elsewhere in that file:

```tsx
// Before:
import { volunteerForRole, dropRole } from './actions'
// After (if dropRole no longer used in page.tsx):
import { volunteerForRole } from './actions'
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/member/dashboard/DropRoleButton.tsx src/app/member/dashboard/page.tsx
git commit -m "feat: extract DropRoleButton, push volunteer_dropped Faro event"
```

---

### Task 8: Add `speech_submitted` event to `FeedbackForm`

**Files:**
- Modify: `src/app/member/speeches/FeedbackForm.tsx`

`FeedbackForm` already uses `useTransition`. Add the Faro push after `await addFeedback(formData)`.

- [ ] **Step 1: Update `src/app/member/speeches/FeedbackForm.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { addFeedback } from './actions'
import { getFaro } from '@/lib/faro'

export default function FeedbackForm({ speechId, defaultValue }: { speechId: string; defaultValue: string }) {
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addFeedback(formData)
      getFaro()?.api.pushEvent('speech_submitted', { speechId })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form action={handleSubmit} style={{ marginTop: "1rem" }}>
      <input type="hidden" name="speech_id" value={speechId} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <label style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Your Feedback</label>
        <textarea
          name="feedback_notes"
          defaultValue={defaultValue}
          rows={4}
          placeholder="Provide constructive feedback here..."
          style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", resize: "vertical", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          style={{ padding: "0.5rem 1rem", background: "#10b981" }}
        >
          {isPending ? 'Saving…' : 'Save Feedback'}
        </button>
        {saved && (
          <span style={{ color: "#10b981", fontSize: "0.9rem", fontWeight: "600" }}>✓ Saved!</span>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/member/speeches/FeedbackForm.tsx
git commit -m "feat: push speech_submitted Faro event on feedback save"
```

---

### Task 9: Add `auth_error` event to `LoginForm`

**Files:**
- Modify: `src/app/login/LoginForm.tsx`

`LoginForm` receives an `error` prop from the server. Use `useEffect` to watch for the prop changing and push the Faro event whenever a non-empty error arrives.

- [ ] **Step 1: Update `src/app/login/LoginForm.tsx`**

Add the import at the top:

```tsx
import { useEffect } from 'react'
import { getFaro } from '@/lib/faro'
```

The existing imports already include `useState` — update the React import:

```tsx
import { useState, useEffect } from 'react'
```

Add this `useEffect` inside the `LoginForm` component, after the existing `useState` declarations:

```tsx
useEffect(() => {
  if (error) {
    getFaro()?.api.pushEvent('auth_error', { reason: error })
  }
}, [error])
```

No other changes to `LoginForm.tsx`.

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/LoginForm.tsx
git commit -m "feat: push auth_error Faro event on failed login"
```

---

### Task 10: Add Vercel environment variables and verify end-to-end

**Files:** Vercel dashboard (no code changes)

- [ ] **Step 1: Add env vars to Vercel**

In Vercel → Project → Settings → Environment Variables, add:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_FARO_URL` | `https://faro-collector-prod-eu-west-0.grafana.net/collect/<your-app-id>` | Production, Preview, Development |
| `NEXT_PUBLIC_FARO_APP_NAME` | `speakers-club-portal` | Production, Preview, Development |

- [ ] **Step 2: Deploy**

```bash
git push origin fix/security-audit
```

Wait for Vercel to deploy. Open the production URL.

- [ ] **Step 3: Verify data flows into Grafana**

In Grafana Cloud → Application Observability, within ~2 minutes of opening the production site you should see:
- The `speakers-club-portal` app appear in the app list
- Web Vitals metrics (LCP, CLS, FCP) in the default dashboard
- No errors in the browser console

- [ ] **Step 4: Final commit (plan completion marker)**

```bash
git add .
git commit -m "feat: Grafana Faro browser observability complete — errors, Web Vitals, custom events"
```
