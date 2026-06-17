'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendEnquiryReply } from '@/lib/email'

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

export async function sendEnquiryMessage(
  prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  await checkAdmin()
  const supabase = await createClient()

  const enquiryId = formData.get('enquiry_id') as string
  const body = (formData.get('body') as string)?.trim()

  if (!body) return { error: 'Message cannot be empty.' }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: enquiry } = await supabase
    .from('contact_messages')
    .select('name, email, message, status')
    .eq('id', enquiryId)
    .single()

  if (!enquiry) return { error: 'Enquiry not found.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const adminName = profile?.full_name ?? 'Winchburgh Speakers Club'

  try {
    await sendEnquiryReply(enquiry.email, enquiry.name, adminName, body, enquiry.message)
  } catch (err) {
    console.error('[sendEnquiryMessage] email failed:', err)
    return { error: 'Failed to send email. Please try again.' }
  }

  const { error: insertError } = await supabase
    .from('enquiry_messages')
    .insert({
      enquiry_id: enquiryId,
      direction: 'outbound',
      body,
      sent_by: user.id,
    })

  if (insertError) {
    console.error('[sendEnquiryMessage] insert failed:', insertError)
    return { error: 'Email sent but message could not be saved. Contact support.' }
  }

  if (enquiry.status === 'new') {
    await supabase
      .from('contact_messages')
      .update({ status: 'replied', handled_at: new Date().toISOString(), is_read: true })
      .eq('id', enquiryId)
  }

  revalidatePath('/admin/enquiries')
  return { error: null }
}
