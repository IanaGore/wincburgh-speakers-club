'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { checkAdmin } from '@/utils/supabase/auth-helpers'

export async function toggleMemberActive(formData: FormData) {
  await checkAdmin()
  const supabase = await createClient()

  const memberId = formData.get('member_id') as string
  const current = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('profiles')
    .update({ is_active: !current })
    .eq('id', memberId)

  if (error) {
    console.error("Failed to update active status:", error)
    throw new Error("Failed to update active status")
  }

  revalidatePath('/admin/members')
}

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
