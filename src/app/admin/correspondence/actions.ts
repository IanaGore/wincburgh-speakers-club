'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendCorrespondenceReply } from '@/lib/email'

const VALID_STATUSES = ['open', 'in_progress', 'closed'] as const

export async function sendCorrespondenceReplyAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await checkAdmin()
  const supabase = await createClient()

  const correspondenceId = (formData.get('correspondence_id') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!correspondenceId) return { error: 'Invalid correspondence ID.', success: false }
  if (!body) return { error: 'Reply cannot be empty.', success: false }

  const { data: corr, error: corrError } = await supabase
    .from('external_correspondence')
    .select('from_email, from_name, subject')
    .eq('id', correspondenceId)
    .single()

  if (corrError || !corr) return { error: 'Correspondence not found.', success: false }

  try {
    await sendCorrespondenceReply({
      to: corr.from_email as string,
      toName: corr.from_name as string,
      subject: corr.subject as string,
      body,
      correspondenceId,
    })
  } catch (err) {
    console.error('[corr reply] send failed:', err)
    return { error: 'Failed to send email. Check Resend logs.', success: false }
  }

  const { error: insertError } = await supabase
    .from('correspondence_messages')
    .insert({
      correspondence_id: correspondenceId,
      direction: 'outbound',
      body,
      from_email: 'president@winchburghspeakersclub.uk',
      from_name: 'Winchburgh Speakers Club',
      sent_by: user.id,
    })

  if (insertError) {
    console.error('[corr reply] message insert failed:', insertError)
    return { error: 'Email sent but failed to save to thread.', success: false }
  }

  revalidatePath(`/admin/correspondence/${correspondenceId}`)
  return { error: null, success: true }
}

export async function updateCorrespondenceStatus(formData: FormData): Promise<void> {
  await checkAdmin()
  const supabase = await createClient()

  const id = (formData.get('correspondence_id') as string)?.trim()
  const status = formData.get('status') as string

  if (!id || !(VALID_STATUSES as readonly string[]).includes(status)) return

  await supabase
    .from('external_correspondence')
    .update({ status })
    .eq('id', id)

  revalidatePath(`/admin/correspondence/${id}`)
  revalidatePath('/admin/correspondence')
}
