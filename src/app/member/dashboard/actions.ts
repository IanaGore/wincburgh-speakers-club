'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function volunteerForRole(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('meeting_assignments')
    .update({ member_id: user.id })
    .eq('id', assignmentId)
    .is('member_id', null) // Ensures role wasn't claimed immediately prior

  if (error) {
    console.error(error)
    throw new Error("Failed to volunteer")
  }
  
  revalidatePath('/member/dashboard')
}

export async function dropRole(assignmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('meeting_assignments')
    .update({ member_id: null })
    .eq('id', assignmentId)
    .eq('member_id', user.id) // Ensures they can only drop their own role

  if (error) {
    console.error(error)
    throw new Error("Failed to drop role")
  }
  
  revalidatePath('/member/dashboard')
}
