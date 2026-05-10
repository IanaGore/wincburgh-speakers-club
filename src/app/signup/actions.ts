'use server'
import { createClient } from '@/utils/supabase/server'

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
  // Validate inputs
  const firstName = data.firstName?.trim()
  if (!firstName || firstName.length > 100) throw new Error('Invalid first name')

  const email = data.email?.trim().toLowerCase()
  if (!email || !/\S+@\S+\.\S+/.test(email) || email.length > 254) throw new Error('Invalid email address')

  const validExperience = ['none', 'some', 'lots']
  if (!validExperience.includes(data.experience)) throw new Error('Invalid experience value')

  const hopes = Array.isArray(data.hopes) ? data.hopes.slice(0, 20).map(h => String(h).slice(0, 200)) : []

  const supabase = await createClient()

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
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
