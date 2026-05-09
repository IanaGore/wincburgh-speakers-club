# Website Redesign — Phase 1 Design Spec

**Date:** 2026-05-09  
**Scope:** Public site (Homepage, Contact, Login) + shared component system  
**Phase 2:** Signup multi-step flow + Member Dashboard (separate spec)

---

## Overview

Full visual redesign of the Winchburgh Speakers Club public-facing site. The current dark glassmorphism aesthetic is replaced with a light-mode, community-forward design: pale oat backgrounds, loch-blue + sunrise-amber palette, serif headline type, and a warm neighbourly tone.

The redesign implements the design handoff at `../design_handoff_speakers_club_portal/` pixel-accurately, adapted to the existing tech stack (Next.js 16 App Router, vanilla CSS, Supabase).

---

## Technical Constraints

- **Styling:** Vanilla CSS only. No Tailwind. CSS custom properties for all design tokens.
- **CSS architecture:** Tokens in `globals.css`; per-component and per-page `.css` files imported where used.
- **Admin panel:** Untouched in phase 1. `PortalNav.tsx` and `/admin/*` layouts unchanged.
- **Routes:** No route changes. `/`, `/contact`, `/login` stay as-is.
- **Framework:** Next.js 16 App Router. Server components by default; client components only where state is needed.

---

## Design Tokens (`globals.css`)

The current dark token set is fully replaced. All colours use oklch.

### Colours

| Token | Value | Role |
|---|---|---|
| `--paper` | `oklch(0.970 0.010 230)` | Page background |
| `--paper-2` | `oklch(0.950 0.014 230)` | Section alt background |
| `--paper-3` | `oklch(0.91 0.020 230)` | Cards / panels |
| `--rule` | `oklch(0.85 0.025 230)` | Borders |
| `--rule-soft` | `oklch(0.91 0.018 230)` | Soft dividers |
| `--ink` | `oklch(0.24 0.040 245)` | Primary text |
| `--ink-2` | `oklch(0.38 0.045 245)` | Body text |
| `--ink-3` | `oklch(0.54 0.040 240)` | Muted text |
| `--ink-4` | `oklch(0.68 0.030 235)` | Captions / placeholders |
| `--clay` | `oklch(0.56 0.155 240)` | Primary accent — loch blue |
| `--clay-deep` | `oklch(0.44 0.155 245)` | Button hover, dark text |
| `--clay-soft` | `oklch(0.92 0.045 235)` | Tag backgrounds |
| `--sage` | `oklch(0.68 0.135 200)` | Secondary — kingfisher teal |
| `--sage-soft` | `oklch(0.93 0.045 200)` | Teal wash |
| `--gold` | `oklch(0.78 0.135 75)` | Tertiary — sunrise amber |
| `--night` | `oklch(0.22 0.060 250)` | Dark hero sections |
| `--night-2` | `oklch(0.30 0.065 245)` | Lifted navy |

**Signature gradient:** `linear-gradient(135deg, var(--clay) 0%, var(--gold) 100%)`  
Used on date badges, primary CTA buttons, step indicators.

### Typography

Loaded via `<link>` in `src/app/layout.tsx` (Google Fonts). Geist Sans removed.

| Font | Weights | Role |
|---|---|---|
| `Newsreader` | 300/400/500, italic 400/500 | Serif display — headlines, pull-quotes |
| `Inter` | 400/500/600/700 | Sans — body, UI, labels |
| `JetBrains Mono` | 400/500 | Mono — eyebrows, dates, small detail |

Headlines use `letter-spacing: -0.015em`, `line-height: 1.05`. Italic amber emphasis (`oklch(0.55 0.155 60)`) inside headlines is a recurring pattern.

### Spacing & Shape

```css
--r-sm: 6px;
--r-md: 10px;
--r-lg: 16px;
--r-xl: 24px;
--shadow-sm: 0 1px 3px oklch(0.24 0.040 245 / 0.08);
--shadow-md: 0 4px 12px oklch(0.24 0.040 245 / 0.10);
--shadow-lg: 0 8px 32px oklch(0.24 0.040 245 / 0.12);
```

