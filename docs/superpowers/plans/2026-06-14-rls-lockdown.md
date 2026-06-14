# RLS Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the direct-API write bypass on four tables by replacing permissive RLS policies with `profiles.is_admin = true` checks.

**Architecture:** Single migration file uses `pg_policies` loops to drop all non-SELECT policies (safe against unknown original policy names), then creates strict admin `FOR ALL` (or `FOR UPDATE` for `site_settings`). `meeting_assignments` gets the admin `FOR ALL` plus the two member UPDATE policies re-added verbatim.

**Tech Stack:** PostgreSQL RLS, PL/pgSQL, Supabase migrations, Playwright e2e

---

### Task 1: Write the migration

**Files:**
- Create: `supabase/migrations/20260614000000_rls_lockdown.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- RLS lockdown: close direct-API write bypass on four tables.
-- All admin server actions already call checkAdmin() at the app layer;
-- this migration enforces the same constraint at the database layer.

-- ── Helper: drop all non-SELECT policies on a table ──────────────────────
-- Used for tables whose original policies were created outside migrations
-- and whose exact names are unknown.

-- ── 1. meetings ───────────────────────────────────────────────────────────
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'meetings'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.meetings', p.policyname);
  end loop;
end $$;

create policy "Admins can manage meetings"
  on public.meetings for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 2. news_posts ─────────────────────────────────────────────────────────
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'news_posts'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.news_posts', p.policyname);
  end loop;
end $$;

create policy "Admins can manage news posts"
  on public.news_posts for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 3. site_settings ──────────────────────────────────────────────────────
-- Singleton row — only UPDATE is needed (no INSERT/DELETE in the application).
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'site_settings'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.site_settings', p.policyname);
  end loop;
end $$;

create policy "Admins can update site settings"
  on public.site_settings for update
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- ── 4. meeting_assignments ────────────────────────────────────────────────
-- Clears both the permissive policies AND the member UPDATE policies
-- (which were created in 20260503020000_fix_assignment_rls.sql).
-- Both sets are re-created below.
do $$ declare p record; begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'meeting_assignments'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.meeting_assignments', p.policyname);
  end loop;
end $$;

-- Admins: full control (INSERT roles when creating/editing meetings, DELETE, UPDATE any assignment)
create policy "Admins can manage meeting assignments"
  on public.meeting_assignments for all
  using   (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true))
  with check (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true));

-- Members: claim an unassigned role (volunteer for self or assign another member)
-- Verbatim copy from 20260503020000_fix_assignment_rls.sql
create policy "Members can volunteer for roles"
  on public.meeting_assignments for update
  using (member_id is null)
  with check (auth.uid() is not null);

-- Members: edit speech details or drop out from their own assigned role
-- Verbatim copy from 20260503020000_fix_assignment_rls.sql
create policy "Members can manage their own role"
  on public.meeting_assignments for update
  using (auth.uid() = member_id)
  with check (true);
```

- [ ] **Step 2: Commit the migration**

```bash
git add supabase/migrations/20260614000000_rls_lockdown.sql
git commit -m "feat(security): RLS lockdown — restrict writes to is_admin on meetings, news_posts, site_settings, meeting_assignments"
```

---

### Task 2: Run Tier-0 gates

**Files:** (none modified — gate-only task)

- [ ] **Step 1: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 new errors (pre-existing errors in untouched files are acceptable — see MEMORY note about ~76-error baseline).

- [ ] **Step 2: Lint**

```bash
npx next lint
```

Expected: 0 new errors in changed files.

- [ ] **Step 3: Build**

```bash
npx next build
```

Expected: build completes without error.

- [ ] **Step 4: Grants guard**

```bash
npm run check:migrations
```

Expected: passes (no new tables → no new grant requirements).

---

### Task 3: Apply migration and run Playwright smoke tests

- [ ] **Step 1: Push migration to remote DB**

```bash
npx supabase db push --include-all
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 2: Start dev server (needed for Playwright)**

```bash
npm run dev
```

Wait until the server is ready (Turbopack can take up to ~5 min cold).

- [ ] **Step 3: Run Playwright e2e suite**

```bash
npx playwright test
```

Expected: all tests pass. Key scenarios covered by existing tests:
- Admin can create and delete a meeting
- Member can volunteer for a role and drop out
- Public pages load (meetings, news, homepage)

- [ ] **Step 4: Commit if any test fixes were needed**

If tests needed adjustments (unlikely — no app code changed):

```bash
git add -p
git commit -m "test: update e2e for RLS lockdown"
```

---

### Task 4: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git checkout -b feat/rls-lockdown
git push -u origin feat/rls-lockdown
gh pr create \
  --title "feat(security): RLS lockdown — admin-only writes on core tables" \
  --body "$(cat <<'EOF'
## Summary
- Replaces permissive write policies on `meetings`, `news_posts`, `site_settings`, and `meeting_assignments` with strict `profiles.is_admin = true` checks
- Uses `pg_policies` loop to safely drop policies whose original names are unknown (set up outside migrations)
- Re-adds member volunteer/dropout UPDATE policies on `meeting_assignments`
- No app-layer changes — `checkAdmin()` already gates every server action

## Test plan
- [ ] tsc / lint / build all pass
- [ ] `npm run check:migrations` passes
- [ ] `npx playwright test` — all pass, including admin meeting CRUD and member volunteer/dropout
- [ ] Manually verify: log in as a non-admin authenticated user, attempt `POST /rest/v1/meetings` via Supabase REST API → expect 401/403

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL returned.
