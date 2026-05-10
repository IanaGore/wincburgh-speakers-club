# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Winchburgh Speakers Club design handoff across all pages — public site, member portal, and admin — with a guest RSVP flow, account conversion, and mobile-first responsive layouts throughout.

**Architecture:** Journey-first, 6 phases. Each phase follows the user's path through the site and is independently shippable. All styling uses vanilla CSS with CSS variables (no Tailwind). Server Components by default; Client Components only where interactivity requires it.

**Tech Stack:** Next.js 16 App Router, Supabase (supabase-ssr), Pure CSS (globals.css + co-located page CSS), lucide-react icons, Google Fonts (Newsreader, Inter, JetBrains Mono)

**Design Handoff:** `../design_handoff_speakers_club_portal/` — read `README.md` and `designs/design-system.css` before starting any task.

**Spec:** `docs/superpowers/specs/2026-05-10-design-system-implementation.md`

---

## Phase 1 — Foundation

### Task 1.1: Update Navbar — top ribbon + responsive hamburger

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/components/Navbar.css`

- [ ] **Step 1: Read the current Navbar**

Read `src/components/Navbar.tsx` and `src/components/Navbar.css` in full before making any changes.

- [ ] **Step 2: Add the top ribbon**

In `Navbar.tsx`, add a `<div className="nav-ribbon">` above the main nav bar:

```tsx
<div className="nav-ribbon">
  <span>Tuesday meetings · 7pm · Community Centre, Main Street</span>
  <span>First three visits free</span>
</div>
```

In `Navbar.css`, add:

```css
.nav-ribbon {
  background: var(--ink);
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 8px 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 767px) {
  .nav-ribbon { display: none; }
}
```

- [ ] **Step 3: Add hamburger state to Navbar**

`Navbar.tsx` must become a Client Component to manage mobile menu state. Add `'use client'` at the top.

Replace the nav export with:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Wordmark from './Wordmark'
import { Menu, X } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="navbar-wrap">
      <div className="nav-ribbon">
        <span>Tuesday meetings · 7pm · Community Centre, Main Street</span>
        <span>First three visits free</span>
      </div>
      <nav className="navbar">
        <Wordmark />
        <button
          className="navbar__hamburger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <ul className={`navbar__links${open ? ' navbar__links--open' : ''}`}>
          {[['/', 'Home'], ['/about', 'About'], ['/meetings', 'Meetings'], ['/news', 'News'], ['/contact', 'Contact']].map(([href, label]) => (
            <li key={href}><Link href={href} onClick={() => setOpen(false)}>{label}</Link></li>
          ))}
        </ul>
        <Link href="/login" className="navbar__login wsc-btn wsc-btn-sm">Member login</Link>
      </nav>
    </header>
  )
}
```

- [ ] **Step 4: Add responsive CSS for nav**

Append to `Navbar.css`:

```css
.navbar-wrap { position: sticky; top: 0; z-index: 100; background: var(--paper); border-bottom: 1px solid var(--rule); }

.navbar {
  display: flex;
  align-items: center;
  padding: 0 56px;
  height: 64px;
  max-width: 1280px;
  margin: 0 auto;
  gap: 32px;
}

.navbar__links {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 28px;
  flex: 1;
}

.navbar__links a {
  font-size: 15px;
  font-weight: 500;
  color: var(--ink-2);
  transition: color 0.15s;
}
.navbar__links a:hover { color: var(--clay); }

.navbar__hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink);
  padding: 8px;
  margin-left: auto;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 767px) {
  .navbar { padding: 0 20px; }
  .navbar__hamburger { display: flex; }
  .navbar__login { display: none; }

  .navbar__links {
    display: none;
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--paper);
    flex-direction: column;
    padding: 32px 24px;
    gap: 0;
    border-top: 1px solid var(--rule);
  }

  .navbar__links--open { display: flex; }

  .navbar__links li { border-bottom: 1px solid var(--rule-soft); }
  .navbar__links a {
    display: block;
    padding: 16px 0;
    font-size: 18px;
  }
}
```

- [ ] **Step 5: Verify in browser**

Run `npm run dev`. Check:
- Desktop: ribbon visible, nav items horizontal, "Member login" pill visible
- Mobile (DevTools < 768px): ribbon hidden, hamburger icon visible, tapping opens full-screen nav drawer, tapping a link closes it

- [ ] **Step 6: Commit**

```bash
git add src/components/Navbar.tsx src/components/Navbar.css
git commit -m "feat: update Navbar with top ribbon and responsive hamburger menu"
```

---

### Task 1.2: Update Footer to 4-column handoff layout

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/components/Footer.css`

- [ ] **Step 1: Read the current Footer files**

Read `src/components/Footer.tsx` and `src/components/Footer.css` before editing.

- [ ] **Step 2: Rebuild Footer.tsx**

```tsx
import Link from 'next/link'
import Wordmark from './Wordmark'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Wordmark />
          <p className="footer__tagline">Winchburgh's home for public speaking, storytelling, and connecting.</p>
        </div>
        <div className="footer__col">
          <h4>Visit</h4>
          <ul>
            <li><Link href="/meetings">Upcoming meetings</Link></li>
            <li><Link href="/contact#find-us">Find us</Link></li>
            <li><Link href="/contact#find-us">Accessibility</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4>About</h4>
          <ul>
            <li><Link href="/about">About the club</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/about#pathways">Speaking pathways</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@winchburghsc.co.uk">hello@winchburghsc.co.uk</a></li>
            <li><Link href="/contact">Send a message</Link></li>
            <li><a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
          </ul>
        </div>
      </div>
      <div className="footer__bar">
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-4)' }}>
          © {new Date().getFullYear()} Winchburgh Speakers Club
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-4)' }}>
          est. 2018
        </span>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Rebuild Footer.css**

```css
.footer {
  background: var(--paper-2);
  border-top: 1px solid var(--rule);
  margin-top: auto;
}

.footer__inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 64px 56px 48px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 48px;
}

.footer__tagline {
  margin-top: 16px;
  font-size: 14px;
  color: var(--ink-3);
  max-width: 260px;
}

.footer__col h4 {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 16px;
}

.footer__col ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer__col a {
  font-size: 14px;
  color: var(--ink-2);
  transition: color 0.15s;
}
.footer__col a:hover { color: var(--clay); }

.footer__bar {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 56px;
  border-top: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
}

@media (max-width: 1023px) {
  .footer__inner { grid-template-columns: 1fr 1fr; gap: 32px; padding: 48px 32px 32px; }
  .footer__brand { grid-column: 1 / -1; }
}

@media (max-width: 639px) {
  .footer__inner { grid-template-columns: 1fr; padding: 40px 20px 24px; }
  .footer__bar { padding: 16px 20px; flex-direction: column; gap: 8px; }
}
```

- [ ] **Step 4: Verify in browser**

Check desktop (4 columns), tablet (2 columns), mobile (single column).

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.css
git commit -m "feat: rebuild Footer to 4-column design handoff layout"
```

---

### Task 1.3: Update shared UI components

**Files:**
- Modify: `src/components/Wordmark.tsx` + `Wordmark.css`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/EyebrowLabel.tsx`
- Modify: `src/components/ui/Tag.tsx`

- [ ] **Step 1: Read all 5 component files**

Read each file before editing.

- [ ] **Step 2: Update Wordmark.tsx — add tone prop**

```tsx
import './Wordmark.css'

export default function Wordmark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <div className={`wordmark wordmark--${tone}`}>
      <span className="wordmark__serif">Winchburgh</span>
      <span className="wordmark__mono">Speakers Club · est. 2018</span>
    </div>
  )
}
```

In `Wordmark.css` ensure:

```css
.wordmark { display: flex; flex-direction: column; gap: 2px; text-decoration: none; }

.wordmark__serif {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 20px;
  letter-spacing: -0.01em;
  line-height: 1;
}

.wordmark__mono {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wordmark--dark .wordmark__serif { color: var(--ink); }
.wordmark--dark .wordmark__mono { color: var(--ink-3); }
.wordmark--light .wordmark__serif { color: oklch(0.97 0.010 80); }
.wordmark--light .wordmark__mono { color: oklch(0.78 0.135 75); }
```

- [ ] **Step 3: Update Button.tsx**

```tsx
import { ReactNode } from 'react'
import Link from 'next/link'

type ButtonVariant = 'primary' | 'ghost' | 'ghost-light' | 'text'
type ButtonSize = 'default' | 'sm'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
}

export default function Button({
  children, variant = 'primary', size = 'default',
  href, onClick, type = 'button', disabled, className = ''
}: ButtonProps) {
  const classes = [
    'wsc-btn',
    variant === 'primary' ? 'wsc-btn-primary' : '',
    variant === 'ghost' ? 'wsc-btn-ghost' : '',
    variant === 'ghost-light' ? 'wsc-btn-ghost-light' : '',
    variant === 'text' ? 'wsc-btn-text' : '',
    size === 'sm' ? 'wsc-btn-sm' : '',
    className,
  ].filter(Boolean).join(' ')

  if (href) return <Link href={href} className={classes}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{children}</button>
}
```

