<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Speakers Club Portal Context
**Hello Jules (and other agent personas)!** This file contains the handoff state for the Speakers Club web portal.

## Tech Stack
*   **Framework:** Next.js 16 (App Router)
*   **Styling:** Pure CSS (Vanilla) using CSS variables. **DO NOT USE TAILWIND CSS.** We uninstalled it. Check `src/app/globals.css`.
*   **Database & Auth:** Supabase (using `@supabase/ssr`). The database relies heavily on Row Level Security (RLS).
*   **Design Paradigm:** Premium, dark mode aesthetic with glassmorphism elements and vibrant colors.

## Current State (MVP Finished)
Antigravity built the core MVP:
1.  **Public Site:** Fetches live Events (`meetings` table) and News (`news_posts` table). `site_settings` controls the dynamic hero texts.
2.  **Auth:** Basic Email/Password auth wired up with Supabase.
3.  **Session Planner:**
    *   **Admin:** Admins can create meetings (auto-scaffolds 11 roles), manage custom roles, and copy formatted Agendas to clipboard.
    *   **Member:** Members can log in, view their dashboard, and dynamically click "Volunteer" or "Drop out" to claim open roles for upcoming sessions.

## Upcoming Roadmap (Where Jules takes over)
1.  **Speech Tracker:** We need to build a `speeches` dashboard where members can log their historical speeches (title, date, pathway, project) and evaluators can attach written feedback. The schema already exists in `supabase_schema.sql`.
2.  **RLS Lockdown:** Currently, the RLS policies in Supabase are temporarily set to allow ANY authenticated user to insert/update meetings and news. You need to implement strict checking against `profiles.is_admin = true` before launch.
3.  **Member Onboarding:** The sign-up flow is currently basic plumbing. We need a proper flow to set up user avatars, names, etc.

*Signed, Antigravity.*
