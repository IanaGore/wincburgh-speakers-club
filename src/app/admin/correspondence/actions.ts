'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendCorrespondenceReply } from '@/lib/email'

const VALID_STATUSES = ['open', 'in_progress', 'closed'] as const

export async function sendCorrespondenceReplyAction(
  prevState: { error: string | null; success: boolean; successCount: number },
  formData: FormData,
): Promise<{ error: string | null; success: boolean; successCount: number }> {
  const user = await checkAdmin()
  const supabase = await createClient()

  const correspondenceId = (formData.get('correspondence_id') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!correspondenceId) return { error: 'Invalid correspondence ID.', success: false, successCount: prevState.successCount }
  if (!body) return { error: 'Reply cannot be empty.', success: false, successCount: prevState.successCount }

  const { data: corr, error: corrError } = await supabase
    .from('external_correspondence')
    .select('from_email, from_name, subject')
    .eq('id', correspondenceId)
    .single()

  if (corrError || !corr) return { error: 'Correspondence not found.', success: false, successCount: prevState.successCount }

  // Insert DB record first — if email send fails, admin can retry without duplicating the thread entry.
  // Reversed order (email first) caused duplicate sends on retry when the insert failed.
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
    return { error: 'Failed to save reply to thread.', success: false, successCount: prevState.successCount }
  }

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
    return { error: 'Reply saved but email failed to send. Check Resend logs.', success: false, successCount: prevState.successCount }
  }

  revalidatePath(`/admin/correspondence/${correspondenceId}`)
  return { error: null, success: true, successCount: prevState.successCount + 1 }
}

export async function updateCorrespondenceStatus(formData: FormData): Promise<void> {
  await checkAdmin()
  const supabase = await createClient()

  const id = (formData.get('correspondence_id') as string)?.trim()
  const status = (formData.get('status') as string)?.trim()

  if (!id || !(VALID_STATUSES as readonly string[]).includes(status)) return

  const { error } = await supabase
    .from('external_correspondence')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[corr status] update failed:', error)
    throw new Error('Failed to update correspondence status')
  }

  revalidatePath(`/admin/correspondence/${id}`)
  revalidatePath('/admin/correspondence')
}