- [ ] **Step 4: Update Input.tsx — add show/hide password toggle**

```tsx
'use client'
import { useState, InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
}

export default function Input({ label, id, error, type, ...props }: InputProps) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="input-field">
      <label className="wsc-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} type={inputType} className="wsc-input" {...props} />
        {isPassword && (
          <button
            type="button"
            className="input-field__eye"
            aria-label={showPw ? 'Hide password' : 'Show password'}
            onClick={() => setShowPw(v => !v)}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="input-field__error">{error}</p>}
    </div>
  )
}
```

Add to `globals.css`:

```css
.input-field { display: flex; flex-direction: column; gap: 0; }
.input-field__eye {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-3);
  padding: 4px;
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
}
.input-field__error { font-size: 13px; color: oklch(0.50 0.18 25); margin-top: 4px; }
```

- [ ] **Step 5: Update EyebrowLabel.tsx**

```tsx
type EyebrowTone = 'muted' | 'clay' | 'gold'

export default function EyebrowLabel({ children, tone = 'muted' }: { children: React.ReactNode; tone?: EyebrowTone }) {
  const colors: Record<EyebrowTone, string> = {
    muted: 'var(--ink-3)',
    clay: 'var(--clay)',
    gold: 'oklch(0.55 0.155 60)',
  }
  return (
    <span className="wsc-eyebrow" style={{ color: colors[tone] }}>
      {children}
    </span>
  )
}
```

- [ ] **Step 6: Update Tag.tsx**

```tsx
type TagVariant = 'default' | 'clay' | 'sage' | 'gold'

export default function Tag({ children, variant = 'default' }: { children: React.ReactNode; variant?: TagVariant }) {
  return (
    <span className={`wsc-tag${variant !== 'default' ? ` wsc-tag-${variant}` : ''}`}>
      {children}
    </span>
  )
}
```

- [ ] **Step 7: Verify in browser**

Open homepage. Confirm wordmark renders, buttons show correct variants, inputs work on the login page with show/hide toggle.

- [ ] **Step 8: Commit**

```bash
git add src/components/Wordmark.tsx src/components/Wordmark.css src/components/ui/
git commit -m "feat: update shared UI components — Wordmark tone prop, Button variants, Input password toggle, EyebrowLabel, Tag"
```

---

### Task 1.4: Update PortalNav for design system + mobile

**Files:**
- Modify: `src/components/PortalNav.tsx`

- [ ] **Step 1: Read PortalNav.tsx**

- [ ] **Step 2: Apply design tokens**

Ensure PortalNav uses `var(--paper)`, `var(--rule)`, `var(--clay)`, `var(--ink)` for all colours. Active tab should use `var(--clay)` border/text. No hardcoded hex values.

Add mobile responsive styles:

```css
/* In the PortalNav component's CSS or inline */
@media (max-width: 767px) {
  /* Portal nav becomes a horizontal scrollable tab strip */
  .portal-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .portal-nav__list { white-space: nowrap; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PortalNav.tsx
git commit -m "feat: apply design tokens to PortalNav, add mobile horizontal scroll"
```

---

### Task 1.5: Write design-system.md standards doc

**Files:**
- Create: `docs/design-system.md`

- [ ] **Step 1: Write the standards doc**

```markdown
# Winchburgh Speakers Club — Design System

## 1. Design Tokens

Always use CSS variables. Never hardcode colour values.

| Variable | Value | Use when |
|---|---|---|
| `--paper` | pale cool oat | Page background |
| `--paper-2` | slightly darker | Section alt backgrounds |
| `--paper-3` | card/panel bg | Cards, elevated surfaces |
| `--rule` | border grey | Borders, dividers |
| `--ink` | deep slate-blue | Primary text, headings |
| `--ink-2` | body text | Body copy |
| `--ink-3` | muted text | Labels, secondary |
| `--ink-4` | captions | Placeholders, meta |
| `--clay` | loch blue | Primary accent, links, active states |
| `--clay-deep` | deep loch | Button hover, strong emphasis |
| `--clay-soft` | sky wash | Tag backgrounds, tinted surfaces |
| `--sage` | kingfisher teal | Secondary accent |
| `--sage-soft` | kingfisher wash | Secondary tag backgrounds |
| `--gold` | sunrise amber | Tertiary accent, on dark backgrounds |
| `--night` | deep navy | Dark section backgrounds |
| `--night-2` | lifted navy | Elevated dark surfaces |
| `--gradient` | clay→gold | CTA buttons, date badges |

## 2. Typography

| Variable | Font | Use for |
|---|---|---|
| `--serif` | Newsreader | All headings (h1–h4), pull-quotes, large numbers |
| `--sans` | Inter | Body text, UI labels, buttons |
| `--mono` | JetBrains Mono | Eyebrow labels, dates, meta, code |

Heading defaults (from globals.css): `font-weight: 500`, `letter-spacing: -0.015em`, `line-height: 1.05`.

Italic amber emphasis in headings: wrap the phrase in `<em style={{ color: 'oklch(0.55 0.155 60)', fontStyle: 'italic' }}>`.

## 3. Component Classes

| Class | Use |
|---|---|
| `.wsc-btn` | Base for all buttons |
| `.wsc-btn-primary` | Gradient CTA (clay→gold) |
| `.wsc-btn-ghost` | Outlined, light background |
| `.wsc-btn-ghost-light` | Outlined, dark background |
| `.wsc-btn-sm` | Compact button (38px height) |
| `.wsc-tag` | Default pill tag |
| `.wsc-tag-clay / -sage / -gold` | Coloured tag variants |
| `.wsc-card` | White card, rule border, r-lg, 24px padding |
| `.wsc-input` | 48px form input |
| `.wsc-label` | Form field label |
| `.wsc-eyebrow` | Mono uppercase section label |

All components are in `src/components/ui/`. Prefer these over one-off inline styles.

## 4. Page File Structure

Every page follows this pattern:

```
src/app/[route]/
  page.tsx        ← Server Component (default)
  [route].css     ← Page-specific styles (import in page.tsx)
  SomeForm.tsx    ← Client Component only if state/interactivity needed
  actions.ts      ← Server Actions (form submissions, mutations)
```

CSS file is co-located with `page.tsx`, not global. Import it in `page.tsx`:

```tsx
import './contact.css'
```

## 5. Responsive Design Rules

**Mobile-first always.** Write the mobile layout first, then use `min-width` media queries to enhance:

```css
/* Mobile: single column (default) */
.hero { display: block; }

/* Tablet and up */
@media (min-width: 768px) {
  .hero { display: grid; grid-template-columns: 1fr 1fr; }
}
```

**Breakpoints:**

| Name | Min-width | Use for |
|---|---|---|
| sm | 640px | Small tablets, landscape phones |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops (design width) |

**Side padding:**
- Desktop (≥1280px): `56px`
- Tablet (768–1279px): `32px`
- Mobile (<768px): `20px`

**Max content width:** `1280px`, centred with `margin: 0 auto`.

## 6. New Page Checklist

Before shipping any new page:

- [ ] All colours use CSS variables (no hardcoded hex/rgb)
- [ ] All buttons use `.wsc-btn` + variant class
- [ ] All inputs use `.wsc-input` + `.wsc-label`
- [ ] All headings use `--serif` font
- [ ] Page tested on mobile (< 768px) in DevTools
- [ ] All interactive elements have ≥ 44px tap target
- [ ] All form fields have associated `<label htmlFor>`
- [ ] Focus rings visible on keyboard navigation
- [ ] No Tailwind classes

## 7. Admin Page Baseline

Admin pages don't have polished designs but must use the design system:

- Page background: `var(--paper)`
- Table wrapper: `<div style={{ overflowX: 'auto' }}>` for mobile scroll
- Action buttons: `.wsc-btn .wsc-btn-sm` for inline table actions
- Section headings: `.wsc-eyebrow` + `<h2>` with `--serif`
- Status badges: `.wsc-tag` with appropriate colour variant

## 8. Copy Tone

Plain, neighbourly Scottish-English. Examples:

- ✅ "The kettle goes on at half six. You're welcome."
- ✅ "No booking needed for your first visit."
- ✅ "You don't need to be confident. You just need to turn up."
- ❌ "Register your interest" → use "Come along"
- ❌ Toastmasters jargon (DTM, manual) → use "pathway", "Foundations"
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-system.md
git commit -m "docs: add design system standards document"
```

---

