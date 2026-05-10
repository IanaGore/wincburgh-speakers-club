'use server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function completeConversion(prevState: { error: string | null }, formData: FormData) {
  const supabase = await createClient()
  const token = formData.get('token') as string
  const password = formData.get('password') as string

  // Look up the signup by conversion token
  const { data: signup, error: lookupError } = await supabase
    .from('signups')
    .select('*')
    .eq('conversion_token', token)
    .is('conversion_token_used_at', null)
    .gt('conversion_token_expires_at', new Date().toISOString())
    .single()

  if (lookupError || !signup) {
    return { error: 'This invite link has expired or already been used. Please contact us for a new one.' }
  }

  // Create the auth account
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: signup.email,
    password,
  })

  if (signUpError || !authData.user) {
    return { error: signUpError?.message ?? 'Could not create account. Please try again.' }
  }

  // Create profile row
  await supabase.from('profiles').upsert({
    id: authData.user.id,
    first_name: signup.first_name,
    last_name: signup.last_name,
    email: signup.email,
    phone: signup.phone,
    is_admin: false,
  })

  // Mark signup as converted
  await supabase.from('signups').update({
    status: 'converted',
    conversion_token_used_at: new Date().toISOString(),
  }).eq('id', signup.id)

  redirect('/member/dashboard')
}
