'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { sendCommunicationEmail } from '@/lib/email'

const BUCKET = 'site-media'
const COMMS_PREFIX = 'comms-attachments'

export async function uploadCommAttachment(
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  await checkAdmin()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { url: null, error: 'No file provided' }
  if (file.size > 10 * 1024 * 1024) return { url: null, error: 'File must be under 10 MB' }

  const ALLOWED_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: 'File type not allowed. Accepted: PDF, images, Word documents.' }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${COMMS_PREFIX}/${Date.now()}_${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createServiceClient()
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return { url: null, error: `Upload failed: ${error.message}` }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
  return { url: publicUrl, error: null }
}

type Recipient = {
  email: string
  name: string
  recipient_type: 'member' | 'signup' | 'external'
  source_id?: string
}

export async function sendCommunicationAction(
  prevState: { error: string | null; success: boolean },
  formData: FormData,
): Promise<{ error: string | null; success: boolean }> {
  const user = await checkAdmin()
  const supabase = await createClient()

  const subject = (formData.get('subject') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()
  const senderTitle = (formData.get('sender_title') as string)?.trim()
  const recipientsJson = formData.get('recipients') as string
  const attachmentUrlsJson = (formData.get('attachment_urls') as string) || '[]'

  if (!subject) return { error: 'Subject is required.', success: false }
  if (!body) return { error: 'Body is required.', success: false }
  if (!senderTitle) return { error: 'Sender title is required.', success: false }

  if (!recipientsJson) return { error: 'Invalid recipients data.', success: false }

  let recipients: Recipient[]
  try {
    const parsed: unknown = JSON.parse(recipientsJson)
    if (!Array.isArray(parsed)) throw new Error('not an array')
    recipients = parsed as Recipient[]
  } catch {
    return { error: 'Invalid recipients data.', success: false }
  }

  if (!recipients.length) return { error: 'At least one recipient is required.', success: false }

  let attachmentUrls: string[]
  try {
    attachmentUrls = JSON.parse(attachmentUrlsJson)
  } catch {
    attachmentUrls = []
  }

  // Insert communications row (draft)
  const { data: comm, error: commError } = await supabase
    .from('communications')
    .insert({ subject, body, sender_title: senderTitle, sent_by: user.id, status: 'draft', attachment_urls: attachmentUrls })
    .select('id')
    .single()

  if (commError || !comm) {
    console.error('[sendComm] insert comm failed:', commError)
    return { error: 'Failed to create communication record.', success: false }
  }

  const communicationId: string = comm.id

  // Insert recipients
  const { error: recipError } = await supabase
    .from('communication_recipients')
    .insert(
      recipients.map(r => ({
        communication_id: communicationId,
        email: r.email,
        name: r.name,
        recipient_type: r.recipient_type,
        source_id: r.source_id ?? null,
      }))
    )

  if (recipError) {
    console.error('[sendComm] insert recipients failed:', recipError)
    return { error: 'Failed to save recipients.', success: false }
  }

  let emailsFailed = false
  for (const recipient of recipients) {
    try {
      await sendCommunicationEmail({
        to: recipient.email,
        toName: recipient.name,
        communicationId,
        senderTitle,
        subject,
        body,
        attachmentUrls,
      })
    } catch (error) {
      console.error(`[sendComm] email failed for ${recipient.email}:`, error)
      emailsFailed = true
    }
  }

  // Update status to sent
  const { error: updateError } = await supabase
    .from('communications')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', communicationId)

  if (updateError) {
    console.error('[sendComm] status update failed:', updateError)
  }

  const sendFailed = emailsFailed || !!updateError

  revalidatePath('/admin/communications')

  if (sendFailed) {
    return { error: 'Communication saved but some emails failed to send. Check Resend logs.', success: true }
  }

  return { error: null, success: true }
}
