'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function submitContactForm(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const message = formData.get('message') as string

  const { error } = await supabase
    .from('contact_messages')
    .insert([{ name, email, message }])

  if (error) {
    console.error("Contact Form Error:", error)
    // Silently fail for the user, but we log it
  }

  redirect('/contact?success=true')
}
