// Single source of truth for the homepage CTA paragraph (#31).

export type CtaSettings = {
  cta_body: string | null
}

// Default matches the migration seed so the homepage degrades gracefully.
const DEFAULT_CTA_BODY =
  'No booking needed for your first visit. A member of the committee will reach out to say hello in the next day or two.'

/** The CTA paragraph, falling back to the seed copy if unset/unreadable. */
export function ctaBody(s: Partial<CtaSettings>): string {
  const v = s.cta_body
  return (v && v.trim()) || DEFAULT_CTA_BODY
}

/** The settings column every CTA-consuming page should select. */
export const CTA_COLUMNS = 'cta_body'