## Phase 2 — Discover & Enquire

### Task 2.1: Complete homepage to full handoff fidelity

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.css`

- [ ] **Step 1: Read current page.tsx and page.css in full**

Also read `../design_handoff_speakers_club_portal/designs/wsc-homepage.jsx` to understand all sections.

- [ ] **Step 2: Implement missing homepage sections**

The homepage needs all 8 sections from the handoff. For each missing section, add it to `page.tsx` and style in `page.css`. Required sections:

**Section 1 — Hero** (check if exists, complete to spec):
```tsx
<section className="home-hero">
  <div className="home-hero__content">
    <EyebrowLabel tone="gold">Winchburgh · West Lothian</EyebrowLabel>
    <h1>
      Where <em className="home-hero__italic">speaking out loud</em> becomes the easiest thing in the room.
    </h1>
    <p>We meet every Tuesday at 7pm. No experience needed. The kettle goes on at half six.</p>
    <div className="home-hero__ctas">
      <Button href="/signup">Come to a meeting</Button>
      <Button href="/about" variant="ghost">What happens?</Button>
    </div>
    <div className="home-hero__members">
      <div className="home-hero__avatars">
        {/* PhotoSlot placeholders until real avatars */}
        {[1,2,3].map(i => <PhotoSlot key={i} width={36} height={36} style={{ borderRadius: '50%', border: '2px solid var(--paper)' }} />)}
      </div>
      {memberCount && <span>{memberCount} members and counting</span>}
    </div>
  </div>
  <div className="home-hero__media">
    <PhotoSlot width={520} height={400} data-label="Member at lectern" />
    <div className="home-hero__next-card">
      {nextMeeting && (
        <>
          <div className="home-hero__date-badge">
            <span>{formatDay(nextMeeting.meeting_date)}</span>
            <span>{formatMonth(nextMeeting.meeting_date)}</span>
          </div>
          <div>
            <p className="wsc-eyebrow">Next meeting</p>
            <p style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>{nextMeeting.theme || 'Open session'}</p>
          </div>
        </>
      )}
    </div>
  </div>
</section>
```

**Section 2 — How it works:**
```tsx
<section className="home-how">
  <div className="home-how__inner">
    <EyebrowLabel>How it works</EyebrowLabel>
    <h2>We keep it simple. <em className="text-amber-italic">You keep your seat.</em></h2>
    <div className="home-how__steps">
      {[
        { n: '01', title: 'Turn up', body: 'Walk in. Someone will meet you at the door. No booking needed for your first visit.' },
        { n: '02', title: 'Watch and listen', body: 'Spend your first visit just watching. See how it works. See that everyone is kind.' },
        { n: '03', title: 'Have a go', body: 'When you\'re ready — and only when you\'re ready — you can take a role or give a short speech.' },
      ].map(s => (
        <div key={s.n} className="home-how__step">
          <span className="home-how__step-num">STEP {s.n}</span>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Section 3 — Pull-quote:**
```tsx
<section className="home-quote">
  <blockquote>
    <span className="home-quote__mark">"</span>
    <p>It is the warmest room in Winchburgh on a Tuesday. Honest.</p>
    <cite>— Margaret, Club President</cite>
  </blockquote>
</section>
```

**Section 4 — News cards** (from `news` data):
```tsx
<section className="home-news">
  <div className="home-news__inner">
    <EyebrowLabel>From the club</EyebrowLabel>
    <h2>News</h2>
    <div className="home-news__grid">
      {news?.map(post => (
        <article key={post.id} className="home-news__card wsc-card">
          <PhotoSlot width={360} height={200} data-label="News image" />
          <Tag variant="clay">{post.category || 'Club news'}</Tag>
          <time style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-4)' }}>
            {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </time>
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  </div>
</section>
```

**Section 5 — CTA strip:**
```tsx
<section className="home-cta">
  <div className="home-cta__inner">
    <h2>Come and try us</h2>
    <p>No booking needed for your first visit. No-one will put you on the spot.</p>
    <div className="home-cta__btns">
      <Button href="/signup">Reserve a spot</Button>
      <Button href="/contact" variant="ghost-light">Get in touch</Button>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Add all CSS for new sections**

In `page.css`:

```css
/* Hero */
.home-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 80px 56px;
  align-items: center;
}
.home-hero__italic { font-style: italic; color: oklch(0.55 0.155 60); }
.home-hero h1 { font-size: clamp(40px, 5vw, 72px); line-height: 1.05; margin-bottom: 24px; }
.home-hero p { font-size: 18px; color: var(--ink-2); margin-bottom: 32px; }
.home-hero__ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.home-hero__members { display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--ink-3); }
.home-hero__avatars { display: flex; }
.home-hero__avatars > * { margin-right: -8px; }
.home-hero__media { position: relative; }
.home-hero__next-card {
  position: absolute;
  left: -20px;
  bottom: 20px;
  background: white;
  border-radius: var(--r-lg);
  padding: 16px 20px;
  box-shadow: var(--shadow-lg);
  display: flex;
  gap: 16px;
  align-items: center;
}
.home-hero__date-badge {
  background: var(--gradient);
  border-radius: var(--r-md);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.3;
}

/* How it works */
.home-how { background: var(--paper-2); padding: 72px 56px; }
.home-how__inner { max-width: 1280px; margin: 0 auto; text-align: center; }
.home-how__inner h2 { font-size: 40px; margin: 12px 0 48px; }
.home-how__steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; text-align: left; }
.home-how__step-num { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; color: var(--clay-deep); font-weight: 500; }
.home-how__step h3 { font-size: 22px; margin: 8px 0; }
.home-how__step p { color: var(--ink-2); }
.text-amber-italic { font-style: italic; color: oklch(0.55 0.155 60); }

/* Pull quote */
.home-quote { padding: 80px 56px; text-align: center; }
.home-quote blockquote { max-width: 720px; margin: 0 auto; position: relative; }
.home-quote__mark { font-family: var(--serif); font-size: 96px; line-height: 0.5; color: oklch(0.55 0.155 60); display: block; margin-bottom: 24px; }
.home-quote p { font-family: var(--serif); font-size: 40px; font-style: italic; line-height: 1.2; color: var(--ink); }
.home-quote cite { display: block; margin-top: 24px; font-family: var(--mono); font-size: 13px; color: var(--ink-3); font-style: normal; }

/* News */
.home-news { padding: 72px 56px; }
.home-news__inner { max-width: 1280px; margin: 0 auto; }
.home-news__grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 40px; }
.home-news__card { display: flex; flex-direction: column; gap: 12px; }
.home-news__card h3 { font-size: 20px; }
.home-news__card p { color: var(--ink-2); font-size: 15px; }

/* CTA strip */
.home-cta {
  background: var(--night);
  padding: 80px 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
}
.home-cta::before {
  content: '';
  position: absolute;
  top: -100px; right: -100px;
  width: 480px; height: 480px;
  background: radial-gradient(circle, oklch(0.78 0.135 75 / 0.25) 0%, transparent 70%);
  pointer-events: none;
}
.home-cta__inner { max-width: 640px; margin: 0 auto; position: relative; }
.home-cta__inner h2 { color: white; font-size: 48px; margin-bottom: 16px; }
.home-cta__inner p { color: oklch(0.78 0.04 240); margin-bottom: 32px; font-size: 17px; }
.home-cta__btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* Responsive */
@media (max-width: 1023px) {
  .home-hero { grid-template-columns: 1fr; padding: 48px 32px; gap: 40px; }
  .home-how__steps { grid-template-columns: 1fr; gap: 28px; }
  .home-news__grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 767px) {
  .home-how { padding: 48px 20px; }
  .home-quote { padding: 48px 20px; }
  .home-quote p { font-size: 26px; }
  .home-news { padding: 48px 20px; }
  .home-news__grid { grid-template-columns: 1fr; }
  .home-cta { padding: 56px 20px; }
  .home-cta__inner h2 { font-size: 32px; }
  .home-hero { padding: 40px 20px; }
}
```

- [ ] **Step 4: Verify all sections render correctly**

Run `npm run dev`. Check homepage has all 8 sections. Check mobile layout in DevTools. Verify Supabase data (meetings, news, member count) loads correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/page.css
git commit -m "feat: complete homepage to full design handoff fidelity"
```

---

### Task 2.2: Build Contact page to handoff spec

**Files:**
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/contact/contact.css`
- Modify: `src/app/contact/ContactForm.tsx`

- [ ] **Step 1: Read current contact files**

Read `page.tsx`, `contact.css`, `ContactForm.tsx`, and `actions.ts`.

Also read `../design_handoff_speakers_club_portal/designs/wsc-contact.jsx`.

- [ ] **Step 2: Rebuild contact page layout**

```tsx
import ContactForm from './ContactForm'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import './contact.css'