Section padding: `72px 56px` (large), `64px 48px` (medium). Card padding: `28px–32px`.

### Shared Component Classes (in `globals.css`)

Used across pages — stay global:

- `.wsc-btn`, `.wsc-btn-primary`, `.wsc-btn-ghost`, `.wsc-btn-sm`
- `.wsc-input`, `.wsc-textarea`, `.wsc-label`
- `.wsc-tag`, `.wsc-tag-clay`, `.wsc-tag-sage`, `.wsc-tag-gold`
- `.wsc-eyebrow` — small uppercase mono label
- `.wsc-photo` — striped placeholder (diagonal stripe pattern, replaces real images)

---

## Shared Components

Each in `src/components/` with a sibling `.css` file.

### `Wordmark` (`Wordmark.tsx` + `Wordmark.css`)

Serif "Winchburgh" on one line, mono "Speakers Club · est. 2018" below.  
Props: `tone?: "light" | "dark"` — `"light"` renders white text for dark backgrounds.

### `Navbar` (`Navbar.tsx` + `Navbar.css`) — replaces current

Two-layer header:
1. **Top ribbon** — `--ink` bg, mono small text. Left: "Tuesday meetings · 7pm · Community Centre, Main Street". Right: "First three visits free".
2. **Nav bar** — white bg, `--rule` bottom border, sticky. `Wordmark` left; centre links (Home, About, Meetings, News, Contact); right: "Member login" pill button (`--clay` border, `--clay` text).

Mobile: hamburger toggles a full-width dropdown. Hit targets ≥ 44px.

`PortalNav.tsx` is untouched — used by `/member/*` and `/admin/*` layouts only.

### `Footer` (`Footer.tsx` + `Footer.css`) — new

`--paper-2` background. Four columns: Visit / About / Contact / Newsletter signup (email input + submit). Bottom bar: `Wordmark` left + copyright right, `--rule` top border.

### `ui/Button` (`Button.tsx` + `Button.css`)

```tsx
<Button variant="primary" | "ghost" | "sm" href="/path">Label</Button>
```

Renders `<Link>` when `href` is provided, `<button>` otherwise. Primary variant uses the signature gradient bg, white text. Ghost has `--clay` border + text. Hover: primary lifts (`translateY(-1px)`), ghost fills.

### `ui/Input` (`Input.tsx` + `Input.css`)

Wraps `<input>` and `<textarea>`. Height `52px` (large) / `48px` (default). Focus ring: `box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18)`. Password variant includes show/hide toggle button with `aria-label`.

### `ui/Tag` (`Tag.tsx` + `Tag.css`)

```tsx
<Tag variant="clay" | "sage" | "gold">Label</Tag>
```

Pill shape, `--r-xl` radius. Uses `-soft` bg + deep text per variant.

### `EyebrowLabel` (`EyebrowLabel.tsx`)

```tsx
<EyebrowLabel>Winchburgh · West Lothian</EyebrowLabel>
```

Inline `<span>`, `JetBrains Mono`, uppercase, `0.72rem`, `--clay-deep` colour. No separate CSS file — style inline or via `.wsc-eyebrow` global class.

### `PhotoSlot` (`PhotoSlot.tsx` + `PhotoSlot.css`)

Striped diagonal placeholder box. Props: `width`, `height`, `className`. Communicates "image goes here" without fabricating visual content. Replace with `<Image>` when real photos arrive.

---

## Pages

### Homepage (`/`) — `src/app/page.tsx` + `src/app/page.css`

Server component. Fetches same Supabase data as current page:
- `meetings` (upcoming 3, with `meeting_assignments`)
- `news_posts` (latest 3, published)
- `site_settings` (hero_title, hero_subtitle)

**8 sections, top to bottom** (ribbon + nav are one `<Navbar>` component):

