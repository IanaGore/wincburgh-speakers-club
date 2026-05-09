'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const full_name = formData.get('full_name') as string
  const avatar_url = formData.get('avatar_url') as string
  const contact_email = formData.get('contact_email') as string
  const phone = formData.get('phone') as string
  
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
