# Website Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the new Winchburgh Speakers Club visual identity (loch-blue/amber palette, serif headlines, light mode) across the public site — Homepage, Contact, Login — plus the shared component system.

**Architecture:** Vanilla CSS with CSS custom properties. Design tokens and shared component classes live in `globals.css`. Each new component and page has its own `.css` file imported where used. Admin (`/admin/*`) and member (`/member/*`) routes are untouched. A dedicated `portal.css` protects those dark-theme routes from the new light-mode defaults.

**Tech Stack:** Next.js 16 App Router, Supabase SSR (`@supabase/ssr`), vanilla CSS, Google Fonts via `next/font/google` (Newsreader, Inter, JetBrains Mono).

**Design reference:** `../design_handoff_speakers_club_portal/designs/` — read `README.md`, `design-system.css`, and individual `wsc-*.jsx` files for exact values.

**Start the dev server before Task 6 and keep it running.** Use `npm run dev` and check `http://localhost:3000` after each page task.

---

## File Map

**Create:**
- `src/app/portal.css` — dark-theme overrides for admin/member routes
- `src/components/Wordmark.tsx` + `Wordmark.css`
- `src/components/Footer.tsx` + `Footer.css`
- `src/components/Navbar.css`
- `src/components/ui/PhotoSlot.tsx` + `PhotoSlot.css`
- `src/components/ui/EyebrowLabel.tsx`
- `src/components/ui/Tag.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/app/page.css`
- `src/app/contact/contact.css`
- `src/app/login/LoginForm.tsx` + `login.css`

**Modify:**
- `src/app/globals.css` — full replacement
- `src/app/layout.tsx` — swap fonts
- `src/components/Navbar.tsx` — full replacement
- `src/app/page.tsx` — full replacement
- `src/app/contact/page.tsx` — full replacement
- `src/app/login/page.tsx` — full replacement
- `src/app/member/layout.tsx` — add explicit dark bg + import portal.css
- `src/app/admin/layout.tsx` — add explicit dark bg + import portal.css

**Leave untouched:**
- `src/components/PortalNav.tsx`
- `src/app/member/**` (except layout.tsx)
- `src/app/admin/**` (except layout.tsx)
- `src/app/login/actions.ts`
- `src/app/contact/actions.ts`

---

## Task 1: Protect portal routes from new light-mode defaults

The new `globals.css` sets a light body background. Admin and member pages were built for dark mode. This task creates a guard file and updates both portal layouts before touching `globals.css`.

**Files:**
- Create: `src/app/portal.css`
- Modify: `src/app/member/layout.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/app/portal.css`**

