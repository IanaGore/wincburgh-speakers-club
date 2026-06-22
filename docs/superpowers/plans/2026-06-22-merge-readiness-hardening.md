# Merge-Readiness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the four identified merge blockers while preserving current live-site behaviour and avoiding external service or live database mutations.

**Architecture:** Keep outbound delivery synchronous and sequential, matching `main`. Add webhook deduplication through nullable provider IDs and unique indexes, with a small shared duplicate-error predicate. Repair grants using both the original migration and a forward-only corrective migration.

**Tech Stack:** Next.js 16 server actions and route handlers, TypeScript, Supabase/PostgreSQL migrations, Resend/Svix, Vitest.

---

### Task 1: Outbound delivery regression tests

**Files:**
- Create: `src/app/admin/__tests__/email-actions.test.ts`
- Modify: `src/app/admin/communications/actions.ts`
- Modify: `src/app/admin/correspondence/actions.ts`

- [ ] **Step 1: Write a failing communication sequencing test**

Mock `checkAdmin`, the Supabase server client, and `sendCommunicationEmail`. Hold the first send promise open, invoke `sendCommunicationAction`, and assert the second recipient has not started. Resolve the first promise and assert the second recipient is then attempted.

```ts
it('sends communications sequentially', async () => {
  const firstSend = Promise.withResolvers<void>()
  sendCommunicationEmail
    .mockImplementationOnce(() => firstSend.promise)
    .mockResolvedValueOnce(undefined)

  const pending = sendCommunicationAction(initialState, communicationFormData())
  await vi.waitFor(() => expect(sendCommunicationEmail).toHaveBeenCalledTimes(1))
  firstSend.resolve()
  await pending
  expect(sendCommunicationEmail).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run the sequencing test and verify RED**

Run: `npm test -- src/app/admin/__tests__/email-actions.test.ts -t "sends communications sequentially"`

Expected: FAIL because `Promise.allSettled` starts both sends before the first resolves.

- [ ] **Step 3: Restore sequential delivery**

Replace the parallel map with a loop that catches per-recipient failures and continues:

```ts
let emailsFailed = false
for (const recipient of recipients) {
  try {
    await sendCommunicationEmail({
      to: recipient.email,
      toName: recipient.name,
      communicationId,
      senderTitle,
      subject,
      body,
      attachmentUrls,
    })
  } catch (error) {
    console.error(`[sendComm] email failed for ${recipient.email}:`, error)
    emailsFailed = true
  }
}
```

- [ ] **Step 4: Run the sequencing test and verify GREEN**

Run: `npm test -- src/app/admin/__tests__/email-actions.test.ts -t "sends communications sequentially"`

Expected: PASS.

- [ ] **Step 5: Write a failing correspondence ordering test**

Configure `sendCorrespondenceReply` to reject and assert no `correspondence_messages` insert occurs.

```ts
it('does not add a thread entry when correspondence email delivery fails', async () => {
  sendCorrespondenceReply.mockRejectedValueOnce(new Error('provider unavailable'))
  const result = await sendCorrespondenceReplyAction(initialReplyState, replyFormData())
  expect(result.success).toBe(false)
  expect(correspondenceInsert).not.toHaveBeenCalled()
})
```

- [ ] **Step 6: Run the correspondence test and verify RED**

Run: `npm test -- src/app/admin/__tests__/email-actions.test.ts -t "does not add a thread entry"`

Expected: FAIL because the branch currently inserts before sending.

- [ ] **Step 7: Restore email-first correspondence ordering**

Move `sendCorrespondenceReply` before the insert. Preserve the existing result text for both failure cases:

```ts
try {
  await sendCorrespondenceReply({
    to: corr.from_email as string,
    toName: corr.from_name as string,
    subject: corr.subject as string,
    body,
    correspondenceId,
  })
} catch (error) {
  console.error('[corr reply] send failed:', error)
  return { error: 'Failed to send email. Check Resend logs.', success: false, successCount: prevState.successCount }
}
```

If the later insert fails, return `Email sent but failed to save to thread.`.

- [ ] **Step 8: Run the action tests and verify GREEN**

Run: `npm test -- src/app/admin/__tests__/email-actions.test.ts`

Expected: both regression tests pass.

- [ ] **Step 9: Commit Task 1**

```bash
git add src/app/admin/__tests__/email-actions.test.ts src/app/admin/communications/actions.ts src/app/admin/correspondence/actions.ts
git commit -m "fix: preserve safe outbound email ordering"
```

### Task 2: Inbound webhook idempotency

**Files:**
- Modify: `src/lib/email-utils.ts`
- Modify: `src/lib/__tests__/email-utils.test.ts`
- Modify: `src/app/api/email/inbound/route.ts`
- Create: `src/app/api/email/inbound/route.test.ts`
- Create: `supabase/migrations/20260622000000_inbound_email_idempotency.sql`

- [ ] **Step 1: Write failing duplicate-error predicate tests**

```ts
describe('isDuplicateDeliveryError', () => {
  it('recognises PostgreSQL unique violations', () => {
    expect(isDuplicateDeliveryError({ code: '23505' })).toBe(true)
  })

  it('does not swallow unrelated database errors', () => {
    expect(isDuplicateDeliveryError({ code: '42501' })).toBe(false)
    expect(isDuplicateDeliveryError(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the predicate tests and verify RED**

Run: `npm test -- src/lib/__tests__/email-utils.test.ts -t "isDuplicateDeliveryError"`

Expected: FAIL because the export does not exist.

- [ ] **Step 3: Implement the minimal predicate**

```ts
export function isDuplicateDeliveryError(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}
```

- [ ] **Step 4: Run the predicate tests and verify GREEN**

Run: `npm test -- src/lib/__tests__/email-utils.test.ts -t "isDuplicateDeliveryError"`

Expected: PASS.

- [ ] **Step 5: Add the additive migration**

Create nullable columns and unique partial indexes without touching existing rows:

```sql
alter table public.enquiry_messages
  add column if not exists resend_email_id text;
alter table public.communication_replies
  add column if not exists resend_email_id text;
alter table public.correspondence_messages
  add column if not exists resend_email_id text;

create unique index if not exists enquiry_messages_resend_email_id_idx
  on public.enquiry_messages (resend_email_id)
  where resend_email_id is not null;
create unique index if not exists communication_replies_resend_email_id_idx
  on public.communication_replies (resend_email_id)
  where resend_email_id is not null;
create unique index if not exists correspondence_messages_resend_email_id_idx
  on public.correspondence_messages (resend_email_id)
  where resend_email_id is not null;

grant select, insert, update, delete on public.enquiry_messages to authenticated;
```

- [ ] **Step 6: Include provider IDs in all inbound message inserts**

Add `resend_email_id: emailId` to inserts into `enquiry_messages`, `communication_replies`, and both `correspondence_messages` branches.

- [ ] **Step 7: Treat duplicate inserts as successful retries**

For each message insert error, return `{ ok: true }` when `isDuplicateDeliveryError(error)` is true. Preserve status 500 for every other database error.

```ts
if (insertError) {
  if (isDuplicateDeliveryError(insertError)) {
    console.info('[inbound] email already processed, skipping:', emailId)
    return NextResponse.json({ ok: true })
  }
  console.error('[inbound] insert failed:', insertError)
  return NextResponse.json({ error: 'insert failed' }, { status: 500 })
}
```

- [ ] **Step 8: Add route-level retry tests**

Create deterministic webhook request tests with mocked Svix verification, Resend retrieval, and Supabase query chains. Cover enquiry, communication, and correspondence-reply routes returning HTTP 200 on error code `23505`, plus one route returning HTTP 500 on `42501`.

- [ ] **Step 9: Run route and utility tests**

Run: `npm test -- src/app/api/email/inbound/route.test.ts src/lib/__tests__/email-utils.test.ts`

Expected: all webhook idempotency and utility tests pass without network access.

- [ ] **Step 10: Commit Task 2**

```bash
git add src/lib/email-utils.ts src/lib/__tests__/email-utils.test.ts src/app/api/email/inbound/route.ts src/app/api/email/inbound/route.test.ts supabase/migrations/20260622000000_inbound_email_idempotency.sql
git commit -m "fix: make inbound email webhooks idempotent"
```

### Task 3: Migration grants repair

**Files:**
- Modify: `supabase/migrations/20260617120000_enquiry_messages.sql`
- Verify: `supabase/migrations/20260622000000_inbound_email_idempotency.sql`

- [ ] **Step 1: Reproduce the grants-guard failure**

Run: `npm run check:migrations`

Expected: FAIL naming `20260617120000_enquiry_messages.sql` and `public.enquiry_messages`.

- [ ] **Step 2: Repair clean-install grants**

Append to the original migration:

```sql
grant select, insert, update, delete on public.enquiry_messages to authenticated;
```

The forward migration from Task 2 repeats this grant for environments where the original migration already ran.

- [ ] **Step 3: Verify the grants guard**

Run: `npm run check:migrations`

Expected: `Migration grants-guard OK` and exit code 0.

- [ ] **Step 4: Commit Task 3**

```bash
git add supabase/migrations/20260617120000_enquiry_messages.sql supabase/migrations/20260622000000_inbound_email_idempotency.sql
git commit -m "fix: grant authenticated access to enquiry messages"
```

### Task 4: Full verification and merge review

**Files:**
- Review all files changed from `main`.

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run database migration checks**

Run: `npm run check:migrations`

Expected: exit code 0.

- [ ] **Step 3: Run lint and TypeScript checks**

Run: `npm run lint`

Run: `npx tsc --noEmit --pretty false`

Expected: both exit with code 0 and no errors.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: Next.js production build exits with code 0. The command may read configured environment variables but must not invoke database migrations or writes.

- [ ] **Step 5: Run diff hygiene checks**

```bash
git diff --check main...HEAD
git status --short
git diff --stat main...HEAD
```

Expected: no whitespace errors; only intentional files are modified or committed.

- [ ] **Step 6: Review compatibility requirements**

Confirm action signatures and return shapes are unchanged, migration columns are nullable, indexes are additive, no migration was applied, and tests contain no real credentials or network calls.

- [ ] **Step 7: Commit any verification-only corrections separately**

If verification required a correction, repeat the specific failing command after the correction and commit only those files with a focused `fix:` message.
