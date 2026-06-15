'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function logSpeech(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const title = formData.get('title') as string
  const speech_date = formData.get('speech_date') as string
  const meeting_id = formData.get('meeting_id') as string || null
  const pathway = formData.get('pathway') as string
  const project = formData.get('project') as string
  const evaluator_id = formData.get('evaluator_id') as string || null

  if (!speech_date) {
    redirect('/member/speeches?error=1')
  }

  const { error } = await supabase.from('speeches').insert({
    member_id: user.id,
    title,
    speech_date,
    meeting_id,
    pathway,
    project,
    evaluator_id,
  })

  if (error) {
    redirect('/member/speeches?error=1')
  }

  redirect(`/member/speeches?logged=${encodeURIComponent(title)}`)
}

export async function deleteSpeech(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not logged in')
  const speechId = formData.get('speechId') as string
  await supabase.from('speeches').delete().eq('id', speechId).eq('member_id', user.id)
  revalidatePath('/member/speeches')
}

export async function addFeedback(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Not logged in')

  const speech_id = formData.get('speech_id') as string
  const feedback_notes = formData.get('feedback_notes') as string

  const { error } = await supabase
    .from('speeches')
    .update({ feedback_notes })
    .eq('id', speech_id)
    .eq('evaluator_id', user.id) // Ensure only evaluator can add feedback

  if (error) {
    throw new Error('Failed to add feedback: ' + error.message)
  }

  revalidatePath('/member/speeches')
}
