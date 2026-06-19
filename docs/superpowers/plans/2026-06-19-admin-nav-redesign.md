# Admin Nav Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overflowing 10-link admin nav with grouped dropdowns and a pinned "Member View →" button that is always visible.

**Architecture:** Two files only — `PortalNav.tsx` gains dropdown state and renders three grouped dropdown menus; `portal.css` gains the dropdown and pinned-section styles. The nav restructures from two flex children (logo | links) to three (logo | scrollable-links | pinned-actions).

**Tech Stack:** Next.js 16 App Router, React `useState`/`useEffect`, vanilla CSS, `position: fixed` for dropdown panels (escapes the mobile scroll container).

---

## File Map

| File | Change |
|---|---|
| `src/components/PortalNav.tsx` | Add dropdown state, group data, toggle handler, click-outside effect, new JSX structure |
| `src/app/portal.css` | Add `.portal-nav__dropdown-wrapper`, `.portal-nav__dropdown-toggle`, `.portal-nav__chevron`, `.portal-nav__dropdown-panel`, `.portal-nav__dropdown-item`, `.portal-nav__pinned` |

---

## Task 1: CSS — add dropdown and pinned styles

**Files:**
- Modify: `src/app/portal.css`

- [ ] **Step 1: Add new CSS rules after the existing `.portal-nav__links a:hover` block (around line 109)**

Open `src/app/portal.css`. After the `.portal-nav__links a:hover` rule, add:

