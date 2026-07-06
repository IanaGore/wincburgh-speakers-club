# Resend Expired Member Invites Plan

## Tasks
- [ ] Trace the current invite flow for direct invites and bulk invites, plus the existing resend logic in admin signups.
- [ ] Reuse the current invite resend action where possible; only extract a shared helper if both paths truly need it.
- [ ] Add admin controls to resend an invite for a pending/expired signup from the relevant member screens.
- [ ] Make the UI show when an invite is expired or resendable.
- [ ] Add one regression test around the resend cooldown/expiry behavior.

## Notes
- Prefer no schema change unless the current invite fields are insufficient.
- Keep the fix at the admin entry point; avoid duplicating resend logic in multiple callers.
- If bulk and direct invites already converge on the same signup record, one resend path should cover both.
