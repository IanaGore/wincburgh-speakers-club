// Single source of truth for the president's pull-quote and attributed name.
// Public surfaces render from these helpers so copy never drifts.

import type { SupabaseClient } from '@supabase/supabase-js'

export type PresidentSettings = {
  president_quote: string | null
  president_name_fallback: string | null
}

// Defaults match the migration seed so server components degrade gracefully
// if a column is unexpectedly null.
const D = {
  president_quote:
    "You don't need to be confident. You don't need to have anything to say. You just need to turn up.",
  president_name_fallback: 'Margaret',
}

function val<K extends keyof typeof D>(s: Partial<PresidentSettings>, key: K): string {
  const v = s[key as keyof PresidentSettings]
  return (v && String(v).trim()) || D[key]
}

/** The quote text, falling back to the seed copy if unset/unreadable. */
export function presidentQuote(s: Partial<PresidentSettings>): string {
  return val(s, 'president_quote')
}

/**
 * Name of the member currently holding the President club role, via the
 * SECURITY DEFINER rpc (anon cannot read profiles directly). Falls back to
 * president_name_fallback when no one holds the role or the rpc is
 * unavailable (e.g. migration not yet applied).
 */
export async function getPresidentName(
  supabase: SupabaseClient,
  s: Partial<PresidentSettings> = {},
): Promise<string> {
  const { data, error } = await supabase.rpc('get_president_name')
  if (!error && data && String(data).trim()) return String(data).trim()
  return val(s, 'president_name_fallback')
}

/** The list of settings columns every quote-consuming page should select. */
export const PRESIDENT_COLUMNS = 'president_quote, president_name_fallback'