1. **Ribbon + Nav** — via `<Navbar />`
2. **Hero** — two-column. Left: eyebrow, 80px serif headline (amber italic emphasis), body, two `<Button>` CTAs, avatar stack (3–4 `<PhotoSlot>` thumbnails) + member count (fetched via `select count(*) from profiles`; falls back to omitting the count if query fails). Right: photo collage (`<PhotoSlot>` × 2), floating "next meeting" pill card (real data from first upcoming meeting, gradient date badge). `position: absolute; left: -20px; bottom: 20px` on pill card.
3. **How it works** — `--paper-2` bg. Centred eyebrow + headline. Three step cards with `STEP 01/02/03` mono label, serif title, body.
4. **Pull-quote** — centred. 40px serif italic. Amber `"` opener. Mono attribution.
5. **News** — three `<article>` cards. `<PhotoSlot>` top, `<Tag>`, date, serif title, blurb. Data from `news_posts`.
6. **Village map + venue** — left: hand-coded SVG schematic (pale-blue road paths, `--sage` canal line, `--ink-4` mono street labels, clay map pin). Right: venue details, accessibility info, "Get directions" `<Button variant="ghost">`.
7. **CTA strip** — `--night` bg, amber + kingfisher radial CSS glows. "Come and try us" headline, two CTAs.
8. **Footer** — via `<Footer />`

### Contact (`/contact`) — `src/app/contact/page.tsx` + `src/app/contact/page.css`

Server component with client `<ContactForm>` child (needs `useState` for validation). Existing `contact/actions.ts` server action unchanged.

**Split layout:**

- **Left column** — friendly intro, `<ContactForm>`: name / email / topic `<select>` / message `<textarea>` / "ok to text you back" `<input type="checkbox">` / gradient submit `<Button>`. Client component for field validation.
- **Right column** — "Find us" card (`--paper-3` bg, venue + parking + accessibility copy). Three FAQ `<details>`/`<summary>` rows ("Do I need to book?", "Will I have to speak?", "What does it cost?"). Social/email contact list.

### Login (`/login`) — `src/app/login/page.tsx` + `src/app/login/page.css`

Client component (needs `useState` for `showPw`, magic link loading state). Existing `login/actions.ts` unchanged for password sign-in.

**50/50 split:**

- **Left panel** — `--night` bg, `padding: 48px 56px`. Two radial CSS glows (amber top-right, loch-blue bottom-left). `<Wordmark tone="light">` top. Middle: eyebrow + 56px serif welcome headline (amber italic phrase), paragraph, frosted-glass next-meeting card (real data — next upcoming meeting from Supabase, needs server fetch or passed as prop). Bottom: serif italic pull-quote, amber `"`, mono attribution. The left panel requires a server data fetch — make the outer page a server component that passes `nextMeeting` as prop to the client form component.
- **Right panel** — "New here? Get in touch" link top-right → `/contact`. 420px centred form: eyebrow, 40px serif heading, paragraph. Email + password fields (`<Input>`). Show/hide toggle. "Keep me signed in" checkbox (accent colour `--gold`). Gradient sign-in `<Button>`. OR divider. Amber-tinted magic link button (calls `supabase.auth.signInWithOtp({ email })`). "Forgotten your password?" → `/forgot-password`. Help text.

**Auth wiring:**
- Password sign-in: existing `signInWithPassword` server action
- Magic link: new client-side call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin + '/auth/callback' } })`
- Show success state after magic link send (don't redirect)

---

## Accessibility

Per handoff spec, verified on implementation:
- All hit targets ≥ 44px
- Focus rings on all interactive elements (`box-shadow: 0 0 0 3px oklch(0.56 0.155 240 / 0.18)`)
- All form fields have associated `<label htmlFor>`
- Show/hide password has `aria-label="Show password"` / `aria-label="Hide password"`
- Amber text on light bg uses `oklch(0.42 0.135 65)` (deeper than `--gold`) for WCAG AA contrast
- FAQ rows use native `<details>`/`<summary>` (keyboard accessible by default)

---

## Out of Scope (Phase 2)

- Signup 4-step onboarding flow (`/signup`)
- Member dashboard (`/member/dashboard`)
- Admin panel redesign
- Real photos (placeholders stay until content is supplied)
- `/news/[id]` article page redesign