```css
/* Dropdown wrapper — positions the panel anchor point */
.portal-nav__dropdown-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* Dropdown toggle button — looks identical to a nav link */
.portal-nav__dropdown-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  padding: 0;
  color: var(--ink);
  font-weight: 500;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s;
  white-space: nowrap;
}

.portal-nav__dropdown-toggle:hover,
.portal-nav__dropdown-toggle.is-active {
  color: var(--clay);
}

.portal-nav__dropdown-toggle.is-active {
  border-bottom: 2px solid var(--clay);
  padding-bottom: 2px;
}

/* Chevron rotates when dropdown is open */
.portal-nav__chevron {
  font-size: 0.7rem;
  color: var(--ink-3);
  transition: transform 0.15s;
  display: inline-block;
}

.portal-nav__chevron.is-open {
  transform: rotate(180deg);
}

/* Dropdown panel — fixed so it escapes the mobile scroll container */
.portal-nav__dropdown-panel {
  position: fixed;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 160px;
  padding: 0.5rem 0;
}

/* Individual link inside the dropdown panel */
.portal-nav__dropdown-item {
  display: block;
  padding: 0.65rem 1.25rem;
  min-height: 44px;
  color: var(--ink);
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.portal-nav__dropdown-item:hover {
  background: var(--surface, #f5f0e8);
  color: var(--clay);
}

.portal-nav__dropdown-item.is-active {
  color: var(--clay);
  border-left: 3px solid var(--clay);
  padding-left: calc(1.25rem - 3px);
}

/* Pinned actions — always visible at far right, never scrolls */
.portal-nav__pinned {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Update the mobile `@media (max-width: 767px)` block to handle the new structure**

Inside the existing `@media (max-width: 767px)` block (around line 112), add these rules:

```css
  .portal-nav__pinned {
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .portal-nav__dropdown-toggle {
    font-size: 0.9rem;
    padding: 0.3rem 0.5rem;
  }
```

- [ ] **Step 3: Verify the CSS file parses correctly by running the TypeScript check**

```bash
cd speakers-club-portal && npx tsc --noEmit
```

Expected: no errors (CSS is not type-checked, but this confirms the project still compiles).

- [ ] **Step 4: Commit**

```bash
git add src/app/portal.css
git commit -m "style: add dropdown and pinned nav styles"
```

---

## Task 2: PortalNav — grouped dropdowns and pinned actions

**Files:**
- Modify: `src/components/PortalNav.tsx`

- [ ] **Step 1: Replace the entire file content**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'

const ADMIN_GROUPS = {
  people: [
    { label: 'Members', href: '/admin/members' },
    { label: 'Payments', href: '/admin/payments' },
  ],
  content: [
    { label: 'News', href: '/admin/news' },
    { label: 'Media', href: '/admin/media' },
    { label: 'Resources', href: '/admin/resources' },
  ],
  comms: [
    { label: 'Enquiries', href: '/admin/enquiries' },
    { label: 'Communications', href: '/admin/communications' },
    { label: 'Correspondence', href: '/admin/correspondence' },
  ],
} as const

type GroupKey = keyof typeof ADMIN_GROUPS

const GROUP_LABELS: Record<GroupKey, string> = {
  people: 'People',
  content: 'Content',
  comms: 'Comms',
}

export default function PortalNav({ isAdminView = false }: { isAdminView?: boolean }) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  function isGroupActive(key: GroupKey) {
    return ADMIN_GROUPS[key].some(item => pathname.startsWith(item.href))
  }

  function activeStyle(href: string) {
    return pathname.startsWith(href)
      ? { color: 'var(--ink)', borderBottom: '2px solid var(--clay)', paddingBottom: '2px' }
      : {}
  }

  function toggleGroup(key: GroupKey, e: React.MouseEvent<HTMLButtonElement>) {
    if (openGroup === key) {
      setOpenGroup(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setPanelPos({ top: rect.bottom + 4, left: rect.left })
    setOpenGroup(key)
  }

  // Close dropdown on route change (e.g. after clicking a dropdown item)
  useEffect(() => {
    setOpenGroup(null)
  }, [pathname])

  // Close dropdown when clicking outside the nav or panel
  useEffect(() => {
    if (!openGroup) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Element
      if (
        !target.closest('.portal-nav') &&
        !target.closest('.portal-nav__dropdown-panel')
      ) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [openGroup])

  return (
    <nav
      className="portal-nav"
      style={{
        background: 'var(--paper)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div className="portal-nav__logo" style={{ fontSize: '1.2rem' }}>
        <Link href="/">🎙️ Winchburgh <span>Speakers Club</span></Link>
        <span style={{ color: 'var(--ink-3)', marginLeft: '0.5rem', fontWeight: '400', fontSize: '1rem' }}>
          | {isAdminView ? 'Admin' : 'Member'}
        </span>
      </div>

      <div className="portal-nav__links">
        {isAdminView ? (
          <>
            <Link href="/admin/meetings" style={activeStyle('/admin/meetings')}>Sessions</Link>

            {(Object.keys(ADMIN_GROUPS) as GroupKey[]).map(key => (
              <div key={key} className="portal-nav__dropdown-wrapper">
                <button
                  type="button"
                  className={`portal-nav__dropdown-toggle${isGroupActive(key) ? ' is-active' : ''}`}
                  onClick={e => toggleGroup(key, e)}
                >
                  {GROUP_LABELS[key]}
                  <span className={`portal-nav__chevron${openGroup === key ? ' is-open' : ''}`}>▾</span>
                </button>
                {openGroup === key && (
                  <div
                    className="portal-nav__dropdown-panel"
                    style={{ top: panelPos.top, left: panelPos.left }}
                  >
                    {ADMIN_GROUPS[key].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`portal-nav__dropdown-item${pathname.startsWith(item.href) ? ' is-active' : ''}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link href="/admin/settings" style={activeStyle('/admin/settings')}>Settings</Link>
          </>
        ) : (
          <>
            <Link href="/member/dashboard" style={activeStyle('/member/dashboard')}>Dashboard</Link>
            <Link href="/member/profile" style={activeStyle('/member/profile')}>Profile</Link>
            <Link href="/member/speeches" style={activeStyle('/member/speeches')}>Speeches</Link>
            <Link href="/member/resources" style={activeStyle('/member/resources')}>Resources</Link>
          </>
        )}
      </div>

      <div className="portal-nav__pinned">
        {isAdminView ? (
          <Link href="/member/dashboard" style={{ color: 'var(--clay)', fontWeight: 'bold' }}>
            Member View →
          </Link>
        ) : (
          <Link href="/admin/meetings" style={{ color: 'var(--clay)', fontWeight: 'bold' }}>
            Admin Tools →
          </Link>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="btn-secondary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
          >
            Log out
          </button>
        </form>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors. Any pre-existing errors in other files are acceptable (there is a known baseline of ~76 errors in untouched files).

- [ ] **Step 3: Run build**

```bash
npx next build
```

Expected: build completes successfully.

- [ ] **Step 4: Smoke test in browser**

Start the dev server:
```bash
npx next dev
```

Open `http://localhost:3000` and log in as an admin user. Check:

1. Admin nav shows: Sessions · People ▾ · Content ▾ · Comms ▾ · Settings — then Member View → and Log out on the far right
2. Click "People ▾" → panel opens showing Members and Payments; click outside → panel closes
3. Click "Content ▾" → panel opens showing News, Media, Resources; click "People ▾" while Content is open → Content closes, People opens
4. Navigate to `/admin/news` → "Content" label gets the active underline
5. Click "Member View →" → lands on `/member/dashboard`
6. From member view, "Admin Tools →" still appears on the right and navigates back to `/admin/meetings`
7. On a narrow window (or phone simulation in DevTools) — nav scrolls horizontally, Member View and Log out remain visible at the right

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalNav.tsx
git commit -m "feat: grouped dropdown admin nav with pinned member view"
```
