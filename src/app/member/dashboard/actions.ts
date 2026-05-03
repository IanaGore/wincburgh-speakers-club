'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function volunteerForRole(formData: FormData) {
  const assignmentId   = formData.get('assignmentId') as string
  const targetMemberId = formData.get('target_member_id') as string | null
  const speech_title   = formData.get('speech_title') as string | null
  const speech_level   = formData.get('speech_level') as string | null
  const speech_length  = formData.get('speech_length') as string | null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Use the provided target member, or fall back to the current user
  const memberId = (targetMemberId && targetMemberId.trim()) ? targetMemberId : user.id

  const { error } = await supabase
    .from('meeting_assignments')
    .update({
      member_id: memberId,
      speech_title: speech_title || null,
      speech_level: speech_level || null,
      speech_length: speech_length || null
    })
    .eq('id', assignmentId)
    .is('member_id', null) // Prevents overwriting an already-claimed slot

  if (error) {
    console.error(error)
    throw new Error("Failed to volunteer")
  }
  
  revalidatePath('/member/dashboard')
}

export async function updateSpeechDetails(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string
  const speech_title = formData.get('speech_title') as string
  const speech_level = formData.get('speech_level') as string
  const speech_length = formData.get('speech_length') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('meeting_assignments')
    .update({
      speech_title: speech_title || null,
      speech_level: speech_level || null,
      speech_length: speech_length || null
    })
    .eq('id', assignmentId)
    .eq('member_id', user.id) // Can only edit own slot

  if (error) {
    console.error(error)
    throw new Error("Failed to update speech details")
  }

  revalidatePath('/member/dashboard')
}

export async function dropRole(formData: FormData) {
  const assignmentId = formData.get('assignmentId') as string

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('meeting_assignments')
    .update({ 
      member_id: null,
      speech_title: null,
      speech_level: null,
      speech_length: null
    })
    .eq('id', assignmentId)
    .eq('member_id', user.id) // Ensures they can only drop their own role

  if (error) {
    console.error(error)
    throw new Error("Failed to drop role")
  }
  
  revalidatePath('/member/dashboard')
}
