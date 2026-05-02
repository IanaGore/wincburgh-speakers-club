'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = formData.get('full_name') as string

  // Update auth metadata
  await supabase.auth.updateUser({
    data: { full_name: fullName }
  })

  // Update profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (error) {
    throw new Error('Failed to update profile')
  }

  revalidatePath('/', 'layout')
  redirect('/member/dashboard')
}
