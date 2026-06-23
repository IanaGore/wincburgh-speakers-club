'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'
import { redirect } from 'next/navigation'
import { parseBulkInviteFile, queueBulkInviteProcessor } from './bulk-invites'
import { headers } from 'next/headers'

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

async function createSignupAndInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  firstName: string,
  lastName: string | null,
  email: string,
) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('contact_email', email)
    .maybeSingle()

  if (existing) return { status: 'skipped' as const, reason: 'existing member' }

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
    throw new Error('Failed to save signup')
  }

  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const joinUrl = `${siteUrl}/join?token=${token}`

  const { error: updateError } = await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expiresAt.toISOString(),
    invite_sent_at: new Date().toISOString(),
    invite_count: 1,
  }).eq('id', signup.id)

  if (updateError) throw new Error(updateError.message)

  await sendInviteEmail(email, firstName, joinUrl, expiresAt)
  return { status: 'sent' as const, signup_id: signup.id }
}

export async function previewBulkInvites(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) redirect('/admin/members?bulk_error=no_file')
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || (ext !== 'csv' && ext !== 'xlsx')) redirect('/admin/members?bulk_error=bad_file')

  const parsed = await parseBulkInviteFile(file)
  const emails = parsed.rows.map(r => r.email)
  const dedupedRows = parsed.rows.filter((row, idx) => emails.indexOf(row.email) === idx)
  const duplicateCount = parsed.rows.length - dedupedRows.length

  const { data: existingMembers } = await supabase
    .from('profiles')
    .select('contact_email')
    .in('contact_email', dedupedRows.map(r => r.email))

  const existing = new Set((existingMembers ?? []).map(row => String(row.contact_email).toLowerCase()))

  const { data: existingSignups } = await supabase
    .from('signups')
    .select('email')
    .in('email', dedupedRows.map(r => r.email))

  const signupEmails = new Set((existingSignups ?? []).map(row => String(row.email).toLowerCase()))

  const { data: batch, error: batchError } = await supabase
    .from('bulk_invite_batches')
    .insert({
      file_name: file.name,
      file_type: ext,
      status: 'ready',
      row_count: parsed.rows.length,
      valid_count: dedupedRows.length,
      invalid_count: parsed.errors.length,
      skipped_count: duplicateCount + dedupedRows.filter(row => existing.has(row.email) || signupEmails.has(row.email)).length,
    })
    .select('id')
    .single()

  if (batchError || !batch) redirect('/admin/members?bulk_error=failed')

  const batchRows = dedupedRows.map(row => {
    const existingMember = existing.has(row.email)
    const existingSignup = signupEmails.has(row.email)
    const status = existingMember || existingSignup ? 'skipped' : 'pending'
    return {
      batch_id: batch.id,
      row_number: row.row_number,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      status,
      error: existingMember ? 'Already an existing member.' : existingSignup ? 'Invite already queued for this email.' : null,
    }
  })

  const { error: rowError } = await supabase.from('bulk_invite_batch_rows').insert(batchRows)
  if (rowError) redirect('/admin/members?bulk_error=failed')

  redirect(`/admin/members/bulk-invites?batch=${batch.id}`)
}

export async function sendBulkInvites(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()
  const requestHeaders = await headers()
  const batchId = (formData.get('batch_id') as string)?.trim()
  if (!batchId) redirect('/admin/members/bulk-invites?bulk_error=missing_batch')

  await supabase.from('bulk_invite_batches').update({ status: 'ready' }).eq('id', batchId)
  queueBulkInviteProcessor(batchId, requestHeaders.get('cookie'))
  revalidatePath('/admin/members')
  revalidatePath('/admin/members/bulk-invites')
}
