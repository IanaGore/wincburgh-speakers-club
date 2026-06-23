'use server'

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const fullName = formData.get('full_name') as string

  await supabase.auth.updateUser({ data: { full_name: fullName } })

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id)

  if (error) throw new Error('Failed to update profile')

  revalidatePath('/', 'layout')
  redirect('/onboarding/photo')
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) throw new Error('No file provided')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('Only JPEG, PNG and WebP images are accepted')
  if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `avatars/${user.id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createServiceClient()

  const { error: uploadError } = await admin.storage
    .from('site-media')
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media/${storagePath}`

  const { error: dbError } = await admin
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (dbError) throw new Error(`Profile update failed: ${dbError.message}`)

  revalidatePath('/', 'layout')
  redirect('/member/dashboard')
}
