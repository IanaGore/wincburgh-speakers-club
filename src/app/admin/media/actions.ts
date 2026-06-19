'use server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath, refresh } from 'next/cache'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Service role client bypasses Storage RLS — only used after admin check below
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function uploadMediaPhoto(formData: FormData) {
  // Auth check with user client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Admin access required')

  const key     = formData.get('key') as string
  const altText = (formData.get('alt_text') as string | null) ?? ''
  const file    = formData.get('file') as File | null

  if (!key) throw new Error('Missing media key')
  if (!file || file.size === 0) throw new Error('No file provided')
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Only JPEG, PNG and WebP images are accepted')
  if (file.size > MAX_BYTES) throw new Error('File must be under 5 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const storagePath = `${key}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // Use service role for storage + DB writes — bypasses Storage RLS
  const admin = getAdminClient()

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
  refresh()
}
