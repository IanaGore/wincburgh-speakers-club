# Design System Implementation — Winchburgh Speakers Club Portal

**Date:** 2026-05-10  
**Scope:** Full site redesign — public pages, member portal, admin, and guest RSVP flow  
**Approach:** Journey-first, 6 phases, each independently shippable

---

## Context

The design handoff (`design_handoff_speakers_club_portal/`) defines a complete visual identity for the Winchburgh Speakers Club portal: warm community aesthetic, loch-blue + sunrise-amber palette, Newsreader serif + Inter sans + JetBrains Mono type stack, and detailed specs for 5 screens (homepage, contact, login, signup, dashboard).

The existing codebase has the design tokens and component classes already ported to `globals.css`. Login is redesigned. Homepage is in progress. The gap is: full fidelity on all remaining pages, a guest RSVP flow with its own schema, an account conversion flow, admin pages brought to design system standard, and mobile-responsive layouts throughout.

---

## Constraints

- **No Tailwind.** Pure CSS with CSS variables. Component classes live in `globals.css` and per-page `*.css` files.
- **Next.js 16 App Router.** Server Components by default; Client Components only where interactivity requires it.
- **Supabase** for auth and data. `@supabase/ssr` pattern (`server.ts` / `client.ts`).
- **Mobile-first.** All layouts are designed for mobile first, then enhanced for larger screens. Breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.
- **Accessibility.** Hit targets ≥ 44px. Focus rings on all interactive elements. Colour contrast WCAG AA minimum. All form fields have associated `<label>`.

---

## Design Tokens (already in globals.css — do not change)

| Category | Key tokens |
|---|---|
| Surfaces | `--paper`, `--paper-2`, `--paper-3`, `--rule`, `--rule-soft` |
| Ink | `--ink`, `--ink-2`, `--ink-3`, `--ink-4` |
| Primary | `--clay`, `--clay-deep`, `--clay-soft` (loch blue) |
| Secondary | `--sage`, `--sage-soft` (kingfisher teal) |
| Tertiary | `--gold` (sunrise amber) |
| Dark | `--night`, `--night-2` (deep navy) |
| Gradient | `--gradient: linear-gradient(135deg, var(--clay) 0%, var(--gold) 100%)` |
| Type | `--serif`, `--sans`, `--mono` |
| Radius | `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`, `--r-pill` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |

---

## Component Classes (already in globals.css — do not change)

| Class | Purpose |
|---|---|
| `.wsc-btn` | Base button — 48px height, pill radius, 600 weight |
| `.wsc-btn-primary` | Gradient background (clay→gold), white text |
| `.wsc-btn-ghost` | Transparent, rule border, ink text |
| `.wsc-btn-ghost-light` | Transparent, white border, white text (dark backgrounds) |
| `.wsc-btn-sm` | 38px height variant |
| `.wsc-tag` | Pill tag — mono uppercase, paper-3 bg |
| `.wsc-tag-clay / -sage / -gold` | Coloured tag variants |
| `.wsc-card` | White card, rule border, r-lg, 24px padding |
| `.wsc-input` | 48px input, rule border, clay focus ring |
| `.wsc-label` | 13px, 600 weight, ink-2, form label |

---

## Shared Components (src/components/)

All of the following already exist in some form and need to be updated to full handoff fidelity, or are new:

| Component | File | Status | Notes |
|---|---|---|---|
| `Wordmark` | `Wordmark.tsx` | Update | Add `tone="light"` prop for dark backgrounds |
| `Navbar` | `Navbar.tsx` | Update | Add top ribbon, hamburger menu for mobile, member-login pill |
| `Footer` | `Footer.tsx` | Update | Rebuild to 4-column handoff layout |
| `Button` | `ui/Button.tsx` | Update | Ensure all variants (primary/ghost/ghost-light/text/sm) |
| `Input` | `ui/Input.tsx` | Update | Label wrapper, show/hide password toggle |
| `EyebrowLabel` | `ui/EyebrowLabel.tsx` | Update | clay / gold / muted tone props |
| `Tag` | `ui/Tag.tsx` | Update | default / clay / sage / gold variants |
| `PhotoSlot` | `ui/PhotoSlot.tsx` | Keep | Striped placeholder — replace with next/image when photos arrive |
| `PortalNav` | `PortalNav.tsx` | Update | Apply design tokens; mobile: bottom tab bar or hamburger |

---

## Responsive Design Standard

Every page and component must follow mobile-first CSS:

```css
/* Mobile: default — single column, full width */
.hero { display: block; }

/* Desktop: enhanced */
@media (min-width: 1024px) {
  .hero { display: grid; grid-template-columns: 1fr 1fr; }
}
```

**Navbar on mobile:** hamburger icon (≥44px tap target) opens a full-height slide-in nav drawer. The top ribbon collapses or is hidden on small screens.

**Data tables (admin):** `overflow-x: auto` wrapper so tables scroll horizontally on mobile rather than truncating.