export default function ContactPage() {
  return (
    <main className="contact-page">
      <div className="contact-inner">
        <div className="contact-left">
          <EyebrowLabel tone="clay">Get in touch</EyebrowLabel>
          <h1>We'd love to hear from you</h1>
          <p className="contact-intro">Whether you're curious about visiting, have a question, or just want to say hello — drop us a message and we'll get back to you soon.</p>
          <ContactForm />
        </div>
        <aside className="contact-right">
          <div className="contact-find-us wsc-card" id="find-us">
            <EyebrowLabel>Find us</EyebrowLabel>
            <h2>Winchburgh Community Centre</h2>
            <address>
              <p>Main Street, Winchburgh</p>
              <p>EH52 6RP</p>
            </address>
            <p style={{ marginTop: 16, fontSize: 14, color: 'var(--ink-3)' }}>
              <strong>Parking:</strong> Free parking on site<br />
              <strong>Step-free:</strong> Yes — full wheelchair access<br />
              <strong>Hearing loop:</strong> Available in the main hall
            </p>
            <a href="https://maps.google.com/?q=Winchburgh+Community+Centre" target="_blank" rel="noopener noreferrer" className="wsc-btn wsc-btn-ghost wsc-btn-sm" style={{ marginTop: 20 }}>
              Get directions
            </a>
          </div>

          <div className="contact-faqs">
            <EyebrowLabel>Common questions</EyebrowLabel>
            <details className="contact-faq">
              <summary>Do I need to book?</summary>
              <p>No booking needed for your first three visits. Just turn up. If you'd like to let us know you're coming, you can use the form above — but it's not required.</p>
            </details>
            <details className="contact-faq">
              <summary>Will I have to speak?</summary>
              <p>Not on your first visit — or your second, or your third. You're welcome to just watch until you feel ready. Nobody will put you on the spot.</p>
            </details>
            <details className="contact-faq">
              <summary>What does it cost?</summary>
              <p>Your first three visits are completely free. After that, membership is £3 per meeting. No hidden costs, no annual fee.</p>
            </details>
          </div>
        </aside>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Rebuild ContactForm.tsx**

```tsx
'use client'
import { useActionState } from 'react'
import { sendContactMessage } from './actions'
import Button from '@/components/ui/Button'

const initialState = { success: false, error: null }

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState)

  if (state.success) {
    return (
      <div className="contact-success">
        <p style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>Message sent. We'll be in touch shortly.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="contact-form">
      <div className="contact-form__row">
        <div className="input-field">
          <label className="wsc-label" htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" className="wsc-input" required placeholder="First name is fine" />
        </div>
        <div className="input-field">
          <label className="wsc-label" htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" className="wsc-input" required placeholder="you@example.com" />
        </div>
      </div>
      <div className="input-field">
        <label className="wsc-label" htmlFor="topic">What's it about?</label>
        <select id="topic" name="topic" className="wsc-input">
          <option value="">Choose a topic</option>
          <option value="visit">I'd like to visit</option>
          <option value="membership">Membership question</option>
          <option value="venue">Venue / accessibility</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="input-field">
        <label className="wsc-label" htmlFor="message">Your message</label>
        <textarea id="message" name="message" className="wsc-input wsc-textarea" required rows={5} placeholder="What would you like to know?" />
      </div>
      <label className="contact-form__checkbox">
        <input type="checkbox" name="sms_ok" />
        <span>It's OK to text me back on the number above</span>
      </label>
      {state.error && <p className="input-field__error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Add contact CSS**

```css
.contact-page { max-width: 1280px; margin: 0 auto; padding: 72px 56px; }
.contact-inner { display: grid; grid-template-columns: 1fr 420px; gap: 80px; align-items: start; }
.contact-left h1 { font-size: 48px; margin: 12px 0 20px; }
.contact-intro { font-size: 17px; color: var(--ink-2); margin-bottom: 40px; }

.contact-form { display: flex; flex-direction: column; gap: 20px; }
.contact-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.contact-form__checkbox { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--ink-2); cursor: pointer; }
.contact-form__checkbox input { width: 18px; height: 18px; accent-color: var(--gold); }

.contact-find-us { margin-bottom: 32px; }
.contact-find-us h2 { font-size: 22px; margin: 12px 0 8px; }
.contact-find-us address { font-style: normal; color: var(--ink-2); line-height: 1.7; }

.contact-faqs { display: flex; flex-direction: column; gap: 0; }
.contact-faq { border-bottom: 1px solid var(--rule); padding: 16px 0; }
.contact-faq summary { font-weight: 600; cursor: pointer; list-style: none; display: flex; justify-content: space-between; }
.contact-faq summary::after { content: '+'; font-size: 20px; color: var(--ink-3); }
.contact-faq[open] summary::after { content: '−'; }
.contact-faq p { margin-top: 12px; color: var(--ink-2); font-size: 15px; }

@media (max-width: 1023px) {
  .contact-inner { grid-template-columns: 1fr; gap: 48px; padding: 48px 32px; }
}
@media (max-width: 767px) {
  .contact-page { padding: 40px 20px; }
  .contact-form__row { grid-template-columns: 1fr; }
  .contact-left h1 { font-size: 32px; }
}
```

- [ ] **Step 5: Verify form submits correctly**

Test the contact form in browser — submit with valid data, confirm the success state renders.

- [ ] **Step 6: Commit**

```bash
git add src/app/contact/
git commit -m "feat: rebuild Contact page to design handoff spec"
```

---

## Phase 3 — RSVP (Guest Signup Flow)

### Task 3.1: Create signups table migration

**Files:**
- Create: `supabase/migrations/[timestamp]_create_signups.sql`

- [ ] **Step 1: Create the migration file**

```bash
timestamp=$(date +%Y%m%d%H%M%S)
touch "supabase/migrations/${timestamp}_create_signups.sql"
```

- [ ] **Step 2: Write the migration**

```sql
-- Create signups table for guest RSVPs (pre-auth visitors)
create table public.signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  heard_from text,
  experience text check (experience in ('none', 'some', 'lots')),
  hopes text[] default '{}',
  meeting_id uuid references public.meetings(id) on delete set null,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'attended', 'converted')),
  conversion_token uuid unique,
  conversion_token_expires_at timestamptz,
  conversion_token_used_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table public.signups enable row level security;

-- Anyone (including anon) can insert a new signup
create policy "Anyone can create a signup"
  on public.signups for insert
  with check (true);

-- Only admins can read/update signups
create policy "Admins can view all signups"
  on public.signups for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update signups"
  on public.signups for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Index for admin queries
create index signups_status_idx on public.signups (status);
create index signups_meeting_id_idx on public.signups (meeting_id);
create index signups_email_idx on public.signups (email);
create index signups_conversion_token_idx on public.signups (conversion_token) where conversion_token is not null;
```

- [ ] **Step 3: Apply migration**

```bash
npx supabase db push
```

Expected: migration runs without error, `signups` table visible in Supabase dashboard.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add signups table migration for guest RSVP flow"
```

---

### Task 3.2: Build 4-step signup RSVP flow

**Files:**
- Modify: `src/app/signup/page.tsx`
- Create: `src/app/signup/signup.css`
- Create: `src/app/signup/SignupFlow.tsx` (Client Component)
- Modify: `src/app/signup/actions.ts`

- [ ] **Step 1: Read current signup files**

Read `src/app/signup/page.tsx` and `src/app/signup/actions.ts`. Also read `../design_handoff_speakers_club_portal/designs/wsc-signup.jsx`.

- [ ] **Step 2: Create actions.ts server action**

Replace the contents of `src/app/signup/actions.ts`:

```ts
'use server'
import { createClient } from '@/utils/supabase/server'

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
  const supabase = await createClient()

  const { error } = await supabase.from('signups').insert({
    first_name: data.firstName,
    last_name: data.lastName || null,
    email: data.email,
    phone: data.phone || null,
    heard_from: data.heard || null,
    experience: data.experience,
    hopes: data.hopes,
    meeting_id: data.meetingId || null,
    notes: data.notes || null,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
```

- [ ] **Step 3: Create SignupFlow.tsx — 4-step Client Component**

