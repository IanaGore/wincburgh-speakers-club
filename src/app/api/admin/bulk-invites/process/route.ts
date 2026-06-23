import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'

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

  if (insertError || !signup) throw new Error('Failed to save signup')

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { batch_id: batchId } = (await req.json().catch(() => ({}))) as { batch_id?: string }
  if (!batchId) return NextResponse.json({ error: 'missing batch_id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { error: lockError } = await supabase
    .from('invite_send_locks')
    .insert({ name: 'bulk_member_invites' })

  if (lockError) return NextResponse.json({ ok: true, locked: true })

  try {
    await supabase.from('bulk_invite_batches').update({ status: 'processing' }).eq('id', batchId)
    const { data: rows } = await supabase
      .from('bulk_invite_batch_rows')
      .select('id, email, first_name, last_name, status')
      .eq('batch_id', batchId)
      .order('row_number', { ascending: true })

    for (const row of rows ?? []) {
      if (row.status !== 'pending') continue
      try {
        const result = await createSignupAndInvite(supabase, row.first_name as string, (row.last_name as string | null) ?? null, row.email as string)
        if (result.status === 'sent') {
          await supabase.from('bulk_invite_batch_rows').update({ status: 'sent', signup_id: result.signup_id, error: null }).eq('id', row.id)
        } else {
          await supabase.from('bulk_invite_batch_rows').update({ status: 'skipped', error: result.reason }).eq('id', row.id)
        }
      } catch (error) {
        await supabase.from('bulk_invite_batch_rows').update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Invite failed',
        }).eq('id', row.id)
      }
    }

    await supabase.from('bulk_invite_batches').update({
      status: 'completed',
      processed_at: new Date().toISOString(),
    }).eq('id', batchId)
  } catch (error) {
    await supabase.from('bulk_invite_batches').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Bulk invite failed',
      processed_at: new Date().toISOString(),
    }).eq('id', batchId)
    throw error
  } finally {
    await supabase.from('invite_send_locks').delete().eq('name', 'bulk_member_invites')
  }

  return NextResponse.json({ ok: true })
}
