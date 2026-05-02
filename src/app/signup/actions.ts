'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const full_name = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const headersList = await import('next/headers').then(m => m.headers())
  const host = headersList.get('host')
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name,
      }
    }
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  // If Supabase is configured to require email confirmation, the session will be null here.
  if (data.user && data.session === null) {
    redirect('/signup?message=Success! Please check your email to verify your account.')
  }

  // If email confirmation is disabled (e.g. some local dev environments)
  redirect('/member/dashboard')
}
