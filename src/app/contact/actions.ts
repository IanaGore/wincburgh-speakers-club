'use server'
import { createClient } from '@/utils/supabase/server'

// TODO: Also send notification email via Resend/Edge Function before launch
export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, message })

  if (error) return { success: false, error: error.message }
  return { success: true, error: null }
}
