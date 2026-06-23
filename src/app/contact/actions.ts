'use server'
import { createClient } from '@/utils/supabase/server'
import { sendContactNotification } from '@/lib/email'

export async function sendContactMessage(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
) {
  const honeypot = (formData.get('website') as string | null) ?? ''
  if (honeypot) return { success: true, error: null }

  const name    = (formData.get('name')    as string | null)?.trim() ?? ''
  const email   = (formData.get('email')   as string | null)?.trim() ?? ''
  const phone   = (formData.get('phone')   as string | null)?.trim() ?? ''
  const topic   = (formData.get('topic')   as string | null)?.trim() ?? ''
  const message = (formData.get('message') as string | null)?.trim() ?? ''

  if (!name || !email || !message) {
    return { success: false, error: 'Name, email and message are required.' }
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contact_messages')
    .insert({ name, email, phone: phone || null, topic: topic || null, message })

  if (error) return { success: false, error: error.message }

  // Notify admin — non-blocking
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      await sendContactNotification(adminEmail, { name, email, phone, topic, message })
    } catch (emailError) {
      console.error('Contact notification email failed:', emailError)
    }
  }

  return { success: true, error: null }
}
