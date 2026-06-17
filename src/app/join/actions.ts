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

  // Create auth account via admin API — pre-confirms the email so no confirmation email is sent.
  // signUp() would create an unconfirmed user and fire a Supabase confirmation email on top of
  // our own invite, breaking the flow for admin-invited members.
  const serviceClient = getServiceClient()
  const { data: adminAuthData, error: createError } = await serviceClient.auth.admin.createUser({
    email: signup.email,
    password,
    email_confirm: true,
  })

  if (createError || !adminAuthData.user) {
    return { error: createError?.message ?? 'Could not create account. Please try again.' }
  }

  // Create profile row
  const fullName = [signup.first_name, signup.last_name].filter(Boolean).join(' ')
  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: adminAuthData.user.id,
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

  // Sign the user in immediately — account is confirmed so this succeeds without any email step
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: signup.email,
    password,
  })
  if (signInError) {
    // Account created successfully; auto sign-in failed — send them to login to do it manually
    console.error('[join] auto sign-in failed:', signInError.message)
    redirect('/login')
  }

  redirect('/member/dashboard')
}
