'use server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// Token lookup must bypass RLS — signups SELECT is admin-only and the user is unauthenticated here
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function completeConversion(prevState: { error: string | null }, formData: FormData) {
  const supabase = await createClient()
  const token = formData.get('token') as string
  const password = formData.get('password') as string

  // Look up the signup by conversion token — uses service role to bypass RLS
  const { data: signup, error: lookupError } = await getServiceClient()
    .from('signups')
    .select('id, email, first_name, last_name, phone')
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

  // Create profile row — service role needed: SSR session isn't set within the same server action
  // request after signUp(), so the regular client is still unauthenticated and no INSERT policy exists
  const serviceClient = getServiceClient()
  const fullName = [signup.first_name, signup.last_name].filter(Boolean).join(' ')
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: authData.user.id,
    full_name: fullName,
    contact_email: signup.email,
    phone: signup.phone || null,
    is_admin: false,
  })
  if (profileError) {
    console.error('[join] profile upsert failed:', profileError.message, profileError.details)
    return { error: 'Account created but profile setup failed. Please contact us.' }
  }

  // Mark signup as converted
  const { error: updateError } = await serviceClient.from('signups').update({
    status: 'converted',
    conversion_token_used_at: new Date().toISOString(),
  }).eq('id', signup.id)
  if (updateError) console.error('[join] failed to mark signup as converted:', updateError)

  redirect('/member/dashboard')
}