```tsx
'use client'
import { useState } from 'react'
import { submitSignup, type SignupData } from './actions'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Button from '@/components/ui/Button'

type Meeting = { id: string; meeting_date: string; theme: string | null; meeting_type: string | null }

const HEARD_OPTIONS = ['A friend or family member', 'Social media', 'Local noticeboard', 'Search engine', 'Walked past', 'Other']
const HOPE_OPTIONS = ['Build my confidence', 'Get better at work presentations', 'Meet new people in Winchburgh', 'Practice for a wedding / event', 'Have a go at competitions', 'Just have a fun Tuesday night']

function formatDay(d: string) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric' }) }
function formatMonth(d: string) { return new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase() }
function formatFullDate(d: string) { return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) }

type Step = 1 | 2 | 3 | 4

export default function SignupFlow({ meetings }: { meetings: Meeting[] }) {
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<SignupData>({
    firstName: '', lastName: '', email: '', phone: '', heard: '',
    experience: 'none', hopes: [], meetingId: '', notes: '',
  })

  const set = (k: keyof SignupData, v: string | string[]) => setForm(f => ({ ...f, [k]: v }))

  const validEmail = /\S+@\S+\.\S+/.test(form.email)
  const step1Valid = form.firstName.trim().length > 0 && validEmail
  const step2Valid = form.experience !== 'none' || form.hopes.length > 0
    ? (form.experience as string) !== '' && form.hopes.length > 0
    : false
  const step3Valid = form.meetingId !== ''

  const selectedMeeting = meetings.find(m => m.id === form.meetingId)

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitSignup(form)
      setStep(4)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="signup-flow">
      {/* Step indicator */}
      <div className="signup-steps">
        {([1,2,3,4] as Step[]).map((n, i) => (
          <div key={n} className="signup-steps__item">
            <div className={`signup-steps__dot${step === n ? ' signup-steps__dot--active' : step > n ? ' signup-steps__dot--done' : ''}`}>
              {step > n ? '✓' : n}
            </div>
            {i < 3 && <div className={`signup-steps__line${step > n ? ' signup-steps__line--done' : ''}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="signup-step" key="step1">
          <EyebrowLabel tone="clay">Step 1 of 4</EyebrowLabel>
          <h2>The basics</h2>
          <div className="signup-form">
            <div className="signup-form__row">
              <div className="input-field">
                <label className="wsc-label" htmlFor="firstName">First name <span style={{color:'var(--clay)'}}>*</span></label>
                <input id="firstName" className="wsc-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Your first name" required />
              </div>
              <div className="input-field">
                <label className="wsc-label" htmlFor="lastName">Last name <span style={{color:'var(--ink-4)'}}>(optional)</span></label>
                <input id="lastName" className="wsc-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Your last name" />
              </div>
            </div>
            <div className="input-field">
              <label className="wsc-label" htmlFor="email">Email address <span style={{color:'var(--clay)'}}>*</span></label>
              <input id="email" type="email" className="wsc-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="input-field">
              <label className="wsc-label" htmlFor="phone">Phone <span style={{color:'var(--ink-4)'}}>(optional)</span></label>
              <input id="phone" type="tel" className="wsc-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="07700 000000" />
            </div>
            <div>
              <p className="wsc-label" style={{marginBottom:12}}>How did you hear about us?</p>
              <div className="signup-chips">
                {HEARD_OPTIONS.map(o => (
                  <button key={o} type="button" className={`signup-chip${form.heard === o ? ' signup-chip--active' : ''}`} onClick={() => set('heard', form.heard === o ? '' : o)}>{o}</button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!step1Valid}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="signup-step" key="step2">
          <EyebrowLabel tone="clay">Step 2 of 4</EyebrowLabel>
          <h2>About you</h2>
          <div className="signup-form">
            <p className="wsc-label" style={{marginBottom:12}}>How much speaking experience do you have?</p>
            <div className="signup-experience">
              {([['none', 'Total newcomer', "I've never spoken in front of a group before. Or if I have, it was a disaster."],
                ['some', 'A bit, here and there', "I've done the odd presentation or toast, but nothing regular."],
                ['lots', "I've spoken plenty", "Presentations, debates, maybe even some Toastmasters. I want to keep improving."]] as const).map(([val, title, body]) => (
                <button key={val} type="button" className={`signup-exp-card${form.experience === val ? ' signup-exp-card--active' : ''}`} onClick={() => set('experience', val)}>
                  {form.experience === val && <span className="signup-exp-card__check">✓</span>}
                  <h3>{title}</h3>
                  <p>{body}</p>
                </button>
              ))}
            </div>
            <div>
              <p className="wsc-label" style={{marginBottom:12}}>What are you hoping for? <span style={{color:'var(--ink-4)'}}>(pick all that apply)</span></p>
              <div className="signup-chips">
                {HOPE_OPTIONS.map(o => {
                  const active = form.hopes.includes(o)
                  return (
                    <button key={o} type="button"
                      className={`signup-chip signup-chip--multi${active ? ' signup-chip--multi-active' : ''}`}
                      onClick={() => set('hopes', active ? form.hopes.filter(h => h !== o) : [...form.hopes, o])}
                    >
                      {active && '✓ '}{o}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{display:'flex',gap:12}}>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>Next</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="signup-step" key="step3">
          <EyebrowLabel tone="clay">Step 3 of 4</EyebrowLabel>
          <h2>Your first visit</h2>
          <p style={{color:'var(--ink-2)',marginBottom:24}}>Pick a Tuesday that works for you. No pressure — you can always come along without booking.</p>
          <div className="signup-meetings">
            {meetings.length === 0 && <p style={{color:'var(--ink-3)'}}>No upcoming meetings scheduled yet. Check back soon.</p>}
            {meetings.map(m => (
              <button key={m.id} type="button"
                className={`signup-meeting${form.meetingId === m.id ? ' signup-meeting--active' : ''}`}
                onClick={() => set('meetingId', m.id)}
              >
                <div className={`signup-meeting__badge${form.meetingId === m.id ? ' signup-meeting__badge--active' : ''}`}>
                  <span>{formatDay(m.meeting_date)}</span>
                  <span>{formatMonth(m.meeting_date)}</span>
                </div>
                <div className="signup-meeting__info">
                  <span className="wsc-eyebrow">{m.meeting_type || 'Regular meeting'}</span>
                  <strong style={{fontFamily:'var(--serif)',fontSize:18}}>{m.theme || 'Open session'}</strong>
                  <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--ink-4)'}}>7:00pm · Community Centre, Main Street</span>
                </div>
                <div className={`signup-meeting__radio${form.meetingId === m.id ? ' signup-meeting__radio--active' : ''}`}>
                  {form.meetingId === m.id && '✓'}
                </div>
              </button>
            ))}
          </div>
          <details className="signup-notes">
            <summary>Anything we should know? <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></summary>
            <textarea
              className="wsc-input wsc-textarea"
              style={{marginTop:12}}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Mobility needs, hearing loop, dietary requirements... or just: please don't put me on the spot."
              rows={4}
            />
          </details>
          {submitError && <p className="input-field__error">{submitError}</p>}
          <div style={{display:'flex',gap:12,marginTop:8}}>
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit} disabled={!step3Valid || submitting}>
              {submitting ? 'Reserving…' : 'Reserve my spot'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="signup-step signup-step--done" key="step4">
          <div className="signup-done__mark">✓</div>
          <EyebrowLabel tone="gold">You're booked in</EyebrowLabel>
          <h2>Brilliant, <em style={{fontStyle:'italic',color:'oklch(0.55 0.155 60)'}}>{form.firstName}</em>. We'll see you then.</h2>
          <p style={{color:'var(--ink-2)',maxWidth:480}}>
            We've sent a confirmation to <strong>{form.email}</strong>. Margaret, our president, will drop you a quick hello in the next day or two.
          </p>
          {selectedMeeting && (
            <div className="signup-confirmation">
              <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:16}}>
                <div className="signup-meeting__badge signup-meeting__badge--active" style={{width:56,height:64,fontSize:16}}>
                  <span style={{fontSize:28,fontWeight:600}}>{formatDay(selectedMeeting.meeting_date)}</span>
                  <span>{formatMonth(selectedMeeting.meeting_date)}</span>
                </div>
                <div>
                  <p className="wsc-eyebrow" style={{color:'var(--gold)'}}>Your visit</p>
                  <p style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:500}}>{selectedMeeting.theme || 'Open session'}</p>
                  <p style={{fontFamily:'var(--mono)',fontSize:12,color:'oklch(0.78 0.04 240)'}}>{formatFullDate(selectedMeeting.meeting_date)} · 7:00pm</p>
                </div>
              </div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <Button>Add to calendar</Button>
                <Button variant="ghost-light" href="https://maps.google.com/?q=Winchburgh+Community+Centre">Get directions</Button>
              </div>
            </div>
          )}
          <div className="signup-expect wsc-card" style={{marginTop:24}}>
            <p className="wsc-eyebrow" style={{marginBottom:16}}>What to expect</p>
            {['Someone will meet you at the door', 'Doors open at 6:30, kettle on, meeting starts at 7:00', "You don't have to speak — just watch", "Nothing to bring, nothing to pay"].map(item => (
              <div key={item} style={{display:'flex',gap:12,alignItems:'center',padding:'10px 0',borderBottom:'1px solid var(--rule-soft)'}}>
                <span style={{width:28,height:28,borderRadius:'50%',background:'var(--clay-soft)',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:14}}>✓</span>
                <span style={{color:'var(--ink-2)'}}>{item}</span>
              </div>
            ))}
          </div>
          <p style={{marginTop:24,fontSize:14,color:'var(--ink-4)'}}>Questions? Email us at <a href="mailto:hello@winchburghsc.co.uk" style={{color:'var(--clay)'}}>hello@winchburghsc.co.uk</a></p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update page.tsx to fetch meetings and render flow**

