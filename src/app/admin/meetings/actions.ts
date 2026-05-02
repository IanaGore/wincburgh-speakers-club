'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function createMeeting(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const date = formData.get('meeting_date') as string
  const theme = formData.get('theme') as string

  // Insert the meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .insert([{ meeting_date: date, theme }])
    .select()
    .single()

  if (meetingError || !meeting) {
    console.error("Meeting Error:", meetingError)
    throw new Error("Failed to create meeting")
  }

  // Pre-populate the standard roles
  const standardRoles = [
    'Toastmaster',
    'Timekeeper',
    'Ah-Counter',
    'Grammarian',
    'General Evaluator',
    'Speaker 1',
    'Speaker 2',
    'Speaker 3',
    'Evaluator 1',
    'Evaluator 2',
    'Evaluator 3',
  ]

  const assignmentsToInsert = standardRoles.map(role => ({
    meeting_id: meeting.id,
    role_name: role,
  }))

  const { error: rolesError } = await supabase
    .from('meeting_assignments')
    .insert(assignmentsToInsert)

  if (rolesError) {
    console.error("Roles Error:", rolesError)
    throw new Error("Failed to create default roles")
  }

  revalidatePath('/admin/meetings')
}

export async function deleteMeeting(meetingId: string) {
  const supabase = await createClient()
  
  // This will cascade and delete the related meeting_assignments automatically
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
  
  if (error) {
    console.error("Delete Error:", error)
    throw new Error("Failed to delete meeting")
  }
  
  revalidatePath('/admin/meetings')
}
