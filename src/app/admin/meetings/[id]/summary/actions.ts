'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function toggleAttendance(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const meetingId = formData.get('meeting_id') as string
  const memberId  = formData.get('member_id') as string
  const current   = formData.get('attended') === 'true'

  const { error } = await supabase
    .from('meeting_attendance')
    .update({ attended: !current })
    .eq('meeting_id', meetingId)
    .eq('member_id', memberId)

  if (error) {
    console.error("Failed to toggle attendance:", error)
    throw new Error("Failed to update attendance")
  }

  revalidatePath(`/admin/meetings/${meetingId}/summary`)
}

export async function saveSummary(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const meetingId = formData.get('meeting_id') as string
  const summary   = formData.get('summary') as string

  const { error } = await supabase
    .from('meetings')
    .update({ summary })
    .eq('id', meetingId)

  if (error) {
    console.error("Failed to save summary:", error)
    throw new Error("Failed to save session notes")
  }

  revalidatePath(`/admin/meetings/${meetingId}/summary`)
}
