import { describe, it, expect } from 'vitest'
import {
  extractRoutingId,
  htmlToText,
  isDuplicateDeliveryError,
  stripQuotedReply,
} from '../email-utils'

const DOMAIN = 'winchburghspeakersclub.uk'
const UUID = '550e8400-e29b-41d4-a716-446655440000'

describe('extractRoutingId', () => {
  it('routes communication reply — not misrouted as enquiry', () => {
    // reply+comm-{uuid} also matches the generic reply+{uuid} regex; comm must win
    const result = extractRoutingId([`reply+comm-${UUID}@${DOMAIN}`])
    expect(result).toEqual({ type: 'communication', id: UUID })
  })

  it('routes correspondence reply', () => {
    expect(extractRoutingId([`reply+corr-${UUID}@${DOMAIN}`])).toEqual({
      type: 'correspondence_reply', id: UUID,
    })
  })

  it('routes enquiry reply', () => {
    expect(extractRoutingId([`reply+${UUID}@${DOMAIN}`])).toEqual({
      type: 'enquiry', id: UUID,
    })
  })

  it('routes new correspondence via president@', () => {
    expect(extractRoutingId([`president@${DOMAIN}`])).toEqual({ type: 'correspondence_new' })
  })

  it('returns null for non-UUID plus-address', () => {
    expect(extractRoutingId([`reply+not-a-uuid@${DOMAIN}`])).toBeNull()
  })

  it('returns null for wrong domain', () => {
    expect(extractRoutingId([`reply+${UUID}@evil.com`])).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(extractRoutingId([])).toBeNull()
  })
})

describe('stripQuotedReply', () => {
  it('strips Gmail "On [date] ... wrote:" attribution without leading dashes', () => {
    const input = 'Hello there\nOn Mon, 1 Jan 2024 at 10:00, admin@example.com wrote:\n> Original'
    expect(stripQuotedReply(input)).toBe('Hello there')
  })

  it('strips standard dashes separator', () => {
    const input = 'My reply\n--\nOriginal message below'
    expect(stripQuotedReply(input)).toBe('My reply')
  })

  it('strips From: header pattern', () => {
    const input = 'Reply text\nFrom: someone@example.com\nOriginal body'
    expect(stripQuotedReply(input)).toBe('Reply text')
  })

  it('returns trimmed text when no quote markers found', () => {
    expect(stripQuotedReply('  Just a plain message  ')).toBe('Just a plain message')
  })
})

describe('htmlToText', () => {
  it('converts <br> before stripping other tags', () => {
    // If order were reversed, <br> would be eaten by the generic stripper with no newline
    expect(htmlToText('<p>Hello<br/>World</p>')).toBe('Hello\nWorld')
  })

  it('decodes HTML entities', () => {
    expect(htmlToText('&amp; &lt; &gt; &quot; &#x27;')).toBe("& < > \" '")
  })

  it('collapses excessive blank lines', () => {
    expect(htmlToText('a\n\n\n\nb')).toBe('a\n\nb')
  })
})

describe('isDuplicateDeliveryError', () => {
  it('recognises PostgreSQL unique violations', () => {
    expect(isDuplicateDeliveryError({ code: '23505' })).toBe(true)
  })

  it('does not swallow unrelated database errors', () => {
    expect(isDuplicateDeliveryError({ code: '42501' })).toBe(false)
    expect(isDuplicateDeliveryError(null)).toBe(false)
  })
})
