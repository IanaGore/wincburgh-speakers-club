'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { sendInviteEmail } from '@/lib/email'

export async function markAttended(signupId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Admin access required')

  const { error } = await supabase.from('signups').update({ status: 'attended' }).eq('id', signupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/enquiries')
}

export async function sendConversionInvite(signupId: string) {
  const supabase = await createClient()

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Admin access required')

  // Load signup
  const { data: signup, error: fetchError } = await supabase
    .from('signups')
    .select('id, email, first_name, invite_count, invite_sent_at')
    .eq('id', signupId)
    .single()
  if (fetchError || !signup) throw new Error('Signup not found')

  // Safeguard: max 3 invites
  if ((signup.invite_count ?? 0) >= 3) {
    throw new Error('Maximum invites reached for this signup (3). Contact support if needed.')
  }

  // Safeguard: 24-hour cooldown
  if (signup.invite_sent_at) {
    const hoursSince = (Date.now() - new Date(signup.invite_sent_at).getTime()) / 36e5
    if (hoursSince < 24) {
      const hoursLeft = Math.ceil(24 - hoursSince)
      throw new Error(`Please wait ${hoursLeft} more hour${hoursLeft === 1 ? '' : 's'} before resending.`)
    }
  }

  // Generate token
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { error: updateError } = await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expiresAt.toISOString(),
    conversion_token_used_at: null,
    invite_sent_at: new Date().toISOString(),
    invite_count: (signup.invite_count ?? 0) + 1,
  }).eq('id', signupId)
  if (updateError) throw new Error(updateError.message)

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`

  try {
    await sendInviteEmail(signup.email, signup.first_name, joinUrl, expiresAt)
  } catch (emailError) {
    console.error('Invite email failed:', emailError)
    throw new Error('Invite saved but email failed to send. Check server logs.')
  }

  revalidatePath('/admin/enquiries')
}
