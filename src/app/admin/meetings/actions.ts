'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function createMeeting(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const date = formData.get('meeting_date') as string
  const theme = formData.get('theme') as string

  const { data: existing } = await supabase
    .from('meetings').select('id').eq('meeting_date', date).limit(1)
  if (existing && existing.length > 0) {
    throw new Error('A meeting is already scheduled on this date.')
  }

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
    'Chairperson',
    'Timekeeper',
    'Speech 1',
    'Evaluator 1',
    'Speech 2',
    'Evaluator 2',
    'Topics Chair',
    'General Evaluator'
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
  await checkAdmin()
  const supabase = await createClient()
  
  // This will cascade and delete the related meeting_assignments automatically
  const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
  
  if (error) {
    console.error("Delete Error:", error)
    throw new Error("Failed to delete meeting")
  }
  
  revalidatePath('/admin/meetings')
}
