#!/usr/bin/env node
// Tier-2 guard: every migration that creates a table must also grant on it.
// Catches the recurring "forgot PostgREST grants" Supabase footgun.
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const dir = 'supabase/migrations'

// PostgREST started requiring explicit table grants on 2026-05-30 (Supabase change).
// Migrations from that date onward MUST grant explicitly; older tables relied on the
// previous default-grant behaviour and are grandfathered in.
const POLICY_CUTOFF = '20260530000000'

const files = (await readdir(dir))
  .filter((f) => f.endsWith('.sql'))
  .filter((f) => f.slice(0, 14) >= POLICY_CUTOFF)
const failures = []

for (const file of files) {
  const sql = (await readFile(path.join(dir, file), 'utf8')).toLowerCase()
  const created = [...sql.matchAll(/create table(?:\s+if not exists)?\s+public\.(\w+)/g)].map((m) => m[1])
  for (const table of created) {
    // Allow an explicit opt-out for internal tables that intentionally have no anon/auth grants.
    if (sql.includes(`-- grants-guard: skip ${table}`)) continue
    const granted = new RegExp(`grant\\s+[\\w, ]+\\s+on\\s+public\\.${table}\\b`).test(sql)
    if (!granted) failures.push(`${file}: creates public.${table} but has no grant on it`)
  }
}

if (failures.length) {
  console.error('Migration grants-guard FAILED:')
  for (const f of failures) console.error('  - ' + f)
  process.exit(1)
}
console.log(`Migration grants-guard OK (${files.length} files checked).`)
