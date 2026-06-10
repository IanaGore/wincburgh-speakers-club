// Single source of truth for formatting venue & meeting details.
// All public surfaces render from these helpers so copy never drifts.

export type VenueSettings = {
  venue_name: string | null
  venue_address: string | null
  meeting_day: string | null
  meeting_frequency: string | null
  meeting_doors_time: string | null
  meeting_time: string | null      // canonical START time
  meeting_end_time: string | null  // optional
}

// Defaults match the migration seed so server components degrade gracefully
// if a column is unexpectedly null.
const D = {
  venue_name: 'Winchburgh Community Centre',
  venue_address: 'Main Street, Winchburgh, EH52 6QF',
  meeting_day: 'Tuesday',
  meeting_frequency: '1st & 3rd of the month',
  meeting_doors_time: '6:30pm',
  meeting_time: '7:00pm',
}

function val<K extends keyof typeof D>(s: Partial<VenueSettings>, key: K): string {
  const v = s[key as keyof VenueSettings]
  return (v && String(v).trim()) || D[key]
}

/** Short navbar ribbon: "Tuesday meetings · 7:00pm · Winchburgh Community Centre" */
export function formatMeetingShort(s: Partial<VenueSettings>): string {
  return `${val(s, 'meeting_day')} meetings · ${val(s, 'meeting_time')} · ${val(s, 'venue_name')}`
}

/** Schedule line: "1st & 3rd Tuesday of the month" (frequency + day woven together). */
export function formatScheduleLine(s: Partial<VenueSettings>): string {
  const freq = val(s, 'meeting_frequency')
  const day = val(s, 'meeting_day')
  // "1st & 3rd of the month" + "Tuesday" -> "1st & 3rd Tuesday of the month"
  if (freq.includes('of the month')) {
    return freq.replace(/\s+of the month$/, ` ${day} of the month`)
  }
  return `${freq} · ${day}`
}

/** Times line: "Doors 6:30pm · Meeting 7:00pm" (+ " · Finish 9:00pm" if end set). */
export function formatTimesLine(s: Partial<VenueSettings>): string {
  let line = `Doors ${val(s, 'meeting_doors_time')} · Meeting ${val(s, 'meeting_time')}`
  const end = s.meeting_end_time && String(s.meeting_end_time).trim()
  if (end) line += ` · Finish ${end}`
  return line
}

/** Venue name, falling back to the default if unset/unreadable. */
export function venueName(s: Partial<VenueSettings>): string {
  return val(s, 'venue_name')
}

/** Venue address, falling back to the default if unset/unreadable. */
export function venueAddress(s: Partial<VenueSettings>): string {
  return val(s, 'venue_address')
}

/** Google Maps directions URL from venue name + address. */
export function mapsUrl(s: Partial<VenueSettings>): string {
  const q = encodeURIComponent(`${val(s, 'venue_name')}, ${val(s, 'venue_address')}`)
  return `https://maps.google.com/?q=${q}`
}

/** The list of settings columns every venue-consuming page should select. */
export const VENUE_COLUMNS =
  'venue_name, venue_address, meeting_day, meeting_frequency, meeting_doors_time, meeting_time, meeting_end_time'