**Dark panels (login left, dashboard next-meeting):** On mobile, the dark panel either becomes a full-width header strip or is hidden entirely — the form/content is always the primary focus on small screens.

---

## Phase 1 — Foundation

**Goal:** Shared components and standards doc in place. All subsequent phases build on this.

**Deliverables:**
1. Update `Navbar.tsx` + `Navbar.css` — top ribbon, responsive hamburger, member-login pill
2. Update `Footer.tsx` + `Footer.css` — 4-column layout, responsive reflow
3. Update `Wordmark.tsx` — `tone` prop
4. Audit and update `ui/Button.tsx`, `ui/Input.tsx`, `ui/EyebrowLabel.tsx`, `ui/Tag.tsx` — ensure all variants correct
5. Update `PortalNav.tsx` — design tokens applied, mobile-responsive
6. Write `docs/design-system.md` — component usage guide, colour token reference, layout patterns, CSS naming convention, responsive rules, admin baseline

**Standards doc covers:**
- How to use design tokens (always use CSS variables, never hardcode values)
- How to name page-level CSS files (`[page].css` co-located with `page.tsx`)
- How to structure a new page (layout wrapper → sections → components)
- Responsive patterns (mobile-first, breakpoint reference)
- Admin page baseline (wsc- classes, table scroll pattern, action button placement)

---

## Phase 2 — Discover & Enquire

**Routes:** `/` (homepage), `/contact`

### Homepage (`/`)

Already in progress. Complete to full handoff fidelity:

1. **Top ribbon** — `--ink` bg, mono text: "Tuesday meetings · 7pm · Community Centre, Main Street" + "First three visits free". Hidden on mobile (or collapses to single line).
2. **Hero** — Desktop: 2-col grid (text left, photo collage right). Mobile: stacked (text → photo). Left: eyebrow + 80px serif headline with amber italic emphasis + body + 2 CTAs + avatar stack. Right: large photo (PhotoSlot), floating next-meeting pill card.
3. **How it works** — 3 step cards. 3-col desktop, 1-col mobile.
4. **Pull-quote** — centered serif italic, amber `"` opener.
5. **News** — 3 news cards from `news_posts` table. 3-col desktop, 1-col mobile.
6. **Village map + venue** — SVG map left, venue details right. Stacked on mobile.
7. **CTA strip** — `--night` bg, amber + kingfisher radial glows. Full-bleed.
8. **Footer** — from shared component.

**Data:** `meetings`, `news_posts`, `profiles` (member count) — all existing Supabase queries.

### Contact (`/contact`)

1. **Layout** — Split desktop (form left, find-us right). Stacked mobile.
2. **Form fields** — name, email, topic select, message textarea, SMS consent checkbox. Submits to existing `contact` Server Action.
3. **Find Us card** — venue, parking, accessibility info.
4. **FAQ accordions** — 3 rows using `<details>`/`<summary>`. "Do I need to book?", "Will I have to speak?", "What does it cost?"
5. **Social/contact list** — email, phone links.

---

## Phase 3 — RSVP (Guest Signup Flow)

**Route:** `/signup`

### Schema

New table: `signups`

```sql
create table public.signups (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  heard_from text,
  experience text check (experience in ('none', 'some', 'lots')),
  hopes text[],
  meeting_id uuid references meetings(id),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'attended', 'converted')),
  created_at timestamptz default now()
);
```

**RLS:**
- `INSERT`: open to `anon` and `authenticated` (guest can submit without an account)
- `SELECT` / `UPDATE`: restricted to `auth.jwt()->>'role' = 'admin'` or `profiles.is_admin = true`

### 4-Step Flow

**Step indicator:** 4 dots with connectors. Full-width on mobile. Current dot: amber. Completed: clay with check. Upcoming: pale.

**Step 1 — The basics**
- Fields: first name (required), last name (optional), email (required, validated), phone (optional)
- "How did you hear about us?" — 6 single-select chip buttons
- Next disabled until first name + valid email

