'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const full_name = formData.get('full_name') as string
  const raw_avatar_url = (formData.get('avatar_url') as string | null) ?? ''
  const contact_email = formData.get('contact_email') as string
  const phone = formData.get('phone') as string

  // Only allow https:// URLs to prevent CSS/JS injection via the background-image property
  let avatar_url: string | null = null
  if (raw_avatar_url.trim()) {
    try {
      const parsed = new URL(raw_avatar_url.trim())
      if (parsed.protocol !== 'https:') throw new Error('Invalid protocol')
      avatar_url = parsed.href
    } catch {
      throw new Error('Avatar URL must be a valid https:// URL')
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name,
      avatar_url,
      contact_email,
      phone
    })
    .eq('id', user.id)

  if (error) {
    console.error("Profile update error", error)
    throw new Error("Failed to update profile")
  }

  revalidatePath('/member/profile')
}
