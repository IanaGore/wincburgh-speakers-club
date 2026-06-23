import { describe, it, expect } from 'vitest'
import { ctaBody } from '../cta'
import { formatMeetingShort, formatScheduleLine, formatTimesLine, venueName } from '../venue'
import { presidentQuote } from '../president'

describe('ctaBody', () => {
  it('returns default for null', () => {
    expect(ctaBody({ cta_body: null })).toMatch(/No booking needed/)
  })
  it('returns default for empty string', () => {
    expect(ctaBody({ cta_body: '' })).toMatch(/No booking needed/)
  })
  it('returns default for whitespace-only', () => {
    expect(ctaBody({ cta_body: '   ' })).toMatch(/No booking needed/)
  })
  it('returns the provided value', () => {
    expect(ctaBody({ cta_body: 'Custom copy' })).toBe('Custom copy')
  })
})

describe('formatScheduleLine', () => {
  it('weaves day into "of the month" frequency', () => {
    expect(formatScheduleLine({ meeting_frequency: '1st & 3rd of the month', meeting_day: 'Tuesday' }))
      .toBe('1st & 3rd Tuesday of the month')
  })

  it('falls back to "freq · day" when no "of the month" suffix', () => {
    expect(formatScheduleLine({ meeting_frequency: 'Weekly', meeting_day: 'Monday' }))
      .toBe('Weekly · Monday')
  })

  it('uses defaults when null', () => {
    const result = formatScheduleLine({})
    expect(result).toContain('Tuesday')
  })
})

describe('formatMeetingShort', () => {
  it('formats ribbon line', () => {
    expect(formatMeetingShort({ meeting_day: 'Wednesday', meeting_time: '7:30pm', venue_name: 'The Hub' }))
      .toBe('Wednesday meetings · 7:30pm · The Hub')
  })
})

describe('formatTimesLine', () => {
  it('omits finish time when not set', () => {
    expect(formatTimesLine({ meeting_doors_time: '6:30pm', meeting_time: '7:00pm' }))
      .toBe('Doors 6:30pm · Meeting 7:00pm')
  })
  it('includes finish time when set', () => {
    expect(formatTimesLine({ meeting_doors_time: '6:30pm', meeting_time: '7:00pm', meeting_end_time: '9:00pm' }))
      .toBe('Doors 6:30pm · Meeting 7:00pm · Finish 9:00pm')
  })
})

describe('venueName', () => {
  it('falls back to default when null', () => {
    expect(venueName({ venue_name: null })).toBe('Winchburgh Community Centre')
  })
})

describe('presidentQuote', () => {
  it('falls back to default for null', () => {
    expect(presidentQuote({ president_quote: null })).toContain("You don't need to be confident")
  })
  it('returns provided quote', () => {
    expect(presidentQuote({ president_quote: 'Custom quote' })).toBe('Custom quote')
  })
})
