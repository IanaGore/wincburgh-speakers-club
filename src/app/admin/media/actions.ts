'use server'
import { revalidatePath } from 'next/cache'
import { checkAdmin } from '@/utils/supabase/auth-helpers'
import { createServiceClient } from '@/utils/supabase/service'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function uploadMediaPhoto(formData: FormData) {
  await checkAdmin()

  const key     = formData.get('key') as string
  const altText = (formData.get('alt_text') as string | null) ?? ''
  const file    = formData.get('file') as File | null

  if (!key) throw new Error('Missing media key')
  if (!file || file.size === 0) throw new Error('No file provided')
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) throw new Error('Only JPEG, PNG and WebP images are accepted')
  if (file.size > MAX_BYTES) throw new Error('File must be under 5 MB')

  const storagePath = `${key}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const admin = createServiceClient()

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: true })
  if (uploadError) {
    console.error('[media] Storage upload failed:', uploadError.message)
    throw new Error(`Storage: ${uploadError.message}`)
  }

  const { error: dbError } = await admin.from('media').upsert({
    key,
    storage_path: storagePath,
    alt_text: altText,
    updated_at: new Date().toISOString(),
  })
  if (dbError) {
    console.error('[media] DB upsert failed:', dbError.message)
    throw new Error(`DB: ${dbError.message}`)
  }

  revalidatePath('/admin/media')
  revalidatePath('/')
  revalidatePath('/about')
  revalidatePath('/meetings')
}