```css
/*
  portal.css — dark-theme overrides for /admin/* and /member/* routes.
  Imported in both admin/layout.tsx and member/layout.tsx.
  Remove after Phase 2 portal redesign.
*/

/* Override body background for portal routes via wrapper */
.portal-root {
  background: #0f172a;
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Legacy colour tokens used by portal pages */
.portal-root {
  --background: #0f172a;
  --foreground: #f8fafc;
  --primary: #0ea5e9;
  --primary-hover: #0284c7;
  --card-bg: rgba(30, 41, 59, 0.7);
  --card-border: rgba(255, 255, 255, 0.1);
}

/* Legacy button classes used by portal pages */
.portal-root .btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.6rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.3);
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
.portal-root .btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
}
.portal-root .btn-secondary {
  background: transparent;
  color: var(--foreground);
  padding: 0.6rem 1.5rem;
  border-radius: 50px;
  font-weight: 600;
  border: 1px solid var(--card-border);
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
.portal-root .btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

- [ ] **Step 2: Update `src/app/member/layout.tsx`**

```tsx
import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import '../portal.css'

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  return (
    <div className="portal-root">
      <PortalNav isAdminView={false} />
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Update `src/app/admin/layout.tsx`**

```tsx
import PortalNav from '@/components/PortalNav'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import '../portal.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  if (!profile?.is_admin) {
    return (
      <div className="portal-root" style={{ padding: '4rem', textAlign: 'center' }}>
        <h1 style={{ color: '#f87171', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>You must be an administrator to view this page.</p>
        <a href="/member/dashboard" className="btn-primary" style={{ padding: '0.8rem 1.5rem' }}>Return to Dashboard</a>
      </div>
    )
  }

  return (
    <div className="portal-root">
      <PortalNav isAdminView={true} />
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/portal.css src/app/member/layout.tsx src/app/admin/layout.tsx
git commit -m "feat: add portal.css guard for dark-mode admin/member routes"
```

---

## Task 2: Replace globals.css with new design token system

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the entire file**

```css
/* ============================================================
   Winchburgh Speakers Club — Design System
   New light-mode tokens for public site.
   Portal routes are handled via portal.css in their layouts.
   ============================================================ */

:root {
  /* Surface */
  --paper:      oklch(0.970 0.010 230);
  --paper-2:    oklch(0.950 0.014 230);
  --paper-3:    oklch(0.91 0.020 230);
  --rule:       oklch(0.85 0.025 230);
  --rule-soft:  oklch(0.91 0.018 230);

  /* Ink */
  --ink:   oklch(0.24 0.040 245);
  --ink-2: oklch(0.38 0.045 245);
  --ink-3: oklch(0.54 0.040 240);
  --ink-4: oklch(0.68 0.030 235);

  /* Primary — loch blue */
  --clay:      oklch(0.56 0.155 240);
  --clay-deep: oklch(0.44 0.155 245);
  --clay-soft: oklch(0.92 0.045 235);

  /* Secondary — kingfisher teal */
  --sage:      oklch(0.68 0.135 200);
  --sage-soft: oklch(0.93 0.045 200);

  /* Tertiary — sunrise amber */
  --gold: oklch(0.78 0.135 75);

  /* Dark sections */
  --night:   oklch(0.22 0.060 250);
  --night-2: oklch(0.30 0.065 245);

  /* Signature gradient */
  --gradient: linear-gradient(135deg, var(--clay) 0%, var(--gold) 100%);

  /* Type */
  --serif: var(--font-newsreader), "Source Serif 4", Georgia, serif;
  --sans:  var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --mono:  var(--font-jetbrains-mono), ui-monospace, "SF Mono", Menlo, monospace;

  /* Radius */
  --r-sm:   6px;
  --r-md:   10px;
  --r-lg:   16px;
  --r-xl:   24px;
  --r-pill: 999px;

  /* Shadow */
  --shadow-sm: 0 1px 2px oklch(0.22 0.02 60 / 0.06);
  --shadow-md: 0 4px 14px oklch(0.22 0.02 60 / 0.08), 0 1px 3px oklch(0.22 0.02 60 / 0.05);
  --shadow-lg: 0 18px 40px oklch(0.22 0.02 60 / 0.12), 0 2px 6px oklch(0.22 0.02 60 / 0.06);
}

/* ============================================================
   Base reset
   ============================================================ */

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--sans);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}

a {
  color: inherit;
  text-decoration: none;
}

img, svg {
  display: block;
  max-width: 100%;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--serif);
  font-weight: 500;
  letter-spacing: -0.015em;
  line-height: 1.05;
  color: var(--ink);
  margin: 0;
  text-wrap: balance;
}

p {
  margin: 0;
  line-height: 1.6;
  text-wrap: pretty;
}

/* ============================================================
   WSC component classes — used across multiple pages
   ============================================================ */

/* Buttons */
.wsc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 22px;
  border-radius: var(--r-pill);
  font-family: var(--sans);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.01em;
  border: 1.5px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.15s ease, background 0.2s, box-shadow 0.2s, border-color 0.2s;
  white-space: nowrap;
}
.wsc-btn:active { transform: translateY(1px); }

.wsc-btn-primary {
  background: var(--gradient);
  color: oklch(0.99 0.005 80);
  box-shadow: var(--shadow-md);
}
.wsc-btn-primary:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.wsc-btn-ghost {
  background: transparent;
  color: var(--ink);
  border-color: var(--rule);
}
.wsc-btn-ghost:hover {
  background: var(--paper-2);
  border-color: var(--ink-3);
}

.wsc-btn-ghost-light {
  background: transparent;
  color: white;
  border-color: oklch(0.97 0.01 80 / 0.4);
}
.wsc-btn-ghost-light:hover {
  background: oklch(1 0 0 / 0.08);
  border-color: oklch(0.97 0.01 80 / 0.65);
}

.wsc-btn-sm {
  height: 38px;
  padding: 0 16px;
  font-size: 14px;
}

/* Tags */
.wsc-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--r-pill);
  font-size: 11px;
  font-family: var(--mono);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--paper-3);
  color: var(--ink-2);
}
.wsc-tag-clay { background: var(--clay-soft); color: var(--clay-deep); }
.wsc-tag-sage { background: var(--sage-soft); color: oklch(0.36 0.08 200); }
.wsc-tag-gold { background: oklch(0.94 0.07 80); color: oklch(0.42 0.135 65); }

/* Card */
.wsc-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  padding: 24px;
}

/* Inputs */
.wsc-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wsc-input:focus {
  outline: none;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18);
}
.wsc-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wsc-textarea:focus {
  outline: none;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18);
}
.wsc-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-2);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}

/* Photo placeholder */
.wsc-photo {
  background: repeating-linear-gradient(
    135deg,
    oklch(0.84 0.045 230) 0 12px,
    oklch(0.89 0.035 230) 12px 24px
  );
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 11px;
  color: oklch(0.40 0.045 235);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
}

/* Eyebrow label */
.wsc-eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* Focus ring for interactive elements */
:focus-visible {
  outline: 2px solid var(--clay);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace globals.css with new design token system"
```

---

## Task 3: Update font loading in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import type { Metadata } from 'next'
import { Newsreader, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Run dev server and verify fonts load**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. Open DevTools → Network → filter by "font". You should see requests to `fonts.gstatic.com` for Newsreader, Inter, and JetBrains Mono. The page will look unstyled at this point — that's expected.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: load Newsreader, Inter, JetBrains Mono fonts"
```

---

## Task 4: PhotoSlot component

**Files:**
- Create: `src/components/ui/PhotoSlot.tsx`
- Create: `src/components/ui/PhotoSlot.css`

- [ ] **Step 1: Create directory**

```bash
mkdir -p src/components/ui
```

- [ ] **Step 2: Create `src/components/ui/PhotoSlot.css`**

```css
.photo-slot {
  background: repeating-linear-gradient(
    135deg,
    oklch(0.84 0.045 230) 0 12px,
    oklch(0.89 0.035 230) 12px 24px
  );
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.photo-slot__label {
  font-family: var(--mono);
  font-size: 11px;
  color: oklch(0.40 0.045 235);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--paper);
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--r-pill);
}
```

- [ ] **Step 3: Create `src/components/ui/PhotoSlot.tsx`**

```tsx
import './PhotoSlot.css'

interface PhotoSlotProps {
  width?: number | string
  height?: number | string
  label?: string
  className?: string
  style?: React.CSSProperties
}

export default function PhotoSlot({
  width = '100%',
  height = 200,
  label = 'photo',
  className = '',
  style,
}: PhotoSlotProps) {
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

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/PhotoSlot.tsx src/components/ui/PhotoSlot.css
git commit -m "feat: add PhotoSlot placeholder component"
```

---

## Task 5: UI primitive components (EyebrowLabel, Tag, Button, Input)

These four components apply global CSS classes from `globals.css` — no separate CSS files needed.

**Files:**
- Create: `src/components/ui/EyebrowLabel.tsx`
- Create: `src/components/ui/Tag.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`

- [ ] **Step 1: Create `src/components/ui/EyebrowLabel.tsx`**

```tsx
interface EyebrowLabelProps {
  children: React.ReactNode
  className?: string
  color?: 'default' | 'clay' | 'gold'
}

export default function EyebrowLabel({
  children,
  className = '',
  color = 'default',
}: EyebrowLabelProps) {
  const colorStyle =
    color === 'clay'
      ? { color: 'var(--clay-deep)' }
      : color === 'gold'
        ? { color: 'oklch(0.55 0.155 60)' }
        : undefined

  return (
    <span className={`wsc-eyebrow ${className}`} style={colorStyle}>
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/Tag.tsx`**

```tsx
interface TagProps {
  children: React.ReactNode
  variant?: 'default' | 'clay' | 'sage' | 'gold'
}

export default function Tag({ children, variant = 'default' }: TagProps) {
  const variantClass =
    variant === 'clay'
      ? 'wsc-tag-clay'
      : variant === 'sage'
        ? 'wsc-tag-sage'
        : variant === 'gold'
          ? 'wsc-tag-gold'
          : ''

  return <span className={`wsc-tag ${variantClass}`}>{children}</span>
}
```

- [ ] **Step 3: Create `src/components/ui/Button.tsx`**

```tsx
import Link from 'next/link'

type ButtonVariant = 'primary' | 'ghost' | 'ghost-light' | 'sm'

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant | ButtonVariant[]
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
  formAction?: (formData: FormData) => void | Promise<void>
}

export default function Button({
  children,
  variant = 'primary',
  href,
  onClick,
  type = 'button',
  disabled,
  className = '',
  style,
  formAction,
}: ButtonProps) {
  const variants = Array.isArray(variant) ? variant : [variant]
  const classes = [
    'wsc-btn',
    ...variants.map((v) =>
      v === 'primary'
        ? 'wsc-btn-primary'
        : v === 'ghost'
          ? 'wsc-btn-ghost'
          : v === 'ghost-light'
            ? 'wsc-btn-ghost-light'
            : v === 'sm'
              ? 'wsc-btn-sm'
              : ''
    ),
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={style}
      formAction={formAction}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Create `src/components/ui/Input.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface InputProps {
  id: string
  name: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'checkbox'
  label?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  autoComplete?: string
}

export default function Input({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  required,
  defaultValue,
  autoComplete,
}: InputProps) {
  const [showPw, setShowPw] = useState(false)

  if (type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          id={id}
          name={name}
          type="checkbox"
          style={{ accentColor: 'var(--gold)', width: 18, height: 18 }}
        />
        <span className="wsc-label" style={{ margin: 0, cursor: 'pointer' }}>
          {label}
        </span>
      </label>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label htmlFor={id} className="wsc-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type={type === 'password' ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className="wsc-input"
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/EyebrowLabel.tsx src/components/ui/Tag.tsx src/components/ui/Button.tsx src/components/ui/Input.tsx
git commit -m "feat: add EyebrowLabel, Tag, Button, Input UI components"
```

---

## Task 6: Wordmark component

**Files:**
- Create: `src/components/Wordmark.tsx`
- Create: `src/components/Wordmark.css`

- [ ] **Step 1: Create `src/components/Wordmark.css`**

```css
.wordmark {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.wordmark__text {
  line-height: 1.1;
}

.wordmark__name {
  font-family: var(--serif);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.wordmark__sub {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.wordmark--light .wordmark__name {
  color: oklch(0.97 0.01 80);
}

.wordmark--light .wordmark__sub {
  color: oklch(0.85 0.02 80);
}

.wordmark--dark .wordmark__name {
  color: var(--ink);
}

.wordmark--dark .wordmark__sub {
  color: var(--clay);
}
```

- [ ] **Step 2: Create `src/components/Wordmark.tsx`**

```tsx
import Link from 'next/link'
import './Wordmark.css'

interface WordmarkProps {
  tone?: 'light' | 'dark'
  href?: string
}

function WSCLogo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  const stroke = light ? 'oklch(0.97 0.01 80)' : 'var(--clay)'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="20" cy="20" r="19" fill="none" stroke={stroke} strokeWidth="1.5" />
      <path d="M14 26 Q14 18 20 18 Q26 18 26 26" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="18" x2="20" y2="13" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="20" cy="11" r="1.6" fill={stroke} />
      <line x1="14" y1="29" x2="26" y2="29" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Wordmark({ tone = 'dark', href = '/' }: WordmarkProps) {
  const toneClass = tone === 'light' ? 'wordmark--light' : 'wordmark--dark'

  return (
    <Link href={href} className={`wordmark ${toneClass}`}>
      <WSCLogo light={tone === 'light'} />
      <div className="wordmark__text">
        <div className="wordmark__name">Winchburgh</div>
        <div className="wordmark__sub">Speakers Club · est. 2018</div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Wordmark.tsx src/components/Wordmark.css
git commit -m "feat: add Wordmark component"
```

---

## Task 7: Navbar component (replaces current)

**Files:**
- Modify: `src/components/Navbar.tsx`
- Create: `src/components/Navbar.css`

- [ ] **Step 1: Create `src/components/Navbar.css`**

```css
.site-ribbon {
  background: var(--ink);
  color: var(--paper-3);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 56px;
}

.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 56px;
  background: var(--paper);
  border-bottom: 1px solid var(--rule-soft);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.site-nav__links {
  display: flex;
  align-items: center;
  gap: 32px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.site-nav__link {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-2);
  text-decoration: none;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.site-nav__link:hover,
.site-nav__link--active {
  color: var(--clay-deep);
  border-bottom-color: var(--clay);
}

.site-nav__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .site-ribbon {
    padding: 10px 20px;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .site-nav {
    padding: 16px 20px;
  }

  .site-nav__links {
    display: none;
  }
}
```

- [ ] **Step 2: Replace `src/components/Navbar.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Wordmark from './Wordmark'
import './Navbar.css'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header>
      <div className="site-ribbon">
        <span>Tuesday meetings · 7pm · Community Centre, Main Street</span>
        <span>First three visits free</span>
      </div>
      <nav className="site-nav">
        <Wordmark />
        <ul className="site-nav__links">
          <li><Link href="/#about" className="site-nav__link">About</Link></li>
          <li><Link href="/#meetings" className="site-nav__link">Meetings</Link></li>
          <li><Link href="/news" className="site-nav__link">News</Link></li>
          <li><Link href="/contact" className="site-nav__link">Contact</Link></li>
        </ul>
        <div className="site-nav__actions">
          {user ? (
            <Link href="/member/dashboard" className="wsc-btn wsc-btn-ghost wsc-btn-sm">
              My dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="wsc-btn wsc-btn-ghost wsc-btn-sm">
                Member login
              </Link>
              <Link href="/contact" className="wsc-btn wsc-btn-primary wsc-btn-sm">
                Visit a meeting
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
```

- [ ] **Step 3: Verify in browser**

With `npm run dev` running, open `http://localhost:3000`. You should see the dark ribbon at top ("Tuesday meetings · 7pm") and below it the white nav bar with Wordmark (circle logo + "Winchburgh" serif text), nav links, and the "Member login" + "Visit a meeting" buttons. The homepage below will still look broken — that's fine.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx src/components/Navbar.css
git commit -m "feat: replace Navbar with new two-layer public nav"
```

---

## Task 8: Footer component

**Files:**
- Create: `src/components/Footer.tsx`
- Create: `src/components/Footer.css`

- [ ] **Step 1: Create `src/components/Footer.css`**

```css
.site-footer {
  background: var(--paper-2);
  border-top: 1px solid var(--rule);
  padding: 56px 56px 0;
  margin-top: 80px;
}

.site-footer__grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 48px;
  padding-bottom: 48px;
}

.site-footer__brand p {
  font-size: 14px;
  color: var(--ink-3);
  margin-top: 16px;
  max-width: 300px;
  line-height: 1.65;
}

.site-footer__col h4 {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 16px;
}

.site-footer__col ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.site-footer__col a {
  font-size: 14px;
  color: var(--ink-2);
  text-decoration: none;
  transition: color 0.2s;
}

.site-footer__col a:hover {
  color: var(--clay);
}

.site-footer__newsletter {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.site-footer__newsletter input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--r-md);
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 14px;
}
.site-footer__newsletter input:focus {
  outline: none;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18);
}

.site-footer__newsletter button {
  height: 38px;
  padding: 0 16px;
  background: var(--clay);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.site-footer__newsletter button:hover {
  background: var(--clay-deep);
}

.site-footer__bar {
  border-top: 1px solid var(--rule);
  padding: 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--ink-3);
}

@media (max-width: 900px) {
  .site-footer {
    padding: 40px 20px 0;
  }
  .site-footer__grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

@media (max-width: 600px) {
  .site-footer__grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Create `src/components/Footer.tsx`**

```tsx
import Link from 'next/link'
import Wordmark from './Wordmark'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Wordmark />
          <p>
            A friendly community of speakers in Winchburgh, West Lothian. We meet on the 1st and 3rd Tuesday of every month at the Winchburgh Community Centre.
          </p>
        </div>

        <div className="site-footer__col">
          <h4>Visit</h4>
          <ul>
            <li><Link href="/#meetings">Upcoming meetings</Link></li>
            <li><Link href="/contact">Find us</Link></li>
            <li><Link href="/contact">Get in touch</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h4>About</h4>
          <ul>
            <li><Link href="/#about">How it works</Link></li>
            <li><Link href="/#about">What to expect</Link></li>
            <li><Link href="/login">Member login</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h4>Stay in touch</h4>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 12 }}>
            Occasional updates, no spam.
          </p>
          <form className="site-footer__newsletter" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" aria-label="Email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>

      <div className="site-footer__bar">
        <span>© {new Date().getFullYear()} Winchburgh Speakers Club</span>
        <Link href="/contact">Contact us</Link>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.css
git commit -m "feat: add Footer component"
```

---

## Task 9: Homepage

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/page.css`

- [ ] **Step 1: Create `src/app/page.css`**

```css
/* ---- Hero ---- */
.home-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  padding: 80px 56px;
  max-width: 1200px;
  margin: 0 auto;
}

.home-hero__eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.home-hero__eyebrow::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
}

.home-hero h1 {
  font-size: clamp(44px, 5vw, 72px);
  margin-bottom: 24px;
  line-height: 1.02;
}

.home-hero h1 em {
  font-style: italic;
  color: oklch(0.55 0.155 60);
}

.home-hero__body {
  font-size: 17px;
  color: var(--ink-2);
  max-width: 480px;
  margin-bottom: 36px;
  line-height: 1.65;
}

.home-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.home-hero__avatars {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home-hero__avatar-stack {
  display: flex;
}

.home-hero__avatar-stack .photo-slot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid var(--paper);
  margin-left: -10px;
}

.home-hero__avatar-stack .photo-slot:first-child {
  margin-left: 0;
}

.home-hero__member-count {
  font-size: 14px;
  color: var(--ink-3);
}

.home-hero__member-count strong {
  color: var(--ink);
  font-weight: 600;
}

.home-hero__visual {
  position: relative;
  height: 480px;
}

.home-hero__photo-large {
  position: absolute;
  top: 0;
  left: 0;
  width: 75%;
  height: 80%;
  border-radius: var(--r-xl);
}

.home-hero__photo-small {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 55%;
  height: 55%;
  border-radius: var(--r-xl);
}

.home-hero__meeting-pill {
  position: absolute;
  left: -20px;
  bottom: 20px;
  background: white;
  border-radius: var(--r-lg);
  padding: 14px 18px;
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 220px;
}

.home-hero__date-badge {
  background: var(--gradient);
  border-radius: var(--r-md);
  padding: 10px 14px;
  text-align: center;
  flex-shrink: 0;
}

.home-hero__date-badge .day {
  font-family: var(--serif);
  font-size: 28px;
  font-weight: 300;
  color: white;
  line-height: 1;
}

.home-hero__date-badge .month {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.97 0.01 80);
}

.home-hero__pill-info {
  flex: 1;
  min-width: 0;
}

.home-hero__pill-info .label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 4px;
}

