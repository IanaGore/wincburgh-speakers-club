# Member Role Resources (#36) Implementation Plan

> Executed inline in the authoring session (full context held); this plan records the design, file map, and the load-bearing code so the work is reviewable against it.

**Goal:** Members browse role-prep resources by role and print them; admins maintain a roles catalog, per-role resources (with drafts), and file attachments.

**Architecture:** Three new tables (`roles`, `role_resources`, `role_resource_files`) with member-gated RLS (authenticated read; drafts visible to admins only; admin-only writes checked inline against `profiles.is_admin`). Member UI at `/member/resources` (+ `[slug]`) renders published resources as pre-wrap plain text (house pattern; no markdown dep) with attachment links and a print button. Admin UI at `/admin/resources` (roles catalog manager, mirrors FacilitiesManager) and `/admin/resources/[id]` (per-role resource manager; uploads via the existing service-role `site-media` Storage pattern into `role-resources/{resourceId}/…`).

**Spec:** `docs/superpowers/specs/2026-05-30-member-role-resources-design.md`. Out of scope per spec: signed URLs (public bucket accepted v1), usage tracking, meeting-scaffold wiring, WYSIWYG.

## File map

- Create `supabase/migrations/20260611100000_role_resources.sql`
- Create `src/app/admin/resources/actions.ts` — all CRUD + upload/delete, every action `checkAdmin()`-gated
- Create `src/app/admin/resources/page.tsx` + `RolesManager.tsx` (client)
- Create `src/app/admin/resources/[id]/page.tsx` + `ResourceManager.tsx` (client)
- Create `src/app/member/resources/page.tsx` (role cards)
- Create `src/app/member/resources/[slug]/page.tsx` + `PrintButton.tsx` (client) + `resources.css`
- Modify `src/components/PortalNav.tsx` — "Resources" link in both member and admin link sets
- Create `e2e/resources.spec.ts` — logged-out access to `/member/resources` redirects to `/login`

## Migration (authoritative SQL)

```sql
-- Issue #36: member role-resources (roles catalog + resources + attachments).

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  sort_order  int  not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.role_resources (
  id           uuid primary key default gen_random_uuid(),
  role_id      uuid not null references public.roles(id) on delete cascade,
  title        text not null,
  body         text not null default '',
  is_published boolean not null default false,
  sort_order   int  not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.role_resource_files (
  id           uuid primary key default gen_random_uuid(),
  resource_id  uuid not null references public.role_resources(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text not null,
  size         int  not null,
  sort_order   int  not null,
  created_at   timestamptz not null default now()
);

alter table public.roles enable row level security;
alter table public.role_resources enable row level security;
alter table public.role_resource_files enable row level security;

-- Member-gated reads (authenticated only; NOT anon). Drafts admin-only.
do $$ begin
  create policy "members read roles" on public.roles
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read published resources" on public.role_resources
    for select using (
      auth.uid() is not null and (
        is_published
        or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
      )
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members read resource files" on public.role_resource_files
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

-- Admin-only writes (inline profiles.is_admin check — house pattern, no is_admin() helper).
-- One insert + one update + one delete policy per table, all with:
--   exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
-- (update policies use USING, insert policies use WITH CHECK)

-- PostgREST grants (required since Supabase May 30 2026 change). Authenticated only — member-gated.
grant select on public.roles, public.role_resources, public.role_resource_files to authenticated;
grant insert, update, delete on public.roles, public.role_resources, public.role_resource_files to authenticated;

-- Seed the generic roles catalog (idempotent via slug conflict).
insert into public.roles (name, slug, description, sort_order) values
  ('Chairperson',       'chairperson',       'Open the meeting, set the tone, and keep the agenda moving.', 1),
  ('Timekeeper',        'timekeeper',        'Track speech and segment timings and signal speakers.', 2),
  ('Speaker',           'speaker',           'Prepare and deliver a speech from your pathway.', 3),
  ('Evaluator',         'evaluator',         'Give a constructive spoken evaluation of a speech.', 4),
  ('Topics Chair',      'topics-chair',      'Run the impromptu Table Topics segment.', 5),
  ('General Evaluator', 'general-evaluator', 'Evaluate everything outside the speeches — the meeting itself.', 6)
on conflict (slug) do nothing;
```

## Actions (`src/app/admin/resources/actions.ts`)

All `'use server'`, all start `await checkAdmin()`. CRUD mirrors `settings/actions.ts` managers (insert computes `max(sort_order)+1`, add returns the inserted row for optimistic state, reorder loops `sort_order = i+1`). Revalidates `/member/resources`, `/member/resources/[slug]` (via the role's slug where known), `/admin/resources` and `/admin/resources/[id]`.

- Roles: `addRole()`, `updateRole(id, name, slug, description)`, `deleteRole(id)`, `reorderRoles(orderedIds)`
- Resources: `addResource(roleId)`, `updateResource(id, title, body)`, `togglePublished(id, isPublished)`, `deleteResource(id)`, `reorderResources(orderedIds)`
- Files: `uploadResourceFile(formData)` — service-role client (media pattern), bucket `site-media`, path `role-resources/{resourceId}/{Date.now()}-{sanitised name}`, allowed: pdf/doc/docx/png/jpg/webp, max 5 MB; inserts `role_resource_files` row; returns it. `deleteResourceFile(id)` — removes storage object then row (service-role).

`deleteRole`/`deleteResource` rely on `on delete cascade` for rows but must first list+remove the resources' storage objects (service-role) so the bucket doesn't accumulate orphans.

## UI notes

- Member landing: `wsc`-style cards on the dark portal background (`var(--foreground)` text), each linking to `/member/resources/{slug}`.
- Role page: published resources ordered by `sort_order`; body in `whiteSpace: 'pre-wrap'`; attachments as links to `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/{storage_path}`; `PrintButton` (`window.print()`) and nav carry `no-print`; `resources.css` adds `@media print` rules forcing black-on-white for the resource sheet (portal.css already hides `nav`).
- Unknown slug → `notFound()`. Params are `Promise<{ slug: string }>` (Next 16).
- Admin pages use the light admin chrome (inline `var(--paper)`/`var(--ink)` styles like existing admin pages).
- PortalNav: member set gains `/member/resources` ("Resources"); admin set gains `/admin/resources` ("Resources").

## Verification

Tier 0: `npx tsc --noEmit`, eslint on new/changed files (no new errors), `npm run build`.
Tier 2: `npm run check:migrations` (3 new tables MUST have grants), e2e suite + new `resources.spec.ts` (logged-out `/member/resources` → `/login` redirect).
Migration applied to remote DB pre-merge (established practice); manual test plan in the PR (admin CRUD + upload, member view, draft hidden, print, logged-out blocked).
