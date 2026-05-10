'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

export async function markAttended(signupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('signups').update({ status: 'attended' }).eq('id', signupId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/signups')
}

export async function sendConversionInvite(signupId: string) {
  const supabase = await createClient()
  const token = randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase.from('signups').update({
    conversion_token: token,
    conversion_token_expires_at: expires,
    conversion_token_used_at: null,
  }).eq('id', signupId)
  if (error) throw new Error(error.message)

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/join?token=${token}`
  console.log(`Invite URL for signup ${signupId}: ${joinUrl}`)

  revalidatePath('/admin/signups')
}
