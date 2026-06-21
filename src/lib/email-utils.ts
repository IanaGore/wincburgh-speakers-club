const RECEIVING_DOMAIN = 'winchburghspeakersclub.uk'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type RoutingResult =
  | { type: 'enquiry'; id: string }
  | { type: 'communication'; id: string }
  | { type: 'correspondence_new' }
  | { type: 'correspondence_reply'; id: string }
  | null

export function extractRoutingId(toAddresses: string[]): RoutingResult {
  for (const addr of toAddresses) {
    // Communication replies: reply+comm-{uuid}@domain (must precede generic reply+ check)
    const commMatch = addr.match(/reply\+comm-([^@]+)@(.+)/)
    if (commMatch) {
      const [, id, domain] = commMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'communication', id }
      }
    }

    // Correspondence replies: reply+corr-{uuid}@domain
    const corrMatch = addr.match(/reply\+corr-([^@]+)@(.+)/)
    if (corrMatch) {
      const [, id, domain] = corrMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'correspondence_reply', id }
      }
    }

    // Enquiry replies: reply+{uuid}@domain
    const enquiryMatch = addr.match(/reply\+([^@]+)@(.+)/)
    if (enquiryMatch) {
      const [, id, domain] = enquiryMatch
      if (domain === RECEIVING_DOMAIN && UUID_RE.test(id)) {
        return { type: 'enquiry', id }
      }
    }

    // New external correspondence: president@domain
    if (addr.toLowerCase() === `president@${RECEIVING_DOMAIN}`) {
      return { type: 'correspondence_new' }
    }
  }
  return null
}

export function stripQuotedReply(text: string): string {
  const markers = [
    /\r?\nOn .+wrote:/m,
    /\r?\n[-]{2,}\r?\n/m,
    /\r?\n>[ ]?.+/m,
    /\r?\nFrom:[ ].+/m,
  ]
  for (const marker of markers) {
    const idx = text.search(marker)
    if (idx !== -1) {
      const stripped = text.slice(0, idx).trim()
      return stripped.length > 0 ? stripped : text.trim()
    }
  }
  return text.trim()
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