.home-hero__pill-info .title {
  font-family: var(--serif);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- How it works ---- */
.home-how {
  background: var(--paper-2);
  padding: 80px 56px;
}

.home-how__inner {
  max-width: 1100px;
  margin: 0 auto;
}

.home-how__header {
  text-align: center;
  margin-bottom: 56px;
}

.home-how__header .wsc-eyebrow {
  display: block;
  margin-bottom: 16px;
}

.home-how__header h2 {
  font-size: clamp(32px, 3.5vw, 48px);
}

.home-how__header h2 em {
  font-style: italic;
  color: oklch(0.55 0.155 60);
}

.home-how__steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.home-how__step {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  padding: 32px;
}

.home-how__step-num {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--clay-deep);
  margin-bottom: 16px;
  font-weight: 500;
}

.home-how__step h3 {
  font-size: 22px;
  margin-bottom: 12px;
}

.home-how__step p {
  font-size: 15px;
  color: var(--ink-3);
  line-height: 1.65;
}

/* ---- Pull-quote ---- */
.home-quote {
  padding: 88px 56px;
  text-align: center;
}

.home-quote__inner {
  max-width: 760px;
  margin: 0 auto;
}

.home-quote__mark {
  font-family: var(--serif);
  font-size: 80px;
  line-height: 0.5;
  color: var(--gold);
  display: block;
  margin-bottom: 24px;
}