```tsx
import { createClient } from '@/utils/supabase/server'
import Wordmark from '@/components/Wordmark'
import Link from 'next/link'
import SignupFlow from './SignupFlow'
import './signup.css'

export default async function SignupPage() {
  const supabase = await createClient()
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, meeting_date, theme, meeting_type')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(5)

  return (
    <div className="signup-page">
      <div className="signup-topbar">
        <Wordmark />
        <Link href="/login" style={{ fontSize: 14, color: 'var(--ink-3)' }}>Already a member? <span style={{ color: 'var(--clay)' }}>Sign in</span></Link>
      </div>
      <main className="signup-main">
        <SignupFlow meetings={meetings ?? []} />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Create signup.css**

```css
@keyframes wscFade {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.signup-page { min-height: 100vh; background: var(--paper); }
.signup-page::before {
  content: '';
  position: fixed;
  top: -150px; right: -150px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, oklch(0.78 0.135 75 / 0.12) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.signup-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  border-bottom: 1px solid var(--rule);
  position: relative;
  z-index: 1;
}

.signup-main {
  max-width: 640px;
  margin: 0 auto;
  padding: 56px 24px 80px;
  position: relative;
  z-index: 1;
}

.signup-step {
  animation: wscFade 0.32s ease;
}

.signup-step h2 {
  font-size: 36px;
  margin: 8px 0 24px;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.signup-form__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Steps indicator */
.signup-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  gap: 0;
}
.signup-steps__item { display: flex; align-items: center; }
.signup-steps__dot {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2px solid var(--rule);
  background: var(--paper);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 12px; color: var(--ink-4);
  transition: all 0.2s;
}
.signup-steps__dot--active { border-color: var(--gold); background: oklch(0.94 0.07 80); color: oklch(0.42 0.135 65); font-weight: 600; }
.signup-steps__dot--done { border-color: var(--clay); background: var(--clay-soft); color: var(--clay-deep); }
.signup-steps__line { width: 48px; height: 2px; background: var(--rule); transition: background 0.2s; }
.signup-steps__line--done { background: var(--clay); }

/* Chips */
.signup-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.signup-chip {
  padding: 8px 16px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--rule);
  background: var(--paper);
  font-size: 14px; cursor: pointer;
  transition: all 0.15s;
  color: var(--ink-2);
}
.signup-chip--active {
  border-color: var(--gold);
  background: oklch(0.97 0.020 75);
  color: oklch(0.42 0.135 65);
  font-weight: 600;
}
.signup-chip--multi.signup-chip--multi-active {
  border-color: var(--clay);
  background: var(--clay-soft);
  color: var(--clay-deep);
  font-weight: 600;
}

/* Experience cards */
.signup-experience { display: flex; flex-direction: column; gap: 12px; margin-bottom: 8px; }
.signup-exp-card {
  text-align: left;
  padding: 18px 20px;
  border-radius: var(--r-lg);
  border: 1.5px solid var(--rule);
  background: var(--paper);
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
}
.signup-exp-card:hover { border-color: var(--ink-3); }
.signup-exp-card--active { border-color: var(--gold); background: oklch(0.97 0.020 75); }
.signup-exp-card__check {
  position: absolute; top: 12px; right: 12px;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--gold);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
}
.signup-exp-card h3 { font-size: 17px; margin-bottom: 4px; }
.signup-exp-card p { font-size: 14px; color: var(--ink-3); margin: 0; }
.signup-exp-card--active h3 { color: oklch(0.42 0.135 65); }

/* Meetings */
.signup-meetings { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
.signup-meeting {
  display: flex; align-items: center; gap: 16px;
  padding: 14px 16px;
  border-radius: var(--r-lg);
  border: 1.5px solid var(--rule);
  background: var(--paper);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
  width: 100%;
}
.signup-meeting:hover { border-color: var(--ink-3); }
.signup-meeting--active { border-color: var(--gold); background: oklch(0.97 0.020 75); }
.signup-meeting__badge {
  min-width: 44px; height: 52px;
  border-radius: var(--r-md);
  background: var(--paper-3);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 11px;
  color: var(--ink-3);
  flex-shrink: 0;
}
.signup-meeting__badge--active { background: var(--gradient); color: white; }
.signup-meeting__badge span:first-child { font-size: 20px; font-weight: 600; line-height: 1; }
.signup-meeting__info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.signup-meeting__radio {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--rule);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: white;
}
.signup-meeting__radio--active { background: var(--gold); border-color: var(--gold); }

/* Notes accordion */
.signup-notes { margin-bottom: 16px; }
.signup-notes summary { cursor: pointer; font-size: 15px; font-weight: 500; color: var(--ink-2); padding: 8px 0; list-style: none; }
.signup-notes summary::marker { display: none; }

/* Done step */
.signup-step--done { text-align: center; }
.signup-done__mark {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: var(--gradient);
  color: white;
  font-size: 32px;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 4px 20px oklch(0.78 0.135 75 / 0.3);
}
.signup-done__mark + span { display: block; margin-bottom: 8px; }
.signup-step--done h2 { font-size: 32px; margin-bottom: 16px; }

.signup-confirmation {
  background: var(--night);
  border-radius: var(--r-xl);
  padding: 24px;
  margin-top: 24px;
  text-align: left;
}

@media (max-width: 639px) {
  .signup-topbar { padding: 16px 20px; }
  .signup-form__row { grid-template-columns: 1fr; }
  .signup-steps__line { width: 28px; }
  .signup-step h2 { font-size: 28px; }
}
```

- [ ] **Step 6: Verify the full 4-step flow**

Run `npm run dev`, visit `/signup`. Walk through all 4 steps:
1. Fill in name + email → Next enables
2. Pick experience + 2 hopes → Next enables
3. Pick a meeting → "Reserve my spot" enables
4. Submit → step 4 confirmation renders, check Supabase `signups` table has a new row

- [ ] **Step 7: Commit**

```bash
git add src/app/signup/
git commit -m "feat: build 4-step guest RSVP signup flow with signups table"
```

---

## Phase 4 — Login & Account Conversion

### Task 4.1: Verify login page mobile responsiveness

**Files:**
- Modify: `src/app/login/login.css`

- [ ] **Step 1: Read login.css and page.tsx**

- [ ] **Step 2: Ensure mobile CSS**

The login page is a 50/50 split on desktop. On mobile, the dark left panel should collapse. Add/verify these rules in `login.css`:

```css
@media (max-width: 767px) {
  .login-page {
    grid-template-columns: 1fr;
    min-height: 100vh;
  }

  /* Hide dark welcome panel on mobile — show only the form */
  .login-page__welcome {
    display: none;
  }

  /* Or if you prefer a branded header strip on mobile: */
  /* .login-page__welcome {
    padding: 24px 20px;
    min-height: auto;
  }
  .login-page__welcome .login-quote,
  .login-page__welcome .login-meeting-card { display: none; } */

  .login-page__form {
    padding: 40px 24px;
  }
}
```

- [ ] **Step 3: Verify on mobile in DevTools**

Form fills the screen, all inputs have 48px height, submit button is full-width on mobile.

- [ ] **Step 4: Commit**

```bash
git add src/app/login/login.css
git commit -m "fix: ensure login page collapses correctly on mobile"
```

---

### Task 4.2: Build account conversion flow (/join)

**Files:**
- Create: `src/app/join/page.tsx`
- Create: `src/app/join/join.css`
- Create: `src/app/join/JoinForm.tsx`
- Create: `src/app/join/actions.ts`

- [ ] **Step 1: Create actions.ts**

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function completeConversion(formData: FormData) {
  const supabase = await createClient()
  const token = formData.get('token') as string
  const password = formData.get('password') as string

  // Look up the signup by conversion token
  const { data: signup, error: lookupError } = await supabase
    .from('signups')
    .select('*')
    .eq('conversion_token', token)
    .is('conversion_token_used_at', null)
    .gt('conversion_token_expires_at', new Date().toISOString())
    .single()

  if (lookupError || !signup) {
    return { error: 'This invite link has expired or already been used. Please contact us for a new one.' }
  }

  // Create the auth account
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: signup.email,
    password,
  })

  if (signUpError || !authData.user) {
    return { error: signUpError?.message ?? 'Could not create account. Please try again.' }
  }

  // Create profile row
  await supabase.from('profiles').upsert({
    id: authData.user.id,
    first_name: signup.first_name,
    last_name: signup.last_name,
    email: signup.email,
    phone: signup.phone,
    is_admin: false,
  })

  // Mark signup as converted
  await supabase.from('signups').update({
    status: 'converted',
    conversion_token_used_at: new Date().toISOString(),
  }).eq('id', signup.id)

  redirect('/member/dashboard')
}
```

