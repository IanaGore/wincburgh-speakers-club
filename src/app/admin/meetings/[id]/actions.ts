'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addCustomRole(formData: FormData) {
  const supabase = await createClient()
  const meetingId = formData.get('meeting_id') as string
  const roleName = formData.get('role_name') as string

  await supabase.from('meeting_assignments').insert({ meeting_id: meetingId, role_name: roleName })
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/member/dashboard`)
}

export async function deleteRole(assignmentId: string, meetingId: string) {
  const supabase = await createClient()
  await supabase.from('meeting_assignments').delete().eq('id', assignmentId)
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/member/dashboard`)
}
