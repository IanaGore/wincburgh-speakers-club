'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function volunteerForRole(formData: FormData) {
  const assignmentId   = formData.get('assignmentId') as string
  const meetingId      = formData.get('meetingId') as string | null
  const targetMemberId = formData.get('target_member_id') as string | null
  const speech_title   = formData.get('speech_title') as string | null
  const speech_level   = formData.get('speech_level') as string | null
  const speech_length  = formData.get('speech_length') as string | null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Only admins may assign a role to another member
  let memberId = user.id
  if (targetMemberId && targetMemberId.trim() && targetMemberId !== user.id) {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!callerProfile?.is_admin) throw new Error('Only admins can assign roles to other members.')
    memberId = targetMemberId
  }

  // Prevent the same member from holding multiple roles in the same meeting
  if (meetingId) {
    const { data: conflict } = await supabase
      .from('meeting_assignments')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('member_id', memberId)
      .limit(1)
    if (conflict && conflict.length > 0) {
      throw new Error('This member already has a role in this session.')
    }
  }

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