- [ ] **Step 2: Create JoinForm.tsx**

```tsx
'use client'
import { useActionState } from 'react'
import { completeConversion } from './actions'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const initial = { error: null }

export default function JoinForm({ token, firstName, lastName, email }: {
  token: string; firstName: string; lastName: string; email: string
}) {
  const [state, formAction, pending] = useActionState(completeConversion, initial)

  return (
    <form action={formAction} className="join-form">
      <input type="hidden" name="token" value={token} />
      <div className="join-form__prefilled">
        <p className="wsc-label">Name</p>
        <p>{firstName} {lastName}</p>
      </div>
      <div className="join-form__prefilled">
        <p className="wsc-label">Email</p>
        <p>{email}</p>
        <input type="hidden" name="email" value={email} />
      </div>
      <Input id="password" name="password" label="Choose a password" type="password" required minLength={8} placeholder="At least 8 characters" />
      {state?.error && <p className="input-field__error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Setting up your account…' : 'Create my account'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create page.tsx**

```tsx
import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Wordmark from '@/components/Wordmark'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import JoinForm from './JoinForm'
import './join.css'

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  if (!token) notFound()

  const supabase = await createClient()
  const { data: signup } = await supabase
    .from('signups')
    .select('first_name, last_name, email, conversion_token_expires_at, conversion_token_used_at')
    .eq('conversion_token', token)
    .single()

  if (!signup || signup.conversion_token_used_at) notFound()
  if (signup.conversion_token_expires_at && new Date(signup.conversion_token_expires_at) < new Date()) notFound()

  return (
    <div className="join-page">
      <div className="join-topbar">
        <Wordmark />
      </div>
      <main className="join-main">
        <EyebrowLabel tone="clay">Welcome to the club</EyebrowLabel>
        <h1>Set up your account, <em style={{fontStyle:'italic',color:'oklch(0.55 0.155 60)'}}>{signup.first_name}</em>.</h1>
        <p style={{color:'var(--ink-2)',marginBottom:32}}>
          Your details are already filled in from when you signed up. Just choose a password and you're in.
        </p>
        <JoinForm
          token={token}
          firstName={signup.first_name}
          lastName={signup.last_name ?? ''}
          email={signup.email}
        />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create join.css**

```css
.join-page { min-height: 100vh; background: var(--paper); }
.join-topbar { padding: 20px 40px; border-bottom: 1px solid var(--rule); }
.join-main { max-width: 480px; margin: 0 auto; padding: 56px 24px 80px; }
.join-main h1 { font-size: 36px; margin: 8px 0 16px; }
.join-form { display: flex; flex-direction: column; gap: 20px; }
.join-form__prefilled { padding: 12px 14px; background: var(--paper-2); border-radius: var(--r-md); border: 1px solid var(--rule); }
.join-form__prefilled p:first-child { margin-bottom: 4px; }
.join-form__prefilled p:last-child { color: var(--ink-2); font-size: 15px; margin: 0; }

@media (max-width: 639px) {
  .join-topbar { padding: 16px 20px; }
  .join-main h1 { font-size: 28px; }
}
```

- [ ] **Step 5: Verify with a test token**

Insert a test row directly in Supabase:

```sql
insert into public.signups (
  first_name, last_name, email, status,
  conversion_token, conversion_token_expires_at
) values (
  'Test', 'User', 'test@example.com', 'attended',
  gen_random_uuid(), now() + interval '7 days'
);
```

Copy the `conversion_token` UUID, visit `/join?token={uuid}`. Confirm the form pre-fills correctly and submitting creates a Supabase auth user.

- [ ] **Step 6: Commit**

```bash
git add src/app/join/
git commit -m "feat: build account conversion flow at /join"
```

---

## Phase 5 — Member Dashboard

### Task 5.1: Rebuild member dashboard to handoff spec

**Files:**
- Modify: `src/app/member/dashboard/page.tsx`
- Create: `src/app/member/dashboard/dashboard.css`
- Modify: `src/app/member/dashboard/VolunteerForm.tsx`

- [ ] **Step 1: Read current dashboard files**

Read `src/app/member/dashboard/page.tsx`, `VolunteerForm.tsx`, and `actions.ts`. Also read `../design_handoff_speakers_club_portal/designs/wsc-dashboard.jsx`.

- [ ] **Step 2: Add greeting and layout to page.tsx**

The dashboard Server Component fetches data and passes it to the layout. The page should:

1. Get the current user via `supabase.auth.getUser()`
2. Fetch profile: `select * from profiles where id = auth.uid()`
3. Fetch upcoming meetings (3): `select * from meetings where meeting_date >= today order by meeting_date asc limit 3`
4. For each meeting, fetch roles: `select * from meeting_roles where meeting_id = ? left join role_assignments`
5. Fetch pathway/stats from `profiles` or a `speeches` count query

Add the 3-column layout wrapper and greeting:

```tsx
// At top of the returned JSX:
<div className="dashboard-page">
  <div className="dashboard-greeting">
    <span className="wsc-eyebrow" style={{color:'var(--gold)'}}>
      {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
    </span>
    <h1>
      Good {getTimeOfDay()},{' '}
      <em style={{fontStyle:'italic',color:'oklch(0.55 0.155 60)'}}>{profile?.first_name ?? 'there'}</em>.
    </h1>
  </div>
  <div className="dashboard-grid">
    <div className="dashboard-main">
      {/* Next meeting + agenda */}
    </div>
    <aside className="dashboard-sidebar">
      {/* Pathway + stats + feedback */}
    </aside>
  </div>
</div>
```

Helper:
```ts
function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
```

- [ ] **Step 3: Create dashboard.css**

```css
.dashboard-page { max-width: 1280px; margin: 0 auto; padding: 48px 56px; }

.dashboard-greeting { margin-bottom: 40px; }
.dashboard-greeting h1 { font-size: 44px; margin-top: 6px; }

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;
  align-items: start;
}

/* Next meeting card */
.dash-next {
  background: var(--night);
  border-radius: var(--r-xl);
  padding: 32px;
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}
.dash-next::before {
  content: '';
  position: absolute; top: -80px; right: -80px;
  width: 360px; height: 360px;
  background: radial-gradient(circle, oklch(0.78 0.135 75 / 0.2) 0%, transparent 70%);
  pointer-events: none;
}
.dash-next::after {
  content: '';
  position: absolute; bottom: -100px; left: -80px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, oklch(0.56 0.155 240 / 0.15) 0%, transparent 70%);
  pointer-events: none;
}

/* Meeting tabs */
.dash-meeting-tabs { display: flex; gap: 8px; margin-bottom: 24px; position: relative; z-index: 1; flex-wrap: wrap; }
.dash-meeting-tab {
  padding: 6px 14px;
  border-radius: var(--r-pill);
  border: 1px solid oklch(0.97 0.01 80 / 0.2);
  background: transparent;
  color: oklch(0.78 0.04 240);
  font-family: var(--mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.dash-meeting-tab--active { background: oklch(0.97 0.01 80 / 0.12); border-color: oklch(0.97 0.01 80 / 0.4); color: white; }

/* Role list */
.dash-roles { display: flex; flex-direction: column; gap: 2px; position: relative; z-index: 1; }
.dash-role {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--r-md);
  transition: background 0.1s;
}
.dash-role:hover { background: oklch(1 0 0 / 0.04); }
.dash-role__badge {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 13px; font-weight: 600;
  flex-shrink: 0;
}
.dash-role__badge--open { background: oklch(0.30 0.065 245); color: oklch(0.68 0.030 235); }
.dash-role__badge--you { background: var(--clay-soft); color: var(--clay-deep); }
.dash-role__badge--filled { background: oklch(0.27 0.055 247); color: oklch(0.55 0.040 240); }
.dash-role__name { flex: 1; font-size: 14px; color: oklch(0.88 0.02 240); }
.dash-role__status { font-family: var(--mono); font-size: 11px; color: oklch(0.55 0.040 240); }

/* Sidebar */
.dash-sidebar-card { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--r-lg); padding: 24px; margin-bottom: 16px; }

.dash-progress-bar { display: flex; gap: 4px; margin: 16px 0; }
.dash-progress-seg {
  height: 6px; flex: 1; border-radius: var(--r-pill);
  background: var(--paper-3);
}
.dash-progress-seg--done { background: var(--clay); }
.dash-progress-seg--current { background: var(--gold); }

.dash-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dash-stat { text-align: center; }
.dash-stat__num { font-family: var(--serif); font-size: 32px; font-weight: 500; color: var(--ink); display: block; }
.dash-stat__label { font-family: var(--mono); font-size: 11px; color: var(--ink-3); letter-spacing: 0.08em; }

.dash-feedback { border-left: 2px solid var(--gold); padding-left: 16px; }
.dash-feedback blockquote { font-family: var(--serif); font-style: italic; font-size: 17px; color: var(--ink); margin: 0 0 8px; }
.dash-feedback cite { font-family: var(--mono); font-size: 11px; color: var(--ink-3); font-style: normal; }

/* Toast */
.dash-toast {
  position: fixed;
  bottom: 24px; left: 50%; transform: translateX(-50%);
  background: var(--night);
  color: white;
  padding: 14px 24px;
  border-radius: var(--r-pill);
  font-size: 14px;
  box-shadow: var(--shadow-lg);
  z-index: 999;
  white-space: nowrap;
  animation: wscFade 0.2s ease;
}
@keyframes wscFade { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

@media (max-width: 1023px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .dashboard-page { padding: 32px 32px; }
}
@media (max-width: 767px) {
  .dashboard-page { padding: 24px 20px; }
  .dashboard-greeting h1 { font-size: 30px; }
}
```

- [ ] **Step 4: Verify dashboard renders**

Run `npm run dev`, log in as a member, visit `/member/dashboard`. Confirm:
- Greeting shows correct name and time of day
- Next meeting card shows with dark background
- Roles list renders (may be empty if no roles in DB)
- Sidebar shows placeholder values
- Mobile: stacks to single column

- [ ] **Step 5: Commit**

```bash
git add src/app/member/dashboard/
git commit -m "feat: rebuild member dashboard to design handoff spec"
```

---

## Phase 6 — Admin Design System

### Task 6.1: Apply design tokens to all admin pages

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: All `src/app/admin/*/page.tsx` files

- [ ] **Step 1: Read admin/layout.tsx and a sample admin page**

Read `src/app/admin/layout.tsx` and `src/app/admin/meetings/page.tsx`.

- [ ] **Step 2: Update admin layout**

Ensure `admin/layout.tsx` uses design system variables for the shell:

```tsx
// admin/layout.tsx wrapping div:
<div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--sans)' }}>
  {/* PortalNav already updated in Phase 1 */}
  <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 56px' }}>
    {children}
  </main>
</div>
```

- [ ] **Step 3: Update each admin page — apply wsc- classes**

For each page in `src/app/admin/*/page.tsx`, make these changes:

**Headings:** Replace any hardcoded font/colour styles with the serif heading pattern:
```tsx
<h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32 }}>Page title</h1>
```

**Tables:** Wrap in a scroll container:
```tsx
<div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
  <table>...</table>
</div>
```

**Buttons:** Replace inline-styled or unstyled buttons with `.wsc-btn`:
```tsx
<button className="wsc-btn wsc-btn-sm wsc-btn-primary">Action</button>
<button className="wsc-btn wsc-btn-sm wsc-btn-ghost">Cancel</button>
```

**Inputs/selects:** Add `className="wsc-input"` and wrap with `<label className="wsc-label">`.

**Status indicators:** Use `.wsc-tag` variants:
- Pending → `<span className="wsc-tag wsc-tag-gold">Pending</span>`
- Active/done → `<span className="wsc-tag wsc-tag-clay">Active</span>`
- Cancelled → `<span className="wsc-tag">Cancelled</span>`

Repeat for: `admin/settings`, `admin/payments`, `admin/news`, `admin/members`, `admin/meetings`, `admin/messages`.

- [ ] **Step 4: Commit per admin section**

```bash
git add src/app/admin/
git commit -m "feat: apply design system tokens and wsc- classes to all admin pages"
```

---

### Task 6.2: Build RSVP management page (/admin/signups)

**Files:**
- Create: `src/app/admin/signups/page.tsx`
- Create: `src/app/admin/signups/actions.ts`
- Create: `src/app/admin/signups/RSVPActions.tsx`

- [ ] **Step 1: Create actions.ts**

```ts
'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function markAttended(signupId: string) {
  const supabase = await createClient()
  await supabase.from('signups').update({ status: 'attended' }).eq('id', signupId)
  revalidatePath('/admin/signups')
}

export async function sendConversionInvite(signupId: string) {
  const supabase = await createClient()
  const token = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expires,
    conversion_token_used_at: null,
  }).eq('id', signupId)

  // TODO: trigger email via Supabase Edge Function or resend.com
  // For now, log the join URL (replace with email send in production)
  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`
  console.log(`Invite URL for signup ${signupId}: ${joinUrl}`)

  revalidatePath('/admin/signups')
  return { joinUrl }
}
```

- [ ] **Step 2: Create RSVPActions.tsx — Client Component for table row actions**

```tsx
'use client'
import { useState } from 'react'
import { markAttended, sendConversionInvite } from './actions'