.home-quote blockquote {
  font-family: var(--serif);
  font-size: clamp(22px, 3vw, 36px);
  font-style: italic;
  color: var(--ink);
  line-height: 1.35;
  margin: 0 0 24px;
}

.home-quote__attribution {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-4);
}

/* ---- News cards ---- */
.home-news {
  background: var(--paper-2);
  padding: 80px 56px;
}

.home-news__inner {
  max-width: 1100px;
  margin: 0 auto;
}

.home-news__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.home-news__header h2 {
  font-size: 36px;
}

.home-news__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.home-news__card {
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
}

.home-news__card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.home-news__card-body {
  padding: 20px;
}

.home-news__card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.home-news__card-date {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-4);
  letter-spacing: 0.06em;
}

.home-news__card h3 {
  font-size: 19px;
  margin-bottom: 10px;
  line-height: 1.25;
}

.home-news__card p {
  font-size: 14px;
  color: var(--ink-3);
  line-height: 1.6;
}

/* ---- Map + venue ---- */
.home-venue {
  padding: 80px 56px;
  max-width: 1200px;
  margin: 0 auto;
}

.home-venue__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: start;
}

.home-venue__map svg {
  width: 100%;
  height: auto;
  border-radius: var(--r-lg);
  border: 1px solid var(--rule);
}

.home-venue__info .wsc-eyebrow {
  display: block;
  margin-bottom: 16px;
}

.home-venue__info h2 {
  font-size: 36px;
  margin-bottom: 20px;
}

.home-venue__detail {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 15px;
  color: var(--ink-2);
}

.home-venue__detail-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r-sm);
  background: var(--clay-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}

.home-venue__access {
  margin-top: 24px;
  padding: 16px;
  background: var(--paper-2);
  border-radius: var(--r-md);
  border: 1px solid var(--rule);
  font-size: 14px;
  color: var(--ink-3);
}

/* ---- CTA strip ---- */
.home-cta {
  background: var(--night);
  padding: 88px 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.home-cta::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -100px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, oklch(0.78 0.135 75 / 0.20) 0%, transparent 70%);
  pointer-events: none;
}