**Step 2 — About you**
- 3 experience cards (Total newcomer / A bit, here and there / I've spoken plenty)
- "What are you hoping for?" — 6 multi-select pill chips
- Next disabled until experience picked + ≥1 hope selected

**Step 3 — Your first visit**
- List of upcoming meetings from `meetings` table (date badge, type eyebrow, serif theme, time/venue)
- Active meeting: gradient date badge, gold radio fill
- Collapsible textarea for notes ("Please don't put me on the spot" prompt)
- Next button label: "Reserve my spot". Disabled until meeting picked.

**Step 4 — Done**
- On submit: INSERT to `signups` table → trigger confirmation email (Supabase Edge Function or email action)
- If email fails: show toast error but still display step 4
- Confirmation card: `--night` bg, reservation details, "Add to calendar" + "Get directions" CTAs
- "What to expect" card: 4-row list

**State management:** React `useState` in a Client Component wrapper. No Context needed — linear flow.

**Animations:** Each step: `animation: wscFade 0.32s ease` (8px translateY + opacity fade). Define keyframes in `signup.css`.

---

## Phase 4 — Login & Account Conversion

### Login (`/login`) — already redesigned

Verify full mobile responsiveness:
- Desktop: 50/50 split — dark welcome panel left, form right
- Mobile: dark panel collapses to a small branded header strip; form panel takes full width

### Account Conversion (`/join`)

**Trigger:** Admin clicks "Invite to join" on a `signups` row → Supabase Edge Function fires → sends magic link email to `signups.email`

**Magic link lands on `/join?token=...`**

Server Component reads the `signups` row linked to the token, pre-fills the form.

**`/join` page:**
- Same visual style as login right panel — single column, 420px max-width centred
- Pre-filled: first name, last name, email (readonly)
- User sets password (with show/hide toggle)
- Submit: `supabase.auth.signUp({ email, password })` → insert `profiles` row (copying name/phone from signup) → `signups.status = 'converted'`
- On success: redirect to `/member/dashboard`

**Token approach:** Store a one-time `conversion_token` (uuid) on the `signups` row when the invite is sent. Expire after 7 days. The Edge Function emails `/join?token={uuid}`. The `/join` server component looks up the signup by token and verifies it's unused and unexpired.

Add to `signups` table:
```sql
conversion_token uuid unique,
conversion_token_expires_at timestamptz,
conversion_token_used_at timestamptz
```

---

## Phase 5 — Member Dashboard

**Route:** `/member/dashboard`

**Layout:**
- Desktop: 3-column grid (next-meeting hero spanning 2 cols left, sidebar 1 col right)
- Mobile: single column — greeting → next meeting card → pathway progress → stats → recent feedback

**Greeting:** Mono eyebrow (amber, current day + date) + "Good evening, *{firstName}*." (44px serif, amber italic name)

**Next Meeting Card:**
- `--night` bg, amber top-right + loch bottom-left radial glows
- 3 upcoming meeting tabs (from `meetings` table)
- 11-role agenda list per meeting. Each row: initial badge, name, status, action button
- "Volunteer" (wsc-btn-primary) → Server Action upserts `role_assignments` row → optimistic UI update
- "Drop out" (wsc-btn-ghost) → Server Action deletes `role_assignments` row → optimistic update
- Toast: fixed bottom-centre, 3s auto-dismiss. Works on mobile (full-width, above safe area inset)

**Sidebar:**
- Pathway progress card: 5-segment bar, "Foundations · Project 4 of 5", "View pathway →" link
- Stats row: speeches given / pathway level / roles taken (32px serif numbers)
- Recent feedback: amber left-border blockquote, serif italic, mono attribution

**Data queries:**
- `meetings` + `role_assignments` join for agenda
- `profiles` for member name + pathway progress
- `speeches` for stats + feedback

---

## Phase 6 — Admin (Design System Applied)

**Routes:** All `/admin/*` pages

**What changes:**
- Typography: all headings use `--serif`, body uses `--sans`, labels/dates use `--mono`
- Buttons: all become `.wsc-btn` variants
- Cards/panels: `.wsc-card`
- Inputs: `.wsc-input` / `.wsc-label`
- Page backgrounds: `var(--paper)`
- Section headers: `.wsc-eyebrow` + serif heading

**Table pattern (mobile):**
```css
.admin-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

**New admin page — RSVP Management (`/admin/signups`):**
- Table: name, email, meeting date, heard from, status badge
- Row actions: "Mark attended" (updates `signups.status = 'attended'`), "Invite to join" (triggers Edge Function, sets `conversion_token`)
- Filter by status (pending / attended / converted)
- Mobile: card-per-row layout instead of table

---

## Standards Doc Outline (`docs/design-system.md`)

1. **Design tokens** — full colour/type/spacing reference, when to use each
2. **Component classes** — usage examples for every `.wsc-*` class
3. **Page structure pattern** — file layout, CSS co-location, layout wrapper
4. **Responsive rules** — mobile-first mandate, breakpoints, common reflow patterns
5. **New page checklist** — tokens ✓, wsc- classes ✓, mobile tested ✓, focus rings ✓, labels ✓
6. **Admin baseline** — what every admin page must have before shipping
7. **Copy tone** — plain Scottish-English, examples, what to avoid

---

## Migration Notes

- Existing `/signup` route currently does email+password auth account creation. This route becomes the new 4-step guest RSVP flow. The old account-creation behaviour moves to `/join` (post-conversion).
- Existing `/onboarding` route may be retired or repurposed as post-conversion profile completion. Assess during Phase 4.
- `portal.css` in `src/app/` covers portal-scoped overrides. Keep this pattern — member and admin layouts import it via their `layout.tsx`.

---

## Out of Scope

- Speech tracker (`/member/speeches`) — exists in the codebase, not in the design handoff. Apply design tokens as part of Phase 6 but no new feature work.
- Real photography — PhotoSlot placeholders remain until the club supplies images.
- Supabase email templates — confirmation email HTML is out of scope; a plain-text email triggering the right link is sufficient.
