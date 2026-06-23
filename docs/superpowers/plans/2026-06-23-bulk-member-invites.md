# Bulk Member Invites Plan

## Tasks
- [ ] Add database support for bulk invite batches and a single active send lock.
- [ ] Add an admin bulk invite page with CSV/XLSX upload and validation preview.
- [ ] Add a server action to parse spreadsheets, dedupe by email, create pending signups, and process invites serially.
- [ ] Reuse the existing invite email helper so bulk and single invites share the same email content.
- [ ] Add a small regression test for spreadsheet parsing / validation.

## Notes
- Keep the bulk path simple: one upload, one validation pass, one serialized send loop.
- Use `email` as the dedupe key.
- Block a second run while the lock is held so the resend queue is not flooded.
