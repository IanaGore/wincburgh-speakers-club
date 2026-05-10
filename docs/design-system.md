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
