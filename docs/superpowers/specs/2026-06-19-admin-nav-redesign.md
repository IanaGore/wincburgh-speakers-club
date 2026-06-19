# Admin Nav Redesign

**Date:** 2026-06-19
**Status:** Approved

## Problem

The admin `PortalNav` has grown to 10 flat links, causing the nav bar to overflow on typical screens. This pushes the "Member View →" link off-screen, leaving admins with no visible way to return to the member view.

## Solution

Replace the flat 10-link list with grouped dropdown menus, keeping Sessions and Settings as direct top-level links. "Member View →" and Log out are pinned to the right so they are always visible.

## Nav Structure

| Item | Type | Route / Contains |
|---|---|---|
| Sessions | Direct link | `/admin/meetings` |
| People ▾ | Dropdown | Members (`/admin/members`), Payments (`/admin/payments`) |
| Content ▾ | Dropdown | News (`/admin/news`), Media (`/admin/media`), Resources (`/admin/resources`) |
| Comms ▾ | Dropdown | Enquiries (`/admin/enquiries`), Communications (`/admin/communications`), Correspondence (`/admin/correspondence`) |
| Settings | Direct link | `/admin/settings` |
| Member View → | Direct link, pinned right | `/member/dashboard` |
| Log out | Button, pinned right | — |

## Dropdown Behaviour

- Click/tap the group label to open the panel; dropdown appears below that label
- Only one dropdown open at a time — opening a second closes the first
- Clicking a link inside the dropdown navigates and closes the panel
- Clicking anywhere outside the nav closes the open dropdown (`mousedown` listener on `document`, cleaned up on unmount)
- If the current route falls under a group (e.g. `/admin/news` is under Content), the group label receives the active underline style instead of the individual link

## Mobile

- Existing horizontal-scroll behaviour on the nav bar is preserved
- Dropdown panels use `position: fixed` anchored below the nav bar so they are not clipped by the scroll container
- Dropdown items have a minimum tap target height of 44px

## Files Changed

### `src/components/PortalNav.tsx`
- Add `useState<string | null>` to track which dropdown is open (`'people' | 'content' | 'comms' | null`)
- Add `useEffect` to attach/detach a `mousedown` listener on `document` that closes the open dropdown when clicking outside
- Replace the flat admin link list with:
  - Direct link: Sessions
  - Three `<div class="portal-nav__dropdown-wrapper">` groups, each with a toggle button and a conditionally rendered panel
  - Direct link: Settings
- Move "Member View →" and Log out into a `<div class="portal-nav__pinned">` container that sits outside the scrollable links and uses `flex-shrink: 0` / `margin-left: auto`
- Active-group detection: for each group, check if `pathname.startsWith()` any of its child routes

### `src/app/portal.css`
- `.portal-nav__dropdown-wrapper` — `position: relative; display: inline-block`
- `.portal-nav__dropdown-toggle` — same text style as existing nav links; adds `cursor: pointer` and a small chevron (`▾`) that rotates 180° when open
- `.portal-nav__dropdown-panel` — `position: fixed`; `background: var(--paper)`; `border: 1px solid var(--rule)`; `border-radius: 6px`; `box-shadow: 0 4px 16px rgba(0,0,0,0.1)`; `z-index: 100`; `min-width: 160px`; `padding: 0.5rem 0`
- `.portal-nav__dropdown-item` — full-width link; `padding: 0.65rem 1.25rem`; `min-height: 44px`; active state uses `var(--clay)` left border
- `.portal-nav__pinned` — `display: flex; align-items: center; gap: 1rem; flex-shrink: 0; margin-left: auto`

## Out of Scope

- Member nav is unchanged
- No changes to any admin page layouts
- No changes to routing, server actions, or data fetching
