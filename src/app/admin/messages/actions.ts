'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function markAsRead(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const messageId = formData.get('message_id') as string

  const { error } = await supabase
    .from('contact_messages')
    .update({ is_read: true })
    .eq('id', messageId)

  if (error) throw new Error("Failed to update message")

  revalidatePath('/admin/messages')
}

export async function deleteMessage(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const messageId = formData.get('message_id') as string

  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', messageId)

  if (error) throw new Error("Failed to delete message")

  revalidatePath('/admin/messages')
}
