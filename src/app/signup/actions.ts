'use server'
import { createClient } from '@/utils/supabase/server'
import { sendRsvpConfirmation } from '@/lib/email'

export type SignupData = {
  firstName: string
  lastName: string
  email: string
  phone: string
  heard: string
  experience: 'none' | 'some' | 'lots'
  hopes: string[]
  meetingId: string
  notes: string
}

export async function submitSignup(data: SignupData) {
  const firstName = data.firstName?.trim()
  if (!firstName || firstName.length > 100) throw new Error('Invalid first name')

  const email = data.email?.trim().toLowerCase()
  if (!email || !/\S+@\S+\.\S+/.test(email) || email.length > 254) throw new Error('Invalid email address')

  const validExperience = ['none', 'some', 'lots']
  if (!validExperience.includes(data.experience)) throw new Error('Invalid experience value')

  const hopes = Array.isArray(data.hopes) ? data.hopes.slice(0, 20).map(h => String(h).slice(0, 200)) : []

  const supabase = await createClient()

  // Fetch meeting date + venue in parallel for confirmation email
  const [meetingResult, settingsResult] = await Promise.all([
    data.meetingId
      ? supabase.from('meetings').select('meeting_date').eq('id', data.meetingId).single()
      : Promise.resolve({ data: null }),
    supabase.from('site_settings').select('venue_name, meeting_time').eq('id', 1).single(),
  ])
  const meetingDateStr = meetingResult.data
    ? new Date(meetingResult.data.meeting_date).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''
  const settings = settingsResult.data
  let venueName = settings?.venue_name ?? 'our venue'
  if (settings?.meeting_time) venueName = `${venueName} at ${settings.meeting_time}`

  const { error } = await supabase.from('signups').insert({
    first_name: firstName,
    last_name: data.lastName?.trim().slice(0, 100) || null,
    email,
    phone: data.phone?.trim().slice(0, 30) || null,
    heard_from: data.heard?.trim().slice(0, 200) || null,
    experience: data.experience,
    hopes,
    meeting_id: data.meetingId || null,
    notes: data.notes?.trim().slice(0, 2000) || null,
    status: 'pending',
    source: 'rsvp',
  })

  if (error) throw new Error(error.message)

  // Send confirmation — non-blocking, don't fail the RSVP on email error
  try {
    const dateDisplay = meetingDateStr || 'our next meeting'
    await sendRsvpConfirmation(email, firstName, dateDisplay, venueName)
  } catch (emailError) {
    console.error('RSVP confirmation email failed:', emailError)
  }

  return { success: true }
}
