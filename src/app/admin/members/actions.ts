'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'
import { redirect } from 'next/navigation'

export async function toggleAdmin(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const memberId = formData.get('member_id') as string
  const currentStatus = formData.get('is_admin') === 'true'

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: !currentStatus })
    .eq('id', memberId)

  if (error) {
    console.error("Failed to update admin status:", error)
    throw new Error("Failed to update admin status")
  }

  revalidatePath('/admin/members')
}

export async function updateMemberRoles(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const memberId = formData.get('member_id') as string
  const clubRoles = formData.getAll('club_roles') as string[]

  const { error } = await supabase
    .from('profiles')
    .update({ club_roles: clubRoles })
    .eq('id', memberId)

  if (error) {
    console.error("Failed to update roles:", error)
    throw new Error("Failed to update roles")
  }

  revalidatePath('/admin/members')
  // club_roles drives the public president attribution (#30)
  revalidatePath('/')
  revalidatePath('/login')
}

export async function toggleActive(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const memberId = formData.get('member_id') as string
  const currentStatus = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: !currentStatus })
    .eq('id', memberId)

  if (error) {
    console.error("Failed to update active status:", error)
    throw new Error("Failed to update active status")
  }

  revalidatePath('/admin/members')
}

export async function inviteMember(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim() || null
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!firstName || !email || !/\S+@\S+\.\S+/.test(email)) {
    redirect('/admin/members?invite_error=invalid')
  }

  // Guard: account already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('contact_email', email)
    .maybeSingle()

  if (existing) {
    redirect('/admin/members?invite_error=duplicate')
  }

  // Create signups row
  const { data: signup, error: insertError } = await supabase
    .from('signups')
    .insert({
      first_name: firstName.slice(0, 100),
      last_name: lastName ? lastName.slice(0, 100) : null,
      email: email.slice(0, 254),
      source: 'admin_invite',
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !signup) {
    redirect('/admin/members?invite_error=failed')
  }

  // Generate token and send invite immediately
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const joinUrl = `${siteUrl}/join?token=${token}`

  await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expiresAt.toISOString(),
    invite_sent_at: new Date().toISOString(),
    invite_count: 1,
  }).eq('id', signup.id)

  await sendInviteEmail(email, firstName, joinUrl, expiresAt)

  redirect(`/admin/members?invited=${encodeURIComponent(firstName)}`)
}