.home-cta::after {
  content: '';
  position: absolute;
  bottom: -200px;
  left: -100px;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, var(--sage / 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.home-cta__inner {
  position: relative;
  z-index: 1;
  max-width: 620px;
  margin: 0 auto;
}

.home-cta .wsc-eyebrow {
  color: oklch(0.78 0.135 75);
  display: block;
  margin-bottom: 20px;
}

.home-cta h2 {
  font-size: clamp(32px, 4vw, 52px);
  color: white;
  margin-bottom: 16px;
}

.home-cta h2 em {
  font-style: italic;
  color: oklch(0.78 0.135 75);
}

.home-cta p {
  font-size: 17px;
  color: oklch(0.80 0.02 240);
  margin-bottom: 40px;
  line-height: 1.6;
}

.home-cta__actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ---- Responsive ---- */
@media (max-width: 900px) {
  .home-hero,
  .home-venue__inner {
    grid-template-columns: 1fr;
    padding: 48px 24px;
    gap: 40px;
  }

  .home-hero__visual {
    height: 320px;
    order: -1;
  }

  .home-how,
  .home-news,
  .home-quote,
  .home-venue,
  .home-cta {
    padding: 56px 24px;
  }

  .home-how__steps,
  .home-news__grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Replace `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import './page.css'

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

export default async function Home() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('meetings')
    .select('*')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(3)

  const { data: news } = await supabase
    .from('news_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const nextMeeting = events?.[0]

  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="home-hero">
          <div>
            <div className="home-hero__eyebrow">
              <EyebrowLabel>Winchburgh · West Lothian</EyebrowLabel>
            </div>
            <h1>
              The warmest room in Winchburgh{' '}
              <em>on a Tuesday.</em>
            </h1>
            <p className="home-hero__body">
              We&apos;re a friendly bunch who meet twice a month to practise speaking, try new things, and have a proper cup of tea. No experience needed. No booking required for your first visit.
            </p>
            <div className="home-hero__actions">
              <Button href="/contact" variant="primary">Come to a meeting</Button>
              <Button href="/#about" variant="ghost">What happens?</Button>
            </div>
            {memberCount != null && (
              <div className="home-hero__avatars">
                <div className="home-hero__avatar-stack">
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                </div>
                <span className="home-hero__member-count">
                  <strong>{memberCount}+</strong> members and growing
                </span>
              </div>
            )}
          </div>

          <div className="home-hero__visual">
            <PhotoSlot
              label="member at lectern"
              className="home-hero__photo-large"
              style={{ width: '75%', height: '80%', top: 0, left: 0, position: 'absolute' }}
            />
            <PhotoSlot
              label="audience"
              className="home-hero__photo-small"
              style={{ width: '55%', height: '55%', bottom: 0, right: 0, position: 'absolute', background: 'oklch(0.72 0.09 200 / 0.25)' }}
            />
            {nextMeeting && (
              <div className="home-hero__meeting-pill">
                <div className="home-hero__date-badge">
                  <div className="day">{formatDay(nextMeeting.meeting_date)}</div>
                  <div className="month">{formatMonth(nextMeeting.meeting_date)}</div>
                </div>
                <div className="home-hero__pill-info">
                  <div className="label">Next meeting</div>
                  <div className="title">{nextMeeting.theme || 'Members\' Meeting'}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="home-how" id="about">
          <div className="home-how__inner">
            <div className="home-how__header">
              <EyebrowLabel className="wsc-eyebrow" color="clay">How it works</EyebrowLabel>
              <h2>We keep it simple. <em>You keep your seat.</em></h2>
            </div>
            <div className="home-how__steps">
              {[
                {
                  num: 'Step 01',
                  title: 'Just turn up',
                  body: 'No booking needed for your first three visits. The kettle goes on at half six. Meeting starts at seven. Someone will meet you at the door.',
                },
                {
                  num: 'Step 02',
                  title: 'Watch and listen',
                  body: "You won't be asked to speak until you're ready. Watch how it works, ask questions, eat a biscuit. There's absolutely no pressure.",
                },
                {
                  num: 'Step 03',
                  title: 'Find your pace',
                  body: "When you're ready, take a role. Give a speech. Get feedback. We follow the Pathways programme — or we can just be your Tuesday-night practice ground.",
                },
              ].map((step) => (
                <div key={step.num} className="home-how__step">
                  <div className="home-how__step-num">{step.num}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pull-quote */}
        <section className="home-quote">
          <div className="home-quote__inner">
            <span className="home-quote__mark">&ldquo;</span>
            <blockquote>
              You don&apos;t need to be confident. You don&apos;t need to have anything to say. You just need to turn up.
            </blockquote>
            <p className="home-quote__attribution">— Margaret, Club President</p>
          </div>
        </section>

        {/* News */}
        {news && news.length > 0 && (
          <section className="home-news" id="news">
            <div className="home-news__inner">
              <div className="home-news__header">
                <h2>From the club</h2>
                <Link href="/news" className="wsc-btn wsc-btn-ghost wsc-btn-sm">All news →</Link>
              </div>
              <div className="home-news__grid">
                {news.map((post) => (
                  <article key={post.id} className="home-news__card">
                    <PhotoSlot height={180} label="news image" style={{ borderRadius: 0 }} />
                    <div className="home-news__card-body">
                      <div className="home-news__card-meta">
                        <Tag variant="clay">Update</Tag>
                        <span className="home-news__card-date">
                          {new Date(post.published_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt || post.content?.slice(0, 100)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Village map + venue */}
        <section className="home-venue" id="meetings">
          <div className="home-venue__inner">
            <div className="home-venue__map">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="oklch(0.95 0.014 230)" rx="16" />
                {/* Roads */}
                <path d="M 20 150 L 380 150" stroke="oklch(0.88 0.025 230)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 200 20 L 200 280" stroke="oklch(0.88 0.025 230)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 80 80 L 320 220" stroke="oklch(0.88 0.025 230)" strokeWidth="6" strokeLinecap="round" />
                {/* Canal */}
                <path d="M 0 200 Q 100 190 200 200 Q 300 210 400 200" stroke="var(--sage)" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Labels */}
                <text x="50" y="140" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="oklch(0.55 0.040 240)" letterSpacing="1">MAIN STREET</text>
                <text x="205" y="100" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="oklch(0.55 0.040 240)" letterSpacing="1" transform="rotate(90 205 100)">SCHOOL RD</text>
                <text x="60" y="215" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--sage)" letterSpacing="1">UNION CANAL</text>
                {/* Venue pin */}
                <circle cx="200" cy="150" r="14" fill="var(--clay)" />
                <circle cx="200" cy="150" r="6" fill="white" />
                <text x="215" y="135" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--clay-deep)" fontWeight="500">Community Centre</text>
              </svg>
            </div>

            <div className="home-venue__info">
              <EyebrowLabel color="clay">Find us</EyebrowLabel>
              <h2>It is the warmest room in Winchburgh on a Tuesday. <em>Honest.</em></h2>
              <div className="home-venue__detail">
                <div className="home-venue__detail-icon">📍</div>
                <div>
                  <strong>Winchburgh Community Centre</strong><br />
                  Main Street, Winchburgh, EH52 6QF
                </div>
              </div>
              <div className="home-venue__detail">
                <div className="home-venue__detail-icon">🕖</div>
                <div>
                  <strong>1st &amp; 3rd Tuesday of the month</strong><br />
                  Doors 6:30pm · Meeting 7:00pm
                </div>
              </div>
              <div className="home-venue__access">
                ✅ Step-free access &nbsp;·&nbsp; 🔊 Hearing loop &nbsp;·&nbsp; 🚗 Free parking on-site
              </div>
              <div style={{ marginTop: 28 }}>
                <Button href="https://maps.google.com/?q=Winchburgh+Community+Centre" variant="ghost">
                  Get directions →
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className="home-cta">
          <div className="home-cta__inner">
            <EyebrowLabel>Ready when you are</EyebrowLabel>
            <h2>Come and <em>try us.</em></h2>
            <p>
              No booking needed for your first visit. Margaret, our president, will drop you a quick hello in the next day or two.
            </p>
            <div className="home-cta__actions">
              <Button href="/contact" variant="primary">Come to a meeting</Button>
              <Button href="/contact" variant="ghost-light">Get in touch</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000`. You should see:
- Dark ribbon + white sticky nav at top
- Two-column hero with serif headline and amber italic emphasis
- Striped photo placeholders in the hero visual
- The "next meeting" pill card floating over the photos (if there are upcoming meetings in the DB)
- Three step cards on a `--paper-2` background
- Pull-quote in large italic serif
- News cards (if data exists) on alt background
- SVG village map + venue details
- Dark CTA strip with amber copy
- Footer with 4 columns

If the DB has no meetings or news, those sections are empty or hidden — that's expected.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/page.css
git commit -m "feat: implement new homepage design"
```

---

## Task 10: Contact page

**Files:**
- Modify: `src/app/contact/page.tsx`
- Create: `src/app/contact/ContactForm.tsx`
- Create: `src/app/contact/contact.css`

- [ ] **Step 1: Create `src/app/contact/contact.css`**

```css
.contact-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 72px 56px;
}

.contact-page__header {
  margin-bottom: 56px;
}

.contact-page__header .wsc-eyebrow {
  display: block;
  margin-bottom: 12px;
}

.contact-page__header h1 {
  font-size: clamp(36px, 4vw, 52px);
  margin-bottom: 16px;
}

.contact-page__header p {
  font-size: 17px;
  color: var(--ink-2);
  max-width: 520px;
  line-height: 1.65;
}

.contact-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 64px;
  align-items: start;
}

/* Form */
.contact-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contact-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.contact-form__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-form__select {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--rule);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 15px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  cursor: pointer;
}

