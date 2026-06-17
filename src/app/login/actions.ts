'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { sendInviteEmail, sendMemberRequestNotification } from '@/lib/email'

// Caller is unauthenticated — signups UPDATE requires admin, so bypass RLS for token write
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/login?error=Invalid login credentials')
  }

  revalidatePath('/', 'layout')
  redirect('/member/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestMemberAccess(formData: FormData) {
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!firstName || !email || !/\S+@\S+\.\S+/.test(email)) {
    redirect('/login?registered=error')
  }

  const supabase = await createClient()

  // Guard: email already has an account
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('contact_email', email)
    .maybeSingle()

  if (existing) {
    redirect('/login?registered=duplicate')
  }

  const { data: signup } = await supabase.from('signups').insert({
    first_name: firstName.slice(0, 100),
    last_name: lastName ? lastName.slice(0, 100) : null,
    email: email.slice(0, 254),
    source: 'existing_member',
    status: 'pending',
  }).select('id').single()

  // Generate and send invite immediately — no admin bottleneck for existing members
  if (signup) {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const joinUrl = `${siteUrl}/join?token=${token}`

    await getServiceClient().from('signups').update({
      conversion_token: token,
      conversion_token_expires_at: expiresAt.toISOString(),
      invite_sent_at: new Date().toISOString(),
      invite_count: 1,
    }).eq('id', signup.id)

    try {
      await sendInviteEmail(email, firstName, joinUrl, expiresAt)
    } catch (err) {
      console.error('[requestMemberAccess] invite email failed:', err)
    }
  }

  // Notify admin as FYI
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      await sendMemberRequestNotification(adminEmail, firstName, lastName, email)
    } catch (err) {
      console.error('[requestMemberAccess] admin notification failed:', err)
    }
  }

  redirect('/login?registered=1')
}
