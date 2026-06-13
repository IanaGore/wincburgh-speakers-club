'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

function revalidateEnquiries() {
  revalidatePath('/admin/enquiries')
}

export async function updateMessageStatus(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const messageId = formData.get('message_id') as string
  const status = formData.get('status') as string
  const handled_at = status !== 'new' ? new Date().toISOString() : null
  const { error } = await supabase
    .from('contact_messages')
    .update({ status, handled_at, is_read: status !== 'new' })
    .eq('id', messageId)
  if (error) throw new Error('Failed to update message status')
  revalidateEnquiries()
}

export async function updateMessageNotes(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const messageId = formData.get('message_id') as string
  const notes = formData.get('notes') as string
  const { error } = await supabase
    .from('contact_messages')
    .update({ admin_notes: notes || null })
    .eq('id', messageId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}

export async function updateSignupStatus(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const signupId = formData.get('signup_id') as string
  const status = formData.get('status') as string
  const contacted_at = status === 'contacted' ? new Date().toISOString() : undefined
  const { error } = await supabase
    .from('signups')
    .update({ status, ...(contacted_at ? { contacted_at } : {}) })
    .eq('id', signupId)
  if (error) throw new Error('Failed to update signup status')
  revalidateEnquiries()
}

export async function updateSignupNotes(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const signupId = formData.get('signup_id') as string
  const notes = formData.get('notes') as string
  const { error } = await supabase
    .from('signups')
    .update({ admin_notes: notes || null })
    .eq('id', signupId)
  if (error) throw new Error('Failed to save notes')
  revalidateEnquiries()
}