.contact-form__select:focus {
  outline: none;
  border-color: var(--clay);
  box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18);
}

.contact-form__submit {
  width: 100%;
  height: 52px;
  background: var(--gradient);
  color: white;
  border: none;
  border-radius: var(--r-pill);
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: var(--shadow-md);
}

.contact-form__submit:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.contact-form__success {
  padding: 16px 20px;
  background: oklch(0.93 0.06 160);
  border: 1px solid oklch(0.70 0.12 160);
  border-radius: var(--r-md);
  color: oklch(0.30 0.10 160);
  font-weight: 600;
}

/* Right column */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.contact-find-us {
  background: var(--paper-3);
  border: 1px solid var(--rule);
  border-radius: var(--r-lg);
  padding: 24px;
}

.contact-find-us h3 {
  font-size: 22px;
  margin-bottom: 16px;
}

.contact-find-us__detail {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 12px;
  font-size: 15px;
  color: var(--ink-2);
}

.contact-faqs h3 {
  font-size: 22px;
  margin-bottom: 16px;
}

.contact-faq details {
  border-bottom: 1px solid var(--rule);
  padding: 14px 0;
}

.contact-faq details:first-of-type {
  border-top: 1px solid var(--rule);
}

.contact-faq summary {
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  cursor: pointer;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-faq summary::after {
  content: '+';
  font-size: 20px;
  color: var(--clay);
  transition: transform 0.2s;
}

.contact-faq details[open] summary::after {
  transform: rotate(45deg);
}

.contact-faq details p {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-3);
  line-height: 1.65;
}

