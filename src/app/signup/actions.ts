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
  const supabase = await createClient()

  const { error } = await supabase.from('signups').insert({
    first_name: data.firstName,
    last_name: data.lastName || null,
    email: data.email,
    phone: data.phone || null,
    heard_from: data.heard || null,
    experience: data.experience,
    hopes: data.hopes,
    meeting_id: data.meetingId || null,
    notes: data.notes || null,
    status: 'pending',
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
