# Member Role-Resources Page — Design Spec

**Date:** 2026-05-30
**Issue:** #36 (member role resource page)
**Status:** Ready

## Problem

The club has many meeting roles members can volunteer for (Chairperson, Timekeeper,
Evaluator, Topics Chair, General Evaluator, etc.). Members have nowhere to find guidance and
templates to prepare for a role. #36 asks for a member-facing resources area, organised by
role, that admins can easily maintain and members can print.

## Current State

Roles today are free-text `role_name` strings on `meeting_assignments`, scaffolded per
meeting (Chairperson, Timekeeper, Speech 1/2, Evaluator 1/2, Topics Chair, General Evaluator)
plus per-meeting custom roles. **There is no central roles catalog.** The numbered variants
("Evaluator 1/2") are unsuitable for organising resources. An existing media-upload pattern
(`site-media` bucket + service-role uploads) can be reused for attachments.

## Goals

- Members can browse resources by role (#36 criterion 1).
- Admins can easily create/upload resources (#36 criterion 2).
- Members can print resources (#36 criterion 3).

## Data Model

### `roles` catalog

| Column | Notes |
|--------|-------|
| `id` uuid pk | |
| `name` text | e.g. "Evaluator" (generic — no "1/2" variants) |
| `slug` text unique | e.g. "evaluator" |
| `description` text | short blurb shown on the landing cards |
| `sort_order` integer | |
| `created_at` / `updated_at` | |

Seeded with the generic roles: Chairperson, Timekeeper, Speaker, Evaluator, Topics Chair,
General Evaluator.

### `role_resources`

| Column | Notes |
|--------|-------|
| `id` uuid pk | |
| `role_id` uuid fk → roles | |
| `title` text | |
| `body` text | markdown, rendered read-only |
| `is_published` boolean default false | draft support |
| `sort_order` integer | |
| `created_at` / `updated_at` | |

### `role_resource_files`

| Column | Notes |
|--------|-------|
| `id` uuid pk | |
| `resource_id` uuid fk → role_resources | |
| `storage_path` text | in the Storage bucket |
| `file_name` text | original name shown to members |
| `mime_type` text | |
| `size` integer | |
| `sort_order` integer | |
| `created_at` | |

### RLS & grants

- Read: `authenticated` only (member-gated — **not** anon).
- Write: admin only (`is_admin()` / `checkAdmin()`).
- **Explicit grants** (`grant select ... to authenticated`, write to service/admin) per the
  May-30 PostgREST change — RLS alone is insufficient.
- Uploads via the existing **service-role** Storage pattern.

## Member UI — `/member/resources`

- **Landing:** role cards (name + description) linking to each role.
- **`/member/resources/[slug]`:** the role's *published* resources — each shows title,
  rendered markdown body, and attachment download links.
- **Print:** a Print button (`window.print()`) plus print CSS that hides nav/sidebar/chrome,
  producing a clean prep sheet for the role.
- Add a "Resources" link to the member nav (`PortalNav`).

## Admin UI — `/admin/resources`

- **Roles catalog manager:** add / edit / delete / reorder roles (name, slug, description) —
  mirrors the `HowItWorksManager` pattern (optimistic local state).
- **Resource manager (per role):** create / edit / delete resources (title, body, publish
  toggle, reorder); upload / remove attachments (service-role server action, reusing the media
  upload pattern).
- All actions `checkAdmin()`-gated. Add a "Resources" link to the admin sidebar.

## Deliberate v1 Simplifications / Out of Scope

- **Attachment privacy:** the page is member-gated, but attachment files live in a public
  Storage bucket (reusing the existing pattern), so a direct file URL is technically reachable.
  Accepted for prep templates in v1; switch to a private bucket + signed URLs later if needed.
- **Usage tracking** (the issue's open question) — deferred to a possible follow-up.
- **Speech-creation resources** — excluded per the issue.
- **No wiring into per-meeting role scaffolding** — the catalog is standalone for resources;
  meeting creation (`meeting_assignments` role_name strings) is untouched. *Future: deep-link
  from the dashboard "Volunteer" action to the matching role's resources.*
- **No heavy WYSIWYG editor** — body is markdown / plain text.

## Acceptance Criteria

- [ ] Members (logged in) can browse roles and view published resources per role.
- [ ] Members can download attachments and print a clean per-role resource sheet.
- [ ] Admins can create/edit/delete/reorder roles and resources, and upload/remove attachments.
- [ ] Draft (unpublished) resources are hidden from members.
- [ ] Non-members cannot read resources; non-admins cannot write (RLS + `checkAdmin()`).

## Verification (manual)

1. As admin, add a role, add a published resource with body + an uploaded file, and a draft resource.
2. As a member, open `/member/resources`, pick the role, confirm the published resource shows
   (draft hidden), download the file, and print the page (chrome stripped).
3. As a logged-out visitor, confirm `/member/resources` is not accessible.
4. Edit/reorder/delete a resource as admin; confirm member view updates.
