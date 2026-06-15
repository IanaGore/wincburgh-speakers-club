'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { sendMemberRequestNotification } from '@/lib/email'

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

  await supabase.from('signups').insert({
    first_name: firstName.slice(0, 100),
    last_name: lastName ? lastName.slice(0, 100) : null,
    email: email.slice(0, 254),
    source: 'existing_member',
    status: 'pending',
  })

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    try {
      await sendMemberRequestNotification(adminEmail, firstName, lastName, email)
    } catch (err) {
      console.error('[requestMemberAccess] notification email failed:', err)
    }
  }

  redirect('/login?registered=1')
}
