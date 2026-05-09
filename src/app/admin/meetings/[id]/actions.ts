'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function addCustomRole(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const meetingId = formData.get('meeting_id') as string
  const roleName = formData.get('role_name') as string

  await supabase.from('meeting_assignments').insert({ meeting_id: meetingId, role_name: roleName })
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/member/dashboard`)
}

export async function deleteRole(assignmentId: string, meetingId: string) {
  await checkAdmin()
  const supabase = await createClient()
  await supabase.from('meeting_assignments').delete().eq('id', assignmentId)
  revalidatePath(`/admin/meetings/${meetingId}`)
  revalidatePath(`/member/dashboard`)
}

export async function deleteRoleFromForm(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string
  const meetingId    = formData.get('meetingId') as string
  await deleteRole(assignmentId, meetingId)
}
