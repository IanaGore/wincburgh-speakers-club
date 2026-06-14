# RLS Lockdown — Design Spec

**Date:** 2026-06-14  
**Scope:** Database-layer write policy enforcement on four tables  
**Deliverable:** Single migration file

---

## Problem

The `meetings`, `news_posts`, `site_settings`, and `meeting_assignments` tables were created directly in Supabase before the migration workflow existed. Their write policies are permissive (any authenticated user). The application layer already guards every write via `checkAdmin()`, but a direct PostgREST API call can bypass it.

## Approach

Use a PL/pgSQL loop per table to drop all non-SELECT policies by querying `pg_policies` (avoids guessing original policy names), then create strict `is_admin` policies. No app-layer changes needed.

## Tables

### `meetings`
- Drop all `INSERT`, `UPDATE`, `DELETE`, `ALL` policies
- Add: admin `FOR ALL`

### `news_posts`
- Drop all `INSERT`, `UPDATE`, `DELETE`, `ALL` policies
- Add: admin `FOR ALL`

### `site_settings`
- Drop all `INSERT`, `UPDATE`, `DELETE`, `ALL` policies
- Add: admin `FOR UPDATE` only (singleton row, no INSERT/DELETE in the application)

### `meeting_assignments`
- Drop all `INSERT`, `UPDATE`, `DELETE`, `ALL` policies (clears permissive insert + existing member UPDATE policies)
- Add: admin `FOR ALL`
- Re-add: two member UPDATE policies (exact copies from `fix_assignment_rls.sql`):
  - "Members can volunteer for roles" — `USING (member_id IS NULL) WITH CHECK (auth.uid() IS NOT NULL)`
  - "Members can manage their own role" — `USING (auth.uid() = member_id) WITH CHECK (true)`

## Policy expression (house pattern)

```sql
exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
```

## Out of scope

Tables already locked down in prior migrations: `contact_messages`, `media`, `how_it_works_steps`, `facilities`, `role_resources`, `role_resource_files`, `signups`, `meeting_attendance`, `member_payments`, `payment_periods`, `speeches`.

No grant changes needed (no new tables).

## Testing

- tsc + lint + build gates
- Migration grants-guard (`npm run check:migrations`) — no new tables so should be a no-op
- Playwright smoke: admin can still create/delete a meeting; member can still volunteer/dropout
- Manual: confirm a non-admin authenticated API call to `POST /rest/v1/meetings` returns 403
