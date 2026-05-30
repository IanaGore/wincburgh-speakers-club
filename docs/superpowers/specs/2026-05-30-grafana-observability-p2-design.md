# Grafana Cloud Observability — Sub-project 2 Design (Faro Browser SDK)

> **For agentic workers:** This spec is implemented via `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Read the linked implementation plan for task-by-task instructions.

**Goal:** Instrument the Speakers Club Next.js portal with Grafana Faro to capture browser errors, Web Vitals, and key user interaction events, with authenticated user context attached to every event.

**Architecture:** Two leaf client components (`FaroInit`, `FaroUserSync`) added to the root layout with no wrapping boundary. A thin `getFaro()` helper in `src/lib/faro.ts` gives any client component access to the SDK for custom events.

**Tech Stack:** `@grafana/faro-web-sdk`, `@grafana/faro-web-tracing`, Next.js 16 App Router, Supabase SSR

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/observability/FaroInit.tsx` | Initialise Faro SDK once on mount |
| Create | `src/components/observability/FaroUserSync.tsx` | Attach user ID + role after auth resolves |
| Create | `src/lib/faro.ts` | `getFaro()` helper — safe accessor for the global Faro instance |
| Modify | `src/app/layout.tsx` | Add `<FaroInit />` and `<FaroUserSync />` as leaf nodes inside `<body>` |
| Modify | `src/app/member/dashboard/VolunteerForm.tsx` | Push `volunteer_claimed` and `volunteer_dropped` custom events |
| Modify | `src/app/member/speeches/FeedbackForm.tsx` | Push `speech_submitted` custom event |
| Modify | `src/app/login/LoginForm.tsx` | Push `auth_error` custom event on failed login |

---

## Environment Variables

Two `NEXT_PUBLIC_` vars required — safe to expose in the browser:

```
NEXT_PUBLIC_FARO_URL=https://faro-collector-prod-eu-west-0.grafana.net/collect/<your-app-id>
NEXT_PUBLIC_FARO_APP_NAME=speakers-club-portal
```

**Where to get them:** Grafana Cloud → Application Observability → Add new app → Web SDK → copy the collector URL. The app name is freeform.

Add to:
- `.env.local` for local development
- Vercel project → Settings → Environment Variables for production

---

## Component Design

### `FaroInit.tsx`

`'use client'` component. On mount, calls `initializeFaro()` from `@grafana/faro-web-sdk` with:
- `url`: `process.env.NEXT_PUBLIC_FARO_URL`
- `app.name`: `process.env.NEXT_PUBLIC_FARO_APP_NAME`
- `app.version`: `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev'` (Vercel sets this automatically)
- `instrumentations`: `[...getWebInstrumentations(), new TracingInstrumentation()]`

Guards against double-init (Next.js renders components twice in dev Strict Mode) by checking `window.__faro` before calling init. Returns `null` (renders nothing).

### `FaroUserSync.tsx`

`'use client'` component. Uses `useEffect` with Supabase's `onAuthStateChange` listener to call `getFaro()?.api.setUser()` whenever session changes:

```ts
faro.api.setUser({
  id: user.id,
  attributes: { role: profile.is_admin ? 'admin' : 'member' },
})
```

Calls `faro.api.resetUser()` on sign-out. Reads `profiles.is_admin` via a single Supabase query on mount. Returns `null`.

### `src/lib/faro.ts`

```ts
import type { Faro } from '@grafana/faro-web-sdk'

export function getFaro(): Faro | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { __faro?: Faro }).__faro
}
```

Safe to call from any client component — returns `undefined` on the server or before init.

---

## Custom Events

| Event name | Fired in | Payload |
|---|---|---|
| `volunteer_claimed` | `VolunteerForm.tsx` — after successful server action | `{ meetingId, roleId }` |
| `volunteer_dropped` | `VolunteerForm.tsx` — after successful drop | `{ meetingId, roleId }` |
| `speech_submitted` | `FeedbackForm.tsx` — after successful submit | `{ speechId }` |
| `auth_error` | `LoginForm.tsx` — on login failure | `{ reason: error.message }` |

Pattern for pushing a custom event:

```ts
getFaro()?.api.pushEvent('volunteer_claimed', { meetingId, roleId })
```

---

## Automatic Instrumentation (no extra code)

The `getWebInstrumentations()` call enables:
- Unhandled JS errors and promise rejections
- Web Vitals (LCP, FID, CLS, TTFB, FCP)
- Navigation/page-load timing
- Console error forwarding
- Session tracking (automatic session ID per browser session)

---

## Root Layout Integration

`src/app/layout.tsx` — add both components as leaf nodes inside `<body>`. The layout remains a Server Component; the Faro components are isolated client leaves:

```tsx
import FaroInit from '@/components/observability/FaroInit'
import FaroUserSync from '@/components/observability/FaroUserSync'

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={...}>
      <body>
        {children}
        <FaroInit />
        <FaroUserSync />
      </body>
    </html>
  )
}
```

---

## Out of Scope

- Server-side OpenTelemetry tracing (sub-project 3)
- Alerting rules in Grafana (can be configured in the UI after data flows in)
- Custom dashboards (Grafana Application Observability provides a default dashboard automatically)