@media (max-width: 900px) {
  .contact-page {
    padding: 48px 24px;
  }

  .contact-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .contact-form__row {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Create `src/app/contact/ContactForm.tsx`**

```tsx
'use client'

import { useRef } from 'react'
import { submitContactForm } from './actions'

export default function ContactForm({ success }: { success: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <>
      {success && (
        <div className="contact-form__success" role="alert">
          Thanks for reaching out! We&apos;ll get back to you soon.
        </div>
      )}
      <form
        ref={formRef}
        action={submitContactForm}
        className="contact-form"
      >
        <div className="contact-form__row">
          <div className="contact-form__field">
            <label htmlFor="name" className="wsc-label">Your name</label>
            <input id="name" name="name" type="text" required className="wsc-input" placeholder="Margaret Smith" />
          </div>
          <div className="contact-form__field">
            <label htmlFor="email" className="wsc-label">Email address</label>
            <input id="email" name="email" type="email" required className="wsc-input" placeholder="margaret@example.com" />
          </div>
        </div>

        <div className="contact-form__field">
          <label htmlFor="topic" className="wsc-label">What&apos;s it about?</label>
          <select id="topic" name="topic" className="contact-form__select">
            <option value="">Choose a topic…</option>
            <option value="visiting">I&apos;d like to visit a meeting</option>
            <option value="joining">Joining as a member</option>
            <option value="speaking">Speaking or event enquiry</option>
            <option value="other">Something else</option>
          </select>
        </div>

        <div className="contact-form__field">
          <label htmlFor="message" className="wsc-label">Your message</label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="wsc-textarea"
            placeholder="Ask us anything. We don't bite."
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="allow_text"
            style={{ accentColor: 'var(--gold)', width: 18, height: 18 }}
          />
          <span className="wsc-label" style={{ margin: 0 }}>
            It&apos;s ok to text me back if you need a quick answer
          </span>
        </label>

        <button type="submit" className="contact-form__submit">
          Send message
        </button>
      </form>
    </>
  )
}
```

- [ ] **Step 3: Replace `src/app/contact/page.tsx`**

```tsx
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import ContactForm from './ContactForm'
import './contact.css'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const success = params.success === 'true'

  return (
    <>
      <Navbar />
      <main>
        <div className="contact-page">
          <div className="contact-page__header">
            <EyebrowLabel color="clay">Get in touch</EyebrowLabel>
            <h1>We&apos;d love to hear from you.</h1>
            <p>
              Questions about the club? Want to come as a guest? Drop us a message and someone from the committee will get back to you — usually within a day or two.
            </p>
          </div>

          <div className="contact-layout">
            {/* Left: form */}
            <div>
              <ContactForm success={success} />
            </div>

            {/* Right: info */}
            <div className="contact-info">
              <div className="contact-find-us">
                <h3>Find us</h3>
                <div className="contact-find-us__detail">
                  <span>📍</span>
                  <div>
                    <strong>Winchburgh Community Centre</strong><br />
                    Main Street, Winchburgh, EH52 6QF
                  </div>
                </div>
                <div className="contact-find-us__detail">
                  <span>🕖</span>
                  <div>1st &amp; 3rd Tuesday · doors 6:30pm</div>
                </div>
                <div className="contact-find-us__detail">
                  <span>🚗</span>
                  <div>Free parking on-site. Step-free entrance. Hearing loop available.</div>
                </div>
              </div>

              <div className="contact-faqs">
                <h3>Common questions</h3>
                <div className="contact-faq">
                  <details>
                    <summary>Do I need to book?</summary>
                    <p>No booking needed for your first three visits. Just turn up. If you&apos;re coming for the first time, a quick message so we can look out for you is always nice — but it&apos;s not required.</p>
                  </details>
                  <details>
                    <summary>Will I have to speak?</summary>
                    <p>Absolutely not. You won&apos;t be put on the spot. Lots of people come along for weeks before they feel ready to take a role. You move at your own pace, full stop.</p>
                  </details>
                  <details>
                    <summary>What does it cost?</summary>
                    <p>Your first three visits are completely free. After that, membership is £30 per quarter — around £2.50 a week. That covers the room, refreshments, and access to all club resources.</p>
                  </details>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href="mailto:hello@winchburghspeakers.co.uk"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-2)', fontSize: 15, textDecoration: 'none' }}
                >
                  <span>✉️</span>
                  hello@winchburghspeakers.co.uk
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/contact`. You should see:
- Split layout: form on left, info on right
- FAQ accordion rows expand/collapse on click (native `<details>`)
- "Find us" card with venue details
- Form has name, email, topic select, message, checkbox, submit button
- Gradient submit button

- [ ] **Step 5: Commit**

```bash
git add src/app/contact/page.tsx src/app/contact/ContactForm.tsx src/app/contact/contact.css
git commit -m "feat: implement new contact page design"
```

---

## Task 11: Login page

The outer page is a server component that fetches the next meeting. It passes the data to `LoginForm`, a client component that handles `showPw` state and the magic link button.

**Files:**
- Modify: `src/app/login/page.tsx`
- Create: `src/app/login/LoginForm.tsx`
- Create: `src/app/login/login.css`

- [ ] **Step 1: Create `src/app/login/login.css`**

```css
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Left panel */
.login-left {
  background: var(--night);
  padding: 48px 56px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.login-left::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -150px;
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, oklch(0.78 0.135 75 / 0.55) 0%, transparent 65%);
  pointer-events: none;
}

.login-left::after {
  content: '';
  position: absolute;
  bottom: -200px;
  left: -150px;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, var(--clay) / 0.45 0%, transparent 65%);
  pointer-events: none;
}

.login-left__content {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.login-left__eyebrow {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.78 0.135 75);
  display: block;
  margin-bottom: 16px;
  margin-top: 48px;
}

.login-left h2 {
  font-size: clamp(36px, 3.5vw, 52px);
  color: white;
  margin-bottom: 20px;
  font-weight: 400;
}

.login-left h2 em {
  font-style: italic;
  color: oklch(0.78 0.135 75);
}

.login-left__sub {
  font-size: 16px;
  color: oklch(0.75 0.025 240);
  line-height: 1.65;
  max-width: 380px;
  margin-bottom: 36px;
}

.login-meeting-card {
  background: oklch(1 0 0 / 0.12);
  border: 1px solid oklch(1 0 0 / 0.14);
  border-radius: var(--r-lg);
  padding: 20px;
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 36px;
  max-width: 380px;
}

.login-meeting-card__badge {
  background: var(--gradient);
  border-radius: var(--r-md);
  padding: 12px 16px;
  text-align: center;
  flex-shrink: 0;
}

.login-meeting-card__badge .day {
  font-family: var(--serif);
  font-size: 32px;
  font-weight: 300;
  color: white;
  line-height: 1;
}

.login-meeting-card__badge .month {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.97 0.01 80);
}

.login-meeting-card__info .label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.70 0.02 240);
  margin-bottom: 6px;
}

.login-meeting-card__info .title {
  font-family: var(--serif);
  font-size: 16px;
  color: white;
  font-weight: 500;
}

.login-meeting-card__info .detail {
  font-size: 13px;
  color: oklch(0.70 0.02 240);
  margin-top: 4px;
}

.login-left__quote {
  margin-top: auto;
  padding-top: 24px;
}

.login-left__quote blockquote {
  font-family: var(--serif);
  font-size: 18px;
  font-style: italic;
  color: oklch(0.87 0.015 240);
  line-height: 1.5;
  margin: 0 0 10px;
  position: relative;
}

.login-left__quote blockquote::before {
  content: '\201C';
  font-size: 40px;
  color: oklch(0.78 0.135 75);
  line-height: 0;
  vertical-align: -0.45em;
  margin-right: 4px;
}

.login-left__quote cite {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(0.55 0.025 240);
  font-style: normal;
}

/* Right panel */
.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 56px;
  background: var(--paper);
  position: relative;
}

.login-right__new-here {
  position: absolute;
  top: 24px;
  right: 32px;
  font-size: 14px;
  color: var(--ink-3);
}

.login-right__new-here a {
  color: var(--clay);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.login-form {
  width: 100%;
  max-width: 420px;
}

.login-form .wsc-eyebrow {
  display: block;
  margin-bottom: 12px;
  color: var(--clay-deep);
}

.login-form h1 {
  font-size: clamp(28px, 2.5vw, 38px);
  margin-bottom: 10px;
}

.login-form__sub {
  font-size: 15px;
  color: var(--ink-3);
  margin-bottom: 32px;
  line-height: 1.55;
}

.login-form__fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 8px;
}

.login-form__forgot {
  text-align: right;
  font-size: 13px;
  margin-top: -4px;
  margin-bottom: 24px;
}

.login-form__forgot a {
  color: var(--clay);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.login-form__keep {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--ink-2);
  cursor: pointer;
}

.login-form__keep input {
  accentColor: var(--gold);
  width: 18px;
  height: 18px;
}

.login-form__submit {
  width: 100%;
  height: 52px;
  background: var(--gradient);
  color: white;
  border: none;
  border-radius: var(--r-pill);
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  box-shadow: var(--shadow-md);
  margin-bottom: 20px;
}

.login-form__submit:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.login-form__or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  color: var(--ink-4);
  font-size: 13px;
}

.login-form__or::before,
.login-form__or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--rule);
}

.login-form__magic {
  width: 100%;
  height: 48px;
  background: oklch(0.97 0.020 75);
  color: oklch(0.42 0.135 65);
  border: 1px solid oklch(0.88 0.06 75);
  border-radius: var(--r-pill);
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 28px;
}

.login-form__magic:hover {
  background: oklch(0.94 0.040 75);
}

.login-form__magic:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-form__help {
  text-align: center;
  font-size: 13px;
  color: var(--ink-4);
}

.login-form__error {
  padding: 12px 16px;
  background: oklch(0.95 0.04 25);
  border: 1px solid oklch(0.80 0.10 25);
  border-radius: var(--r-md);
  color: oklch(0.40 0.15 25);
  font-size: 14px;
  margin-bottom: 16px;
}

.login-form__magic-sent {
  padding: 12px 16px;
  background: oklch(0.93 0.06 160);
  border: 1px solid oklch(0.70 0.12 160);
  border-radius: var(--r-md);
  color: oklch(0.30 0.10 160);
  font-size: 14px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .login-left {
    padding: 40px 24px;
    min-height: 40vh;
  }

  .login-right {
    padding: 48px 24px;
  }
}
```

- [ ] **Step 2: Create `src/app/login/LoginForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { createClient } from '@/utils/supabase/client'

interface LoginFormProps {
  error?: string
}

export default function LoginForm({ error }: LoginFormProps) {
  const [showPw, setShowPw] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [email, setEmail] = useState('')

  async function handleMagicLink() {
    if (!email) return
    setMagicLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setMagicSent(true)
    setMagicLoading(false)
  }

  return (
    <div className="login-form">
      <span className="wsc-eyebrow">Member portal</span>
      <h1>Sign in to your portal</h1>
      <p className="login-form__sub">
        Good to have you back. Sign in with your email and password, or get a magic link sent straight to your inbox.
      </p>

      {error && <div className="login-form__error">{error}</div>}
      {magicSent && (
        <div className="login-form__magic-sent">
          Magic link sent! Check your inbox and click the link to sign in.
        </div>
      )}

      <form>
        <div className="login-form__fields">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="email" className="wsc-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="wsc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="password" className="wsc-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="wsc-input"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-3)',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>
        </div>

        <div className="login-form__forgot">
          <Link href="/forgot-password">Forgotten your password?</Link>
        </div>

        <label className="login-form__keep">
          <input type="checkbox" name="remember" />
          Keep me signed in
        </label>

        <button type="submit" formAction={login} className="login-form__submit">
          Sign in
        </button>
      </form>

      <div className="login-form__or">or</div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={magicLoading || !email}
        className="login-form__magic"
      >
        {magicLoading ? 'Sending…' : '✉ Email me a sign-in link'}
      </button>

      <p className="login-form__help">
        Not a member yet?{' '}
        <Link href="/contact" style={{ color: 'var(--clay)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Come to a meeting
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/app/login/page.tsx`**

```tsx
import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import LoginForm from './LoginForm'
import './login.css'

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: meetings } = await supabase
    .from('meetings')
    .select('*')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(1)

  const nextMeeting = meetings?.[0]

  return (
    <div className="login-page">
      {/* Left: welcome panel */}
      <div className="login-left">
        <div className="login-left__content">
          <Wordmark tone="light" />

          <span className="login-left__eyebrow">Welcome back</span>
          <h2>Good to see you <em>again.</em></h2>
          <p className="login-left__sub">
            Sign in to volunteer for roles, track your pathway, and see what&apos;s coming up.
          </p>

          {nextMeeting && (
            <div className="login-meeting-card">
              <div className="login-meeting-card__badge">
                <div className="day">{formatDay(nextMeeting.meeting_date)}</div>
                <div className="month">{formatMonth(nextMeeting.meeting_date)}</div>
              </div>
              <div className="login-meeting-card__info">
                <div className="label">Next meeting</div>
                <div className="title">{nextMeeting.theme || "Members' Meeting"}</div>
                <div className="detail">{formatDate(nextMeeting.meeting_date)} · 7pm</div>
              </div>
            </div>
          )}

          <div className="login-left__quote">
            <blockquote>
              It is the warmest room in Winchburgh on a Tuesday. Honest.
            </blockquote>
            <cite>— Margaret, Club President</cite>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="login-right">
        <p className="login-right__new-here">
          New here?{' '}
          <a href="/contact">Get in touch</a>
        </p>
        <LoginForm error={params.error} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/login`. You should see:
- 50/50 split layout. Left: dark navy background with amber + blue radial glows (CSS), Wordmark in light tone, welcome headline with amber italic, next meeting card (if data exists), pull-quote at bottom.
- Right: white background, "New here? Get in touch" top right, form with email + password (show/hide eye toggle), "Keep me signed in" checkbox, gradient submit button, "or" divider, amber magic link button.
- Typing an email and clicking "Email me a sign-in link" sends a Supabase OTP and shows the success message.
- Submitting the form calls the existing `login` server action.

- [ ] **Step 5: Commit**

```bash
git add src/app/login/page.tsx src/app/login/LoginForm.tsx src/app/login/login.css
git commit -m "feat: implement new login page design"
```

---

## Task 12: Add .superpowers to .gitignore

**Files:**
- Modify: `.gitignore` (or create it if absent)

- [ ] **Step 1: Add entry**

Open `.gitignore` and add:

```
# Visual companion brainstorming files
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```

---

## Self-review checklist

Spec coverage:

| Requirement | Task |
|---|---|
| CSS tokens in globals.css | Task 2 |
| Fonts: Newsreader, Inter, JetBrains Mono | Task 3 |
| PhotoSlot placeholder | Task 4 |
| EyebrowLabel, Tag, Button, Input | Task 5 |
| Wordmark (light/dark tone) | Task 6 |
| Navbar: ribbon + nav, sticky, auth-aware | Task 7 |
| Footer: 4-col + newsletter | Task 8 |
| Homepage: 8 sections, real Supabase data | Task 9 |
| Contact: split layout, FAQ accordions, existing action | Task 10 |
| Login: split layout, magic link, showPw | Task 11 |
| Admin/member routes protected | Task 1 |
| Admin panel untouched | Task 1 (only layout.tsx modified) |
| Routes unchanged | All page tasks (same paths) |
| Member count in hero | Task 9 (`count(*)` query) |
| Accessibility: labels, focus rings, hit targets | Tasks 5, 7, 10, 11 |
