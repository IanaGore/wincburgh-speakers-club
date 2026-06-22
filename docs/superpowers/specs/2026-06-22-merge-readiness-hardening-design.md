# Merge-Readiness Hardening Design

## Goal

Make `review/ponytail-refactor` safe to merge without changing established live-site behaviour or directly mutating the live Supabase project.

## Scope

The work is limited to four merge blockers:

1. Remove unbounded parallel communication delivery.
2. Remove the correspondence retry regression introduced by changing database/email ordering.
3. Make every inbound Resend webhook route idempotent.
4. Repair missing database grants for `enquiry_messages`.

Public-form rate limiting, a transactional email outbox, and the remaining duplicated service-client constructors are explicitly deferred.

## Delivery Behaviour

Communication recipients will be processed sequentially, matching the behaviour on `main`. Individual failures will still be collected so later recipients are attempted, and the existing action result remains unchanged.

Correspondence replies will return to email-first ordering. A failed email will not create a thread entry; a successful email followed by a database failure will continue to report the existing partial-failure state. Exactly-once delivery requires a transactional outbox and is outside this low-risk change.

## Inbound Webhook Idempotency

The three message tables that receive webhook-created rows will gain a nullable `resend_email_id` column:

- `enquiry_messages`
- `communication_replies`
- `correspondence_messages`

Each column will have a unique partial index covering non-null values. Existing rows remain valid and require no backfill. Webhook inserts will include the provider email ID. PostgreSQL unique-violation error `23505` will be treated as an already-processed delivery and return success, preventing provider retries from creating duplicate messages.

The existing `external_correspondence.resend_email_id` protection remains in place for creation of a new correspondence thread. Its first message also records the ID; the insert is part of the same webhook request, while retries are stopped by the thread-level uniqueness check before another message is created.

## Migration Safety

The original `enquiry_messages` migration will include the grants required for clean database creation. A new forward-only migration will apply the same grants to environments where the original migration has already run and will add the webhook idempotency columns and indexes.

The migration will use `if not exists` where PostgreSQL supports it, making deployment tolerant of partially aligned environments. No migration will be applied from this workspace during implementation or verification.

## Testing

Tests will be added before production changes and observed failing for the intended reason.

- Server-action tests will verify sequential communication delivery and correspondence failure ordering.
- Webhook-focused tests will verify duplicate provider IDs are accepted as successful retries rather than server errors.
- Migration checks will verify every created public table has appropriate grants.
- Existing unit tests, lint, TypeScript, the production build, and `git diff --check` will run before completion.

External services will be mocked or replaced with deterministic fakes. Tests must not use credentials or contact Supabase, Resend, or the deployed site.

## Compatibility and Rollback

Application changes preserve existing action signatures and UI state shapes. Database changes are additive and nullable, so the current production application can run before and after the migration. Rolling back application code does not require rolling back the migration; the added columns and indexes can remain unused safely.