export function MarkAttendedButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <button className="wsc-btn wsc-btn-sm wsc-btn-ghost" disabled={loading}
      onClick={async () => { setLoading(true); await markAttended(signupId); setLoading(false) }}>
      {loading ? '…' : 'Mark attended'}
    </button>
  )
}

export function InviteButton({ signupId }: { signupId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <button className="wsc-btn wsc-btn-sm wsc-btn-primary" disabled={loading || done}
      onClick={async () => {
        setLoading(true)
        await sendConversionInvite(signupId)
        setLoading(false)
        setDone(true)
      }}>
      {done ? 'Invite sent ✓' : loading ? '…' : 'Invite to join'}
    </button>
  )
}
```

- [ ] **Step 3: Create page.tsx**

```tsx
import { createClient } from '@/utils/supabase/server'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import { MarkAttendedButton, InviteButton } from './RSVPActions'

export default async function SignupsAdminPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'pending' } = await searchParams
  const supabase = await createClient()

  const { data: signups } = await supabase
    .from('signups')
    .select('*, meetings(meeting_date, theme)')
    .eq('status', status)
    .order('created_at', { ascending: false })

  return (
    <div>
      <EyebrowLabel>Admin</EyebrowLabel>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px' }}>RSVPs</h1>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['pending', 'attended', 'converted'].map(s => (
          <a key={s} href={`?status=${s}`}
            className={`wsc-btn wsc-btn-sm${status === s ? ' wsc-btn-primary' : ' wsc-btn-ghost'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              {['Name', 'Email', 'Meeting', 'Heard from', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {signups?.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '12px', color: 'var(--ink)', fontWeight: 500 }}>{s.first_name} {s.last_name}</td>
                <td style={{ padding: '12px', color: 'var(--ink-2)' }}>{s.email}</td>
                <td style={{ padding: '12px', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {s.meetings ? new Date(s.meetings.meeting_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td style={{ padding: '12px', color: 'var(--ink-3)', fontSize: 13 }}>{s.heard_from || '—'}</td>
                <td style={{ padding: '12px' }}>
                  <span className={`wsc-tag${s.status === 'attended' ? ' wsc-tag-sage' : s.status === 'converted' ? ' wsc-tag-clay' : ' wsc-tag-gold'}`}>
                    {s.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {s.status === 'pending' && <MarkAttendedButton signupId={s.id} />}
                    {s.status === 'attended' && <InviteButton signupId={s.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {(!signups || signups.length === 0) && (
              <tr><td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--mono)', fontSize: 13 }}>No {status} RSVPs</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add RSVPs link to admin nav**

Find the admin navigation (likely in `src/app/admin/layout.tsx` or `PortalNav.tsx`) and add a link to `/admin/signups`.

- [ ] **Step 5: Verify**

Visit `/admin/signups`. Confirm the table loads, status filter tabs work, "Mark attended" updates a row, "Invite to join" logs a join URL.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/signups/
git commit -m "feat: add RSVP management page to admin with mark-attended and invite-to-join actions"
```

---

## Final Steps

### Task F.1: Add .superpowers to .gitignore

- [ ] **Step 1: Add entry**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm directory"
```

### Task F.2: Accessibility audit

- [ ] **Step 1: Install axe-core browser extension**

In Chrome/Firefox, install the axe DevTools extension.

- [ ] **Step 2: Run audit on each public page**

Visit `/`, `/contact`, `/signup`, `/login`. Run axe on each. Fix any WCAG AA contrast failures or missing labels reported.

- [ ] **Step 3: Verify focus rings**

Tab through each page with keyboard only. Confirm every interactive element has a visible focus ring (the `var(--clay)` outline defined in `globals.css`).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: accessibility audit — contrast and focus ring corrections"
```

---

*End of plan.*
