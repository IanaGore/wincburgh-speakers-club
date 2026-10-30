<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Speakers Club Portal Context
**Hello Jules (and other agent personas)!** This file contains the handoff state and development rules for the Speakers Club web portal.

## Tech Stack
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Pure CSS (Vanilla) using CSS variables. **DO NOT USE TAILWIND CSS.** We uninstalled it. Check `src/app/globals.css`.
*   **Database & Auth:** Supabase (using `@supabase/ssr`). The database relies heavily on Row Level Security (RLS).
*   **Deployments:** Vercel deployments.
*   **Design Paradigm:** Premium, dark mode aesthetic with glassmorphism elements and vibrant colors.

## Verification Protocol
Before declaring any task complete, the agent must ensure:
1. Dependencies are clean and consistent: `npm ci`.
2. Static and type integrity check passes: `npm run lint`.
3. High-severity vulnerability check passes: `npm audit --audit-level=high`.
4. Production build completes cleanly: `npm run build`.

## Security Constraints
*   **OWASP Top 10:** Strict compliance with OWASP Top 10 standards (injection prevention, broken access control, secure Supabase queries).
*   **Input Sanitization:** No inline unsanitized user inputs or unsanitized HTML injections (`dangerouslySetInnerHTML` prohibited unless rigorously validated).
*   **External Scripts:** No unvetted external `<script>` tags.
*   **Zero Committed Secrets:** Never commit API keys, service role secrets, tokens, or `.env` files.

## Blast Radius Constraints
*   Touch only task-specific files required to deliver the requested feature or fix.
*   Do not modify `next.config.*` or `tsconfig.json` unless explicitly instructed.

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
